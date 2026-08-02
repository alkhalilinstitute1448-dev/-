import React, { useState, useEffect } from 'react';
import { useData, useMutation } from '../hooks/useData';
import api from '../api';
import {
  Card, Loader, PageHeader, Button, Input, Modal, Badge, Alert, EmptyState, StatCard,
} from '../components/ui';
import { PERMISSIONS, permissionLabel } from '../utils/permissions';
import { useAuth } from '../context/AuthContext';
import { formatDuration } from '../utils/time';

const PRESENCE_META = {
  in_room: { label: 'داخل غرفة الإعلام', color: 'green', dot: 'bg-emerald-400', icon: '🟢' },
  outside: { label: 'متصل خارج غرفة الإعلام', color: 'orange', dot: 'bg-amber-400', icon: '🟡' },
  online: { label: 'متصل', color: 'blue', dot: 'bg-electric-400', icon: '🟡' },
  offline: { label: 'غير متصل', color: 'gray', dot: 'bg-gray-600', icon: '⚫' },
};

export default function Users() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'admin';
  const { data: users, loading, reload } = useData(() => api.get('/users'));
  const presence = useData(() => api.get('/attendance/presence'));
  const { run, loading: mut } = useMutation();

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'user', permissions: [] });
  const [permUser, setPermUser] = useState(null);
  const [permSelect, setPermSelect] = useState([]);
  const [resetUser, setResetUser] = useState(null);
  const [newPass, setNewPass] = useState('');
  const [error, setError] = useState('');

  const [geo, setGeo] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoSaved, setGeoSaved] = useState(false);

  useEffect(() => {
    api.get('/settings').then(({ data }) => setGeo(data.geo)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setInterval(() => presence.reload(), 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Loader />;

  const presenceMap = {};
  (presence.data || []).forEach((p) => { presenceMap[p.id] = p; });

  const openNew = () => {
    setForm({ name: '', username: '', password: '', role: 'user', permissions: [] });
    setError('');
    setModal('new');
  };

  const togglePerm = (key) => {
    setPermSelect((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]));
  };

  const saveUser = async () => {
    const r = await run(() => api.post('/users', form));
    if (r.ok) { setModal(null); reload(); } else setError(r.error);
  };

  const savePerms = async () => {
    const r = await run(() => api.put(`/users/${permUser.id}/permissions`, { permissions: permSelect }));
    if (r.ok) { setPermUser(null); reload(); } else setError(r.error);
  };

  const resetPass = async () => {
    if (!newPass) return;
    const r = await run(() => api.put(`/users/${resetUser.id}/reset-password`, { password: newPass }));
    if (r.ok) { setResetUser(null); setNewPass(''); } else setError(r.error);
  };

  const saveGeo = async () => {
    if (!geo) return;
    setGeoLoading(true);
    setGeoSaved(false);
    const r = await run(() => api.put('/settings/geo', {
      name: geo.name,
      lat: Number(geo.lat),
      lng: Number(geo.lng),
      radius: Number(geo.radius),
      margin: Number(geo.margin),
      grace_minutes: Number(geo.grace_minutes),
    }));
    if (r.ok) setGeoSaved(true);
    setGeoLoading(false);
  };

  const stats = {
    inRoom: (presence.data || []).filter((p) => p.status === 'in_room').length,
    online: (presence.data || []).filter((p) => p.status === 'online' || p.status === 'outside').length,
    offline: (presence.data || []).filter((p) => p.status === 'offline').length,
  };

  return (
    <>
      <PageHeader
        title="أعضاء الفريق"
        subtitle="الحالة المباشرة لكل عضو في غرفة الإعلام"
        actions={isAdmin && <Button onClick={openNew}>+ إضافة عضو</Button>}
      />

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      {/* Live status stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon="🟢" label="داخل غرفة الإعلام" value={stats.inRoom} accent="emerald" />
        <StatCard icon="🟡" label="متصل خارج الغرفة" value={stats.online} accent="amber" />
        <StatCard icon="⚫" label="غير متصل" value={stats.offline} accent="gray" />
      </div>

      {/* Geo config (admin) */}
      {isAdmin && geo && (
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-white">النطاق الجغرافي للحضور</h3>
              <p className="text-sm text-gray-500 mt-1">يُسجَّل الحضور فقط داخل هذا النطاق</p>
            </div>
            {geoSaved && <Badge color="green">تم الحفظ ✓</Badge>}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-3">
              <Input label="اسم الموقع" value={geo.name} onChange={(e) => setGeo({ ...geo, name: e.target.value })} />
            </div>
            <Input label="خط العرض (Latitude)" value={geo.lat} onChange={(e) => setGeo({ ...geo, lat: e.target.value })} />
            <Input label="خط الطول (Longitude)" value={geo.lng} onChange={(e) => setGeo({ ...geo, lng: e.target.value })} />
            <Input label="نصف القطر (متر)" type="number" value={geo.radius} onChange={(e) => setGeo({ ...geo, radius: e.target.value })} />
            <Input label="هامش خطأ GPS (متر)" type="number" value={geo.margin} onChange={(e) => setGeo({ ...geo, margin: e.target.value })} />
            <Input label="مهلة المغادرة (دقيقة)" type="number" value={geo.grace_minutes} onChange={(e) => setGeo({ ...geo, grace_minutes: e.target.value })} />
            <div className="flex items-end">
              <Button onClick={saveGeo} disabled={geoLoading}>{geoLoading ? 'حفظ...' : 'حفظ الإعدادات'}</Button>
            </div>
          </div>
        </Card>
      )}

      {!users?.length && <Card><EmptyState /></Card>}

      <div className="grid gap-4 md:grid-cols-2">
        {users?.map((u) => {
          const p = presenceMap[u.id];
          const meta = PRESENCE_META[p?.status] || PRESENCE_META.offline;
          return (
            <Card key={u.id} className="p-5" hover>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-royal-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                      {u.name?.charAt(0)}
                    </div>
                    <span className={`absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full border-2 border-navy-900 ${meta.dot}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{u.name}</p>
                    <p className="text-xs text-gray-500">@{u.username}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge color={u.role === 'admin' ? 'indigo' : u.active ? 'blue' : 'red'}>
                    {u.role === 'admin' ? 'مدير' : u.active ? 'عضو' : 'معطل'}
                  </Badge>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="glass rounded-2xl px-4 py-3">
                  <p className="text-[11px] text-gray-500">{meta.icon} {meta.label}</p>
                  {p?.check_in && !p?.check_out && (
                    <p className="text-emerald-300 text-sm font-semibold mt-1 tabular-nums">
                      {formatDuration(p.session_seconds).text}
                    </p>
                  )}
                  {p?.check_in && p?.check_out && (
                    <p className="text-gray-400 text-sm mt-1">انتهت · {formatDuration(p.session_seconds).text}</p>
                  )}
                </div>
                <div className="glass rounded-2xl px-4 py-3">
                  <p className="text-[11px] text-gray-500">وقت الدخول</p>
                  <p className="text-gray-300 text-sm mt-1">
                    {p?.check_in ? new Date(`${new Date().toISOString().slice(0, 10)}T${p.check_in}`).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                </div>
              </div>

              {p?.active && p?.current_task && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="text-gray-500">المهمة الحالية:</span>
                  <span className="text-electric-300 truncate">{p.current_task}</span>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-white/[0.06] flex flex-wrap gap-2">
                {isAdmin && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => { setPermUser(u); setPermSelect(u.permissions || []); }}>
                      الصلاحيات
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setResetUser(u); setNewPass(''); }}>
                      إعادة كلمة المرور
                    </Button>
                    {u.username !== me?.username && (
                      <Button size="sm" variant="danger" onClick={async () => {
                        if (window.confirm(`حذف ${u.name}؟`)) { await run(() => api.delete(`/users/${u.id}`)); reload(); }
                      }}>
                        حذف
                      </Button>
                    )}
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={modal === 'new'} title="إضافة عضو جديد" onClose={() => setModal(null)}
        footer={<>
          <Button variant="ghost" onClick={() => setModal(null)}>إلغاء</Button>
          <Button onClick={saveUser} disabled={mut}>{mut ? '...' : 'حفظ'}</Button>
        </>}>
        <div className="space-y-4">
          <Input label="الاسم الكامل" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="اسم المستخدم" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <Input label="كلمة المرور" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <div className="flex gap-2">
            <button onClick={() => setForm({ ...form, role: 'user' })}
              className={`flex-1 px-4 py-2.5 rounded-2xl text-sm border transition-all ${form.role === 'user' ? 'bg-royal-500/15 border-royal-400/40 text-white' : 'bg-navy-900/70 border-white/10 text-gray-500'}`}>
              عضو
            </button>
            <button onClick={() => setForm({ ...form, role: 'admin' })}
              className={`flex-1 px-4 py-2.5 rounded-2xl text-sm border transition-all ${form.role === 'admin' ? 'bg-royal-500/15 border-royal-400/40 text-white' : 'bg-navy-900/70 border-white/10 text-gray-500'}`}>
              مدير
            </button>
          </div>
          {form.role === 'user' && (
            <div>
              <p className="text-sm text-gray-300/90 mb-2">الصلاحيات</p>
              <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pl-1">
                {PERMISSIONS.map((p) => (
                  <label key={p.key} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer">
                    <input type="checkbox" className="accent-royal-500" checked={form.permissions.includes(p.key)}
                      onChange={(e) => setForm({ ...form, permissions: e.target.checked ? [...form.permissions, p.key] : form.permissions.filter((x) => x !== p.key) })} />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal open={!!permUser} title={`صلاحيات: ${permUser?.name}`} onClose={() => setPermUser(null)}
        footer={<>
          <Button variant="ghost" onClick={() => setPermUser(null)}>إلغاء</Button>
          <Button onClick={savePerms} disabled={mut}>{mut ? '...' : 'حفظ'}</Button>
        </>}>
        <div className="grid grid-cols-2 gap-1.5 max-h-96 overflow-y-auto pl-1">
          {PERMISSIONS.map((p) => (
            <label key={p.key} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer">
              <input type="checkbox" className="accent-royal-500" checked={permSelect.includes(p.key)} onChange={() => togglePerm(p.key)} />
              {p.label}
            </label>
          ))}
        </div>
      </Modal>

      <Modal open={!!resetUser} title={`إعادة كلمة مرور ${resetUser?.name}`} onClose={() => setResetUser(null)}
        footer={<>
          <Button variant="ghost" onClick={() => setResetUser(null)}>إلغاء</Button>
          <Button onClick={resetPass} disabled={mut || !newPass}>{mut ? '...' : 'حفظ'}</Button>
        </>}>
        <Input label="كلمة المرور الجديدة" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
      </Modal>
    </>
  );
}
