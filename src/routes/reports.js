const express = require('express');
const { query } = require('../models/db');
const { verifyToken, requirePermission } = require('../middleware/auth');
const router = express.Router();

router.get('/attendance', verifyToken, requirePermission('reports.view'), async (req, res) => {
  const { from, to } = req.query;
  let sql = `
    SELECT u.id, u.name,
           COUNT(a.id)::int AS present_days,
           COALESCE(SUM(CASE WHEN a.check_out IS NOT NULL THEN 1 ELSE 0 END), 0)::int AS completed_days,
           COUNT(DISTINCT a.date)::int AS total_days
    FROM users u LEFT JOIN attendance a ON a.user_id = u.id
  `;
  const params = [];
  if (from && to) {
    sql += ` AND a.date BETWEEN $1 AND $2`;
    params.push(from, to);
  }
  sql += ' GROUP BY u.id, u.name ORDER BY present_days DESC';
  try {
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tasks', verifyToken, requirePermission('reports.view'), async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT u.name,
              COUNT(t.id)::int AS total,
              COALESCE(COUNT(t.id) FILTER (WHERE t.status='completed'), 0)::int AS completed,
              COALESCE(COUNT(t.id) FILTER (WHERE t.status='in_progress'), 0)::int AS in_progress,
              COALESCE(COUNT(t.id) FILTER (WHERE t.status='pending'), 0)::int AS pending
       FROM users u LEFT JOIN tasks t ON t.assigned_to = u.id
       GROUP BY u.id, u.name ORDER BY total DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
