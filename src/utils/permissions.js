const PERMISSIONS = {
  'dashboard.view': 'لوحة التحكم',
  'users.view': 'عرض المستخدمين',
  'users.manage': 'إدارة المستخدمين',
  'tasks.view': 'عرض المهام',
  'tasks.manage': 'إدارة المهام',
  'lessons.view': 'عرض الدروس',
  'lessons.manage': 'إدارة الدروس',
  'attendance.view': 'عرض الحضور',
  'attendance.manage': 'إدارة الحضور',
  'captions.view': 'عرض الكابشنات',
  'captions.manage': 'إدارة الكابشنات',
  'reports.view': 'التقارير',
  'archive.view': 'الأرشيف',
  'assistant.view': 'المساعد الذكي',
  'registrations.view': 'عرض طلبات التسجيل',
  'registrations.manage': 'إدارة طلبات التسجيل',
};

function hasPermission(user, perm) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  let perms = user.permissions;
  if (typeof perms === 'string') {
    try {
      perms = JSON.parse(perms);
    } catch {
      perms = [];
    }
  }
  return Array.isArray(perms) && perms.includes(perm);
}

module.exports = { PERMISSIONS, hasPermission };
