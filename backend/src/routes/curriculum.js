const express = require('express');
const { query } = require('../models/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: 'uploads/curriculum',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({ storage, fileFilter: (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.zip'];
  const ext = path.extname(file.originalname).toLowerCase();
  cb(null, allowed.includes(ext));
}});

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  let sql = `SELECT cf.id, cf.stage_id, cf.title, cf.file_url, cf.file_type, cf.created_at, s.name as stage_name
    FROM curriculum_files cf JOIN stages s ON s.id = cf.stage_id`;
  const params = [];
  const conditions = [];

  if (req.user.role === 'student') {
    const sResult = await query("SELECT stage_id FROM students WHERE user_id = $1", [req.user.id]);
    if (sResult.rows.length > 0 && sResult.rows[0].stage_id) {
      conditions.push(`cf.stage_id = $${params.length + 1}`);
      params.push(sResult.rows[0].stage_id);
    }
  } else if (req.query.stage_id) {
    conditions.push(`cf.stage_id = $${params.length + 1}`);
    params.push(req.query.stage_id);
  }

  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY cf.created_at DESC';

  const result = await query(sql, params);
  const files = result.rows.map(row => ({
    id: row.id, stageId: row.stage_id, title: row.title,
    fileUrl: row.file_url, fileType: row.file_type, createdAt: row.created_at, stageName: row.stage_name
  }));
  res.json(files);
});

router.post('/', verifyToken, requireRole('admin'), upload.single('file'), async (req, res) => {
  const { title, stageId } = req.body;
  if (!req.file) return res.status(400).json({ error: 'File required' });
  const ext = path.extname(req.file.originalname).toLowerCase();
  const fileUrl = `/uploads/curriculum/${req.file.filename}`;
  await query("INSERT INTO curriculum_files (stage_id, title, file_url, file_type, uploaded_by) VALUES ($1, $2, $3, $4, $5)",
    [stageId, title, fileUrl, ext, req.user.id]);
  res.json({ message: 'File uploaded' });
});

router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const result = await query("SELECT file_url FROM curriculum_files WHERE id = $1", [req.params.id]);
  if (result.rows.length > 0) {
    const filePath = path.join(__dirname, '..', '..', result.rows[0].file_url);
    try { require('fs').unlinkSync(filePath); } catch {}
  }
  await query("DELETE FROM curriculum_files WHERE id = $1", [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
