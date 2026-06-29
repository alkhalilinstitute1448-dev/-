const { Router } = require('express');
const { query } = require('../models/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = Router();

router.get('/stats', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const [studentsRes, teachersRes, examsRes, attendanceRes] = await Promise.all([
      query("SELECT COUNT(*) AS count FROM students"),
      query("SELECT COUNT(*) AS count FROM users WHERE role = 'teacher'"),
      query("SELECT COUNT(*) AS count FROM exams"),
      query("SELECT COUNT(*) AS count FROM attendance"),
    ]);
    res.json({
      students: Number(studentsRes.rows[0].count),
      teachers: Number(teachersRes.rows[0].count),
      exams: Number(examsRes.rows[0].count),
      attendance: Number(attendanceRes.rows[0].count),
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
