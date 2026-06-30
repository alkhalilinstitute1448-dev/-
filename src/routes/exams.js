const express = require('express');
const { query } = require('../models/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir = 'uploads/exams';
    if (file.fieldname === 'curriculum') dir = 'uploads/curriculum';
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({ storage });

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  let sql = `SELECT e.id, e.title, e.stage_id, e.subject, e.code, e.start_time, e.end_time,
    e.duration_minutes, e.file_url, e.is_active, e.created_at, s.name as stage_name
    FROM exams e LEFT JOIN stages s ON s.id = e.stage_id`;
  const params = [];
  const conditions = [];

  if (req.user.role === 'student') {
    const sResult = await query("SELECT stage_id FROM students WHERE user_id = $1", [req.user.id]);
    if (sResult.rows.length > 0 && sResult.rows[0].stage_id) {
      conditions.push(`e.stage_id = $${params.length + 1}`);
      params.push(sResult.rows[0].stage_id);
    }
  } else if (req.query.stage_id) {
    conditions.push(`e.stage_id = $${params.length + 1}`);
    params.push(req.query.stage_id);
  }

  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY e.created_at DESC';

  const result = await query(sql, params);
  const exams = result.rows.map(row => ({
    id: row.id, title: row.title, stageId: row.stage_id, subject: row.subject,
    code: row.code, startTime: row.start_time, endTime: row.end_time,
    durationMinutes: row.duration_minutes, fileUrl: row.file_url, isActive: row.is_active,
    createdAt: row.created_at, stageName: row.stage_name
  }));
  res.json(exams);
});

router.post('/', verifyToken, requireRole('admin', 'teacher'), upload.single('file'), async (req, res) => {
  const { title, stageId, subject, startTime, endTime, durationMinutes } = req.body;
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const fileUrl = req.file ? `/uploads/exams/${req.file.filename}` : null;
  await query(
    `INSERT INTO exams (title, stage_id, subject, code, start_time, end_time, duration_minutes, file_url, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [title, stageId, subject || null, code, startTime || null, endTime || null, durationMinutes || null, fileUrl, req.user.id]
  );
  res.json({ code, message: 'Exam created' });
});

router.get('/:id', verifyToken, async (req, res) => {
  const result = await query(`SELECT e.*, s.name as stage_name FROM exams e
    LEFT JOIN stages s ON s.id = e.stage_id WHERE e.id = $1`, [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
  const row = result.rows[0];
  const exam = {
    id: row.id, title: row.title, stageId: row.stage_id, subject: row.subject,
    code: row.code, startTime: row.start_time, endTime: row.end_time,
    durationMinutes: row.duration_minutes, fileUrl: row.file_url,
    createdBy: row.created_by, isActive: row.is_active,
    createdAt: row.created_at, stageName: row.stage_name
  };

  const results = await query(`SELECT s.full_name, er.score, er.total, er.submitted_at
    FROM exam_results er JOIN students s ON s.id = er.student_id WHERE er.exam_id = $1`, [req.params.id]);
  exam.results = results.rows.map(r => ({
    studentName: r.full_name, score: r.score, total: r.total, submittedAt: r.submitted_at
  }));
  res.json(exam);
});

router.post('/:id/submit', verifyToken, requireRole('student'), async (req, res) => {
  const { score, total, code } = req.body;

  const examResult = await query("SELECT code, start_time, end_time, is_active FROM exams WHERE id = $1", [req.params.id]);
  if (examResult.rows.length === 0) return res.status(404).json({ error: 'Exam not found' });
  const exam = examResult.rows[0];
  if (!exam.is_active) return res.status(400).json({ error: 'Exam is not active' });
  if (exam.code !== code) return res.status(400).json({ error: 'Invalid exam code' });

  const now = new Date().toISOString();
  if (exam.start_time && now < exam.start_time) return res.status(400).json({ error: 'Exam has not started' });
  if (exam.end_time && now > exam.end_time) return res.status(400).json({ error: 'Exam has ended' });

  const sResult = await query("SELECT id FROM students WHERE user_id = $1", [req.user.id]);
  if (sResult.rows.length === 0) return res.status(400).json({ error: 'Student profile not found' });
  const studentId = sResult.rows[0].id;

  const existing = await query("SELECT id FROM exam_results WHERE exam_id = $1 AND student_id = $2",
    [req.params.id, studentId]);
  if (existing.rows.length > 0) return res.status(400).json({ error: 'Already submitted' });

  await query("INSERT INTO exam_results (exam_id, student_id, score, total) VALUES ($1, $2, $3, $4)",
    [req.params.id, studentId, score, total]);

  await query("UPDATE exams SET is_active = false WHERE id = $1 AND (SELECT COUNT(*)::int FROM exam_results WHERE exam_id = $2) >= 1",
    [req.params.id, req.params.id]);

  res.json({ message: 'Submitted' });
});

router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  await query("DELETE FROM exams WHERE id = $1", [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
