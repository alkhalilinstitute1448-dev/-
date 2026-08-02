const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../models/db');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../middleware/activity');
const router = express.Router();

const USER_COLUMNS = 'id, name, username, role, permissions, active, created_at';

router.get('/', verifyToken, requirePermission('users.view'), async (req, res) => {
  try {
    const { rows } = await query(`SELECT ${USER_COLUMNS} FROM users ORDER BY created_at DESC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', verifyToken, requirePermission('users.manage'), async (req, res) => {
  const { name, username, password, role, permissions } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ error: 'الاسم واسم المستخدم وكلمة المرور مطلوبة' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users (name, username, password_hash, role, permissions)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING ${USER_COLUMNS}`,
      [name, username, hash, role || 'user', JSON.stringify(permissions || [])]
    );
    await logActivity(req.user.id, 'أنشأ مستخدمًا', 'users', name);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (/duplicate key|unique/i.test(String(err.message))) {
      return res.status(400).json({ error: 'اسم المستخدم موجود مسبقًا' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', verifyToken, requirePermission('users.manage'), async (req, res) => {
  const { name, role, active } = req.body;
  try {
    await query('UPDATE users SET name = $1, role = $2, active = $3 WHERE id = $4', [
      name,
      role || 'user',
      active === false ? false : true,
      req.params.id,
    ]);
    await logActivity(req.user.id, 'عدّل مستخدمًا', 'users', name);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/permissions', verifyToken, requirePermission('users.manage'), async (req, res) => {
  const { permissions } = req.body;
  if (!Array.isArray(permissions)) return res.status(400).json({ error: 'الصلاحيات يجب أن تكون مصفوفة' });
  try {
    await query('UPDATE users SET permissions = $1::jsonb WHERE id = $2', [JSON.stringify(permissions), req.params.id]);
    await logActivity(req.user.id, 'عدّل صلاحيات مستخدم', 'users', req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/reset-password', verifyToken, requirePermission('users.manage'), async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'كلمة المرور مطلوبة' });
  try {
    const hash = await bcrypt.hash(password, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.params.id]);
    await logActivity(req.user.id, 'أعاد تعيين كلمة مرور', 'users', req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', verifyToken, requirePermission('users.manage'), async (req, res) => {
  try {
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    await logActivity(req.user.id, 'حذف مستخدمًا', 'users', req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
