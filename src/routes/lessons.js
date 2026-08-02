const express = require('express');
const { query } = require('../models/db');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../middleware/activity');
const router = express.Router();

router.get('/', verifyToken, requirePermission('lessons.view'), async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT l.id, l.title, l.description, l.type, l.presenter, l.date, l.duration, l.materials, l.notes, l.status, l.created_at, l.created_by, u.name AS creator_name
       FROM lessons l LEFT JOIN users u ON u.id = l.created_by ORDER BY l.date DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', verifyToken, requirePermission('lessons.manage'), async (req, res) => {
  const { title, description, type, presenter, date, duration, materials, notes, status } = req.body;
  if (!title) return res.status(400).json({ error: 'عنوان الدرس مطلوب' });
  try {
    const { rows } = await query(
      `INSERT INTO lessons (title, description, type, presenter, date, duration, materials, notes, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [title, description || '', type || 'recorded', presenter || '', date || null, duration || '', materials || '', notes || '', status || 'scheduled', req.user.id]
    );
    await logActivity(req.user.id, 'أنشأ درسًا', 'lessons', title);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', verifyToken, requirePermission('lessons.manage'), async (req, res) => {
  const { title, description, type, presenter, date, duration, materials, notes, status } = req.body;
  if (!title) return res.status(400).json({ error: 'عنوان الدرس مطلوب' });
  try {
    await query(
      `UPDATE lessons SET title=$1, description=$2, type=$3, presenter=$4, date=$5, duration=$6, materials=$7, notes=$8, status=$9 WHERE id=$10`,
      [title, description || '', type || 'recorded', presenter || '', date || null, duration || '', materials || '', notes || '', status || 'scheduled', req.params.id]
    );
    await logActivity(req.user.id, 'عدّل درسًا', 'lessons', title);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', verifyToken, requirePermission('lessons.manage'), async (req, res) => {
  try {
    await query('DELETE FROM lessons WHERE id=$1', [req.params.id]);
    await logActivity(req.user.id, 'حذف درسًا', 'lessons', req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
