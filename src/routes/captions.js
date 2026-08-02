const express = require('express');
const { query } = require('../models/db');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../middleware/activity');
const router = express.Router();

router.get('/', verifyToken, requirePermission('captions.view'), async (req, res) => {
  const { platform } = req.query;
  let sql = `
    SELECT c.id, c.platform, c.name, c.text, c.tags, c.updated_at, c.created_by, u.name AS creator_name
    FROM captions c LEFT JOIN users u ON u.id = c.created_by
  `;
  const params = [];
  if (platform) {
    sql += ' WHERE c.platform = $1';
    params.push(platform);
  }
  sql += ' ORDER BY c.updated_at DESC';
  try {
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', verifyToken, requirePermission('captions.manage'), async (req, res) => {
  const { platform, name, text, tags } = req.body;
  if (!platform || !name || !text) return res.status(400).json({ error: 'المنصة والاسم والنص مطلوبة' });
  try {
    const { rows } = await query(
      `INSERT INTO captions (platform, name, text, tags, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [platform, name, text, JSON.stringify(tags || []), req.user.id]
    );
    await logActivity(req.user.id, 'أنشأ كابشن', 'captions', name);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', verifyToken, requirePermission('captions.manage'), async (req, res) => {
  const { platform, name, text, tags } = req.body;
  try {
    await query(
      'UPDATE captions SET platform=$1, name=$2, text=$3, tags=$4, updated_at=NOW() WHERE id=$5',
      [platform, name, text, JSON.stringify(tags || []), req.params.id]
    );
    await logActivity(req.user.id, 'عدّل كابشن', 'captions', name);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', verifyToken, requirePermission('captions.manage'), async (req, res) => {
  try {
    await query('DELETE FROM captions WHERE id=$1', [req.params.id]);
    await logActivity(req.user.id, 'حذف كابشن', 'captions', req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
