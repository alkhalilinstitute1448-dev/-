const express = require('express');
const { query } = require('../models/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  let sql = `SELECT a.id, a.student_id, a.date, a.status, a.notes, a.created_at, s.full_name
    FROM attendance a JOIN students s ON s.id = a.student_id`;
  const params = [];
  const conditions = [];

  if (req.user.role === 'student') {
    const sResult = await query("SELECT id FROM students WHERE user_id = $1", [req.user.id]);
    if (sResult.rows.length > 0) {
      conditions.push(`a.student_id = $${params.length + 1}`);
      params.push(sResult.rows[0].id);
    }
  }

  if (req.query.student_id) {
    conditions.push(`a.student_id = $${params.length + 1}`);
    params.push(req.query.student_id);
  }
  if (req.query.date) {
    conditions.push(`a.date = $${params.length + 1}`);
    params.push(req.query.date);
  }
  if (req.query.from) {
    conditions.push(`a.date >= $${params.length + 1}`);
    params.push(req.query.from);
  }
  if (req.query.to) {
    conditions.push(`a.date <= $${params.length + 1}`);
    params.push(req.query.to);
  }

  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY a.date DESC, s.full_name';

  const result = await query(sql, params);
  const records = result.rows.map(row => ({
    id: row.id, studentId: row.student_id, date: row.date, status: row.status,
    notes: row.notes, createdAt: row.created_at, studentName: row.full_name
  }));
  res.json(records);
});

router.post('/', verifyToken, requireRole('admin', 'attendance_officer'), async (req, res) => {
  const { studentId, date, status, notes } = req.body;
  if (!studentId || !date || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const existing = await query("SELECT id FROM attendance WHERE student_id = $1 AND date = $2", [studentId, date]);
  if (existing.rows.length > 0) {
    await query("UPDATE attendance SET status = $1, notes = $2, recorded_by = $3 WHERE id = $4",
      [status, notes || null, req.user.id, existing.rows[0].id]);
  } else {
    await query("INSERT INTO attendance (student_id, date, status, notes, recorded_by) VALUES ($1, $2, $3, $4, $5)",
      [studentId, date, status, notes || null, req.user.id]);
  }
  res.json({ message: 'Attendance recorded' });
});

router.post('/batch', verifyToken, requireRole('admin', 'attendance_officer'), async (req, res) => {
  const { date, records } = req.body;
  if (!date || !records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Invalid data' });
  }
  for (const r of records) {
    const existing = await query("SELECT id FROM attendance WHERE student_id = $1 AND date = $2", [r.studentId, date]);
    if (existing.rows.length > 0) {
      await query("UPDATE attendance SET status = $1, notes = $2, recorded_by = $3 WHERE id = $4",
        [r.status, r.notes || null, req.user.id, existing.rows[0].id]);
    } else {
      await query("INSERT INTO attendance (student_id, date, status, notes, recorded_by) VALUES ($1, $2, $3, $4, $5)",
        [r.studentId, date, r.status, r.notes || null, req.user.id]);
    }
  }
  res.json({ message: `Attendance recorded for ${records.length} students` });
});

router.put('/:id', verifyToken, requireRole('admin', 'attendance_officer'), async (req, res) => {
  const { status, notes } = req.body;
  await query("UPDATE attendance SET status=$1, notes=$2 WHERE id=$3", [status, notes, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  await query("DELETE FROM attendance WHERE id=$1", [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
