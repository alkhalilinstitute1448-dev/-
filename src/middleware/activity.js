const { query } = require('../models/db');

async function logActivity(userId, action, entity, details) {
  try {
    await query('INSERT INTO activities (user_id, action, entity, details) VALUES ($1, $2, $3, $4)', [
      userId,
      action,
      entity || null,
      details || null,
    ]);
  } catch (err) {
    console.error('logActivity error:', err.message);
  }
}

module.exports = { logActivity };
