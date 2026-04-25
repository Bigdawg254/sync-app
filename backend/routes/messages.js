const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET messages between two users
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const { senderId } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM messages 
       WHERE (sender_id = $1 AND receiver_id = $2) 
       OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY sent_at ASC`,
      [senderId, userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SEND a message
router.post('/', async (req, res) => {
  const { sender_id, receiver_id, content } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *',
      [sender_id, receiver_id, content]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;