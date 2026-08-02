const jwt = require('jsonwebtoken');
const { query } = require('../models/db');
const { hasPermission } = require('../utils/permissions');

const JWT_SECRET = process.env.JWT_SECRET || 'alkhalel-media-secret-key-2026';

function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

async function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    const { rows } = await query(
      'SELECT id, name, username, role, permissions, active, created_at FROM users WHERE id = $1',
      [decoded.id]
    );
    if (!rows.length || rows[0].active === false) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function requirePermission(perm) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!hasPermission(req.user, perm)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

module.exports = { generateToken, verifyToken, requirePermission, JWT_SECRET };
