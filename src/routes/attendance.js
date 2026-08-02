const express = require('express');
const { query } = require('../models/db');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../middleware/activity');
const { distanceMeters, isInside } = require('../utils/geo');
const { getGeo } = require('./settings');
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

router.get('/config', verifyToken, requirePermission('attendance.view'), async (req, res) => {
  try {
    const geo = await getGeo();
    res.json({ geo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', verifyToken, requirePermission('attendance.view'), async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, user_id, date, check_in, check_out, status, notes, outside_since, session_start, session_end FROM attendance WHERE user_id=$1 AND date=$2',
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
  const { lat, lng } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'الموقع الجغرافي مطلوب لتسجيل الحضور' });
  }
  try {
    const geo = await getGeo();
    const inside = isInside({ lat, lng }, { lat: geo.lat, lng: geo.lng }, geo.radius + geo.margin);
    if (!inside) {
      return res.status(403).json({
        error: 'أنت خارج نطاق غرفة الإعلام — يجب أن تكون داخل النطاق لتسجيل الحضور',
      });
    }
    const d = today();
    const now = new Date();
    const time = timeOnly(now);
    const existing = await query('SELECT id, check_out FROM attendance WHERE user_id=$1 AND date=$2', [req.user.id, d]);
    if (existing.rows.length && !existing.rows[0].check_out) {
      return res.status(400).json({ error: 'تم تسجيل حضورك اليوم مسبقًا' });
    }
    if (existing.rows.length) {
      await query(
        'UPDATE attendance SET check_in=$1, check_out=NULL, session_start=NOW(), session_end=NULL, outside_since=NULL, check_in_lat=$2, check_in_lng=$3 WHERE id=$4',
        [time, lat, lng, existing.rows[0].id]
      );
    } else {
      await query(
        'INSERT INTO attendance (user_id, date, check_in, session_start, check_in_lat, check_in_lng, status) VALUES ($1,$2,$3,NOW(),$4,$5,$6)',
        [req.user.id, d, time, lat, lng, 'present']
      );
    }
    await query('UPDATE users SET last_seen=NOW(), last_lat=$1, last_lng=$2 WHERE id=$3', [lat, lng, req.user.id]);
    await logActivity(req.user.id, 'سجّل حضورًا', 'attendance', `${d} · داخل النطاق`);
    res.status(201).json({ ok: true, date: d, check_in: time, session_seconds: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/heartbeat', verifyToken, requirePermission('attendance.manage'), async (req, res) => {
  const { lat, lng } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'الموقع الجغرافي مطلوب' });
  }
  try {
    const geo = await getGeo();
    await query('UPDATE users SET last_seen=NOW(), last_lat=$1, last_lng=$2 WHERE id=$3', [lat, lng, req.user.id]);

    const { rows } = await query(
      'SELECT id, date, check_in, check_out, outside_since, session_start, session_end FROM attendance WHERE user_id=$1 AND date=$2',
      [req.user.id, today()]
    );
    const row = rows[0] || null;
    const active = row && row.check_in && !row.check_out;

    const center = { lat: geo.lat, lng: geo.lng };
    const dist = distanceMeters(lat, lng, center.lat, center.lng);
    const inside = dist <= geo.radius + geo.margin;
    const now = new Date();

    let status = active ? 'in_room' : 'idle';
    let autoEnded = false;

    if (active) {
      if (inside) {
        if (row.outside_since) {
          await query('UPDATE attendance SET outside_since=NULL WHERE id=$1', [row.id]);
        }
        status = 'in_room';
      } else {
        if (!row.outside_since) {
          await query('UPDATE attendance SET outside_since=NOW() WHERE id=$1', [row.id]);
          status = 'leaving';
        } else {
          const since = new Date(row.outside_since);
          const elapsedMs = now - since;
          if (elapsedMs > geo.grace_minutes * 60 * 1000) {
            const outTime = timeOnly(now);
            await query('UPDATE attendance SET check_out=$1, session_end=NOW(), status=$2, outside_since=NULL WHERE id=$3', [outTime, 'leave', row.id]);
            await logActivity(req.user.id, 'إنهاء جلسة تلقائي (مغادرة النطاق)', 'attendance', today());
            status = 'auto_ended';
            autoEnded = true;
          } else {
            status = 'leaving';
          }
        }
      }
    }

    const finalRow = active
      ? (await query('SELECT id, date, check_in, check_out, outside_since, session_start, session_end FROM attendance WHERE user_id=$1 AND date=$2', [req.user.id, today()])).rows[0]
      : row;

    res.json({
      status,
      in_room: inside,
      distance: Math.round(dist),
      autoEnded,
      grace_seconds: geo.grace_minutes * 60,
      outside_seconds: status === 'leaving' && finalRow?.outside_since
        ? Math.max(0, Math.floor((now - new Date(finalRow.outside_since)) / 1000))
        : 0,
      session: finalRow
        ? { date: finalRow.date, check_in: finalRow.check_in, check_out: finalRow.check_out, session_start: finalRow.session_start, session_end: finalRow.session_end, session_seconds: sessionSeconds(finalRow, now) }
        : null,
      geo: { name: geo.name, lat: geo.lat, lng: geo.lng, radius: geo.radius, margin: geo.margin },
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
    const geo = await getGeo();
    const d = today();
    const { rows } = await query(
      `SELECT u.id, u.name, u.username, u.role, u.active, u.last_seen, u.last_lat, u.last_lng,
              a.check_in, a.check_out, a.outside_since, a.session_start, a.session_end
       FROM users u
       LEFT JOIN attendance a ON a.user_id = u.id AND a.date = $1
       WHERE u.active = TRUE
       ORDER BY u.name`,
      [d]
    );
    const now = new Date();
    const center = { lat: geo.lat, lng: geo.lng };
    const result = [];

    for (const u of rows) {
      const online = u.last_seen && now - new Date(u.last_seen) <= ONLINE_WINDOW_MS;
      const active = u.check_in && !u.check_out;
      let in_room = false;
      if (online && u.last_lat != null && u.last_lng != null) {
        in_room = isInside({ lat: u.last_lat, lng: u.last_lng }, center, geo.radius + geo.margin);
      }
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
        status: active ? (in_room ? 'in_room' : 'outside') : online ? 'online' : 'offline',
        in_room,
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
