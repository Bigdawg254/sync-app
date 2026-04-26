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

    // Get sender username
    const sender = await pool.query('SELECT username FROM users WHERE id = $1', [user_id]);

    // Create notification for receiver
    await pool.query(
      'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
      [connected_user_id, `${sender.rows[0].username} sent you a friend request!`]
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

    // Get receiver username
    const connection = result.rows[0];
    const receiver = await pool.query('SELECT username FROM users WHERE id = $1', [connection.connected_user_id]);

    // Notify sender that request was accepted
    await pool.query(
      'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
      [connection.user_id, `${receiver.rows[0].username} accepted your friend request!`]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET notifications for a user
router.get('/notifications/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MARK notifications as read
router.put('/notifications/:userId/read', async (req, res) => {
  const { userId } = req.params;
  try {
    await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId]);
    res.json({ message: 'Notifications marked as read' });
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