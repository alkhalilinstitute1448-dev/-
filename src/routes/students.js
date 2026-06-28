const express = require('express');
const { query } = require('../models/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  let sql = `SELECT s.id, s.full_name, s.father_name, s.mother_name, s.student_phone,
    s.father_phone, s.mother_phone, s.primary_contact, s.birth_year, s.photo_url,
    s.batch_id, s.stage_id, s.stage, b.name as batch_name, st.name as stage_name,
    u.username, u.is_active
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN batches b ON b.id = s.batch_id
    LEFT JOIN stages st ON st.id = s.stage_id`;

  const params = [];
  const conditions = [];

  if (req.user.role === 'student') {
    const sResult = await query("SELECT id FROM students WHERE user_id = $1", [req.user.id]);
    if (sResult.rows.length > 0) {
      conditions.push(`s.id = $${params.length + 1}`);
      params.push(sResult.rows[0].id);
    }
  } else if (req.user.role === 'attendance_officer') {
    conditions.push('1=1');
  } else if (req.user.role === 'teacher') {
    if (req.query.stage_id) {
      conditions.push(`s.stage_id = $${params.length + 1}`);
      params.push(req.query.stage_id);
    }
  }

  if (req.query.batch_id) {
    conditions.push(`s.batch_id = $${params.length + 1}`);
    params.push(req.query.batch_id);
  }
  if (req.query.stage_id && req.user.role !== 'teacher') {
    conditions.push(`s.stage_id = $${params.length + 1}`);
    params.push(req.query.stage_id);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY s.full_name';

  const result = await query(sql, params);
  const students = result.rows.map(row => ({
    id: row.id, fullName: row.full_name, fatherName: row.father_name, motherName: row.mother_name,
    studentPhone: row.student_phone, fatherPhone: row.father_phone, motherPhone: row.mother_phone,
    primaryContact: row.primary_contact, birthYear: row.birth_year, photoUrl: row.photo_url,
    batchId: row.batch_id, stageId: row.stage_id, stage: row.stage, batchName: row.batch_name,
    stageName: row.stage_name, username: row.username, isActive: row.is_active
  }));
  res.json(students);
});

router.get('/:id', verifyToken, async (req, res) => {
  const result = await query(`SELECT s.*, b.name as batch_name, st.name as stage_name, u.username, u.is_active
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN batches b ON b.id = s.batch_id
    LEFT JOIN stages st ON st.id = s.stage_id
    WHERE s.id = $1`, [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
  const row = result.rows[0];
  const student = {
    id: row.id, fullName: row.full_name, fatherName: row.father_name, motherName: row.mother_name,
    fatherStatus: row.father_status, motherStatus: row.mother_status,
    fatherOccupation: row.father_occupation, motherOccupation: row.mother_occupation,
    studentPhone: row.student_phone, fatherPhone: row.father_phone, motherPhone: row.mother_phone,
    primaryContact: row.primary_contact, birthYear: row.birth_year, photoUrl: row.photo_url,
    batchId: row.batch_id, stageId: row.stage_id, stage: row.stage, createdAt: row.created_at,
    batchName: row.batch_name, stageName: row.stage_name, username: row.username,
    isActive: !!row.is_active
  };

  const examResults = await query(`SELECT e.title, er.score, er.total, er.submitted_at
    FROM exam_results er JOIN exams e ON e.id = er.exam_id WHERE er.student_id = $1`, [req.params.id]);
  student.examResults = examResults.rows.map(r => ({
    title: r.title, score: r.score, total: r.total, submittedAt: r.submitted_at
  }));

  const attendance = await query(`SELECT date, status, notes FROM attendance WHERE student_id = $1 ORDER BY date DESC LIMIT 50`, [req.params.id]);
  student.attendance = attendance.rows.map(r => ({
    date: r.date, status: r.status, notes: r.notes
  }));

  const grades = await query(`SELECT subject, grade, term FROM grades WHERE student_id = $1`, [req.params.id]);
  student.grades = grades.rows.map(r => ({
    subject: r.subject, grade: r.grade, term: r.term
  }));

  const books = await query(`SELECT book_name, received_date, returned_date, status FROM books WHERE student_id = $1`, [req.params.id]);
  student.books = books.rows.map(r => ({
    bookName: r.book_name, receivedDate: r.received_date, returnedDate: r.returned_date, status: r.status
  }));

  res.json(student);
});

router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const { fullName, fatherName, motherName, batchId, stageId, stage } = req.body;
  await query(`UPDATE students SET full_name=$1, father_name=$2, mother_name=$3, batch_id=$4, stage_id=$5, stage=$6
    WHERE id=$7`, [fullName, fatherName, motherName, batchId, stageId, stage, req.params.id]);
  res.json({ message: 'Updated' });
});

module.exports = router;
