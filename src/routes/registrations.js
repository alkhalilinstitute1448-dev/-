const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../models/db');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../middleware/activity');
const { generateUniqueUsername } = require('../utils/username');
const { generateStrongPassword } = require('../utils/password');

const router = express.Router();

const DEFAULT_MEMBER_PERMISSIONS = [
  'dashboard.view',
  'attendance.view',
  'attendance.manage',
  'tasks.view',
  'tasks.manage',
  'lessons.view',
  'lessons.manage',
  'captions.view',
  'captions.manage',
  'reports.view',
  'archive.view',
  'assistant.view',
];

const REQUIRED_FIELDS = [
  'first_name',
  'nickname',
  'father_name',
  'mother_name',
  'father_status',
  'father_job',
  'mother_status',
  'mother_job',
  'phone',
  'photo',
];

function normalizePhone(raw) {
  let p = String(raw || '').replace(/[^\d+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('0')) p = `963${p.slice(1)}`;
  return p;
}

function validPhone(raw) {
  const p = String(raw || '').replace(/[^\d+]/g, '');
  return /^\+?\d{8,15}$/.test(p);
}

function validateSubmission(body) {
  for (const key of REQUIRED_FIELDS) {
    if (body[key] === undefined || body[key] === null || String(body[key]).trim() === '') {
      return 'جميع الحقول المطلوبة يجب تعبئتها';
    }
  }
  if (!['alive', 'deceased'].includes(body.father_status)) return 'حالة الأب غير صحيحة';
  if (!['alive', 'deceased'].includes(body.mother_status)) return 'حالة الأم غير صحيحة';
  if (!validPhone(body.phone)) return 'رقم الهاتف غير صحيح';
  if (!/^data:image\/(png|jpe?g|webp);base64,/.test(body.photo)) return 'الصورة الشخصية غير صحيحة';
  if (String(body.photo).length > 8 * 1024 * 1024) return 'الصورة كبيرة جدًا';
  return null;
}

async function getActiveLink(token) {
  if (!token || typeof token !== 'string') return null;
  const { rows } = await query('SELECT token FROM registration_links WHERE token = $1 AND active = TRUE', [token]);
  return rows[0] || null;
}

router.post('/validate-link', async (req, res) => {
  try {
    const link = await getActiveLink(req.body.token);
    if (!link) return res.status(404).json({ error: 'رابط التسجيل غير صالح أو ملغي' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { token, ...body } = req.body;
  try {
    const link = await getActiveLink(token);
    if (!link) return res.status(404).json({ error: 'رابط التسجيل غير صالح أو ملغي' });
    const errMsg = validateSubmission(body);
    if (errMsg) return res.status(400).json({ error: errMsg });
    const phone = normalizePhone(body.phone);
    const dup = await query("SELECT id FROM registration_requests WHERE phone = $1 AND status != 'rejected'", [phone]);
    if (dup.rows.length) return res.status(400).json({ error: 'رقم الهاتف مسجّل مسبقًا' });
    await query(
      `INSERT INTO registration_requests
        (link_token, first_name, nickname, father_name, mother_name,
         father_status, father_job, mother_status, mother_job, phone, photo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        token,
        String(body.first_name).trim(),
        String(body.nickname).trim(),
        String(body.father_name).trim(),
        String(body.mother_name).trim(),
        body.father_status,
        String(body.father_job).trim(),
        body.mother_status,
        String(body.mother_job).trim(),
        phone,
        body.photo,
      ]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/requests', verifyToken, requirePermission('registrations.view'), async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM registration_requests ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/approve', verifyToken, requirePermission('registrations.manage'), async (req, res) => {
  const id = req.params.id;
  try {
    const { rows } = await query("SELECT * FROM registration_requests WHERE id = $1 AND status = 'pending'", [id]);
    if (!rows.length) return res.status(404).json({ error: 'الطلب غير موجود أو تمت معالجته' });
    const pending = rows[0];
    const fullName = `${pending.first_name} ${pending.nickname}`.trim();
    const username = await generateUniqueUsername(pending.first_name, pending.nickname);
    const password = generateStrongPassword();
    const hash = await bcrypt.hash(password, 10);
    const inserted = await query(
      `INSERT INTO users (name, username, password_hash, role, permissions, must_change_password)
       VALUES ($1,$2,$3,$4,$5, TRUE)
       RETURNING id, name, username`,
      [fullName, username, hash, 'user', JSON.stringify(DEFAULT_MEMBER_PERMISSIONS)]
    );
    await query("UPDATE registration_requests SET status='approved', username=$1, approved_by=$2 WHERE id=$3", [
      username,
      req.user.id,
      id,
    ]);
    await logActivity(req.user.id, 'قبل طلب تسجيل', 'registrations', `${fullName} → ${username}`);
    const { photo, ...requestSummary } = pending;
    res.json({
      ok: true,
      request: { ...requestSummary, status: 'approved', username },
      username,
      password,
      fullName,
      phone: pending.phone,
      user_id: inserted.rows[0]?.id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/reject', verifyToken, requirePermission('registrations.manage'), async (req, res) => {
  try {
    const { rows } = await query("SELECT first_name, nickname FROM registration_requests WHERE id = $1 AND status = 'pending'", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'الطلب غير موجود أو تمت معالجته' });
    await query("UPDATE registration_requests SET status='rejected' WHERE id=$1", [req.params.id]);
    await logActivity(req.user.id, 'رفض طلب تسجيل', 'registrations', `${rows[0].first_name} ${rows[0].nickname}`.trim());
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/links', verifyToken, requirePermission('registrations.manage'), async (req, res) => {
  try {
    const token = crypto.randomBytes(24).toString('base64url');
    await query('UPDATE registration_links SET active = FALSE WHERE active = TRUE');
    await query('INSERT INTO registration_links (token, created_by) VALUES ($1,$2)', [token, req.user.id]);
    await logActivity(req.user.id, 'أنشأ رابط تسجيل', 'registrations', token.slice(0, 8));
    res.status(201).json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/links', verifyToken, requirePermission('registrations.view'), async (req, res) => {
  try {
    const { rows } = await query('SELECT token, active, created_at FROM registration_links ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/links/active', verifyToken, requirePermission('registrations.view'), async (req, res) => {
  try {
    const { rows } = await query('SELECT token, created_at FROM registration_links WHERE active = TRUE ORDER BY created_at DESC LIMIT 1');
    res.json({ link: rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/links/:token', verifyToken, requirePermission('registrations.manage'), async (req, res) => {
  try {
    await query('UPDATE registration_links SET active = FALSE WHERE token = $1', [req.params.token]);
    await logActivity(req.user.id, 'ألغى رابط تسجيل', 'registrations', req.params.token.slice(0, 8));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
