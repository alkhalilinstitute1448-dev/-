export const PERMISSIONS = [
  { key: 'dashboard.view', label: 'لوحة التحكم' },
  { key: 'users.view', label: 'عرض المستخدمين' },
  { key: 'users.manage', label: 'إدارة المستخدمين' },
  { key: 'tasks.view', label: 'عرض المهام' },
  { key: 'tasks.manage', label: 'إدارة المهام' },
  { key: 'lessons.view', label: 'عرض الدروس' },
  { key: 'lessons.manage', label: 'إدارة الدروس' },
  { key: 'attendance.view', label: 'عرض الحضور' },
  { key: 'attendance.manage', label: 'تسجيل الحضور' },
  { key: 'captions.view', label: 'عرض الكابشنات' },
  { key: 'captions.manage', label: 'إدارة الكابشنات' },
  { key: 'reports.view', label: 'التقارير' },
  { key: 'archive.view', label: 'الأرشيف' },
  { key: 'assistant.view', label: 'المساعد الذكي' },
];

export function permissionLabel(key) {
  return PERMISSIONS.find((p) => p.key === key)?.label || key;
}
