const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST new status
router.post('/', async (req, res) => {
  const { user_id, image } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO statuses (user_id, image, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'24 hours\') RETURNING *',
      [user_id, image]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET statuses of friends
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      `SELECT s.id, s.image, s.created_at, u.username 
       FROM statuses s
       JOIN users u ON u.id = s.user_id
       JOIN connections c ON (c.user_id = $1 OR c.connected_user_id = $1)
       WHERE (s.user_id = c.user_id OR s.user_id = c.connected_user_id)
       AND c.status = 'accepted'
       AND s.expires_at > NOW()
       AND s.user_id != $1`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;