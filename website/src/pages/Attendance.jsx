import React, { useState } from 'react';
import { useData, useMutation } from '../hooks/useData';
import api from '../api';
import { Card, Loader, PageHeader, Button, Alert, Badge, EmptyState } from '../components/ui';
import { useAuth } from '../context/AuthContext';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function Attendance() {
  const { can } = useAuth();
  const [date, setDate] = useState(today());
  const { data, loading, reload } = useData(() => api.get('/attendance', { params: { date } }), [date]);
  const me = useData(() => api.get('/attendance/me'));
  const { run, loading: mut, error, setError } = useMutation();

  const doCheck = async (action) => {
    setError('');
    const r = await run(() => api.post(`/attendance/${action}`));
    if (r.ok) {
      me.reload();
      reload();
    }
  };

  if (loading) return <Loader />;

  const present = data?.filter((a) => a.check_in && !a.check_out).length;

  return (
    <>
      <PageHeader
        title="الحضور والانصراف"
        subtitle="تسجيل حضور الأعضاء ومتابعته يوميًا"
        actions={
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="rounded-xl bg-dark-900 border border-dark-600 px-3.5 py-2.5 text-sm text-gray-100 outline-none focus:border-gold-500/60" />
        }
      />

      {can('attendance.manage') && (
        <Card className="p-6 mb-6">
          <h3 className="font-bold text-gold-200 mb-1">تسجيلي اليوم</h3>
          {me.data?.today ? (
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <Badge color={me.data.today.check_out ? 'green' : 'blue'}>
                {me.data.today.check_out ? 'منصرف' : 'حاضر'}
              </Badge>
              <span className="text-sm text-gray-400">
                دخول: {me.data.today.check_in || '—'}
                {me.data.today.check_out && <> | خروج: {me.data.today.check_out}</>}
              </span>
              {!me.data.today.check_out && (
                <Button onClick={() => doCheck('check-out')} disabled={mut}>
                  {mut ? '...' : 'تسجيل انصراف'}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 mt-3">
              <p className="text-sm text-gray-500">لم تسجل حضورك بعد</p>
              <Button onClick={() => doCheck('check-in')} disabled={mut}>
                {mut ? '...' : 'تسجيل حضور'}
              </Button>
            </div>
          )}
          {error && <div className="mt-3"><Alert type="error">{error}</Alert></div>}
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gold-200">سجل الحضور</h3>
          <div className="flex items-center gap-3">
            <Badge color="green">حاضرون الآن: {present ?? 0}</Badge>
            <Badge color="gray">المجموع: {data?.length ?? 0}</Badge>
          </div>
        </div>

        {!data?.length && <EmptyState title="لا يوجد حضور في هذا اليوم" />}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-gray-500 border-b border-dark-700/60">
                <th className="py-3 px-3 font-medium">العضو</th>
                <th className="py-3 px-3 font-medium">الدخول</th>
                <th className="py-3 px-3 font-medium">الخروج</th>
                <th className="py-3 px-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((a) => (
                <tr key={a.id} className="border-b border-dark-800/60 hover:bg-dark-900/40">
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
