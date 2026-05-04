const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticate = require('../middleware/auth');

// Create group
router.post('/create', authenticate, async (req, res) => {
  const { name } = req.body;
  const creator_id = req.userId;
  try {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const group = await pool.query(
      'INSERT INTO groups (name, code, creator_id) VALUES ($1, $2, $3) RETURNING *',
      [name, code, creator_id]
    );
    await pool.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
      [group.rows[0].id, creator_id]
    );
    res.json(group.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Join group by code
router.post('/join', authenticate, async (req, res) => {
  const { code } = req.body;
  const user_id = req.userId;
  try {
    const group = await pool.query('SELECT * FROM groups WHERE code = $1', [code]);
    if (group.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
    
    const existing = await pool.query(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
      [group.rows[0].id, user_id]
    );
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Already a member' });
    
    await pool.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
      [group.rows[0].id, user_id]
    );
    res.json(group.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get my groups
router.get('/my', authenticate, async (req, res) => {
  const user_id = req.userId;
  try {
    const result = await pool.query(
      `SELECT g.*, COUNT(gm.user_id) as member_count
       FROM groups g
       JOIN group_members gm ON gm.group_id = g.id
       WHERE g.id IN (SELECT group_id FROM group_members WHERE user_id = $1)
       GROUP BY g.id
       ORDER BY g.created_at DESC`,
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get group messages
router.get('/:groupId/messages', authenticate, async (req, res) => {
  const { groupId } = req.params;
  try {
    const result = await pool.query(
      `SELECT gm.*, u.username FROM group_messages gm
       JOIN users u ON u.id = gm.sender_id
       WHERE gm.group_id = $1
       ORDER BY gm.sent_at ASC`,
      [groupId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save group message
router.post('/:groupId/messages', authenticate, async (req, res) => {
  const { groupId } = req.params;
  const { content } = req.body;
  const sender_id = req.userId;
  try {
    const result = await pool.query(
      'INSERT INTO group_messages (group_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *',
      [groupId, sender_id, content]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete group
router.delete('/:groupId', authenticate, async (req, res) => {
  const { groupId } = req.params;
  const user_id = req.userId;
  try {
    const group = await pool.query('SELECT * FROM groups WHERE id = $1 AND creator_id = $2', [groupId, user_id]);
    if (group.rows.length === 0) return res.status(403).json({ error: 'Not authorized' });
    await pool.query('DELETE FROM groups WHERE id = $1', [groupId]);
    res.json({ message: 'Group deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Leave group
router.post('/:groupId/leave', authenticate, async (req, res) => {
  const { groupId } = req.params;
  const user_id = req.userId;
  try {
    await pool.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, user_id]);
    res.json({ message: 'Left group' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;