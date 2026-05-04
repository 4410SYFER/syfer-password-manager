// Main entry point for the Syfer backend server
// Starts an Express server on port 3001 and connects all routes

const express = require('express');
const session = require('express-session');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const vaultRoutes = require('./routes/vault');

const app = express();
const PORT = 3001;

// Allow requests from the React frontend running on port 5173
// credentials: true is required so session cookies are sent with each request
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

// Parse incoming JSON request bodies
app.use(express.json());

// Session middleware — keeps users logged in between requests
// httpOnly prevents JavaScript from reading the cookie (XSS protection)
// maxAge sets the session to expire after 2 hours
app.use(session({
  secret: process.env.SESSION_SECRET || 'syfer-session-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 2,
  },
}));

// Route handlers — all auth routes live under /api/auth, vault under /api/vault
app.use('/api/auth', authRoutes);
app.use('/api/vault', vaultRoutes);

// Simple health check endpoint to confirm the server is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Syfer backend is running.' });
});

app.listen(PORT, () => {
  console.log(`Syfer backend running on http://localhost:${PORT}`);
});
