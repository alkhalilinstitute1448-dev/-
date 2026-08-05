import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'الآن';
  const m = Math.floor(s / 60);
  if (m < 60) return `قبل ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} س`;
  const d = Math.floor(h / 24);
  return `قبل ${d} يوم`;
}

export default function NotificationBell() {
  const { unreadCount, notifications, fetchList, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const toggle = () => {
    setOpen((o) => !o);
    if (!open) fetchList();
  };

  const handleClick = (n) => {
    if (!n.read) markRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative p-2 rounded-xl bg-white/[0.06] border border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.12] transition-colors"
        title="الإشعارات"
        aria-label="الإشعارات"
      >
        <span className="text-lg leading-none">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-navy-950">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 max-h-[70vh] flex flex-col glass-strong rounded-3xl shadow-glass-lg border border-white/10 animate-[fadeIn_.2s_ease] z-50">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08]">
            <h3 className="text-sm font-bold text-white">الإشعارات</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-royal-300 hover:text-royal-200 transition-colors">
                قراءة الكل
              </button>
            )}
          </div>
          <div className="overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-gray-500">لا توجد إشعارات</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-right px-5 py-3.5 border-b border-white/[0.05] transition-colors hover:bg-white/[0.05] ${n.read ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-royal-400 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-100">{n.title}</p>
                      {n.body && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[11px] text-gray-600 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
