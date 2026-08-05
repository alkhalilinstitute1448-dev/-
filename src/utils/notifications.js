const { query } = require('../models/db');

async function createNotification({ userId, title, body = '', type = 'task_request', link = '' }) {
  if (!userId) return;
  try {
    await query(
      'INSERT INTO notifications (user_id, title, body, type, link) VALUES ($1, $2, $3, $4, $5)',
      [userId, title, body, type, link]
    );
  } catch (err) {
    console.error('createNotification failed:', err.message);
  }
}

async function notifyAdmins({ title, body = '', type = 'task_request', link = '', exceptUserId = null }) {
  try {
    const { rows } = await query("SELECT id FROM users WHERE role = 'admin' AND active = TRUE");
    for (const admin of rows) {
      if (admin.id === exceptUserId) continue;
      await createNotification({ userId: admin.id, title, body, type, link });
    }
  } catch (err) {
    console.error('notifyAdmins failed:', err.message);
  }
}

module.exports = { createNotification, notifyAdmins };
