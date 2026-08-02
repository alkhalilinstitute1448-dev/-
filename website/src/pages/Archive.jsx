import React, { useState } from 'react';
import { useData, useMutation } from '../hooks/useData';
import api from '../api';
import {
  Card, Loader, PageHeader, Button, Input, Modal, Badge, Alert, EmptyState, Select, Textarea,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';

const TYPES = [
  { key: 'post', label: 'منشور' },
  { key: 'video', label: 'فيديو' },
  { key: 'design', label: 'تصميم' },
  { key: 'article', label: 'مقال' },
  { key: 'other', label: 'أخرى' },
];

const empty = { title: '', description: '', type: 'post', url: '', date: '' };

export default function Archive() {
  const { can } = useAuth();
  const [type, setType] = useState('');
  const { data, loading, reload } = useData(() => api.get('/archive', { params: type ? { type } : {} }), [type]);
  const { run, loading: mut } = useMutation();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const canManage = can('archive.view');

  if (loading) return <Loader />;

  const save = async () => {
    if (!form.title) return;
    const r = await run(() => api.post('/archive', { ...form, date: form.date || null }));
    if (r.ok) { setModal(false); reload(); } else setError(r.error);
  };

  return (
    <>
      <PageHeader
        title="الأرشيف"
        subtitle="أرشيف الأعمال والمنشورات السابقة للفريق"
        actions={
          <>
            <Select value={type} onChange={(e) => setType(e.target.value)} className="w-40">
              <option value="">كل الأنواع</option>
              {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </Select>
            {canManage && <Button onClick={() => { setForm(empty); setError(''); setModal(true); }}>+ إضافة عنصر</Button>}
          </>
        }
      />

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      {!data?.length && <Card><EmptyState title="الأرشيف فارغ" sub="أضف أعمال الفريق السابقة هنا" /></Card>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.map((a) => (
          <Card key={a.id} className="p-5 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-100">{a.title}</h3>
              <Badge color="blue">{TYPES.find((t) => t.key === a.type)?.label || a.type}</Badge>
            </div>
            {a.date && <p className="text-xs text-gray-600 mt-1">{new Date(a.date).toLocaleDateString('ar')}</p>}
            {a.description && <p className="text-sm text-gray-500 mt-2 flex-1">{a.description}</p>}
            <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2">
              {a.url && (
                <a href={a.url} target="_blank" rel="noreferrer" className="text-sm text-electric-300 hover:text-electric-200">
                  فتح الرابط ←
                </a>
              )}
              {canManage && (
                <Button size="sm" variant="danger" className="mr-auto"
                  onClick={async () => {
                    if (window.confirm('حذف هذا العنصر من الأرشيف؟')) { await run(() => api.delete(`/archive/${a.id}`)); reload(); }
                  }}>
                  حذف
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modal} title="إضافة إلى الأرشيف" onClose={() => setModal(false)}
        footer={<>
          <Button variant="ghost" onClick={() => setModal(false)}>إلغاء</Button>
          <Button onClick={save} disabled={mut || !form.title}>{mut ? '...' : 'حفظ'}</Button>
        </>}>
        <div className="space-y-4">
          <Input label="العنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="الوصف" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="النوع" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </Select>
            <Input label="التاريخ" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <Input label="الرابط" placeholder="https://..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        </div>
      </Modal>
    </>
  );
}
