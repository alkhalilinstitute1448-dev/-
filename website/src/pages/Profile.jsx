import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData, useMutation } from '../hooks/useData';
import api from '../api';
import { Card, PageHeader, Button, Input, Alert, Badge } from '../components/ui';
import { permissionLabel } from '../utils/permissions';

export default function Profile() {
  const { user, refresh } = useAuth();
  const { run, loading, error, setError } = useMutation();
  const [passwords, setPasswords] = useState({ current: '', newPassword: '' });
  const [ok, setOk] = useState('');

  const changePassword = async () => {
    setOk('');
    setError('');
    const r = await run(() => api.put('/auth/password', passwords));
    if (r.ok) {
      setOk('تم تغيير كلمة المرور بنجاح');
      setPasswords({ current: '', newPassword: '' });
    }
  };

  const perms = user?.role === 'admin' ? null : (user?.permissions || []);

  return (
    <>
      <PageHeader title="صفحة العضو" subtitle="بياناتك الشخصية وصلاحياتك" />
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center text-2xl text-gold-300 font-bold">
              {user?.name?.charAt(0)}
            </div>
            <div>
              <p className="text-xl font-bold text-gray-100">{user?.name}</p>
              <p className="text-sm text-gray-500">@{user?.username}</p>
              <div className="mt-1">
                <Badge color={user?.role === 'admin' ? 'gold' : 'blue'}>
                  {user?.role === 'admin' ? 'مدير' : 'عضو'}
                </Badge>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-600">
            عضو منذ {user?.created_at ? new Date(user.created_at).toLocaleDateString('ar') : '—'}
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-gold-200 mb-4">تغيير كلمة المرور</h3>
          {ok && <div className="mb-3"><Alert type="success">{ok}</Alert></div>}
          {error && <div className="mb-3"><Alert type="error">{error}</Alert></div>}
          <div className="space-y-4">
            <Input label="كلمة المرور الحالية" type="password" value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} />
            <Input label="كلمة المرور الجديدة" type="password" value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
            <Button onClick={changePassword} disabled={loading || !passwords.current || !passwords.newPassword}>
              {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
            </Button>
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h3 className="font-bold text-gold-200 mb-4">
          {perms === null ? 'الصلاحيات — مدير النظام (صلاحيات كاملة)' : 'صلاحياتي'}
        </h3>
        {perms === null && <p className="text-sm text-gray-500">المدير يمتلك جميع الصلاحيات تلقائيًا.</p>}
        {perms !== null && (
          <>
            {perms.length === 0 && <p className="text-sm text-gray-600">لم تُمنح لك صلاحيات بعد.</p>}
            <div className="flex flex-wrap gap-2">
              {perms.map((p) => (
                <span key={p} className="text-xs px-3 py-1.5 rounded-lg bg-dark-800 border border-dark-700 text-gray-300">
                  {permissionLabel(p)}
                </span>
              ))}
            </div>
          </>
        )}
      </Card>
    </>
  );
}
