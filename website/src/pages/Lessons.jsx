import React, { useState } from 'react';
import { useData, useMutation } from '../hooks/useData';
import api from '../api';
import {
  Card, Loader, PageHeader, Button, Input, Modal, Badge, Alert, EmptyState, Select, Textarea,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';

const TYPE = { recorded: 'تسجيل', live: 'مباشر' };
const STATUS = {
  scheduled: { label: 'مجدد', color: 'blue' },
  done: { label: 'منجز', color: 'green' },
  cancelled: { label: 'ملغى', color: 'red' },
};

const empty = { title: '', description: '', type: 'recorded', presenter: '', date: '', duration: '', materials: '', notes: '', status: 'scheduled' };

export default function Lessons() {
  const { can } = useAuth();
  const { data: lessons, loading, reload } = useData(() => api.get('/lessons'));
  const { run, loading: mut } = useMutation();
  const [modal, setModal] = useState(null);
  const [modalId, setModalId] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const canManage = can('lessons.manage');

  if (loading) return <Loader />;

  const save = async () => {
    if (!form.title) return;
    const payload = { ...form, date: form.date || null };
    const r = modal === 'edit'
      ? await run(() => api.put(`/lessons/${modalId}`, payload))
      : await run(() => api.post('/lessons', payload));
    if (r.ok) { setModal(null); reload(); } else setError(r.error);
  };

  return (
    <>
      <PageHeader
        title="الدروس"
        subtitle="أرشيف الدروس المسجلة والبث المباشر"
        actions={canManage && <Button onClick={() => { setForm(empty); setError(''); setModal('new'); }}>+ درس جديد</Button>}
      />

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      {!lessons?.length && <Card><EmptyState title="لا توجد دروس بعد" /></Card>}

      <div className="grid gap-4 md:grid-cols-2">
        {lessons?.map((l) => (
          <Card key={l.id} className="p-5 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-100">{l.title}</h3>
              <Badge color={STATUS[l.status].color}>{STATUS[l.status].label}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              <span className="chip bg-white/[0.05] text-gray-400 border-white/10">{TYPE[l.type]}</span>
              {l.presenter && <span className="chip bg-white/[0.05] text-gray-400 border-white/10">مقدم: {l.presenter}</span>}
              {l.date && <span className="chip bg-white/[0.05] text-gray-400 border-white/10">{new Date(l.date).toLocaleDateString('ar')}</span>}
              {l.duration && <span className="chip bg-white/[0.05] text-gray-400 border-white/10">{l.duration}</span>}
            </div>
            {l.description && <p className="text-sm text-gray-500 mt-3 flex-1">{l.description}</p>}
            {l.materials && (
              <a href={l.materials} target="_blank" rel="noreferrer"
                className="mt-3 text-sm text-electric-300 hover:text-electric-200 flex items-center gap-1">
                الملفات والمواد ←
              </a>
            )}
            {canManage && (
              <div className="mt-3 pt-3 border-t border-white/[0.06] flex gap-2">
                <Button size="sm" variant="ghost"
                  onClick={() => { setForm({ title: l.title, description: l.description, type: l.type, presenter: l.presenter, date: l.date || '', duration: l.duration, materials: l.materials, notes: l.notes, status: l.status }); setModalId(l.id); setModal('edit'); }}>
                  تعديل
                </Button>
                <Button size="sm" variant="danger"
                  onClick={async () => {
                    if (window.confirm('حذف هذا الدرس؟')) { await run(() => api.delete(`/lessons/${l.id}`)); reload(); }
                  }}>
                  حذف
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Modal open={!!modal} title={modal === 'edit' ? 'تعديل درس' : 'درس جديد'} onClose={() => setModal(null)}
        footer={<>
          <Button variant="ghost" onClick={() => setModal(null)}>إلغاء</Button>
          <Button onClick={save} disabled={mut || !form.title}>{mut ? '...' : 'حفظ'}</Button>
        </>}>
        <div className="space-y-4">
          <Input label="العنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="الوصف" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="النوع" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="recorded">تسجيل</option>
              <option value="live">مباشر</option>
            </Select>
            <Select label="الحالة" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="المقدم" value={form.presenter} onChange={(e) => setForm({ ...form, presenter: e.target.value })} />
            <Input label="التاريخ" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <Input label="المدة" placeholder="مثال: 45 دقيقة" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
          <Input label="رابط الملفات/المواد" value={form.materials} onChange={(e) => setForm({ ...form, materials: e.target.value })} />
          <Textarea label="ملاحظات" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Modal>
    </>
  );
}
