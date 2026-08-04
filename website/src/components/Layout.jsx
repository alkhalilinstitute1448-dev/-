import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../context/SessionContext';
import { Button, Avatar } from './ui';
import Logo from './Logo';

const NAV = [
  { to: '/', key: 'dashboard.view', icon: '◈', label: 'لوحة التحكم', end: true },
  { to: '/work', key: '', icon: '⚙', label: 'وضع العمل', always: true },
  { to: '/users', key: 'users.view', icon: '✧', label: 'أعضاء الفريق' },
  { to: '/registrations', key: 'registrations.view', icon: '✉', label: 'طلبات التسجيل' },
  { to: '/attendance', key: 'attendance.view', icon: '◷', label: 'الحضور والانصراف' },
  { to: '/tasks', key: 'tasks.view', icon: '✓', label: 'المهام' },
  { to: '/lessons', key: 'lessons.view', icon: '▤', label: 'الدروس' },
  { to: '/captions', key: 'captions.view', icon: '❝', label: 'الكابشنات' },
  { to: '/reports', key: 'reports.view', icon: '☰', label: 'التقارير' },
  { to: '/archive', key: 'archive.view', icon: '▣', label: 'الأرشيف' },
  { to: '/assistant', key: 'assistant.view', icon: '✦', label: 'المساعد الذكي' },
];

export default function Layout({ children }) {
  const { user, logout, can } = useAuth();
  const { status, toast } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((n) => n.always || can(n.key));

  const dotColor = status === 'in_room' ? 'bg-emerald-400 shadow-glow-green' : 'bg-gray-600';
  const statusLabel = status === 'in_room' ? 'في جلسة عمل' : 'خارج العمل';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen" dir="rtl">
      <aside
        className={`fixed inset-y-0 right-0 z-40 w-64 bg-navy-900/85 backdrop-blur-2xl border-r border-white/[0.07] transform transition-transform duration-300 flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-5 py-6 border-b border-white/[0.07]">
          <NavLink to="/" className="block" onClick={() => setOpen(false)}>
            <Logo size="md" />
          </NavLink>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-royal-500/15 text-white border border-royal-400/25 shadow-inner'
                    : 'text-gray-400 hover:bg-white/[0.05] hover:text-gray-200 border border-transparent'
                }`
              }
            >
              <span className="text-lg leading-none opacity-80">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/[0.07]">
          <div className="bg-navy-850/70 backdrop-blur-md rounded-2xl p-3.5 border border-white/[0.06]">
            <div className="flex items-center gap-3">
              <Avatar user={user} size="md" statusDot dotClass={dotColor} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[11px] text-royal-300">{user?.role === 'admin' ? 'مدير' : 'عضو'}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[11px] text-gray-500">{statusLabel}</span>
              <div className="flex gap-1">
                <NavLink to="/profile" className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors" title="صفحة العضو">
                  ♟
                </NavLink>
                <button onClick={handleLogout} className="p-1.5 rounded-lg text-gray-500 hover:text-red-300 hover:bg-red-500/10 transition-colors" title="تسجيل الخروج">
                  ⏻
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-navy-950/60 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}

      <div className="lg:mr-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8 py-4 bg-navy-950/70 backdrop-blur-xl border-b border-white/[0.06]">
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden px-3 py-2 rounded-xl bg-white/[0.06] text-electric-300 text-lg"
            aria-label="القائمة"
          >
            ☰
          </button>
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
            <span className="text-gray-600">أهلاً بك،</span>
            <span className="text-white font-semibold">{user?.name}</span>
            <span className="mx-2 text-gray-700">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${status === 'in_room' ? 'bg-emerald-400' : 'bg-gray-600'}`} />
              {statusLabel}
            </span>
          </div>
          <Avatar user={user} size="sm" statusDot dotClass={status === 'in_room' ? 'bg-emerald-400' : 'bg-gray-600'} />
        </header>

        <main className="flex-1 px-4 sm:px-8 py-7 max-w-6xl w-full mx-auto page-enter">{children}</main>
        <footer className="px-8 py-5 text-center text-[11px] text-gray-700 border-t border-white/[0.04]">
          Al-Khalil Media ✦ نظام إدارة الفريق الإعلامي
        </footer>
      </div>

      {toast && (
        <div
          className="fixed bottom-6 right-1/2 translate-x-1/2 z-[60] px-5 py-3.5 rounded-2xl glass-strong border shadow-glass-lg text-sm animate-[fadeInUp_.3s_ease]"
          style={{
            borderColor:
              toast.type === 'success' ? 'rgba(34,197,94,0.4)' : toast.type === 'warning' ? 'rgba(245,158,11,0.4)' : 'rgba(88,101,242,0.4)',
            color: toast.type === 'success' ? '#6ee7b7' : toast.type === 'warning' ? '#fcd34d' : '#c7d2fe',
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
