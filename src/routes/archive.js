const express = require('express');
const { query } = require('../models/db');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../middleware/activity');
const router = express.Router();

router.get('/', verifyToken, requirePermission('archive.view'), async (req, res) => {
  const { type } = req.query;
  let sql = 'SELECT * FROM archives';
  const params = [];
  if (type) {
    sql += ' WHERE type = $1';
    params.push(type);
  }
  sql += ' ORDER BY date DESC';
  try {
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', verifyToken, requirePermission('archive.view'), async (req, res) => {
  const { title, description, type, url, date } = req.body;
  if (!title) return res.status(400).json({ error: 'العنوان مطلوب' });
  try {
    const { rows } = await query(
      `INSERT INTO archives (title, description, type, url, date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [title, description || '', type || 'other', url || '', date || null, req.user.id]
    );
    await logActivity(req.user.id, 'أضاف أرشيف', 'archive', title);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', verifyToken, requirePermission('archive.view'), async (req, res) => {
  try {
    await query('DELETE FROM archives WHERE id=$1', [req.params.id]);
    await logActivity(req.user.id, 'حذف من الأرشيف', 'archive', req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
