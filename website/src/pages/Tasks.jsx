import React, { useState } from 'react';
import { useData, useMutation } from '../hooks/useData';
import api from '../api';
import {
  Card, Loader, PageHeader, Button, Input, Modal, Badge, Alert, EmptyState, Select, Textarea,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';

const STATUS = {
  pending: { label: 'قيد الانتظار', color: 'gray' },
  in_progress: { label: 'قيد التنفيذ', color: 'blue' },
  completed: { label: 'مكتملة', color: 'green' },
  cancelled: { label: 'ملغاة', color: 'red' },
};
const PRIORITY = {
  low: { label: 'منخفضة', color: 'gray' },
  medium: { label: 'متوسطة', color: 'blue' },
  high: { label: 'عالية', color: 'red' },
};

const empty = { title: '', description: '', assigned_to: '', priority: 'medium', status: 'pending', due_date: '', notes: '' };

export default function Tasks() {
  const { can, user } = useAuth();
  const [filter, setFilter] = useState('');
  const { data: tasks, loading, reload } = useData(() => api.get('/tasks', { params: filter ? { status: filter } : {} }), [filter]);
  const users = useData(() => api.get('/users'));
  const { run, loading: mut } = useMutation();

  const [modal, setModal] = useState(null);
  const [modalId, setModalId] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const canManage = can('tasks.manage');

  if (loading) return <Loader />;

  const members = (users.data || []).filter((u) => u.active);

  const save = async () => {
    if (!form.title) return;
    const payload = {
      ...form,
      assigned_to: form.assigned_to || null,
      due_date: form.due_date || null,
    };
    const r = modal === 'edit'
      ? await run(() => api.put(`/tasks/${modalId}`, payload))
      : await run(() => api.post('/tasks', payload));
    if (r.ok) { setModal(null); reload(); } else setError(r.error);
  };

  const changeStatus = async (id, status) => {
    await run(() => api.put(`/tasks/${id}/status`, { status }));
    reload();
  };

  return (
    <>
      <PageHeader
        title="المهام"
        subtitle="تنظيم وتوزيع مهام الفريق الإعلامي"
        actions={
          <>
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-40">
              <option value="">كل الحالات</option>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
            {canManage && <Button onClick={() => { setForm(empty); setError(''); setModal('new'); }}>+ مهمة جديدة</Button>}
          </>
        }
      />

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      {!tasks?.length && <Card><EmptyState title="لا توجد مهام" sub="ابدأ بإضافة مهمة جديدة" /></Card>}

      <div className="space-y-3">
        {tasks?.map((t) => (
          <Card key={t.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${t.status === 'completed' ? 'bg-emerald-400' : t.status === 'in_progress' ? 'bg-electric-400' : 'bg-gray-600'}`} />
                <div className="min-w-0">
                  <p className={`font-semibold text-gray-100 ${t.status === 'completed' ? 'line-through opacity-60' : ''}`}>{t.title}</p>
                  {t.description && <p className="text-sm text-gray-500 mt-0.5">{t.description}</p>}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge color={PRIORITY[t.priority].color}>{PRIORITY[t.priority].label}</Badge>
                    {t.assigned_name && <span className="text-xs text-gray-500">⇠ {t.assigned_name}</span>}
                    {t.due_date && <span className="text-xs text-gray-600">الموعد: {new Date(t.due_date).toLocaleDateString('ar')}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge color={STATUS[t.status].color}>{STATUS[t.status].label}</Badge>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-white/[0.06] flex flex-wrap gap-2">
              {t.status !== 'completed' && t.status !== 'cancelled' && (
                <>
                  {t.status === 'pending' && (
                    <Button size="sm" variant="secondary" onClick={() => changeStatus(t.id, 'in_progress')}>بدء التنفيذ</Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => changeStatus(t.id, 'completed')}>إكمال</Button>
                </>
              )}
              {canManage && (
                <>
                  <Button size="sm" variant="ghost"
                    onClick={() => { setForm({ title: t.title, description: t.description, assigned_to: t.assigned_to || '', priority: t.priority, status: t.status, due_date: t.due_date || '', notes: t.notes }); setModalId(t.id); setModal('edit'); }}>
                    تعديل
                  </Button>
                  <Button size="sm" variant="danger"
                    onClick={async () => {
                      if (window.confirm('حذف هذه المهمة؟')) { await run(() => api.delete(`/tasks/${t.id}`)); reload(); }
                    }}>
                    حذف
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={!!modal} title={modal === 'edit' ? 'تعديل مهمة' : 'مهمة جديدة'} onClose={() => setModal(null)}
        footer={<>
          <Button variant="ghost" onClick={() => setModal(null)}>إلغاء</Button>
          <Button onClick={save} disabled={mut || !form.title}>{mut ? '...' : 'حفظ'}</Button>
        </>}>
        <div className="space-y-4">
          <Input label="العنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="الوصف" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="الأولوية" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">منخفضة</option>
              <option value="medium">متوسطة</option>
              <option value="high">عالية</option>
            </Select>
            <Select label="الحالة" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </div>
          <Select label="المسند إليه" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
            <option value="">— غير محدد —</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
          <Input label="الموعد النهائي" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          <Textarea label="ملاحظات" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Modal>
    </>
  );
}
