const express = require('express');
const { query } = require('../models/db');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../middleware/activity');
const router = express.Router();

const ONLINE_WINDOW_MS = 90 * 1000;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function timeOnly(d) {
  return d.toLocaleTimeString('en-GB', { hour12: false });
}

function parseSessionStart(row) {
  if (row?.session_start) return new Date(row.session_start);
  if (!row?.check_in) return null;
  const d = row.date || today();
  const [h, m, s] = String(row.check_in).split(':').map(Number);
  return new Date(`${d}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
}

function sessionSeconds(row, now = new Date()) {
  const start = parseSessionStart(row);
  if (!start) return 0;
  let end = now;
  if (row?.session_end) {
    end = new Date(row.session_end);
  } else if (row?.check_out && !row?.session_end) {
    const [h, m, s] = String(row.check_out).split(':').map(Number);
    end = new Date(`${row.date || today()}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
  }
  return Math.max(0, Math.floor((end - start) / 1000));
}

router.get('/', verifyToken, requirePermission('attendance.view'), async (req, res) => {
  const { date } = req.query;
  let sql = `
    SELECT a.id, a.date, a.check_in, a.check_out, a.status, a.notes, a.user_id, u.name AS user_name
    FROM attendance a JOIN users u ON u.id = a.user_id
  `;
  const params = [];
  if (date) {
    sql += ' WHERE a.date = $1';
    params.push(date);
  }
  sql += ' ORDER BY a.date DESC, a.check_in DESC';
  try {
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', verifyToken, requirePermission('attendance.view'), async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, user_id, date, check_in, check_out, status, notes, session_start, session_end FROM attendance WHERE user_id=$1 AND date=$2',
      [req.user.id, today()]
    );
    const row = rows[0] || null;
    if (row) {
      row.session_seconds = sessionSeconds(row);
    }
    res.json({ today: row });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/check-in', verifyToken, requirePermission('attendance.manage'), async (req, res) => {
  try {
    const d = today();
    const now = new Date();
    const time = timeOnly(now);
    const existing = await query('SELECT id, check_out FROM attendance WHERE user_id=$1 AND date=$2', [req.user.id, d]);
    if (existing.rows.length && !existing.rows[0].check_out) {
      return res.status(400).json({ error: 'تم تسجيل حضورك اليوم مسبقًا' });
    }
    if (existing.rows.length) {
      await query(
        'UPDATE attendance SET check_in=$1, check_out=NULL, session_start=NOW(), session_end=NULL, status=$2 WHERE id=$3',
        [time, 'present', existing.rows[0].id]
      );
    } else {
      await query(
        'INSERT INTO attendance (user_id, date, check_in, session_start, status) VALUES ($1,$2,$3,NOW(),$4)',
        [req.user.id, d, time, 'present']
      );
    }
    await query('UPDATE users SET last_seen=NOW() WHERE id=$1', [req.user.id]);
    await logActivity(req.user.id, 'سجّل حضورًا', 'attendance', d);
    res.status(201).json({ ok: true, date: d, check_in: time, session_seconds: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/heartbeat', verifyToken, requirePermission('attendance.manage'), async (req, res) => {
  try {
    await query('UPDATE users SET last_seen=NOW() WHERE id=$1', [req.user.id]);
    const { rows } = await query(
      'SELECT id, date, check_in, check_out, session_start, session_end FROM attendance WHERE user_id=$1 AND date=$2',
      [req.user.id, today()]
    );
    const row = rows[0] || null;
    const active = row && row.check_in && !row.check_out;
    res.json({
      status: active ? 'in_room' : 'idle',
      session: row
        ? { date: row.date, check_in: row.check_in, check_out: row.check_out, session_start: row.session_start, session_end: row.session_end, session_seconds: sessionSeconds(row) }
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/check-out', verifyToken, requirePermission('attendance.manage'), async (req, res) => {
  try {
    const d = today();
    const now = new Date();
    const time = timeOnly(now);
    const { rows } = await query('SELECT id, check_out FROM attendance WHERE user_id=$1 AND date=$2', [req.user.id, d]);
    if (!rows.length) return res.status(400).json({ error: 'لا توجد جلسة مفتوحة اليوم' });
    if (rows[0].check_out) return res.status(400).json({ error: 'تم إنهاء الجلسة مسبقًا' });
    await query('UPDATE attendance SET check_out=$1, session_end=NOW() WHERE id=$2', [time, rows[0].id]);
    await logActivity(req.user.id, 'أنهى جلسة العمل', 'attendance', d);
    res.json({ ok: true, check_out: time });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/presence', verifyToken, requirePermission('attendance.view'), async (req, res) => {
  try {
    const d = today();
    const { rows } = await query(
      `SELECT u.id, u.name, u.username, u.role, u.active, u.last_seen, u.photo,
              a.check_in, a.check_out, a.session_start, a.session_end
       FROM users u
       LEFT JOIN attendance a ON a.user_id = u.id AND a.date = $1
       WHERE u.active = TRUE
       ORDER BY u.name`,
      [d]
    );
    const now = new Date();
    const result = [];

    for (const u of rows) {
      const online = u.last_seen && now - new Date(u.last_seen) <= ONLINE_WINDOW_MS;
      const active = u.check_in && !u.check_out;
      let currentTask = null;
      if (active) {
        const t = await query(
          `SELECT title FROM tasks WHERE assigned_to = $1 AND status = 'in_progress' ORDER BY updated_at DESC LIMIT 1`,
          [u.id]
        );
        currentTask = t.rows[0]?.title || null;
      }
      result.push({
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        photo: u.photo || null,
        status: active ? 'in_room' : online ? 'online' : 'offline',
        online,
        active,
        check_in: u.check_in || null,
        check_out: u.check_out || null,
        session_seconds: active ? sessionSeconds({ date: d, check_in: u.check_in, session_start: u.session_start, session_end: u.session_end }, now) : 0,
        current_task: currentTask,
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
