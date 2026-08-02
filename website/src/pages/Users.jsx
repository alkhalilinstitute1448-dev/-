import React, { useState } from 'react';
import { useData, useMutation } from '../hooks/useData';
import api from '../api';
import {
  Card, Loader, PageHeader, Button, Input, Modal, Badge, Alert, EmptyState,
} from '../components/ui';
import { PERMISSIONS, permissionLabel } from '../utils/permissions';
import { useAuth } from '../context/AuthContext';

export default function Users() {
  const { user: me } = useAuth();
  const { data: users, loading, reload } = useData(() => api.get('/users'));
  const { run, loading: mutLoading } = useMutation();

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'user', permissions: [] });
  const [permUser, setPermUser] = useState(null);
  const [permSelect, setPermSelect] = useState([]);
  const [error, setError] = useState('');
  const [resetUser, setResetUser] = useState(null);
  const [newPass, setNewPass] = useState('');

  if (loading) return <Loader />;

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
    if (r.ok) {
      setModal(null);
      reload();
    } else setError(r.error);
  };

  const savePerms = async () => {
    const r = await run(() => api.put(`/users/${permUser.id}/permissions`, { permissions: permSelect }));
    if (r.ok) {
      setPermUser(null);
      reload();
    } else setError(r.error);
  };

  const resetPass = async () => {
    if (!newPass) return;
    const r = await run(() => api.put(`/users/${resetUser.id}/reset-password`, { password: newPass }));
    if (r.ok) {
      setResetUser(null);
      setNewPass('');
    } else setError(r.error);
  };

  return (
    <>
      <PageHeader
        title="إدارة المستخدمين"
        subtitle="إضافة الأعضاء وتحديد الأدوار والصلاحيات"
        actions={
          <Button onClick={openNew}>+ إضافة عضو</Button>
        }
      />

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      {!users?.length && <Card><EmptyState /></Card>}

      <div className="grid gap-4 md:grid-cols-2">
        {users?.map((u) => (
          <Card key={u.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gold-500/15 border border-gold-500/30 flex items-center justify-center text-gold-300 font-bold">
                  {u.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-100">{u.name}</p>
                  <p className="text-xs text-gray-500">@{u.username}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge color={u.role === 'admin' ? 'gold' : u.active ? 'blue' : 'red'}>
                  {u.role === 'admin' ? 'مدير' : u.active ? 'عضو' : 'معطل'}
                </Badge>
                {u.role === 'admin' && <span className="text-[10px] text-gold-600">صلاحيات كاملة</span>}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {(u.permissions || []).slice(0, 4).map((p) => (
                <span key={p} className="text-[11px] px-2 py-0.5 rounded-md bg-dark-800 text-gray-400 border border-dark-700">
                  {permissionLabel(p)}
                </span>
              ))}
              {u.role !== 'admin' && (u.permissions || []).length > 4 && (
                <span className="text-[11px] px-2 py-0.5 rounded-md text-gold-500">
                  +{(u.permissions || []).length - 4}
                </span>
              )}
              {u.role !== 'admin' && !(u.permissions || []).length && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-dark-800 text-gray-600">بدون صلاحيات</span>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-dark-800 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => { setPermUser(u); setPermSelect(u.permissions || []); }}>
                الصلاحيات
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setResetUser(u); setNewPass(''); }}>
                إعادة كلمة المرور
              </Button>
              {u.username !== me?.username && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={async () => {
                    if (window.confirm(`حذف ${u.name}؟`)) {
                      await run(() => api.delete(`/users/${u.id}`));
                      reload();
                    }
                  }}
                >
                  حذف
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modal === 'new'} title="إضافة عضو جديد" onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>إلغاء</Button>
            <Button onClick={saveUser} disabled={mutLoading}>{mutLoading ? '...' : 'حفظ'}</Button>
          </>
        }>
        <div className="space-y-4">
          <Input label="الاسم الكامل" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="اسم المستخدم" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <Input label="كلمة المرور" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <div className="flex gap-2">
            <button onClick={() => setForm({ ...form, role: 'user' })}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm border transition-colors ${form.role === 'user' ? 'bg-gold-500/10 border-gold-500/40 text-gold-300' : 'bg-dark-800 border-dark-700 text-gray-500'}`}>
              عضو
            </button>
            <button onClick={() => setForm({ ...form, role: 'admin' })}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm border transition-colors ${form.role === 'admin' ? 'bg-gold-500/10 border-gold-500/40 text-gold-300' : 'bg-dark-800 border-dark-700 text-gray-500'}`}>
              مدير
            </button>
          </div>
          {form.role === 'user' && (
            <div>
              <p className="text-sm text-gold-200/80 mb-2">الصلاحيات</p>
              <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pl-1">
                {PERMISSIONS.map((p) => (
                  <label key={p.key} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer">
                    <input type="checkbox" checked={form.permissions.includes(p.key)}
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
        footer={
          <>
            <Button variant="ghost" onClick={() => setPermUser(null)}>إلغاء</Button>
            <Button onClick={savePerms} disabled={mutLoading}>{mutLoading ? '...' : 'حفظ'}</Button>
          </>
        }>
        <div className="grid grid-cols-2 gap-1.5 max-h-96 overflow-y-auto pl-1">
          {PERMISSIONS.map((p) => (
            <label key={p.key} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer">
              <input type="checkbox" checked={permSelect.includes(p.key)} onChange={() => togglePerm(p.key)} />
              {p.label}
            </label>
          ))}
        </div>
      </Modal>

      <Modal open={!!resetUser} title={`إعادة كلمة مرور ${resetUser?.name}`} onClose={() => setResetUser(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetUser(null)}>إلغاء</Button>
            <Button onClick={resetPass} disabled={mutLoading || !newPass}>{mutLoading ? '...' : 'حفظ'}</Button>
          </>
        }>
        <Input label="كلمة المرور الجديدة" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
      </Modal>
    </>
  );
}
