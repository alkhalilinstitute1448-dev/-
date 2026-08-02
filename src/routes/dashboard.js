const express = require('express');
const { query } = require('../models/db');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { getGeo } = require('./settings');
const router = express.Router();

router.get('/', verifyToken, requirePermission('dashboard.view'), async (req, res) => {
  try {
    const stats = {
      users: 0,
      tasks: { total: 0, pending: 0, in_progress: 0, completed: 0, overdue: 0 },
      lessons: 0,
      captions: 0,
      present_today: 0,
      work_hours_today: 0,
      next_lesson: null,
      my_tasks: { pending: 0, in_progress: 0, completed: 0 },
    };

    const [
      usersR,
      tasksR,
      overdueR,
      lessonsR,
      captionsR,
      attR,
      hoursR,
      nextLessonR,
      myTasksR,
      activitiesR,
    ] = await Promise.all([
      query('SELECT COUNT(*)::int AS c FROM users'),
      query('SELECT status, COUNT(*)::int AS c FROM tasks GROUP BY status'),
      query("SELECT COUNT(*)::int AS c FROM tasks WHERE status IN ('pending','in_progress') AND due_date < CURRENT_DATE"),
      query('SELECT COUNT(*)::int AS c FROM lessons'),
      query('SELECT COUNT(*)::int AS c FROM captions'),
      query('SELECT COUNT(*)::int AS c FROM attendance WHERE date = CURRENT_DATE AND check_in IS NOT NULL'),
      query(`SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(session_end, NOW()) - session_start))), 0)::int AS seconds FROM attendance WHERE date = CURRENT_DATE AND session_start IS NOT NULL`),
      query("SELECT id, title, date FROM lessons WHERE status != 'cancelled' AND (date >= CURRENT_DATE OR date IS NULL) ORDER BY date ASC NULLS LAST LIMIT 1"),
      query('SELECT status, COUNT(*)::int AS c FROM tasks WHERE assigned_to = $1 GROUP BY status', [req.user.id]),
      query('SELECT action, entity, details, created_at FROM activities ORDER BY created_at DESC LIMIT 12'),
    ]);

    stats.users = usersR.rows[0]?.c || 0;
    stats.lessons = lessonsR.rows[0]?.c || 0;
    stats.captions = captionsR.rows[0]?.c || 0;
    stats.present_today = attR.rows[0]?.c || 0;
    stats.work_hours_today = Math.round((hoursR.rows[0]?.seconds || 0) / 3600 * 10) / 10;
    stats.tasks.overdue = overdueR.rows[0]?.c || 0;
    stats.next_lesson = nextLessonR.rows[0] || null;
    tasksR.rows.forEach((r) => { stats.tasks[r.status] = r.c; stats.tasks.total += r.c; });
    myTasksR.rows.forEach((r) => { stats.my_tasks[r.status] = r.c; });

    const geo = await getGeo();

    res.json({ stats, recentActivity: activitiesR.rows, geo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
