const express = require('express');
const { query } = require('../models/db');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../middleware/activity');
const { createNotification, notifyAdmins } = require('../utils/notifications');
const router = express.Router();

router.use(verifyToken);

const TASK_STATUSES = ['new', 'in_progress', 'in_review', 'completed', 'rejected'];
const TASK_TYPES = ['design', 'editing', 'live', 'filming', 'writing', 'management', 'other'];
const TASK_PRIORITIES = ['normal', 'important', 'urgent'];

function cleanPhone(phone) {
  return String(phone || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
}

function buildWhatsAppMessage(creatorName) {
  return (
    'السلام عليكم ورحمة الله وبركاته.\n\n' +
    `معك ${creatorName}\n\n` +
    'تم إسناد مهمة جديدة إليك.\n\n' +
    'يرجى الدخول إلى تطبيق الخليل ميديا والاطلاع على قائمة المهام الخاصة بك، والبدء بتنفيذها في أقرب وقت ممكن.\n\n' +
    'جزاكم الله خيراً.\n\n' +
    'والسلام عليكم ورحمة الله وبركاته.'
  );
}

const BASE_SELECT = `
  SELECT tr.id, tr.title, tr.description, tr.type, tr.priority, tr.status, tr.due_date,
         tr.assigned_to, a.name AS assigned_name,
         tr.created_by, c.name AS creator_name,
         tr.delivery_note, tr.delivery_attachment,
         tr.created_at, tr.updated_at, u.name AS updated_by_name
  FROM task_requests tr
  LEFT JOIN users a ON a.id = tr.assigned_to
  LEFT JOIN users c ON c.id = tr.created_by
  LEFT JOIN users u ON u.id = tr.updated_by
`;

function scopeFilter(user) {
  return user.role === 'admin' ? '1=1' : 'tr.assigned_to = $1';
}

async function ensureAssignable(user, assignedId) {
  if (!assignedId || user.role === 'admin') return true;
  const { rows } = await query('SELECT admin_only_assignment FROM users WHERE id = $1', [assignedId]);
  return !(rows[0]?.admin_only_assignment);
}

router.get('/', requirePermission('task_requests.view'), async (req, res) => {
  const { status, member, q } = req.query;
  try {
    let sql = BASE_SELECT;
    const params = [];
    const where = [];
    if (req.user.role !== 'admin') {
      where.push('tr.assigned_to = $1');
      params.push(req.user.id);
    }
    if (status && TASK_STATUSES.includes(status)) {
      where.push(`tr.status = $${params.length + 1}`);
      params.push(status);
    }
    if (member) {
      where.push(`tr.assigned_to = $${params.length + 1}`);
      params.push(member);
    }
    if (q) {
      where.push(`(LOWER(tr.title) LIKE LOWER($${params.length + 1}) OR LOWER(tr.description) LIKE LOWER($${params.length + 2}))`);
      params.push(`%${q}%`, `%${q}%`);
    }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY tr.created_at DESC';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/members', requirePermission('task_requests.view'), async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const { rows } = await query(
      `SELECT id, name, username, role, phone, admin_only_assignment
       FROM users
       WHERE active = TRUE${isAdmin ? '' : ' AND admin_only_assignment = FALSE'}
       ORDER BY role = 'admin' DESC, name`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/my-count', requirePermission('task_requests.view'), async (req, res) => {
  try {
    const scope = req.user.role === 'admin' ? '1=1' : 'assigned_to = $1';
    const params = req.user.role === 'admin' ? [] : [req.user.id];
    const { rows } = await query(`SELECT status, COUNT(*) AS c FROM task_requests WHERE ${scope} GROUP BY status`, params);
    const counts = { new: 0, in_progress: 0, in_review: 0, completed: 0, rejected: 0 };
    for (const r of rows) counts[r.status] = Number(r.c);
    counts.active = counts.new + counts.in_progress + counts.in_review;
    counts.total = counts.new + counts.in_progress + counts.in_review + counts.completed + counts.rejected;
    res.json(counts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requirePermission('task_requests.manage'), async (req, res) => {
  const { title, description, type, priority, status, due_date, assigned_to } = req.body;
  if (!title) return res.status(400).json({ error: 'عنوان المهمة مطلوب' });
  if (type && !TASK_TYPES.includes(type)) return res.status(400).json({ error: 'نوع المهمة غير صحيح' });
  if (priority && !TASK_PRIORITIES.includes(priority)) return res.status(400).json({ error: 'أولوية المهمة غير صحيحة' });
  if (status && !TASK_STATUSES.includes(status)) return res.status(400).json({ error: 'حالة المهمة غير صحيحة' });
  try {
    const now = new Date().toISOString();
    const { rows } = await query(
      `INSERT INTO task_requests (title, description, type, priority, status, due_date, assigned_to, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [title, description || '', type || 'other', priority || 'normal', status || 'new', due_date || null, assigned_to || null, req.user.id, now, now]
    );
    const id = rows[0].id;
    const { rows: full } = await query(
      `${BASE_SELECT} WHERE tr.id = $1`,
      [id]
    );
    const task = full[0];
    await logActivity(req.user.id, 'أنشأ طلب مهمة', 'task_requests', title);

    const link = '/task-requests';
    const assignedId = assigned_to ? Number(assigned_to) : null;
    if (assignedId && !(await ensureAssignable(req.user, assignedId))) {
      return res.status(403).json({ error: 'لا يمكن إسناد المهمة إلى هذا الحساب — المدير وحده يمكنه إسناد المهام إليه' });
    }
    if (assignedId) {
      await createNotification({
        userId: assignedId,
        title: 'طلب مهمة جديدة',
        body: `تم إسناد مهمة إليك: ${title}`,
        link,
      });
    } else {
      await notifyAdmins({ title: 'طلب مهمة بانتظار التوزيع', body: title, link });
    }

    let whatsapp = null;
    if (assignedId && assignedId !== req.user.id) {
      try {
        const { rows: u } = await query('SELECT phone FROM users WHERE id = $1', [assignedId]);
        const phone = cleanPhone(u[0]?.phone);
        if (phone && phone.length >= 8) {
          const message = buildWhatsAppMessage(req.user.name || req.user.username);
          whatsapp = { phone, message };
        }
      } catch (_) {}
    }

    res.status(201).json({ task, whatsapp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requirePermission('task_requests.manage'), async (req, res) => {
  const { title, description, type, priority, status, due_date, assigned_to } = req.body;
  if (title === undefined || title === '') return res.status(400).json({ error: 'عنوان المهمة مطلوب' });
  if (type && !TASK_TYPES.includes(type)) return res.status(400).json({ error: 'نوع المهمة غير صحيح' });
  if (priority && !TASK_PRIORITIES.includes(priority)) return res.status(400).json({ error: 'أولوية المهمة غير صحيحة' });
  if (status && !TASK_STATUSES.includes(status)) return res.status(400).json({ error: 'حالة المهمة غير صحيحة' });
  try {
    const { rows: cur } = await query('SELECT * FROM task_requests WHERE id = $1', [req.params.id]);
    if (!cur.length) return res.status(404).json({ error: 'الطلب غير موجود' });
    const task = cur[0];

    if (assigned_to !== undefined && !(await ensureAssignable(req.user, Number(assigned_to) || null))) {
      return res.status(403).json({ error: 'لا يمكن إسناد المهمة إلى هذا الحساب — المدير وحده يمكنه إسناد المهام إليه' });
    }

    const sets = [];
    const values = [];
    const add = (col, val) => {
      sets.push(`${col} = $${sets.length + 1}`);
      values.push(val);
    };
    if (title !== undefined) add('title', title);
    if (description !== undefined) add('description', description || '');
    if (type !== undefined) add('type', type);
    if (priority !== undefined) add('priority', priority);
    if (status !== undefined) add('status', status);
    if (due_date !== undefined) add('due_date', due_date || null);
    if (assigned_to !== undefined) add('assigned_to', assigned_to || null);
    add('updated_at', new Date().toISOString());
    add('updated_by', req.user.id);
    if (sets.length) {
      await query(`UPDATE task_requests SET ${sets.join(', ')} WHERE id = $${sets.length + 1}`, [...values, req.params.id]);
    }
    await logActivity(req.user.id, 'عدّل طلب مهمة', 'task_requests', title);

    const newAssigned = assigned_to !== undefined ? Number(assigned_to) || null : (task.assigned_to || null);
    const newStatus = status !== undefined ? status : task.status;
    const link = '/task-requests';
    if (newAssigned && newAssigned !== req.user.id) {
      await createNotification({
        userId: newAssigned,
        title: 'طلب مهمة معدّل',
        body: `تم تعديل أو إعادة إسناد المهمة: ${title}`,
        link,
      });
    } else if (newStatus && newStatus !== task.status) {
      await notifyAdmins({ title: 'تغيّرت حالة طلب مهمة', body: title, link });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/status', requirePermission('task_requests.view'), async (req, res) => {
  const { status } = req.body;
  if (!status || !TASK_STATUSES.includes(status)) return res.status(400).json({ error: 'حالة غير صحيحة' });
  try {
    const { rows: cur } = await query('SELECT * FROM task_requests WHERE id = $1', [req.params.id]);
    if (!cur.length) return res.status(404).json({ error: 'الطلب غير موجود' });
    const task = cur[0];
    if (req.user.role !== 'admin' && Number(task.assigned_to) !== req.user.id) {
      return res.status(403).json({ error: 'لا يمكنك تغيير حالة هذه المهمة' });
    }
    await query(
      'UPDATE task_requests SET status = $1, updated_at = $2, updated_by = $3 WHERE id = $4',
      [status, new Date().toISOString(), req.user.id, req.params.id]
    );
    await logActivity(req.user.id, 'حدّث حالة طلب مهمة', 'task_requests', `${req.params.id} -> ${status}`);

    const link = '/task-requests';
    if (req.user.role === 'admin') {
      if (task.assigned_to) {
        await createNotification({ userId: task.assigned_to, title: 'تغيّرت حالة طلب المهمة', body: task.title, link });
      }
    } else {
      await notifyAdmins({ title: 'حدّث العضو حالة طلب مهمة', body: `${task.title} → ${status}`, link });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/deliver', requirePermission('task_requests.view'), async (req, res) => {
  const { delivery_note, delivery_attachment } = req.body;
  try {
    const { rows: cur } = await query('SELECT * FROM task_requests WHERE id = $1', [req.params.id]);
    if (!cur.length) return res.status(404).json({ error: 'الطلب غير موجود' });
    const task = cur[0];
    if (req.user.role !== 'admin' && Number(task.assigned_to) !== req.user.id) {
      return res.status(403).json({ error: 'لا يمكنك تسليم هذه المهمة' });
    }
    await query(
      'UPDATE task_requests SET status = $1, delivery_note = $2, delivery_attachment = $3, updated_at = $4, updated_by = $5 WHERE id = $6',
      ['in_review', delivery_note || '', delivery_attachment || '', new Date().toISOString(), req.user.id, req.params.id]
    );
    await logActivity(req.user.id, 'سلّم طلب مهمة', 'task_requests', task.title);
    await notifyAdmins({ title: 'تم تسليم طلب مهمة', body: `${task.title} — بانتظار المراجعة`, link: '/task-requests' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requirePermission('task_requests.manage'), async (req, res) => {
  try {
    const { rows: cur } = await query('SELECT title FROM task_requests WHERE id = $1', [req.params.id]);
    if (!cur.length) return res.status(404).json({ error: 'الطلب غير موجود' });
    await query('DELETE FROM task_requests WHERE id = $1', [req.params.id]);
    await logActivity(req.user.id, 'حذف طلب مهمة', 'task_requests', cur[0].title);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
