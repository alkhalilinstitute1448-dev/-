const express = require('express');
const { query } = require('../models/db');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../middleware/activity');
const router = express.Router();

const DEFAULT_GEO = {
  name: 'جامع إبراهيم الخليل – مساكن برزة',
  lat: 33.538,
  lng: 36.321,
  radius: 100,
  margin: 20,
  grace_minutes: 2,
};

async function getGeo() {
  const { rows } = await query("SELECT value FROM settings WHERE key = 'geo'");
  if (rows.length) {
    return { ...DEFAULT_GEO, ...rows[0].value };
  }
  return DEFAULT_GEO;
}

router.get('/', verifyToken, async (req, res) => {
  try {
    const geo = await getGeo();
    res.json({ geo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/geo', verifyToken, requirePermission('users.manage'), async (req, res) => {
  const { name, lat, lng, radius, margin, grace_minutes } = req.body;
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    lat < -90 || lat > 90 ||
    lng < -180 || lng > 180
  ) {
    return res.status(400).json({ error: 'إحداثيات غير صحيحة' });
  }
  const value = {
    name: name || DEFAULT_GEO.name,
    lat,
    lng,
    radius: Math.max(10, Number(radius) || DEFAULT_GEO.radius),
    margin: Math.max(0, Number(margin) || 0),
    grace_minutes: Math.max(1, Number(grace_minutes) || DEFAULT_GEO.grace_minutes),
  };
  try {
    await query(
      `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = $2::jsonb`,
      ['geo', JSON.stringify(value)]
    );
    await logActivity(req.user.id, 'حدّث إعدادات النطاق الجغرافي', 'settings', name || 'geo');
    res.json({ geo: value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, getGeo };
