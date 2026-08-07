const express = require('express');
const { query } = require('../models/db');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../middleware/activity');
const router = express.Router();

router.get('/', verifyToken, requirePermission('team_items.view'), async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT t.id, t.name, t.photo, t.description, t.created_at, t.updated_at, t.created_by, u.name AS creator_name
       FROM team_items t LEFT JOIN users u ON u.id = t.created_by
       ORDER BY t.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', verifyToken, requirePermission('team_items.manage'), async (req, res) => {
  const { name, photo, description } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم الغرض مطلوب' });
  try {
    const { rows } = await query(
      `INSERT INTO team_items (name, photo, description, created_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [name, photo || null, description || '', req.user.id]
    );
    await logActivity(req.user.id, 'أضاف غرضًا للفريق', 'team_items', name);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', verifyToken, requirePermission('team_items.manage'), async (req, res) => {
  const { name, photo, description } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم الغرض مطلوب' });
  try {
    await query(
      `UPDATE team_items SET name=$1, photo=$2, description=$3, updated_at=NOW() WHERE id=$4`,
      [name, photo || null, description || '', req.params.id]
    );
    await logActivity(req.user.id, 'عدّل غرضًا للفريق', 'team_items', name);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', verifyToken, requirePermission('team_items.manage'), async (req, res) => {
  try {
    await query('DELETE FROM team_items WHERE id=$1', [req.params.id]);
    await logActivity(req.user.id, 'حذف غرضًا للفريق', 'team_items', req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
