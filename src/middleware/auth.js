const jwt = require('jsonwebtoken');
const { query } = require('../models/db');

const JWT_SECRET = process.env.JWT_SECRET || 'alkhalel-academy-secret-key-2026';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

async function checkDeviceLock(req, res, next) {
  try {
    const result = await query("SELECT device_id FROM users WHERE id = $1", [req.user.id]);
    if (result.rows.length > 0) {
      const deviceId = result.rows[0].device_id;
      const requestDeviceId = req.headers['x-device-id'];
      if (deviceId && requestDeviceId && deviceId !== requestDeviceId) {
        return res.status(403).json({ error: 'Device locked. Contact admin to unlock.' });
      }
    }
    next();
  } catch {
    next();
  }
}

module.exports = { generateToken, verifyToken, requireRole, checkDeviceLock, JWT_SECRET };
