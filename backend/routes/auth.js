const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const nodemailer = require('nodemailer');

const getTransporter = () => nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: { rejectUnauthorized: false }
});

router.post('/signup', async (req, res) => {
  const { username, email, password, age } = req.body;
  try {
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password required' });
    }
    const existing = await pool.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email.toLowerCase(), username]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email or username already taken' });
    }
    const hash = await bcrypt.hash(password, 12);
    const ageVal = age && !isNaN(parseInt(age)) ? parseInt(age) : null;
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, age) VALUES ($1, $2, $3, $4) RETURNING id, username, email',
      [username.trim(), email.trim().toLowerCase(), hash, ageVal]
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
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'No account found with this email' });
    const valid = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Wrong password' });
    const token = jwt.sign({ id: result.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) return res.status(400).json({ error: 'Email required' });
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'No account found with this email' });
    
    const user = result.rows[0];
    const resetToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const newPassword = Math.random().toString(36).slice(-8);
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user.id]);

    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"Sync App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Your Sync Password Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #02020a; color: #fff; padding: 40px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="width: 80px; height: 80px; background: #6c63ff; border-radius: 24px; display: inline-flex; align-items: center; justify-content: center; font-size: 40px; font-weight: bold; font-style: italic;">S</div>
            <h1 style="color: #fff; letter-spacing: 8px; font-weight: 300; margin-top: 16px;">sync</h1>
          </div>
          <h2 style="color: #6c63ff;">Password Reset</h2>
          <p style="color: #888;">Hi ${user.username},</p>
          <p style="color: #888;">Your password has been reset. Use this temporary password to login:</p>
          <div style="background: #111; border: 1px solid #6c63ff; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
            <p style="color: #6c63ff; font-size: 28px; font-weight: bold; letter-spacing: 4px; margin: 0;">${newPassword}</p>
          </div>
          <p style="color: #888;">Please change your password after logging in.</p>
          <p style="color: #555; font-size: 12px;">If you didn't request this, contact us immediately.</p>
        </div>
      `
    });
    res.json({ message: 'Password reset email sent! Check your inbox.' });
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ error: 'Failed to send email. Check EMAIL_USER and EMAIL_PASS in Railway Variables.' });
  }
});

router.delete('/delete/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    await pool.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM statuses WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM group_messages WHERE sender_id = $1', [userId]);
    await pool.query('DELETE FROM group_members WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [userId]);
    await pool.query('DELETE FROM connections WHERE user_id = $1 OR connected_user_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset-all', async (req, res) => {
  const { secret } = req.body;
  if (secret !== 'SYNC_ADMIN_2026') return res.status(403).json({ error: 'Forbidden' });
  try {
    await pool.query('TRUNCATE notifications, statuses, group_messages, group_members, groups, messages, connections, users RESTART IDENTITY CASCADE');
    res.json({ message: 'All data cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;