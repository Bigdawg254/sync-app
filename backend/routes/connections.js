const express = require('express');
const router = express.Router();
const pool = require('../db');

// SEND friend request
router.post('/request', async (req, res) => {
  const { user_id, connected_user_id } = req.body;
  try {
    const existing = await pool.query(
      'SELECT * FROM connections WHERE user_id = $1 AND connected_user_id = $2',
      [user_id, connected_user_id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Request already sent' });
    }
    const result = await pool.query(
      'INSERT INTO connections (user_id, connected_user_id, status) VALUES ($1, $2, $3) RETURNING *',
      [user_id, connected_user_id, 'pending']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET friend requests for a user
router.get('/requests/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      `SELECT c.id, c.status, u.username, u.age, u.bio 
       FROM connections c 
       JOIN users u ON u.id = c.user_id 
       WHERE c.connected_user_id = $1 AND c.status = 'pending'`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ACCEPT friend request
router.post('/accept', async (req, res) => {
  const { connection_id } = req.body;
  try {
    const result = await pool.query(
      'UPDATE connections SET status = $1 WHERE id = $2 RETURNING *',
      ['accepted', connection_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET accepted friends for a user
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.age, u.bio, u.profile_picture
       FROM connections c
       JOIN users u ON (u.id = c.connected_user_id OR u.id = c.user_id)
       WHERE (c.user_id = $1 OR c.connected_user_id = $1)
       AND c.status = 'accepted'
       AND u.id != $1`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;