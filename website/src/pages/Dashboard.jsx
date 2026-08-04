import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../hooks/useData';
import api from '../api';
import { Card, Loader, PageHeader, Button, Badge, EmptyState, StatCard, Avatar } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../context/SessionContext';
import { formatDuration } from '../utils/time';

const TASK_STATUS = {
  pending: { label: 'قيد الانتظار', color: 'gray' },
  in_progress: { label: 'قيد التنفيذ', color: 'blue' },
  completed: { label: 'مكتملة', color: 'green' },
  cancelled: { label: 'ملغاة', color: 'red' },
};

const PRESENCE_META = {
  in_room: { label: 'في جلسة عمل', color: 'green', dot: 'bg-emerald-400' },
  online: { label: 'متصل', color: 'blue', dot: 'bg-electric-400' },
  offline: { label: 'غير متصل', color: 'gray', dot: 'bg-gray-600' },
};

export default function Dashboard() {
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const session = useSession();
  const { status, sessionSeconds, session: activeSession, checkIn, endSession } = session;

  const { data, loading } = useData(() => api.get('/dashboard'));
  const tasks = useData(() => api.get('/tasks'));
  const presence = useData(() => api.get('/attendance/presence'));

  const prevActive = useRef(false);
  const active = status === 'in_room';

  useEffect(() => {
    if (active && !prevActive.current) navigate('/work');
    prevActive.current = active;
  }, [active, navigate]);

  useEffect(() => {
    const t = setInterval(() => presence.reload(), 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Loader />;

  const s = data?.stats;
  const myTasks = (tasks.data || []).filter((t) => t.assigned_to === user?.id && (t.status === 'pending' || t.status === 'in_progress')).slice(0, 5);
  const duration = formatDuration(activeSession?.session_start ? sessionSeconds : 0);
  const members = presence.data || [];
  const onlineCount = members.filter((m) => m.status !== 'offline').length;

  return (
    <>
      <PageHeader title="لوحة التحكم" subtitle="مركز عمل الفريق الإعلامي — حالة حية" />

      {/* Hero status + timer */}
      <Card className="p-6 sm:p-8 lg:p-10 mb-6 overflow-hidden relative border-white/[0.1]">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(700px 260px at 18% 0%, rgba(63,107,255,0.2), transparent 60%), radial-gradient(500px 240px at 90% 110%, rgba(110,168,255,0.1), transparent 60%)',
          }}
        />
        <img
          src="/logo.png"
          alt=""
          aria-hidden="true"
          className="absolute -left-10 -bottom-14 w-56 h-56 object-contain opacity-[0.05] pointer-events-none"
        />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-8">
          {/* Status section */}
          <div className="flex-1">
            {active ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-emerald-400 animate-[pulseSoft_2.2s_infinite]" />
                  <span className="text-emerald-300 font-semibold text-lg">في جلسة عمل</span>
                </div>
                <p className="text-white text-2xl font-extrabold mt-3 tracking-tight">تم تسجيل حضورك بنجاح ✦</p>
                <p className="text-gray-400 mt-2.5 flex items-center gap-2 text-sm">
                  <span className="text-royal-400">◉</span> يمكنك متابعة مهامك والدروس من صفحة وضع العمل
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-gray-600" />
                  <span className="text-gray-200 font-semibold text-lg">
                    {status === 'checking' ? 'جارِ تسجيل حضورك...' : 'خارج العمل'}
                  </span>
                </div>
                <p className="text-gray-400 mt-3 max-w-md text-sm leading-relaxed">
                  سجّل حضورك لبدء جلسة عمل ومتابعة مهامك، أو تصفح المهام والدروس بحرية دون تسجيل جلسة.
                </p>
                {!active && (
                  <Button className="mt-4" onClick={checkIn} disabled={status === 'checking'}>
                    {status === 'checking' ? 'جارِ التسجيل...' : 'تسجيل الحضور'}
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Timer + end session */}
          <div className="shrink-0 flex flex-col items-center gap-5">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-3 tracking-wide">مدة جلسة العمل</div>
              <div className="font-extrabold text-white leading-none text-5xl sm:text-6xl lg:text-7xl tabular-nums">
                {active ? duration.text : '—'}
              </div>
            </div>
            {active && (
              <Button variant="danger" size="lg" className="px-8" onClick={endSession}>إنهاء جلسة العمل</Button>
            )}
          </div>
        </div>
      </Card>

      {/* 6 stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard icon="✧" label="عدد الأعضاء" value={s?.users ?? 0} accent="royal" to={can('users.view') ? '/users' : undefined} />
        <StatCard icon="◷" label="الحضور اليوم" value={s?.present_today ?? 0} accent="emerald" to={can('attendance.view') ? '/attendance' : undefined} />
        <StatCard icon="✓" label="المهام الحالية" value={s?.tasks?.in_progress ?? 0} accent="indigo" to={can('tasks.view') ? '/tasks' : undefined} />
        <StatCard icon="⚠" label="مهام متأخرة" value={s?.tasks?.overdue ?? 0} accent="amber" to={can('tasks.view') ? '/tasks' : undefined} />
        <StatCard icon="⌛" label="ساعات العمل اليوم" value={s?.work_hours_today ?? 0} accent="electric" sub="ساعة" />
        <StatCard icon="▤" label="الدرس القادم" value={s?.next_lesson ? s?.next_lesson?.type === 'live' ? 'بث' : 'درس' : '—'} accent="royal" to={can('lessons.view') ? '/lessons' : undefined} sub={s?.next_lesson?.title || 'لا يوجد'} />
      </div>

      {/* 3 big cards */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">مهام اليوم</h3>
            <Link to="/tasks" className="text-sm text-electric-300 hover:text-electric-200">الكل ←</Link>
          </div>
          {!myTasks.length && <EmptyState title="لا توجد مهام مخصصة لك اليوم" sub="سيتم إظهار مهامك هنا" />}
          <ul className="space-y-2.5">
            {myTasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 glass rounded-2xl px-4 py-3">
                <span className="text-sm text-gray-200 truncate">{t.title}</span>
                <Badge color={TASK_STATUS[t.status].color}>{TASK_STATUS[t.status].label}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">الدرس القادم</h3>
            <Link to="/lessons" className="text-sm text-electric-300 hover:text-electric-200">الكل ←</Link>
          </div>
          {!s?.next_lesson ? (
            <EmptyState title="لا توجد دروس مجدولة" />
          ) : (
            <div className="glass rounded-2xl p-5">
              <div className="text-lg font-bold text-white">{s.next_lesson.title}</div>
              <div className="flex flex-wrap gap-2 mt-3 text-xs">
                <span className="chip text-indigo-300 bg-indigo-500/10 border-indigo-500/30">
                  {s.next_lesson.type === 'live' ? 'بث مباشر' : 'درس مسجل'}
                </span>
                {s.next_lesson.presenter && (
                  <span className="chip text-gray-400 bg-white/[0.04] border-white/10">مقدم: {s.next_lesson.presenter}</span>
                )}
                {s.next_lesson.date && (
                  <span className="chip text-gray-400 bg-white/[0.04] border-white/10">{new Date(s.next_lesson.date).toLocaleDateString('ar')}</span>
                )}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">آخر النشاطات</h3>
          </div>
          {!data?.recentActivity?.length && <EmptyState title="لا توجد نشاطات بعد" />}
          <ul className="space-y-2">
            {data?.recentActivity?.slice(0, 6).map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2 border-b border-white/[0.05] last:border-0">
                <span className="w-2 h-2 rounded-full bg-royal-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-300 truncate">{a.action}</p>
                  <p className="text-[11px] text-gray-600">{new Date(a.created_at).toLocaleString('ar')}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Team + notifications */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">أعضاء الفريق</h3>
            <span className="chip text-emerald-300 bg-emerald-500/10 border-emerald-500/30">{onlineCount} متصل الآن</span>
          </div>
          {!members.length && <EmptyState title="لا يوجد أعضاء" />}
          <div className="grid sm:grid-cols-2 gap-3">
            {members.map((m) => {
              const meta = PRESENCE_META[m.status] || PRESENCE_META.offline;
              return (
                <div key={m.id} className="glass rounded-2xl p-4 flex items-center gap-3">
                  <Avatar user={m} size="md" statusDot dotClass={meta.dot} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{m.name}</p>
                    <p className="text-[11px] text-gray-500">{meta.label}</p>
                  </div>
                  {m.active && (
                    <div className="mr-auto text-left">
                      <p className="text-[11px] text-gray-600">{m.current_task ? 'مهمة جارية' : '—'}</p>
                      <p className="text-[11px] text-emerald-300 tabular-nums">
                        {formatDuration(m.session_seconds).text}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">الإشعارات</h3>
            <span className="text-royal-300">◉</span>
          </div>
          {!data?.recentActivity?.length && <EmptyState title="لا توجد إشعارات" />}
          <ul className="space-y-3">
            {data?.recentActivity?.slice(0, 5).map((a) => (
              <li key={`n-${a.id}`} className="flex gap-3 items-start">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-electric-400 shrink-0" />
                <div>
                  <p className="text-sm text-gray-300">{a.action}</p>
                  <p className="text-[11px] text-gray-600">{a.details || ''}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
