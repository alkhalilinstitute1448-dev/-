const express = require('express');
const { query } = require('../models/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  let sql = `SELECT b.id, b.student_id, b.book_name, b.received_date, b.returned_date, b.status, b.created_at,
    s.full_name as student_name, s.student_phone
    FROM books b
    JOIN students s ON s.id = b.student_id`;
  const params = [];
  const conditions = [];

  if (req.query.student_id) {
    conditions.push(`b.student_id = $${params.length + 1}`);
    params.push(req.query.student_id);
  }
  if (req.query.status) {
    conditions.push(`b.status = $${params.length + 1}`);
    params.push(req.query.status);
  }

  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY b.created_at DESC';

  const result = await query(sql, params);
  const books = result.rows.map(row => ({
    id: row.id, studentId: row.student_id, bookName: row.book_name,
    receivedDate: row.received_date, returnedDate: row.returned_date,
    status: row.status, createdAt: row.created_at,
    studentName: row.student_name, studentPhone: row.student_phone
  }));
  res.json(books);
});

router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  const { studentId, bookName, receivedDate, returnedDate, status } = req.body;
  if (!studentId || !bookName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  await query(
    "INSERT INTO books (student_id, book_name, received_date, returned_date, status) VALUES ($1, $2, $3, $4, $5)",
    [studentId, bookName, receivedDate || null, returnedDate || null, status || 'received']
  );
  res.json({ message: 'Book record created' });
});

router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const { bookName, receivedDate, returnedDate, status } = req.body;
  await query(
    "UPDATE books SET book_name=$1, received_date=$2, returned_date=$3, status=$4 WHERE id=$5",
    [bookName, receivedDate, returnedDate, status, req.params.id]
  );
  res.json({ message: 'Updated' });
});

router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  await query("DELETE FROM books WHERE id=$1", [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
