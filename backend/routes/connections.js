const express = require('express');
const router = express.Router();
const pool = require('../db');

// SEND friend request
router.post('/request', async (req, res) => {
  const { user_id, connected_user_id } = req.body;
  try {
    if (!user_id || !connected_user_id) {
      return res.status(400).json({ error: 'user_id and connected_user_id required' });
    }

    const existing = await pool.query(
      'SELECT * FROM connections WHERE (user_id = $1 AND connected_user_id = $2) OR (user_id = $2 AND connected_user_id = $1)',
      [user_id, connected_user_id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Request already exists' });
    }

    const result = await pool.query(
      'INSERT INTO connections (user_id, connected_user_id, status) VALUES ($1, $2, $3) RETURNING *',
      [user_id, connected_user_id, 'pending']
    );

    const sender = await pool.query('SELECT username FROM users WHERE id = $1', [user_id]);
    if (sender.rows.length > 0) {
      await pool.query(
        'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
        [connected_user_id, `${sender.rows[0].username} sent you a friend request! Check your notifications.`]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET pending requests
router.get('/requests/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      `SELECT c.id, c.status, u.username, u.age, u.bio, u.profile_picture
       FROM connections c 
       JOIN users u ON u.id = c.user_id 
       WHERE c.connected_user_id = $1 AND c.status = 'pending'
       ORDER BY c.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ACCEPT request
router.post('/accept', async (req, res) => {
  const { connection_id } = req.body;
  try {
    const result = await pool.query(
      'UPDATE connections SET status = $1 WHERE id = $2 RETURNING *',
      ['accepted', connection_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const connection = result.rows[0];
    const receiver = await pool.query('SELECT username FROM users WHERE id = $1', [connection.connected_user_id]);

    if (receiver.rows.length > 0) {
      await pool.query(
        'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
        [connection.user_id, `${receiver.rows[0].username} accepted your friend request!`]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET notifications
router.get('/notifications/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MARK read
router.put('/notifications/:userId/read', async (req, res) => {
  const { userId } = req.params;
  try {
    await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET accepted friends
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      `SELECT DISTINCT u.id, u.username, u.age, u.bio, u.profile_picture
       FROM connections c
       JOIN users u ON (
         CASE 
           WHEN c.user_id = $1::int THEN u.id = c.connected_user_id
           ELSE u.id = c.user_id
         END
       )
       WHERE (c.user_id = $1::int OR c.connected_user_id = $1::int)
       AND c.status = 'accepted'
       ORDER BY u.username`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;