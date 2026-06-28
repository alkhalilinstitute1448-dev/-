const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const { query } = require('../models/db');
const { generateToken, verifyToken } = require('../middleware/auth');
const { normalizePhone } = require('../utils/phone');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `student_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype);
    cb(null, extOk && mimeOk);
  },
});

router.post('/login', async (req, res) => {
  try {
    const { username, password, deviceId } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await query("SELECT id, username, password_hash, role, device_id, is_active FROM users WHERE username = $1", [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const row = result.rows[0];
    const user = {
      id: row.id, username: row.username, passwordHash: row.password_hash,
      role: row.role, deviceId: row.device_id, isActive: row.is_active
    };

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    const valid = bcrypt.compareSync(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (deviceId && !user.deviceId) {
      await query("UPDATE users SET device_id = $1 WHERE id = $2", [deviceId, user.id]);
    }

    const token = generateToken(user);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/register', upload.fields([{ name: 'photo', maxCount: 1 }]), async (req, res) => {
  try {
    const {
      fullName, fatherName, motherName, studentPhone: rawStudentPhone,
      birthYear, stage, currentJob, nationality
    } = req.body;
    const photoUrl = req.files?.photo?.[0] ? `/uploads/${req.files.photo[0].filename}` : req.body.photoUrl;

    const studentPhone = normalizePhone(rawStudentPhone);

    const requiredFields = { fullName, fatherName, motherName, studentPhone, birthYear, stage };
    const missing = Object.entries(requiredFields)
      .filter(([, v]) => !v || (typeof v === 'string' && !v.trim()))
      .map(([k]) => k);
    if (missing.length > 0) {
      return res.status(400).json({ error: `Required fields missing: ${missing.join(', ')}` });
    }

    const nameParts = fullName.trim().split(/\s+/);
    const shortName = nameParts.length >= 2
      ? nameParts[0] + '.' + nameParts[nameParts.length - 1]
      : nameParts[0];

    const cleanName = shortName.replace(/[^a-zA-Z\u0600-\u06FF.]/g, '').toLowerCase();
    const countResult = await query("SELECT COUNT(*) as cnt FROM users");
    const count = countResult.rows[0]?.cnt || 0;
    const username = `${cleanName}${String(count + 1).padStart(2, '0')}`;

    const tempPassword = Math.random().toString(36).slice(2, 10);
    const passwordHash = bcrypt.hashSync(tempPassword, 10);

    const userResult = await query(
      "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'student') RETURNING id",
      [username, passwordHash]
    );
    const userId = userResult.rows[0].id;

    await query(
      `INSERT INTO students (user_id, full_name, father_name, mother_name, student_phone,
        birth_year, photo_url, stage, current_job, nationality)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [userId, fullName, fatherName, motherName, studentPhone || null,
        birthYear || null, photoUrl || null, stage || null,
        currentJob || null, nationality || null]
    );

    res.json({ username, password: tempPassword, userId });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await query("SELECT id, username, role FROM users WHERE id = $1", [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const row = result.rows[0];
    const user = { id: row.id, username: row.username, role: row.role };

    if (user.role === 'student') {
      const s = await query("SELECT id, full_name, batch_id, stage FROM students WHERE user_id = $1", [user.id]);
      if (s.rows.length > 0) {
        user.studentId = s.rows[0].id;
        user.fullName = s.rows[0].full_name;
        user.batchId = s.rows[0].batch_id;
        user.stage = s.rows[0].stage;
      }
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
