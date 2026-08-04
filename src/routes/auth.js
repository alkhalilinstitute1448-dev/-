const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../models/db');
const { generateToken, verifyToken } = require('../middleware/auth');
const { logActivity } = require('../middleware/activity');
const { pickProfile, validateProfile } = require('../utils/profile');
const router = express.Router();

const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const attempts = new Map();

function pruneAttempts() {
  const now = Date.now();
  for (const [key, list] of attempts) {
    const fresh = list.filter((t) => now - t < LOGIN_WINDOW_MS);
    if (fresh.length) attempts.set(key, fresh);
    else attempts.delete(key);
  }
}

setInterval(pruneAttempts, LOGIN_WINDOW_MS).unref();

function publicUser(user) {
  const copy = { ...user };
  delete copy.password_hash;
  if (copy.role !== 'admin') delete copy.admin_notes;
  return copy;
}

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
  }
  const key = `${req.ip}|${String(username).toLowerCase()}`;
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter((t) => now - t < LOGIN_WINDOW_MS);
  if (recent.length >= LOGIN_MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'محاولات كثيرة جدًا — حاول بعد ١٠ دقائق' });
  }
  try {
    const { rows } = await query('SELECT * FROM users WHERE username = $1', [username]);
    if (!rows.length) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    const user = rows[0];
    if (user.active === false) return res.status(403).json({ error: 'الحساب معطل' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      attempts.set(key, [...recent, now]);
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }
    attempts.delete(key);
    const token = generateToken(user);
    await logActivity(user.id, 'تسجيل دخول', 'auth', user.name);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', verifyToken, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.put('/profile', verifyToken, async (req, res) => {
  const profile = pickProfile(req.body);
  if (Object.keys(profile).length === 0) {
    return res.status(400).json({ error: 'لا توجد بيانات لتحديثها' });
  }
  const errMsg = validateProfile(req.body);
  if (errMsg) return res.status(400).json({ error: errMsg });
  try {
    const sets = [];
    const values = [];
    const add = (col, val) => {
      sets.push(`${col} = $${sets.length + 1}`);
      values.push(val);
    };
    if (profile.first_name !== undefined || profile.nickname !== undefined) {
      const first = profile.first_name !== undefined ? String(profile.first_name).trim() : (req.user.first_name || '');
      const nick = profile.nickname !== undefined ? String(profile.nickname).trim() : (req.user.nickname || '');
      add('name', `${first} ${nick}`.trim());
    }
    for (const [k, v] of Object.entries(profile)) {
      add(k, v === '' && ['dob', 'photo', 'gender'].includes(k) ? null : v);
    }
    await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${sets.length + 1}`, [...values, req.user.id]);
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];
    await logActivity(req.user.id, 'حدّث بياناته الشخصية', 'profile', user.name);
    res.json({ user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/password', verifyToken, async (req, res) => {
  const { current, newPassword } = req.body;
  if (!current || !newPassword) return res.status(400).json({ error: 'كلمة المرور الحالية والجديدة مطلوبتان' });
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'كلمة المرور الجديدة يجب ألا تقل عن ٦ أحرف' });
  }
  try {
    const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const ok = await bcrypt.compare(current, rows[0].password_hash);
    if (!ok) return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    const hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2', [hash, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
