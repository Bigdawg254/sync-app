const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// SIGNUP
router.post('/signup', async (req, res) => {
  const { username, email, password, age } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, age) VALUES ($1, $2, $3, $4) RETURNING id, username, email',
      [username, email, hashedPassword, age]
    );
    const token = jwt.sign({ id: result.rows[0].id }, process.env.JWT_SECRET);
    res.json({ token, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'User not found' });
    const valid = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Wrong password' });
    const token = jwt.sign({ id: result.rows[0].id }, process.env.JWT_SECRET);
    res.json({ token, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RESET PASSWORD
router.post('/reset-password', async (req, res) => {
  const { email } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Email not found' });
    }
    res.json({ message: 'Password reset link sent to your email' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;