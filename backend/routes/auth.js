// Authentication routes — handles user registration, login, logout, and password reset
// Passwords are hashed with bcrypt before being stored (one-way, cannot be reversed)

const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');

const router = express.Router();

// Cost factor for bcrypt — higher = slower hashing = harder to brute force
const SALT_ROUNDS = 12;

// POST /api/auth/register — create a new user account
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    // Hash the password before saving — the plain text password is never stored
    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await db.execute(
      'INSERT INTO users (username, email, master_password_hash) VALUES (?, ?, ?)',
      [username, email, hash]
    );

    // Start a session so the user is immediately logged in after registering
    req.session.userId = result.insertId;
    req.session.username = username;
    res.status(201).json({ message: 'Account created successfully.', username });
  } catch (err) {
    // MySQL error code for duplicate entry (username or email already taken)
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username or email already exists.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// POST /api/auth/login — verify credentials and start a session
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    // Look up the user by username
    const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      // Return the same error for wrong username or wrong password (prevents user enumeration)
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = rows[0];

    // bcrypt.compare hashes the input and checks it against the stored hash
    const match = await bcrypt.compare(password, user.master_password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Save user info in the session so protected routes know who is logged in
    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ message: 'Logged in successfully.', username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// POST /api/auth/reset-password — update password after verifying username + email match
router.post('/reset-password', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and new password are required.' });
  }

  // Normalize input to avoid case-sensitivity mismatches
  const normalizedUsername = String(username).trim();
  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    // Verify the username and email belong to the same account before allowing a reset
    const [rows] = await db.execute(
      'SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND LOWER(email) = LOWER(?)',
      [normalizedUsername, normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    // Hash the new password before saving
    const hash = await bcrypt.hash(String(password), SALT_ROUNDS);
    await db.execute('UPDATE users SET master_password_hash = ? WHERE id = ?', [hash, rows[0].id]);

    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while resetting password.' });
  }
});

// POST /api/auth/logout — destroy the session and clear the cookie
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Could not log out.' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully.' });
  });
});

// GET /api/auth/me — check if a user is currently logged in
// The frontend calls this on page load to restore session state
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  res.json({ userId: req.session.userId, username: req.session.username });
});

module.exports = router;
