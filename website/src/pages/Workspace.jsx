import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import api from '../api';
import { Card, Loader, Button, Badge, EmptyState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../context/SessionContext';
import { formatDuration } from '../utils/time';

const TASK_STATUS = {
  pending: { label: 'قيد الانتظار', color: 'gray' },
  in_progress: { label: 'قيد التنفيذ', color: 'blue' },
  completed: { label: 'مكتملة', color: 'green' },
  cancelled: { label: 'ملغاة', color: 'red' },
};

export default function Workspace() {
  const { user } = useAuth();
  const { status, geo, sessionSeconds, endSession, requestLocation, permission } = useSession();
  const { data, loading } = useData(() => api.get('/dashboard'));
  const tasks = useData(() => api.get('/tasks'));

  if (loading) return <Loader />;

  const s = data?.stats;
  const active = status === 'in_room';
  const myTasks = (tasks.data || [])
    .filter((t) => t.assigned_to === user?.id && (t.status === 'pending' || t.status === 'in_progress'))
    .slice(0, 8);
  const duration = formatDuration(sessionSeconds);

  return (
    <div dir="rtl" className="space-y-6">
      {/* Hero */}
      <Card className="relative overflow-hidden p-8 sm:p-10">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(700px 300px at 80% 0%, rgba(16,185,129,0.12), transparent 60%)' }}
        />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded-full bg-emerald-400 animate-[pulseSoft_2.2s_infinite]" />
              <span className="text-emerald-300 font-bold">وضع العمل</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white mt-3">
              {active ? 'أنت في جلسة عمل الآن ✦' : 'وضع خارج العمل'}
            </h1>
            <p className="text-gray-400 mt-2 text-sm">
              {active
                ? `مدة جلستك منذ دخولك ${geo?.name}`
                : 'أنت خارج نطاق غرفة الإعلام — يمكنك متابعة المهام والدروس دون تسجيل جلسة.'}
            </p>
            {!active && (permission === 'denied' || permission === 'prompt') && (
              <Button className="mt-4" onClick={requestLocation}>تفعيل الموقع</Button>
            )}
          </div>
          <div className="shrink-0 flex flex-col items-center gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-2 tracking-wide">مدة الجلسة الحالية</div>
              <div className="font-extrabold text-white leading-none text-6xl sm:text-7xl tabular-nums">
                {active ? duration.text : '—'}
              </div>
            </div>
            {active && (
              <Button variant="danger" size="lg" className="px-8" onClick={endSession}>
                إنهاء جلسة العمل
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-xs text-gray-500">مهامي قيد التنفيذ</div>
          <div className="text-3xl font-extrabold text-white mt-1">{s?.my_tasks?.in_progress ?? 0}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs text-gray-500">مهامي المكتملة</div>
          <div className="text-3xl font-extrabold text-white mt-1">{s?.my_tasks?.completed ?? 0}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs text-gray-500">حضور اليوم</div>
          <div className="text-3xl font-extrabold text-white mt-1">{s?.present_today ?? 0}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs text-gray-500">ساعات عمل الفريق</div>
          <div className="text-3xl font-extrabold text-white mt-1">{s?.work_hours_today ?? 0}</div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Tasks */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white text-lg">مهام اليوم</h2>
            <Link to="/tasks" className="text-sm text-electric-300 hover:text-electric-200">إدارة المهام ←</Link>
          </div>
          {!myTasks.length && <EmptyState title="لا توجد مهام مخصصة لك" sub="مهامك تظهر هنا فور إسنادها لك" />}
          <ul className="space-y-2.5">
            {myTasks.map((t) => (
              <li key={t.id} className="glass rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-sm text-gray-200 truncate">{t.title}</span>
                <Badge color={TASK_STATUS[t.status].color}>{TASK_STATUS[t.status].label}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        {/* Next lesson */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white text-lg">الدرس القادم</h2>
            <Link to="/lessons" className="text-sm text-electric-300 hover:text-electric-200">كل الدروس ←</Link>
          </div>
          {!s?.next_lesson ? (
            <EmptyState title="لا توجد دروس مجدولة" />
          ) : (
            <div className="glass rounded-2xl p-6 text-center">
              <div className="text-2xl font-extrabold text-white">{s.next_lesson.title}</div>
              <div className="flex flex-wrap justify-center gap-2 mt-4 text-xs">
                <Badge color="indigo">{s.next_lesson.type === 'live' ? 'بث مباشر' : 'درس مسجل'}</Badge>
                {s.next_lesson.presenter && <Badge color="blue">مقدم: {s.next_lesson.presenter}</Badge>}
                {s.next_lesson.date && <Badge color="gray">{new Date(s.next_lesson.date).toLocaleDateString('ar')}</Badge>}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Notifications */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white text-lg">آخر الإشعارات والنشاطات</h2>
        </div>
        {!data?.recentActivity?.length && <EmptyState title="لا توجد إشعارات بعد" />}
        <div className="grid sm:grid-cols-2 gap-3">
          {data?.recentActivity?.slice(0, 8).map((a) => (
            <div key={a.id} className="glass rounded-2xl px-4 py-3 flex items-start gap-3">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-electric-400 shrink-0" />
              <div>
                <p className="text-sm text-gray-200">{a.action}</p>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  {a.details ? `${a.details} · ` : ''}{new Date(a.created_at).toLocaleString('ar')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
