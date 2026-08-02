const express = require('express');
const { query } = require('../models/db');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../middleware/activity');
const router = express.Router();

router.get('/', verifyToken, requirePermission('tasks.view'), async (req, res) => {
  const { status } = req.query;
  let sql = `
    SELECT t.id, t.title, t.description, t.priority, t.status, t.due_date, t.notes, t.created_at, t.updated_at,
           t.assigned_to, a.name AS assigned_name,
           t.created_by, c.name AS creator_name
    FROM tasks t
    LEFT JOIN users a ON a.id = t.assigned_to
    LEFT JOIN users c ON c.id = t.created_by
  `;
  const params = [];
  if (status) {
    sql += ' WHERE t.status = $1';
    params.push(status);
  }
  sql += ' ORDER BY t.created_at DESC';
  try {
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', verifyToken, requirePermission('tasks.manage'), async (req, res) => {
  const { title, description, assigned_to, priority, status, due_date, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'عنوان المهمة مطلوب' });
  try {
    const { rows } = await query(
      `INSERT INTO tasks (title, description, assigned_to, priority, status, due_date, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [title, description || '', assigned_to || null, priority || 'medium', status || 'pending', due_date || null, notes || '', req.user.id]
    );
    await logActivity(req.user.id, 'أنشأ مهمة', 'tasks', title);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', verifyToken, requirePermission('tasks.manage'), async (req, res) => {
  const { title, description, assigned_to, priority, status, due_date, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'عنوان المهمة مطلوب' });
  try {
    await query(
      `UPDATE tasks SET title=$1, description=$2, assigned_to=$3, priority=$4, status=$5, due_date=$6, notes=$7, updated_at=NOW()
       WHERE id=$8`,
      [title, description || '', assigned_to || null, priority || 'medium', status || 'pending', due_date || null, notes || '', req.params.id]
    );
    await logActivity(req.user.id, 'عدّل مهمة', 'tasks', title);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/status', verifyToken, requirePermission('tasks.view'), async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'الحالة مطلوبة' });
  try {
    await query('UPDATE tasks SET status=$1, updated_at=NOW() WHERE id=$2', [status, req.params.id]);
    await logActivity(req.user.id, 'حدّث حالة مهمة', 'tasks', status);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', verifyToken, requirePermission('tasks.manage'), async (req, res) => {
  try {
    await query('DELETE FROM tasks WHERE id=$1', [req.params.id]);
    await logActivity(req.user.id, 'حذف مهمة', 'tasks', req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
