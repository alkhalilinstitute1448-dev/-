const express = require('express');
const { query } = require('../models/db');
const { verifyToken, requirePermission } = require('../middleware/auth');
const router = express.Router();

router.get('/', verifyToken, requirePermission('dashboard.view'), async (req, res) => {
  try {
    const stats = {
      users: 0,
      tasks: { total: 0, pending: 0, in_progress: 0, completed: 0 },
      lessons: 0,
      captions: 0,
      present_today: 0,
      my_tasks: { pending: 0, in_progress: 0, completed: 0 },
    };
    const [usersR, tasksR, lessonsR, captionsR, attR, myTasksR, activitiesR] = await Promise.all([
      query('SELECT COUNT(*)::int AS c FROM users'),
      query('SELECT status, COUNT(*)::int AS c FROM tasks GROUP BY status'),
      query('SELECT COUNT(*)::int AS c FROM lessons'),
      query('SELECT COUNT(*)::int AS c FROM captions'),
      query('SELECT COUNT(*)::int AS c FROM attendance WHERE date = CURRENT_DATE AND check_in IS NOT NULL'),
      query('SELECT status, COUNT(*)::int AS c FROM tasks WHERE assigned_to = $1 GROUP BY status', [req.user.id]),
      query('SELECT action, entity, details, created_at FROM activities ORDER BY created_at DESC LIMIT 10'),
    ]);
    stats.users = usersR.rows[0]?.c || 0;
    stats.lessons = lessonsR.rows[0]?.c || 0;
    stats.captions = captionsR.rows[0]?.c || 0;
    stats.present_today = attR.rows[0]?.c || 0;
    tasksR.rows.forEach((r) => { stats.tasks[r.status] = r.c; stats.tasks.total += r.c; });
    myTasksR.rows.forEach((r) => { stats.my_tasks[r.status] = r.c; });
    res.json({ stats, recentActivity: activitiesR.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
