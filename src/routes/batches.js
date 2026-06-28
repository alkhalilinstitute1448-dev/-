const express = require('express');
const { query } = require('../models/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  const result = await query("SELECT id, year, name, created_at FROM batches ORDER BY year DESC");
  const batches = result.rows.map(row => ({
    id: row.id, year: row.year, name: row.name, createdAt: row.created_at
  }));
  res.json(batches);
});

router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  const { year, name } = req.body;
  const result = await query("INSERT INTO batches (year, name) VALUES ($1, $2) RETURNING id", [year, name]);
  res.json({ id: result.rows[0].id, message: 'Batch created' });
});

router.get('/:id/stages', verifyToken, async (req, res) => {
  const result = await query("SELECT id, batch_id, name, level, created_at FROM stages WHERE batch_id = $1 ORDER BY level", [req.params.id]);
  const stages = result.rows.map(row => ({
    id: row.id, batchId: row.batch_id, name: row.name, level: row.level, createdAt: row.created_at
  }));
  res.json(stages);
});

router.post('/:id/stages', verifyToken, requireRole('admin'), async (req, res) => {
  const { name, level } = req.body;
  const result = await query("INSERT INTO stages (batch_id, name, level) VALUES ($1, $2, $3) RETURNING id",
    [req.params.id, name, level]);
  res.json({ id: result.rows[0].id, message: 'Stage created' });
});

router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const { year, name } = req.body;
  await query("UPDATE batches SET year=$1, name=$2 WHERE id=$3", [year, name, req.params.id]);
  res.json({ message: 'Updated' });
});

router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  await query("DELETE FROM batches WHERE id=$1", [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
