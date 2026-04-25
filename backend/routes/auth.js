const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');

const router = express.Router();
const SALT_ROUNDS = 12;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await db.execute(
      'INSERT INTO users (username, email, master_password_hash) VALUES (?, ?, ?)',
      [username, email, hash]
    );
    req.session.userId = result.insertId;
    req.session.username = username;
    res.status(201).json({ message: 'Account created successfully.', username });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username or email already exists.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.master_password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ message: 'Logged in successfully.', username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Could not log out.' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully.' });
  });
});

// GET /api/auth/me — check if currently logged in
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  res.json({ userId: req.session.userId, username: req.session.username });
});

module.exports = router;
