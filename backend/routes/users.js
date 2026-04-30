const express = require('express');
const router = express.Router();
const pool = require('../db');
const cloudinary = require('../cloudinary');
const authenticate = require('../middleware/auth');

// GET all users
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, age, bio, profile_picture FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single user
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT id, username, email, age, bio, gender, profile_picture FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE user profile
router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { username, bio, age, gender, profile_picture } = req.body;
  try {
    let pictureUrl = null;

    if (profile_picture && typeof profile_picture === 'string' && profile_picture.startsWith('data:image')) {
      try {
        const uploaded = await cloudinary.uploader.upload(profile_picture, {
          folder: 'sync-app/profiles',
          transformation: [{ width: 400, height: 400, crop: 'fill' }]
        });
        pictureUrl = uploaded.secure_url;
      } catch (uploadErr) {
        console.error('Cloudinary upload error:', uploadErr.message);
      }
    }

    const ageValue = (age !== null && age !== undefined && age !== '' && !isNaN(parseInt(age))) 
      ? parseInt(age) 
      : null;

    const result = await pool.query(
      `UPDATE users SET 
        username = COALESCE(NULLIF($1, ''), username),
        bio = $2,
        age = $3,
        gender = $4,
        profile_picture = COALESCE($5, profile_picture)
       WHERE id = $6
       RETURNING id, username, bio, age, gender, profile_picture, email`,
      [username || null, bio || null, ageValue, gender || null, pictureUrl, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;