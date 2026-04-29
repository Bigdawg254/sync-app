const express = require('express');
const router = express.Router();
const pool = require('../db');
const cloudinary = require('../cloudinary');

// POST new status
router.post('/', async (req, res) => {
  const { user_id, image } = req.body;
  try {
    let imageUrl = image;
    if (image && image.startsWith('data:image')) {
      const uploaded = await cloudinary.uploader.upload(image, {
        folder: 'sync-app/statuses'
      });
      imageUrl = uploaded.secure_url;
    }

    const result = await pool.query(
      'INSERT INTO statuses (user_id, image, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'24 hours\') RETURNING *',
      [user_id, imageUrl]
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
      `SELECT s.id, s.image, s.created_at, u.username, u.id as user_id
       FROM statuses s
       JOIN users u ON u.id = s.user_id
       WHERE s.expires_at > NOW()
       AND (
         s.user_id = $1
         OR s.user_id IN (
           SELECT CASE 
             WHEN c.user_id = $1 THEN c.connected_user_id
             ELSE c.user_id
           END
           FROM connections c
           WHERE (c.user_id = $1 OR c.connected_user_id = $1)
           AND c.status = 'accepted'
         )
       )
       ORDER BY s.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;