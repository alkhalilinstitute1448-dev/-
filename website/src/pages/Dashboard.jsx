import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import api from '../api';
import { Card, Loader, PageHeader, EmptyState, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const TASK_STATUS = {
  pending: { label: 'قيد الانتظار', color: 'gray' },
  in_progress: { label: 'قيد التنفيذ', color: 'blue' },
  completed: { label: 'مكتملة', color: 'green' },
  cancelled: { label: 'ملغاة', color: 'red' },
};

export default function Dashboard() {
  const { user, can } = useAuth();
  const { data, loading } = useData(() => api.get('/dashboard'));

  if (loading) return <Loader />;
  const s = data?.stats;

  const cards = [
    { label: 'الأعضاء', value: s?.users ?? 0, icon: '✧', to: '/users', visible: can('users.view') },
    { label: 'مهام قيد التنفيذ', value: s?.tasks?.in_progress ?? 0, icon: '✓', to: '/tasks', visible: can('tasks.view') },
    { label: 'مهام مكتملة', value: s?.tasks?.completed ?? 0, icon: '✔', to: '/tasks', visible: can('tasks.view') },
    { label: 'الدروس', value: s?.lessons ?? 0, icon: '▤', to: '/lessons', visible: can('lessons.view') },
    { label: 'الكابشنات', value: s?.captions ?? 0, icon: '❝', to: '/captions', visible: can('captions.view') },
    { label: 'حاضرون اليوم', value: s?.present_today ?? 0, icon: '◷', to: '/attendance', visible: can('attendance.view') },
  ];

  return (
    <>
      <PageHeader
        title="لوحة التحكم"
        subtitle={`مرحباً ${user?.name} — إليك نظرة عامة على الفريق`}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards
          .filter((c) => c.visible)
          .map((c) => (
            <Link key={c.label} to={c.to} className="block">
              <Card className="p-5 hover:shadow-card-hover hover:border-gold-500/25 transition-all">
                <div className="text-2xl text-gold-500/80 mb-2">{c.icon}</div>
                <div className="text-3xl font-extrabold text-gold-200">{c.value}</div>
                <div className="text-sm text-gray-500 mt-1">{c.label}</div>
              </Card>
            </Link>
          ))}
      </div>

      {can('tasks.view') && (
        <Card className="mt-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gold-200">مهامي</h3>
            <Link to="/tasks" className="text-sm text-gold-500 hover:text-gold-400">
              عرض الكل ←
            </Link>
          </div>
          <div className="flex flex-wrap gap-3">
            {['pending', 'in_progress', 'completed'].map((k) => (
              <div key={k} className="flex items-center gap-2">
                <Badge color={TASK_STATUS[k].color}>{TASK_STATUS[k].label}</Badge>
                <span className="text-lg font-bold text-gray-300">{s?.my_tasks?.[k] ?? 0}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="mt-6 p-6">
        <h3 className="font-bold text-gold-200 mb-4">آخر النشاطات</h3>
        {!data?.recentActivity?.length && <EmptyState title="لا توجد نشاطات بعد" />}
        <ul className="space-y-3">
          {data?.recentActivity?.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2 border-b border-dark-800 last:border-0">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-dark-800 flex items-center justify-center text-xs text-gold-400">
                  ✦
                </span>
                <div>
                  <p className="text-sm text-gray-300">{a.action}</p>
                  {a.details && <p className="text-xs text-gray-600">{a.details}</p>}
                </div>
              </div>
              <span className="text-xs text-gray-600 shrink-0">{new Date(a.created_at).toLocaleString('ar')}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
