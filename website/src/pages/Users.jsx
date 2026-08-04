import React, { useState, useEffect } from 'react';
import { useData, useMutation } from '../hooks/useData';
import api from '../api';
import {
  Card, Loader, PageHeader, Button, Input, Modal, Badge, Alert, EmptyState, StatCard, Avatar, Textarea,
} from '../components/ui';
import ProfileForm, { profileFromUser } from '../components/ProfileForm';
import { PERMISSIONS } from '../utils/permissions';
import { useAuth } from '../context/AuthContext';
import { formatDuration } from '../utils/time';

const PRESENCE_META = {
  in_room: { label: 'في جلسة عمل', color: 'green', dot: 'bg-emerald-400', icon: '🟢' },
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
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState(() => profileFromUser(null));
  const [editNotes, setEditNotes] = useState('');
  const [editJoined, setEditJoined] = useState('');
  const [error, setError] = useState('');

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
    if (!form.name.trim() || !form.username.trim()) {
      setError('الاسم واسم المستخدم مطلوبان');
      return;
    }
    if (!form.password) {
      setError('كلمة المرور مطلوبة لعضو جديد');
      return;
    }
    if (form.password.length < 6) {
      setError('كلمة المرور يجب ألا تقل عن ٦ أحرف');
      return;
    }
    const r = await run(() => api.post('/users', form));
    if (r.ok) { setModal(null); reload(); } else setError(r.error);
  };

  const savePerms = async () => {
    const r = await run(() => api.put(`/users/${permUser.id}/permissions`, { permissions: permSelect }));
    if (r.ok) { setPermUser(null); reload(); } else setError(r.error);
  };

  const resetPass = async () => {
    if (!newPass) return;
    if (newPass.length < 6) { setError('كلمة المرور يجب ألا تقل عن ٦ أحرف'); return; }
    const r = await run(() => api.put(`/users/${resetUser.id}/reset-password`, { password: newPass }));
    if (r.ok) { setResetUser(null); setNewPass(''); } else setError(r.error);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm(profileFromUser(u));
    setEditNotes(u.admin_notes || '');
    setEditJoined(u.joined_at ? String(u.joined_at).slice(0, 10) : '');
    setError('');
  };

  const saveEdit = async () => {
    const r = await run(() => api.put(`/users/${editUser.id}`, { ...editForm, admin_notes: editNotes, joined_at: editJoined }));
    if (r.ok) { setEditUser(null); reload(); } else setError(r.error);
  };

  const stats = {
    inRoom: (presence.data || []).filter((p) => p.status === 'in_room').length,
    online: (presence.data || []).filter((p) => p.status === 'online').length,
    offline: (presence.data || []).filter((p) => p.status === 'offline').length,
  };

  return (
    <>
      <PageHeader
        title="أعضاء الفريق"
        subtitle="الحالة المباشرة لكل عضو"
        actions={isAdmin && <Button onClick={openNew}>+ إضافة عضو</Button>}
      />

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      {/* Live status stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon="🟢" label="في جلسة عمل" value={stats.inRoom} accent="emerald" />
        <StatCard icon="🟡" label="متصل" value={stats.online} accent="amber" />
        <StatCard icon="⚫" label="غير متصل" value={stats.offline} accent="gray" />
      </div>

      {!users?.length && <Card><EmptyState /></Card>}

      <div className="grid gap-4 md:grid-cols-2">
        {users?.map((u) => {
          const p = presenceMap[u.id];
          const meta = PRESENCE_META[p?.status] || PRESENCE_META.offline;
          return (
            <Card key={u.id} className="p-5" hover>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar user={u} size="lg" statusDot dotClass={meta.dot} />
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
                    <Button size="sm" variant="secondary" onClick={() => openEdit(u)}>
                      الملف الشخصي
                    </Button>
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
        {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
        <div className="space-y-4">
          <Input label="الاسم الكامل" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="اسم المستخدم" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <Input label="كلمة المرور" type="password" hint="٦ أحرف على الأقل" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
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
        <Input label="كلمة المرور الجديدة" type="password" hint="٦ أحرف على الأقل" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
      </Modal>

      <Modal open={!!editUser} title={`الملف الشخصي: ${editUser?.name}`} onClose={() => setEditUser(null)} wide
        footer={<>
          <Button variant="ghost" onClick={() => setEditUser(null)}>إلغاء</Button>
          <Button onClick={saveEdit} disabled={mut}>{mut ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</Button>
        </>}>
        {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar user={editUser} size="xl" />
            <div className="min-w-0">
              <p className="font-bold text-white">{editUser?.name}</p>
              <p className="text-xs text-gray-500">@{editUser?.username}</p>
            </div>
          </div>
          <ProfileForm form={editForm} setForm={setEditForm} />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="تاريخ الانضمام" type="date" value={editJoined} onChange={(e) => setEditJoined(e.target.value)} />
          </div>
          <Textarea label="ملاحظات الإدارة (لا يراها العضو)" rows={4} value={editNotes} onChange={(e) => setEditNotes(e.target.value)}
            placeholder="ملاحظات داخلية مرئية للمدير فقط..." />
        </div>
      </Modal>
    </>
  );
}
