import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/', key: 'dashboard.view', icon: '◈', label: 'لوحة التحكم' },
  { to: '/profile', icon: '♟', label: 'صفحة العضو', always: true },
  { to: '/attendance', key: 'attendance.view', icon: '◷', label: 'الحضور والانصراف' },
  { to: '/tasks', key: 'tasks.view', icon: '✓', label: 'المهام' },
  { to: '/lessons', key: 'lessons.view', icon: '▤', label: 'الدروس' },
  { to: '/captions', key: 'captions.view', icon: '❝', label: 'الكابشنات' },
  { to: '/reports', key: 'reports.view', icon: '☰', label: 'التقارير' },
  { to: '/archive', key: 'archive.view', icon: '▣', label: 'الأرشيف' },
  { to: '/users', key: 'users.view', icon: '✧', label: 'إدارة المستخدمين' },
  { to: '/assistant', key: 'assistant.view', icon: '✦', label: 'المساعد الذكي' },
];

export default function Layout({ children }) {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((n) => n.always || can(n.key));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-dark-950" dir="rtl">
      <aside
        className={`fixed inset-y-0 right-0 z-40 w-64 transform bg-dark-900/95 border-l border-dark-700/60 backdrop-blur transition-transform duration-200 flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-6 py-6 border-b border-dark-700/60">
          <div className="text-xl font-extrabold text-gold-200">
            AL-KHALIL MEDIA <span className="text-gold-500">✦</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">نظام إدارة الفريق الإعلامي</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors ${
                  isActive
                    ? 'bg-gold-500/10 text-gold-300 border border-gold-500/25'
                    : 'text-gray-400 hover:bg-dark-800 hover:text-gold-200 border border-transparent'
                }`
              }
            >
              <span className="text-lg leading-none opacity-80">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-dark-700/60">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gold-500/15 border border-gold-500/30 flex items-center justify-center text-gold-300 font-bold">
              {user?.name?.charAt(0) || 'م'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-200 truncate">{user?.name}</p>
              <p className="text-xs text-gold-500/80">{user?.role === 'admin' ? 'مدير' : 'عضو'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm bg-dark-800 text-gray-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="lg:mr-64">
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-4 bg-dark-950/80 backdrop-blur border-b border-dark-800">
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden px-3 py-2 rounded-lg bg-dark-800 text-gold-300 text-lg"
            aria-label="القائمة"
          >
            ☰
          </button>
          <div className="text-sm text-gray-500 hidden sm:block">
            أهلاً بك، <span className="text-gold-300">{user?.name}</span>
          </div>
          <div className="text-gold-400 text-sm font-semibold">✦ AL-KHALIL MEDIA</div>
        </header>
        <main className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
