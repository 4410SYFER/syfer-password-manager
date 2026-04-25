const express = require('express');
const db = require('../db');
const { encrypt, decrypt } = require('../crypto');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'You must be logged in.' });
  }
  next();
}

// GET /api/vault — get all entries for the logged-in user
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, site_name, site_username, encrypted_password, iv, category FROM vault_entries WHERE user_id = ?',
      [req.session.userId]
    );

    const entries = rows.map((row) => ({
      id: row.id,
      site_name: row.site_name,
      site_username: row.site_username,
      category: row.category,
      password: decrypt(row.encrypted_password, row.iv),
    }));

    res.json(entries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve vault entries.' });
  }
});

// POST /api/vault — add a new vault entry
router.post('/', requireAuth, async (req, res) => {
  const { site_name, site_username, password, category } = req.body;

  if (!site_name || !password) {
    return res.status(400).json({ error: 'Site name and password are required.' });
  }

  try {
    const { iv, encrypted_password } = encrypt(password);
    const [result] = await db.execute(
      'INSERT INTO vault_entries (user_id, site_name, site_username, encrypted_password, iv, category) VALUES (?, ?, ?, ?, ?, ?)',
      [req.session.userId, site_name, site_username || null, encrypted_password, iv, category || null]
    );
    res.status(201).json({ message: 'Entry saved.', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save vault entry.' });
  }
});

// DELETE /api/vault/:id — delete a vault entry
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [result] = await db.execute(
      'DELETE FROM vault_entries WHERE id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Entry not found or not yours.' });
    }

    res.json({ message: 'Entry deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete entry.' });
  }
});

module.exports = router;
