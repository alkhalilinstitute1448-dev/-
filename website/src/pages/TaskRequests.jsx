import React, { useState } from 'react';
import { useData, useMutation } from '../hooks/useData';
import api from '../api';
import { Card, Loader, PageHeader, Button, Input, Modal, Badge, Alert, EmptyState, Select, Textarea, StatCard } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const TYPE = {
  design: { label: 'تصميم', color: 'indigo' },
  editing: { label: 'مونتاج', color: 'blue' },
  live: { label: 'بث مباشر', color: 'red' },
  filming: { label: 'تصوير', color: 'amber' },
  writing: { label: 'كتابة', color: 'green' },
  management: { label: 'إدارة', color: 'gray' },
  other: { label: 'أخرى', color: 'gray' },
};
const PRIORITY = {
  normal: { label: 'عادية', color: 'gray' },
  important: { label: 'مهمة', color: 'blue' },
  urgent: { label: 'عاجلة', color: 'red' },
};
const STATUS = {
  new: { label: 'جديدة', color: 'blue' },
  in_progress: { label: 'قيد التنفيذ', color: 'amber' },
  in_review: { label: 'بانتظار المراجعة', color: 'indigo' },
  completed: { label: 'مكتملة', color: 'green' },
  rejected: { label: 'مرفوضة', color: 'red' },
};

const empty = { title: '', description: '', type: 'other', priority: 'normal', due_date: '', assigned_to: '', status: '' };

function toInputDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('ar', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function TaskRequests() {
  const { user, can } = useAuth();
  const { taskCounts, refreshCounts } = useNotifications();
  const canManage = can('task_requests.manage');
  const isAdmin = user?.role === 'admin';

  const [filterStatus, setFilterStatus] = useState('');
  const [filterMember, setFilterMember] = useState('');
  const [search, setSearch] = useState('');

  const { data: tasks, loading, reload } = useData(
    () => api.get('/task-requests', { params: { status: filterStatus || undefined, member: filterMember || undefined, q: search || undefined } }),
    [filterStatus, filterMember, search]
  );
  const members = useData(() => api.get('/task-requests/members'));
  const { run, loading: mut } = useMutation();

  const [modal, setModal] = useState(null); // 'new' | 'edit' | 'deliver'
  const [modalId, setModalId] = useState(null);
  const [form, setForm] = useState(empty);
  const [deliverForm, setDeliverForm] = useState({ note: '', attachment: '' });
  const [error, setError] = useState('');

  if (loading) return <Loader />;

  const people = members.data || [];

  const openCreate = () => { setForm(empty); setError(''); setModal('new'); };

  const openEdit = (t) => {
    setForm({
      title: t.title, description: t.description || '', type: t.type, priority: t.priority,
      due_date: toInputDate(t.due_date), assigned_to: t.assigned_to ? String(t.assigned_to) : '',
      status: t.status,
    });
    setError('');
    setModalId(t.id);
    setModal('edit');
  };

  const openDeliver = (t) => {
    setDeliverForm({ note: t.delivery_note || '', attachment: '' });
    setError('');
    setModalId(t.id);
    setModal('deliver');
  };

  const save = async () => {
    if (!form.title.trim()) { setError('عنوان المهمة مطلوب'); return; }
    const payload = {
      title: form.title.trim(),
      description: form.description,
      type: form.type,
      priority: form.priority,
      due_date: form.due_date || null,
      assigned_to: form.assigned_to || null,
    };
    const r = modal === 'edit'
      ? await run(() => api.put(`/task-requests/${modalId}`, { ...payload, status: form.status }))
      : await run(() => api.post('/task-requests', payload));
    if (r.ok) {
      setModal(null);
      reload();
      refreshCounts();
      if (modal === 'new' && r.data?.whatsapp) {
        const wa = r.data.whatsapp;
        const url = `https://wa.me/${wa.phone}?text=${encodeURIComponent(wa.message)}`;
        window.open(url, '_blank');
      }
    } else {
      setError(r.error);
    }
  };

  const changeStatus = async (id, status) => {
    const r = await run(() => api.put(`/task-requests/${id}/status`, { status }));
    if (r.ok) { reload(); refreshCounts(); } else setError(r.error);
  };

  const deliver = async () => {
    const r = await run(() => api.put(`/task-requests/${modalId}/deliver`, {
      delivery_note: deliverForm.note,
      delivery_attachment: deliverForm.attachment,
    }));
    if (r.ok) { setModal(null); reload(); refreshCounts(); } else setError(r.error);
  };

  const remove = async (t) => {
    if (!window.confirm(`حذف طلب المهمة "${t.title}"؟`)) return;
    const r = await run(() => api.delete(`/task-requests/${t.id}`));
    if (r.ok) { reload(); refreshCounts(); } else setError(r.error);
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { setError('حجم الملف يجب ألا يتجاوز 3 ميجابايت'); return; }
    const reader = new FileReader();
    reader.onload = () => setDeliverForm((f) => ({ ...f, attachment: reader.result }));
    reader.readAsDataURL(file);
  };

  const myTask = (t) => isAdmin || Number(t.assigned_to) === user?.id;

  return (
    <>
      <PageHeader
        title="طلبات المهام"
        subtitle={isAdmin ? 'إدارة طلبات المهام وتوزيعها على الفريق' : 'المهام المسندة إليك'}
        actions={canManage && <Button onClick={openCreate}>+ إضافة مهمة</Button>}
      />

      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard icon="✦" label="جديدة" value={taskCounts.new} accent="electric" />
          <StatCard icon="⚙" label="قيد التنفيذ" value={taskCounts.in_progress} accent="amber" />
          <StatCard icon="◷" label="بانتظار المراجعة" value={taskCounts.in_review} accent="indigo" />
          <StatCard icon="✓" label="مكتملة" value={taskCounts.completed} accent="emerald" />
        </div>
      )}

      {isAdmin && (
        <Card className="p-4 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input placeholder="بحث بالعنوان أو الوصف..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={filterMember} onChange={(e) => setFilterMember(e.target.value)}>
              <option value="">كل الأعضاء</option>
              {(members.data || []).map((m) => <option key={m.id} value={m.id}>{m.role === 'admin' ? 'مدير النظام' : m.name}</option>)}
            </Select>
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">كل الحالات</option>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </div>
        </Card>
      )}

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      {!tasks?.length && <Card><EmptyState title="لا توجد طلبات مهام" sub={canManage ? 'ابدأ بإضافة مهمة جديدة' : 'لا توجد مهام مسندة إليك حالياً'} /></Card>}

      <div className="space-y-3">
        {tasks?.map((t) => (
          <Card key={t.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-gray-100">{t.title}</p>
                  <Badge color={PRIORITY[t.priority]?.color || 'gray'}>{PRIORITY[t.priority]?.label}</Badge>
                  <Badge color={TYPE[t.type]?.color || 'gray'}>{TYPE[t.type]?.label}</Badge>
                </div>
                {t.description && <p className="text-sm text-gray-500 mt-1.5 whitespace-pre-line">{t.description}</p>}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-xs text-gray-500">
                  {t.assigned_name && <span>⇠ <b className="text-gray-400">{t.assigned_name}</b></span>}
                  {t.creator_name && <span>منشئ: {t.creator_name}</span>}
                  {t.due_date && <span className="text-amber-300/80">موعد التسليم: {formatDate(t.due_date)}</span>}
                  <span>أنشئت: {formatDate(t.created_at)}</span>
                  {t.updated_at && t.updated_at !== t.created_at && (
                    <span>آخر تحديث: {formatDate(t.updated_at)}{t.updated_by_name ? ` (${t.updated_by_name})` : ''}</span>
                  )}
                </div>

                {t.delivery_note && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-emerald-500/[0.07] border border-emerald-500/20 text-sm text-emerald-200/90">
                    <span className="font-semibold">ملاحظة التسليم: </span>{t.delivery_note}
                  </div>
                )}
                {t.delivery_attachment && (
                  <div className="mt-2.5">
                    {String(t.delivery_attachment).startsWith('data:image/') ? (
                      <img src={t.delivery_attachment} alt="مرفق التسليم" className="max-h-48 rounded-2xl border border-white/10" />
                    ) : (
                      <a href={t.delivery_attachment} download className="text-xs text-royal-300 hover:text-royal-200 underline">تحميل المرفق</a>
                    )}
                  </div>
                )}
              </div>
              <Badge color={STATUS[t.status]?.color || 'gray'} className="shrink-0">{STATUS[t.status]?.label}</Badge>
            </div>

            <div className="mt-3 pt-3 border-t border-white/[0.06] flex flex-wrap gap-2">
              {myTask(t) && t.status === 'new' && (
                <Button size="sm" variant="secondary" onClick={() => changeStatus(t.id, 'in_progress')}>بدء التنفيذ</Button>
              )}
              {myTask(t) && (t.status === 'new' || t.status === 'in_progress') && (
                <Button size="sm" variant="success" onClick={() => openDeliver(t)}>تم التسليم</Button>
              )}
              {canManage && t.status === 'in_review' && (
                <>
                  <Button size="sm" variant="success" onClick={() => changeStatus(t.id, 'completed')}>اعتماد</Button>
                  <Button size="sm" variant="danger" onClick={() => changeStatus(t.id, 'rejected')}>رفض</Button>
                </>
              )}
              {canManage && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>تعديل / إعادة إسناد</Button>
                  <Button size="sm" variant="danger" onClick={() => remove(t)}>حذف</Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={modal === 'new' || modal === 'edit'}
        title={modal === 'edit' ? 'تعديل طلب مهمة' : 'إضافة مهمة جديدة'}
        wide
        onClose={() => setModal(null)}
        footer={<>
          <Button variant="ghost" onClick={() => setModal(null)}>إلغاء</Button>
          <Button onClick={save} disabled={mut || !form.title.trim()}>{mut ? '...' : 'إرسال'}</Button>
        </>}
      >
        <div className="space-y-4">
          <Input label="عنوان المهمة" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="وصف المهمة" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="نوع المهمة" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
            <Select label="الأولوية" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </div>
          <Input label="تاريخ ووقت التسليم" type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          <Select label="إسناد المهمة إلى" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
            <option value="">— لم يُحدد —</option>
            {people.map((m) => (
              <option key={m.id} value={m.id}>
                {m.role === 'admin' ? 'مدير النظام' : `${m.name}${m.phone ? ' ✓' : ''}`}
              </option>
            ))}
          </Select>
          <p className="text-xs text-gray-600">
            يمكنك إسناد المهمة إلى "مدير النظام" ليوزعها لاحقاً. إذا كان لدى العضو رقم هاتف، سيُفتح واتساب برسالة جاهزة بعد الإرسال.
          </p>
          {modal === 'edit' && (
          <Select label="الحالة" value={form.status} onChange={(e) => { setForm({ ...form, status: e.target.value }); }}>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          )}
        </div>
      </Modal>

      <Modal
        open={modal === 'deliver'}
        title="تسليم المهمة"
        wide
        onClose={() => setModal(null)}
        footer={<>
          <Button variant="ghost" onClick={() => setModal(null)}>إلغاء</Button>
          <Button variant="success" onClick={deliver} disabled={mut}>{mut ? '...' : 'تم التسليم'}</Button>
        </>}
      >
        <div className="space-y-4">
          <Textarea label="ملاحظة التسليم" rows={3} value={deliverForm.note} onChange={(e) => setDeliverForm({ ...deliverForm, note: e.target.value })} />
          <div>
            <label className="block text-sm text-gray-300/90 mb-1.5">مرفق (صورة أو ملف)</label>
            <input type="file" accept="image/*,.pdf,.zip,.doc,.docx,.xlsx,.pptx,.txt" onChange={onFile} className="w-full text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-royal-500 file:text-white file:cursor-pointer file:hover:bg-royal-400" />
            {deliverForm.attachment && (
              <div className="mt-2">
                {String(deliverForm.attachment).startsWith('data:image/') ? (
                  <img src={deliverForm.attachment} alt="معاينة" className="max-h-40 rounded-2xl border border-white/10" />
                ) : (
                  <p className="text-xs text-emerald-300">تم إرفاق ملف ✓</p>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
