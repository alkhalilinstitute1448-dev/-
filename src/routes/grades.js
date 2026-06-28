const express = require('express');
const { query } = require('../models/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/:studentId', verifyToken, async (req, res) => {
  const result = await query("SELECT subject, grade, term, created_at FROM grades WHERE student_id = $1 ORDER BY term, subject",
    [req.params.studentId]);
  const grades = result.rows.map(row => ({
    subject: row.subject, grade: row.grade, term: row.term, createdAt: row.created_at
  }));
  res.json(grades);
});

router.post('/', verifyToken, requireRole('admin', 'teacher'), async (req, res) => {
  const { studentId, subject, grade, term } = req.body;
  await query("INSERT INTO grades (student_id, subject, grade, term, created_by) VALUES ($1, $2, $3, $4, $5)",
    [studentId, subject, grade, term || null, req.user.id]);
  res.json({ message: 'Grade added' });
});

router.put('/:id', verifyToken, requireRole('admin', 'teacher'), async (req, res) => {
  const { grade, subject, term } = req.body;
  const updates = [];
  const params = [];
  if (grade !== undefined) { updates.push(`grade = $${params.length + 1}`); params.push(grade); }
  if (subject) { updates.push(`subject = $${params.length + 1}`); params.push(subject); }
  if (term) { updates.push(`term = $${params.length + 1}`); params.push(term); }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  params.push(req.params.id);
  await query(`UPDATE grades SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
  res.json({ message: 'Updated' });
});

module.exports = router;
