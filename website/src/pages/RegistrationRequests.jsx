import React, { useState } from 'react';
import { useData, useMutation } from '../hooks/useData';
import api from '../api';
import {
  Card, Loader, PageHeader, Button, Input, Modal, Badge, Alert, EmptyState, StatCard,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';

function waLink(phone, message) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function credentialsMessage(fullName, username, password) {
  return (
    `السلام عليكم ${fullName}،\n` +
    'تم قبول طلب تسجيلك في أكاديمية الخليل. 🎉\n\n' +
    'بيانات الدخول إلى النظام:\n' +
    `اسم المستخدم: ${username}\n` +
    `كلمة المرور: ${password}\n\n` +
    '⚠️ سيُطلب منك تغيير كلمة المرور عند أول تسجيل دخول.\n\n' +
    `رابط النظام: ${window.location.origin}\n`
  );
}

export default function RegistrationRequests() {
  const { can } = useAuth();
  const canManage = can('registrations.manage');
  const requests = useData(() => api.get('/registrations/requests'));
  const links = useData(() => api.get('/registrations/links'));
  const active = useData(() => api.get('/registrations/links/active'));
  const { run, loading: mut, setError, error } = useMutation();

  const [copied, setCopied] = useState('');
  const [creds, setCreds] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const pending = (requests.data || []).filter((r) => r.status === 'pending');
  const processed = (requests.data || []).filter((r) => r.status !== 'pending');
  const activeLink = active.data?.link;

  const registerUrl = (token) => `${window.location.origin}/register/${token}`;

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 1800);
    } catch {
      setCopied('');
    }
  };

  const createLink = async () => {
    const r = await run(() => api.post('/registrations/links'));
    if (r.ok) {
      links.reload();
      active.reload();
    }
  };

  const revokeLink = async (token) => {
    if (!window.confirm('إلغاء هذا الرابط؟ لن يعد صالحاً للتسجيل.')) return;
    const r = await run(() => api.delete(`/registrations/links/${token}`));
    if (r.ok) {
      links.reload();
      active.reload();
    }
  };

  const accept = async (req) => {
    const r = await run(() => api.post(`/registrations/${req.id}/approve`));
    if (r.ok) {
      setCreds(r.data);
      requests.reload();
    }
  };

  const reject = async (req) => {
    if (!window.confirm(`رفض طلب ${req.first_name} ${req.nickname}؟`)) return;
    const r = await run(() => api.post(`/registrations/${req.id}/reject`));
    if (r.ok) requests.reload();
  };

  const statusBadge = (s) =>
    s === 'approved' ? <Badge color="green">مقبول</Badge>
      : s === 'rejected' ? <Badge color="red">مرفوض</Badge>
        : <Badge color="amber">قيد المراجعة</Badge>;

  const renderReq = (r) => (
    <Card key={r.id} className="p-5">
      <div className="flex items-start gap-4">
        <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-white/10 bg-navy-900/60">
          {r.photo ? (
            <img src={r.photo} alt={r.first_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl text-gray-600">☺</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-bold text-white text-lg">{r.first_name} {r.nickname}</p>
              <p className="text-xs text-gray-500 mt-0.5" dir="ltr">
                {r.phone} · {r.created_at ? new Date(r.created_at).toLocaleDateString('ar') : ''}
              </p>
            </div>
            {statusBadge(r.status)}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div className="flex justify-between gap-2"><span className="text-gray-500">الأب</span><span className="text-gray-200 truncate">{r.father_name} — {r.father_status === 'alive' ? 'حي' : 'متوفى'} — {r.father_job}</span></div>
            <div className="flex justify-between gap-2"><span className="text-gray-500">الأم</span><span className="text-gray-200 truncate">{r.mother_name} — {r.mother_status === 'alive' ? 'حية' : 'متوفاة'} — {r.mother_job}</span></div>
          </div>
          {r.username && <p className="text-xs text-electric-300 mt-2" dir="ltr">@{r.username}</p>}
          {r.status === 'pending' && canManage && (
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="success" onClick={() => accept(r)} disabled={mut}>قبول وإنشاء حساب</Button>
              <Button size="sm" variant="danger" onClick={() => reject(r)} disabled={mut}>رفض</Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  if (requests.loading || links.loading || active.loading) return <Loader />;

  const stats = {
    pending: pending.length,
    approved: processed.filter((r) => r.status === 'approved').length,
    rejected: processed.filter((r) => r.status === 'rejected').length,
  };

  return (
    <>
      <PageHeader
        title="طلبات التسجيل"
        subtitle="روابط الدعوة والطلبات المقدمة من الأعضاء الجدد"
        actions={canManage && <Button onClick={createLink} disabled={mut}>{mut ? '...' : '+ إنشاء رابط جديد'}</Button>}
      />

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon="✉" label="قيد المراجعة" value={stats.pending} accent="amber" />
        <StatCard icon="✓" label="مقبول" value={stats.approved} accent="emerald" />
        <StatCard icon="✕" label="مرفوض" value={stats.rejected} accent="red" />
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-bold text-white">روابط التسجيل</h3>
          <span className="text-xs text-gray-500">كل رابط يبقى صالحًا حتى إلغائه يدويًا</span>
        </div>

        {activeLink && (
          <div className="glass rounded-2xl p-4 mb-4 border border-emerald-500/20">
            <p className="text-[11px] text-emerald-300 mb-2">● أحدث رابط نشط</p>
            <div className="flex items-center gap-2 flex-wrap">
              <code className="flex-1 min-w-0 text-sm text-gray-200 bg-navy-900/70 border border-white/10 rounded-xl px-3 py-2.5 truncate" dir="ltr">
                {registerUrl(activeLink.token)}
              </code>
              <Button size="sm" variant="secondary" onClick={() => copy(registerUrl(activeLink.token), 'link')}>
                {copied === 'link' ? '✓ تم النسخ' : 'نسخ الرابط'}
              </Button>
            </div>
          </div>
        )}
        {!activeLink && <p className="text-sm text-gray-500 mb-4">لا يوجد رابط نشط — أنشئ رابطاً جديداً ليتمكن الأعضاء من التقديم.</p>}

        <div className="space-y-2">
          {(links.data || []).map((l) => (
            <div key={l.token} className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-navy-900/50 border border-white/[0.06]">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-sm text-gray-300 truncate" dir="ltr">{l.token.slice(0, 16)}…</code>
                  {l.active ? <Badge color="green">نشط</Badge> : <Badge color="gray">ملغي</Badge>}
                </div>
                <p className="text-[11px] text-gray-600 mt-1">{l.created_at ? new Date(l.created_at).toLocaleString('ar') : ''}</p>
              </div>
              {l.active && canManage && (
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => copy(registerUrl(l.token), l.token)}>
                    {copied === l.token ? '✓' : 'نسخ'}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => revokeLink(l.token)} disabled={mut}>إلغاء</Button>
                </div>
              )}
            </div>
          ))}
          {!links.data?.length && <p className="text-sm text-gray-600">لا توجد روابط بعد.</p>}
        </div>
      </Card>

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white">الطلبات المقدمة</h3>
        {processed.length > 0 && (
          <button onClick={() => setShowAll((s) => !s)} className="text-xs text-royal-300 hover:text-royal-200 transition-colors">
            {showAll ? 'إخفاء الطلبات المؤكدة' : `عرض الطلبات المؤكدة (${processed.length})`}
          </button>
        )}
      </div>

      {!pending.length && !showAll && (
        <Card><EmptyState title="لا توجد طلبات قيد المراجعة" sub="الطلبات الجديدة ستظهر هنا بعد إرسالها عبر رابط التسجيل" /></Card>
      )}

      {pending.length > 0 && <div className="grid gap-4 md:grid-cols-2">{pending.map(renderReq)}</div>}

      {showAll && (
        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-3">الطلبات المؤكدة</p>
          <div className="grid gap-4 md:grid-cols-2">{processed.map(renderReq)}</div>
        </div>
      )}

      <Modal
        open={!!creds}
        title="تم إنشاء الحساب"
        onClose={() => setCreds(null)}
        footer={<>
          <Button variant="secondary" onClick={() => copy(`${creds?.username} / ${creds?.password}`, 'creds')}>
            {copied === 'creds' ? '✓ تم النسخ' : 'نسخ بيانات الدخول'}
          </Button>
          <a href={waLink(creds?.phone, credentialsMessage(creds?.fullName, creds?.username, creds?.password))} target="_blank" rel="noreferrer">
            <Button variant="success">إرسال عبر واتساب</Button>
          </a>
        </>}
      >
        {creds && (
          <div className="space-y-4">
            <Alert type="success">تم إنشاء حساب العضو {creds.fullName} بنجاح. أرسل له بيانات الدخول عبر واتساب.</Alert>
            <div className="glass rounded-2xl p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">اسم المستخدم</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-lg font-bold text-emerald-300 bg-navy-900/70 border border-white/10 rounded-xl px-3 py-2" dir="ltr">{creds.username}</code>
                  <Button size="sm" variant="ghost" onClick={() => copy(creds.username, 'u')}>{copied === 'u' ? '✓' : 'نسخ'}</Button>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">كلمة المرور المؤقتة</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-lg font-bold text-electric-300 bg-navy-900/70 border border-white/10 rounded-xl px-3 py-2" dir="ltr">{creds.password}</code>
                  <Button size="sm" variant="ghost" onClick={() => copy(creds.password, 'p')}>{copied === 'p' ? '✓' : 'نسخ'}</Button>
                </div>
              </div>
              <p className="text-xs text-gray-600">سيتعين على العضو تغيير كلمة المرور عند أول تسجيل دخول.</p>
            </div>
            <Input label="رقم الهاتف" value={creds.phone} readOnly />
          </div>
        )}
      </Modal>
    </>
  );
}
