const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// SIGNUP
router.post('/signup', async (req, res) => {
  const { username, email, password, age } = req.body;
  try {
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password required' });
    }
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const ageValue = age && !isNaN(parseInt(age)) ? parseInt(age) : null;
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, age) VALUES ($1, $2, $3, $4) RETURNING id, username, email',
      [username.trim(), email.trim().toLowerCase(), hashedPassword, ageValue]
    );
    const token = jwt.sign({ id: result.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }
    const valid = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Wrong password' });
    }
    const token = jwt.sign({ id: result.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RESET PASSWORD REQUEST
router.post('/reset-password', async (req, res) => {
  const { email } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Email not found' });
    }
    res.json({ message: 'If this email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE ACCOUNT
router.delete('/delete/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    await pool.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM statuses WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [userId]);
    await pool.query('DELETE FROM connections WHERE user_id = $1 OR connected_user_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;