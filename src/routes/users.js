const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../models/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  let sql = "SELECT id, username, role, device_id, is_active, created_at FROM users";
  const params = [];
  const conditions = [];

  if (req.query.role) {
    conditions.push(`role = $${params.length + 1}`);
    params.push(req.query.role);
  }

  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY created_at DESC';

  const result = await query(sql, params);
  const users = result.rows.map(row => ({
    id: row.id, username: row.username, role: row.role,
    deviceId: row.device_id, isActive: row.is_active, createdAt: row.created_at
  }));
  res.json(users);
});

router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const hash = bcrypt.hashSync(password, 10);
  try {
    await query("INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)", [username, hash, role]);
    res.json({ message: 'User created' });
  } catch {
    res.status(400).json({ error: 'Username already exists' });
  }
});

router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const { username, role, isActive, password } = req.body;
  const updates = [];
  const params = [];
  if (username) { updates.push(`username = $${params.length + 1}`); params.push(username); }
  if (role) { updates.push(`role = $${params.length + 1}`); params.push(role); }
  if (isActive !== undefined) { updates.push(`is_active = $${params.length + 1}`); params.push(isActive); }
  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    updates.push(`password_hash = $${params.length + 1}`);
    params.push(hash);
  }
  updates.push('updated_at = NOW()');
  params.push(req.params.id);
  await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
  res.json({ message: 'User updated' });
});

router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  await query("DELETE FROM users WHERE id = $1 AND role != 'admin'", [req.params.id]);
  res.json({ message: 'User deleted' });
});

router.post('/:id/unlock', verifyToken, requireRole('admin'), async (req, res) => {
  await query("UPDATE users SET device_id = NULL WHERE id = $1", [req.params.id]);
  res.json({ message: 'Device unlocked' });
});

module.exports = router;
