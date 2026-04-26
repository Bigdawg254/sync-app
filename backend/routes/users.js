const express = require('express');
const router = express.Router();
const pool = require('../db');
const cloudinary = require('../cloudinary');

// GET all users
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, age, bio FROM users'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single user by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT id, username, email, age, bio, gender, profile_picture FROM users WHERE id = $1',
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE user profile
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { username, bio, age, gender, profile_picture } = req.body;
  try {
    let pictureUrl = null;
    if (profile_picture && profile_picture.startsWith('data:image')) {
      const uploaded = await cloudinary.uploader.upload(profile_picture, {
        folder: 'sync-app/profiles'
      });
      pictureUrl = uploaded.secure_url;
    }

    const result = await pool.query(
      `UPDATE users SET 
        username=$1, 
        bio=$2, 
        age=$3, 
        gender=$4,
        profile_picture=COALESCE($5, profile_picture)
       WHERE id=$6 
       RETURNING id, username, bio, age, gender, profile_picture`,
      [username, bio, age, gender, pictureUrl, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;