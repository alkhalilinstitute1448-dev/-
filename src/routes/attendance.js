const express = require('express');
const { query } = require('../models/db');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../middleware/activity');
const router = express.Router();

router.get('/', verifyToken, requirePermission('attendance.view'), async (req, res) => {
  const { date } = req.query;
  let sql = `
    SELECT a.id, a.date, a.check_in, a.check_out, a.status, a.notes, a.user_id, u.name AS user_name
    FROM attendance a JOIN users u ON u.id = a.user_id
  `;
  const params = [];
  if (date) {
    sql += ' WHERE a.date = $1';
    params.push(date);
  }
  sql += ' ORDER BY a.date DESC, a.check_in DESC';
  try {
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', verifyToken, requirePermission('attendance.view'), async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const { rows } = await query(
      'SELECT id, date, check_in, check_out, status, notes FROM attendance WHERE user_id=$1 AND date=$2',
      [req.user.id, today]
    );
    res.json({ today: rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/check-in', verifyToken, requirePermission('attendance.manage'), async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString().slice(11, 19);
  try {
    const existing = await query('SELECT id FROM attendance WHERE user_id=$1 AND date=$2', [req.user.id, today]);
    if (existing.rows.length) return res.status(400).json({ error: 'تم تسجيل الحضور اليوم مسبقًا' });
    const { rows } = await query(
      'INSERT INTO attendance (user_id, date, check_in) VALUES ($1,$2,$3) RETURNING id',
      [req.user.id, today, now]
    );
    await logActivity(req.user.id, 'سجّل حضورًا', 'attendance', today);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/check-out', verifyToken, requirePermission('attendance.manage'), async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString().slice(11, 19);
  try {
    const existing = await query(
      'SELECT id, check_out FROM attendance WHERE user_id=$1 AND date=$2',
      [req.user.id, today]
    );
    if (!existing.rows.length) return res.status(400).json({ error: 'لم يتم تسجيل الحضور اليوم' });
    if (existing.rows[0].check_out) return res.status(400).json({ error: 'تم تسجيل الانصراف اليوم مسبقًا' });
    await query('UPDATE attendance SET check_out=$1 WHERE id=$2', [now, existing.rows[0].id]);
    await logActivity(req.user.id, 'سجّل انصرافًا', 'attendance', today);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/status', verifyToken, requirePermission('attendance.manage'), async (req, res) => {
  const { status, notes } = req.body;
  try {
    await query('UPDATE attendance SET status=$1, notes=$2 WHERE id=$3', [status || 'present', notes || '', req.params.id]);
    await logActivity(req.user.id, 'عدّل حالة حضور', 'attendance', status);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
