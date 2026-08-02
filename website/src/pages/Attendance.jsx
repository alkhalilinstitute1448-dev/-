import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData, useMutation } from '../hooks/useData';
import api from '../api';
import { Card, Loader, PageHeader, Button, Alert, Badge, EmptyState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../context/SessionContext';
import { formatDuration } from '../utils/time';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function Attendance() {
  const { can } = useAuth();
  const { status, sessionSeconds, checkIn } = useSession();
  const [date, setDate] = useState(today());
  const { data, loading, reload } = useData(() => api.get('/attendance', { params: { date } }), [date]);
  const me = useData(() => api.get('/attendance/me'));
  const { run, loading: mut, error, setError } = useMutation();

  const doCheckOut = async () => {
    setError('');
    const r = await run(() => api.post('/attendance/check-out'));
    if (r.ok) {
      me.reload();
      reload();
    }
  };

  if (loading) return <Loader />;

  const present = data?.filter((a) => a.check_in && !a.check_out).length;
  const active = status === 'in_room';

  return (
    <>
      <PageHeader
        title="الحضور والانصراف"
        subtitle="تسجيل الحضور ومتابعته يوميًا"
        actions={
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="rounded-2xl bg-navy-900/70 border border-white/10 focus:border-royal-400/60 focus:ring-2 focus:ring-royal-500/20 px-4 py-2.5 text-sm text-gray-100 outline-none transition-all" />
        }
      />

      <Card className="p-6 mb-6">
        <h3 className="font-bold text-white mb-1">تسجيلي اليوم</h3>
        <div className="flex flex-wrap items-center gap-3 mt-3">
          {me.data?.today ? (
            <>
              <Badge color={me.data.today.check_out ? 'green' : 'blue'}>
                {me.data.today.check_out ? 'منصرف' : 'حاضر'}
              </Badge>
              <span className="text-sm text-gray-400">
                دخول: {me.data.today.check_in || '—'}
                {me.data.today.check_out && <> | خروج: {me.data.today.check_out}</>}
              </span>
              {active && (
                <>
                  <span className="text-sm text-emerald-300 font-semibold tabular-nums">
                    {formatDuration(sessionSeconds).text}
                  </span>
                  <Button variant="danger" onClick={doCheckOut} disabled={mut}>
                    {mut ? '...' : 'تسجيل انصراف'}
                  </Button>
                </>
              )}
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-gray-500">
                سجّل حضورك يدويًا لبدء جلسة عمل اليوم
              </p>
              {!active && (
                <Button onClick={checkIn} disabled={status === 'checking'}>
                  {status === 'checking' ? 'جارِ التسجيل...' : 'تسجيل الحضور'}
                </Button>
              )}
              {active && (
                <Link to="/work">
                  <Button>الانتقال لوضع العمل</Button>
                </Link>
              )}
            </div>
          )}
        </div>
        {error && <div className="mt-3"><Alert type="error">{error}</Alert></div>}
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white">سجل الحضور</h3>
          <div className="flex items-center gap-3">
            <Badge color="green">حاضرون الآن: {present ?? 0}</Badge>
            <Badge color="gray">المجموع: {data?.length ?? 0}</Badge>
          </div>
        </div>

        {!data?.length && <EmptyState title="لا يوجد حضور في هذا اليوم" />}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-gray-500 border-b border-white/[0.08]">
                <th className="py-3 px-3 font-medium">العضو</th>
                <th className="py-3 px-3 font-medium">الدخول</th>
                <th className="py-3 px-3 font-medium">الخروج</th>
                <th className="py-3 px-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((a) => (
                <tr key={a.id} className="border-b border-white/[0.06] hover:bg-white/[0.03]">
                  <td className="py-3 px-3 text-gray-200">{a.user_name}</td>
                  <td className="py-3 px-3 text-gray-400">{a.check_in || '—'}</td>
                  <td className="py-3 px-3 text-gray-400">{a.check_out || '—'}</td>
                  <td className="py-3 px-3">
                    <Badge color={a.status === 'present' ? 'green' : a.status === 'late' ? 'orange' : 'red'}>
                      {a.status === 'present' ? 'حاضر' : a.status === 'late' ? 'متأخر' : a.status === 'leave' ? 'إجازة' : 'غائب'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
