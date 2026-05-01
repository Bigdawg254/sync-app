const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const pool = require('../db');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

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

router.post('/reset-password', async (req, res) => {
  const { email } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Email not found' });
    }
    const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    await transporter.sendMail({
      from: `"Sync App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset Your Sync Password',
      html: `
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px; background: #0f0f0f; color: #fff;">
          <h1 style="color: #6c63ff;">Reset Your Password</h1>
          <p>You requested a password reset for your Sync account.</p>
          <p>Your reset token is:</p>
          <p style="background: #1e1e1e; padding: 16px; border-radius: 8px; font-size: 24px; font-weight: bold; color: #6c63ff; letter-spacing: 4px;">${resetToken.slice(-8).toUpperCase()}</p>
          <p>This token expires in 1 hour.</p>
          <p>If you didn't request this, ignore this email.</p>
        </div>
      `
    });
    res.json({ message: 'Password reset email sent!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// DELETE ALL USERS - for admin reset
router.delete('/delete-all', async (req, res) => {
  const { secret } = req.body;
  if (secret !== 'SYNC_ADMIN_2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    await pool.query('DELETE FROM notifications');
    await pool.query('DELETE FROM statuses');
    await pool.query('DELETE FROM messages');
    await pool.query('DELETE FROM connections');
    await pool.query('DELETE FROM users');
    res.json({ message: 'All users deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;