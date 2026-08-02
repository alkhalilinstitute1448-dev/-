import React, { useState } from 'react';
import { useData, useMutation } from '../hooks/useData';
import api from '../api';
import {
  Card, Loader, PageHeader, Button, Input, Modal, Badge, Alert, EmptyState, Select, Textarea,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';

const PLATFORMS = [
  { key: 'facebook', label: 'فيسبوك' },
  { key: 'instagram', label: 'إنستغرام' },
  { key: 'youtube', label: 'يوتيوب' },
  { key: 'twitter', label: 'إكس' },
  { key: 'whatsapp', label: 'واتساب' },
  { key: 'tiktok', label: 'تيك توك' },
];

const empty = { platform: 'facebook', name: '', text: '', tags: '' };

export default function Captions() {
  const { can } = useAuth();
  const [platform, setPlatform] = useState('');
  const { data, loading, reload } = useData(() => api.get('/captions', { params: platform ? { platform } : {} }), [platform]);
  const { run, loading: mut } = useMutation();
  const [modal, setModal] = useState(null);
  const [modalId, setModalId] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(null);
  const canManage = can('captions.manage');

  if (loading) return <Loader />;

  const save = async () => {
    if (!form.name || !form.text) return;
    const payload = { ...form, tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean) };
    const r = modal === 'edit'
      ? await run(() => api.put(`/captions/${modalId}`, payload))
      : await run(() => api.post('/captions', payload));
    if (r.ok) { setModal(null); reload(); } else setError(r.error);
  };

  const copy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  return (
    <>
      <PageHeader
        title="التسميات التوضيحية"
        subtitle="قوالب جاهزة لمنشورات المنصات المختلفة"
        actions={
          <>
            <Select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-40">
              <option value="">كل المنصات</option>
              {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </Select>
            {canManage && <Button onClick={() => { setForm(empty); setError(''); setModal('new'); }}>+ كابشن جديد</Button>}
          </>
        }
      />

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      {!data?.length && <Card><EmptyState title="لا توجد كابشنات بعد" sub="أنشئ قالب كابشن جديد" /></Card>}

      <div className="grid gap-4 md:grid-cols-2">
        {data?.map((c) => (
          <Card key={c.id} className="p-5 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-100">{c.name}</h3>
              <Badge color="gold">{PLATFORMS.find((p) => p.key === c.platform)?.label || c.platform}</Badge>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed flex-1 whitespace-pre-wrap line-clamp-6">{c.text}</p>
            {(c.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(c.tags || []).map((t, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-dark-800 text-gray-500 border border-dark-700">#{t}</span>
                ))}
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-dark-800 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => copy(c.text, c.id)}>
                {copied === c.id ? '✓ تم النسخ' : 'نسخ النص'}
              </Button>
              {canManage && (
                <>
                  <Button size="sm" variant="ghost"
                    onClick={() => { setForm({ platform: c.platform, name: c.name, text: c.text, tags: (c.tags || []).join(', ') }); setModalId(c.id); setModal('edit'); }}>
                    تعديل
                  </Button>
                  <Button size="sm" variant="danger"
                    onClick={async () => {
                      if (window.confirm('حذف هذا الكابشن؟')) { await run(() => api.delete(`/captions/${c.id}`)); reload(); }
                    }}>
                    حذف
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={!!modal} title={modal === 'edit' ? 'تعديل كابشن' : 'كابشن جديد'} onClose={() => setModal(null)} wide
        footer={<>
          <Button variant="ghost" onClick={() => setModal(null)}>إلغاء</Button>
          <Button onClick={save} disabled={mut || !form.name || !form.text}>{mut ? '...' : 'حفظ'}</Button>
        </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="اسم الكابشن" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select label="المنصة" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
              {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </Select>
          </div>
          <Textarea label="نص الكابشن" rows={8} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
          <Input label="الوسوم (مفصولة بفواصل)" placeholder="مثال: توثيق، إعلام، حلب" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        </div>
      </Modal>
    </>
  );
}
