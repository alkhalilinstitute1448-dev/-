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
};

function hasPermission(user, perm) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return Array.isArray(user.permissions) && user.permissions.includes(perm);
}

module.exports = { PERMISSIONS, hasPermission };
