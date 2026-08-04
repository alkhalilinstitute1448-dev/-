const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../models/db');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../middleware/activity');
const { pickProfile, validateProfile } = require('../utils/profile');
const router = express.Router();

const USER_COLUMNS =
  'id, name, username, role, permissions, active, created_at, joined_at, photo, dob, gender, ' +
  'first_name, nickname, father_name, father_status, father_job, mother_name, mother_status, mother_job, phone, admin_notes';

router.get('/', verifyToken, requirePermission('users.view'), async (req, res) => {
  try {
    const { rows } = await query(`SELECT ${USER_COLUMNS} FROM users ORDER BY created_at DESC`);
    if (req.user.role !== 'admin') {
      for (const r of rows) delete r.admin_notes;
    }
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
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'كلمة المرور يجب ألا تقل عن ٦ أحرف' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const profile = pickProfile(req.body);
    const errMsg = validateProfile(req.body);
    if (errMsg) return res.status(400).json({ error: errMsg });
    const photo = profile.photo !== undefined && profile.photo !== '' ? profile.photo : null;
    const { rows } = await query(
      `INSERT INTO users (name, username, password_hash, role, permissions, photo, joined_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
       RETURNING ${USER_COLUMNS}`,
      [name, username, hash, role || 'user', JSON.stringify(permissions || []), photo, new Date().toISOString()]
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
  const { name, role, active, joined_at, admin_notes } = req.body;
  const profile = pickProfile(req.body);
  const errMsg = validateProfile(req.body);
  if (errMsg) return res.status(400).json({ error: errMsg });
  try {
    const sets = [];
    const values = [];
    const add = (col, val) => {
      sets.push(`${col} = $${sets.length + 1}`);
      values.push(val);
    };
    if (name !== undefined) add('name', name);
    if (role !== undefined) add('role', role);
    if (active !== undefined) add('active', active === false ? false : true);
    if (joined_at !== undefined) add('joined_at', joined_at || null);
    if (req.user.role === 'admin' && admin_notes !== undefined) add('admin_notes', admin_notes || null);
    if (profile.first_name !== undefined || profile.nickname !== undefined) {
      const { rows: cur } = await query('SELECT first_name, nickname FROM users WHERE id = $1', [req.params.id]);
      const base = cur[0] || {};
      const first = profile.first_name !== undefined ? String(profile.first_name).trim() : (base.first_name || '');
      const nick = profile.nickname !== undefined ? String(profile.nickname).trim() : (base.nickname || '');
      add('name', `${first} ${nick}`.trim());
    }
    for (const [k, v] of Object.entries(profile)) {
      add(k, v === '' && ['dob', 'photo', 'gender'].includes(k) ? null : v);
    }
    if (sets.length) {
      await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${sets.length + 1}`, [...values, req.params.id]);
    }
    await logActivity(req.user.id, 'عدّل مستخدمًا', 'users', name || req.params.id);
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
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'كلمة المرور يجب ألا تقل عن ٦ أحرف' });
  }
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
  if (String(req.params.id) === String(req.user.id)) {
    return res.status(400).json({ error: 'لا يمكنك حذف حسابك الحالي' });
  }
  try {
    const { rows } = await query('SELECT role FROM users WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'المستخدم غير موجود' });
    if (rows[0].role === 'admin') {
      const { rows: admins } = await query("SELECT COUNT(*)::int AS c FROM users WHERE role = 'admin' AND active = TRUE");
      if (admins[0].c <= 1) return res.status(400).json({ error: 'لا يمكن حذف آخر مدير في النظام' });
    }
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    await logActivity(req.user.id, 'حذف مستخدمًا', 'users', req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
