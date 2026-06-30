const express = require('express');
const { query } = require('../models/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  const result = await query(
    "SELECT s.id, s.batch_id, s.name, s.level, s.created_at, b.name as batch_name FROM stages s LEFT JOIN batches b ON b.id = s.batch_id ORDER BY s.level, s.name"
  );
  const stages = result.rows.map(row => ({
    id: row.id, batchId: row.batch_id, name: row.name, level: row.level,
    createdAt: row.created_at, batchName: row.batch_name
  }));
  res.json(stages);
});

router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  const { batchId, name, level } = req.body;
  if (!batchId || !name || level === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const result = await query(
    "INSERT INTO stages (batch_id, name, level) VALUES ($1, $2, $3) RETURNING id",
    [batchId, name, level]
  );
  res.json({ id: result.rows[0].id, message: 'Stage created' });
});

router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const { batchId, name, level } = req.body;
  await query(
    "UPDATE stages SET batch_id=$1, name=$2, level=$3 WHERE id=$4",
    [batchId, name, level, req.params.id]
  );
  res.json({ message: 'Updated' });
});

router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  await query("DELETE FROM stages WHERE id=$1", [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
