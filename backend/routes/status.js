const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticate = require('../middleware/auth');

let cloudinary;
try { cloudinary = require('../cloudinary'); } catch(e) {}

router.post('/', async (req, res) => {
  const { user_id, image } = req.body;
  try {
    if (!user_id || !image) return res.status(400).json({ error: 'user_id and image required' });
    let imageUrl = image;
    if (image.startsWith('data:image') && cloudinary) {
      try {
        const uploaded = await cloudinary.uploader.upload(image, {
          folder: 'sync-app/statuses',
          resource_type: 'image'
        });
        imageUrl = uploaded.secure_url;
      } catch (err) {
        return res.status(500).json({ error: 'Image upload failed: ' + err.message });
      }
    }
    const result = await pool.query(
      "INSERT INTO statuses (user_id, image, expires_at) VALUES ($1, $2, NOW() + INTERVAL '24 hours') RETURNING *",
      [user_id, imageUrl]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      `SELECT s.id, s.image, s.created_at, u.username, u.id as user_id
       FROM statuses s JOIN users u ON u.id = s.user_id
       WHERE s.expires_at > NOW()
       AND (s.user_id = $1::int OR s.user_id IN (
         SELECT CASE WHEN c.user_id = $1::int THEN c.connected_user_id ELSE c.user_id END
         FROM connections c
         WHERE (c.user_id = $1::int OR c.connected_user_id = $1::int) AND c.status = 'accepted'
       ))
       ORDER BY s.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE status
router.delete('/:statusId', authenticate, async (req, res) => {
  const { statusId } = req.params;
  const user_id = req.userId;
  try {
    const result = await pool.query(
      'DELETE FROM statuses WHERE id = $1 AND user_id = $2 RETURNING id',
      [statusId, user_id]
    );
    if (result.rows.length === 0) return res.status(403).json({ error: 'Not authorized' });
    res.json({ message: 'Status deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;