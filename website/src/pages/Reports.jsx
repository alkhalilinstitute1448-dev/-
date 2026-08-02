import React from 'react';
import { useData } from '../hooks/useData';
import api from '../api';
import { Card, Loader, PageHeader, EmptyState } from '../components/ui';

export default function Reports() {
  const att = useData(() => api.get('/reports/attendance'));
  const tasks = useData(() => api.get('/reports/tasks'));

  if (att.loading || tasks.loading) return <Loader />;

  const attRows = att.data || [];
  const taskRows = tasks.data || [];

  return (
    <>
      <PageHeader title="التقارير" subtitle="ملخصات الأداء والحضور لأعضاء الفريق" />

      <Card className="p-6 mb-6">
        <h3 className="font-bold text-white mb-4">تقرير الحضور</h3>
        {!attRows.length && <EmptyState title="لا توجد بيانات حضور" />}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-gray-500 border-b border-white/[0.08]">
                <th className="py-3 px-3 font-medium">العضو</th>
                <th className="py-3 px-3 font-medium">أيام الحضور</th>
                <th className="py-3 px-3 font-medium">أيام مكتملة (دخول وخروج)</th>
                <th className="py-3 px-3 font-medium">إجمالي الأيام</th>
              </tr>
            </thead>
            <tbody>
              {attRows.map((r) => (
                <tr key={r.id} className="border-b border-white/[0.06] hover:bg-white/[0.03]">
                  <td className="py-3 px-3 text-gray-200">{r.name}</td>
                  <td className="py-3 px-3 text-royal-300 font-semibold">{r.present_days}</td>
                  <td className="py-3 px-3 text-gray-400">{r.completed_days}</td>
                  <td className="py-3 px-3 text-gray-400">{r.total_days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-white mb-4">تقرير المهام</h3>
        {!taskRows.length && <EmptyState title="لا توجد بيانات مهام" />}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-gray-500 border-b border-white/[0.08]">
                <th className="py-3 px-3 font-medium">العضو</th>
                <th className="py-3 px-3 font-medium">الإجمالي</th>
                <th className="py-3 px-3 font-medium">مكتملة</th>
                <th className="py-3 px-3 font-medium">قيد التنفيذ</th>
                <th className="py-3 px-3 font-medium">معلقة</th>
              </tr>
            </thead>
            <tbody>
              {taskRows.map((r) => (
                <tr key={r.id} className="border-b border-white/[0.06] hover:bg-white/[0.03]">
                  <td className="py-3 px-3 text-gray-200">{r.name}</td>
                  <td className="py-3 px-3 text-royal-300 font-semibold">{r.total}</td>
                  <td className="py-3 px-3 text-emerald-400">{r.completed}</td>
                  <td className="py-3 px-3 text-electric-400">{r.in_progress}</td>
                  <td className="py-3 px-3 text-gray-400">{r.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
