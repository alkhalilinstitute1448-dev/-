import React, { useState } from 'react';
import { useData, useMutation } from '../hooks/useData';
import api from '../api';
import {
  Card, Loader, PageHeader, Button, Input, Modal, Alert, EmptyState, Textarea,
} from '../components/ui';
import PhotoPicker from '../components/PhotoPicker';
import { useAuth } from '../context/AuthContext';

const empty = { name: '', photo: '', description: '' };

export default function TeamItems() {
  const { can } = useAuth();
  const { data, loading, reload } = useData(() => api.get('/team-items'), []);
  const { run, loading: mut } = useMutation();
  const [modal, setModal] = useState(null);
  const [modalId, setModalId] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const canManage = can('team_items.manage');

  if (loading) return <Loader />;

  const save = async () => {
    if (!form.name) return;
    const payload = { name: form.name, photo: form.photo, description: form.description };
    const r = modal === 'edit'
      ? await run(() => api.put(`/team-items/${modalId}`, payload))
      : await run(() => api.post('/team-items', payload));
    if (r.ok) { setModal(null); reload(); } else setError(r.error);
  };

  return (
    <>
      <PageHeader
        title="أغراض الفريق"
        subtitle="معدات وأغراض الفريق مع صورها ووصفها"
        actions={
          canManage && (
            <Button onClick={() => { setForm(empty); setError(''); setModal('new'); }}>+ غرض جديد</Button>
          )
        }
      />

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      {!data?.length && <Card><EmptyState title="لا توجد أغراض بعد" sub="أضف غرضًا جديدًا للفريق" /></Card>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((item) => (
          <Card key={item.id} hover className="p-5 flex flex-col">
            <div className="w-full h-40 rounded-2xl border border-white/[0.08] overflow-hidden flex items-center justify-center bg-navy-900/60 mb-4">
              {item.photo ? (
                <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl text-gray-600">▧</span>
              )}
            </div>
            <h3 className="font-semibold text-gray-100">{item.name}</h3>
            {item.description && (
              <p className="text-sm text-gray-400 leading-relaxed mt-1.5 flex-1 whitespace-pre-wrap line-clamp-4">{item.description}</p>
            )}
            {!item.description && <p className="text-sm text-gray-600 mt-1.5 flex-1">لا يوجد وصف</p>}
            {item.creator_name && (
              <p className="text-[11px] text-gray-600 mt-2">أضافه: {item.creator_name}</p>
            )}
            {canManage && (
              <div className="mt-3 pt-3 border-t border-white/[0.06] flex gap-2">
                <Button size="sm" variant="ghost"
                  onClick={() => { setError(''); setForm({ name: item.name, photo: item.photo || '', description: item.description || '' }); setModalId(item.id); setModal('edit'); }}>
                  تعديل
                </Button>
                <Button size="sm" variant="danger"
                  onClick={async () => {
                    if (window.confirm('حذف هذا الغرض؟')) { await run(() => api.delete(`/team-items/${item.id}`)); reload(); }
                  }}>
                  حذف
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Modal open={!!modal} title={modal === 'edit' ? 'تعديل غرض' : 'غرض جديد'} onClose={() => setModal(null)} wide
        footer={<>
          <Button variant="ghost" onClick={() => setModal(null)}>إلغاء</Button>
          <Button onClick={save} disabled={mut || !form.name}>{mut ? '...' : 'حفظ'}</Button>
        </>}>
        <div className="space-y-4">
          <PhotoPicker
            value={form.photo}
            onChange={(v) => setForm({ ...form, photo: v })}
            hint="صورة واضحة للغرض"
          />
          <Input label="اسم الغرض" placeholder="مثال: كاميرا كانون، مايك، حامل ثلاثي..." value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Textarea label="الوصف" rows={4} placeholder="مواصفات الغرض أو مكانه أو ملاحظات أخرى" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </Modal>
    </>
  );
}
