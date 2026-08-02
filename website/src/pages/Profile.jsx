import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData, useMutation } from '../hooks/useData';
import api from '../api';
import { Card, PageHeader, Button, Input, Alert, Badge } from '../components/ui';
import { useSession } from '../context/SessionContext';
import { permissionLabel } from '../utils/permissions';
import { formatDuration } from '../utils/time';

export default function Profile() {
  const { user, refresh } = useAuth();
  const { status, sessionSeconds, geo, requestLocation } = useSession();
  const { run, loading, error, setError } = useMutation();
  const [passwords, setPasswords] = useState({ current: '', newPassword: '' });
  const [ok, setOk] = useState('');
  const me = useData(() => api.get('/attendance/me'));
  const active = status === 'in_room';

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
  const today = me.data?.today;

  return (
    <>
      <PageHeader title="صفحة العضو" subtitle="بياناتك الشخصية وجلستك وصلاحياتك" />
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-royal-500 to-indigo-600 flex items-center justify-center text-2xl text-white font-bold shadow-glow">
              {user?.name?.charAt(0)}
            </div>
            <div>
              <p className="text-xl font-bold text-gray-100">{user?.name}</p>
              <p className="text-sm text-gray-500">@{user?.username}</p>
              <div className="mt-1">
                <Badge color={user?.role === 'admin' ? 'indigo' : 'blue'}>
                  {user?.role === 'admin' ? 'مدير' : 'عضو'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-3">حالة الجلسة اليوم</p>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${active ? 'bg-emerald-400 animate-[pulseSoft_2.2s_infinite]' : 'bg-gray-600'}`} />
                  <span className={`font-semibold text-sm ${active ? 'text-emerald-300' : 'text-gray-400'}`}>
                    {active ? 'داخل غرفة الإعلام' : 'خارج العمل'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 mt-1.5">{geo?.name}</p>
              </div>
              {active ? (
                <div className="text-left">
                  <p className="text-[11px] text-gray-500">مدة الجلسة</p>
                  <p className="text-emerald-300 font-extrabold tabular-nums">{formatDuration(sessionSeconds).text}</p>
                </div>
              ) : (
                today?.check_in && today?.check_out && (
                  <div className="text-left">
                    <p className="text-[11px] text-gray-500">انتهت الجلسة</p>
                    <p className="text-gray-300 font-bold text-sm tabular-nums">
                      دخول {today.check_in} · خروج {today.check_out}
                    </p>
                  </div>
                )
              )}
            </div>
            {!active && !today?.check_out && (
              <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={requestLocation}>
                تفعيل الموقع
              </Button>
            )}
          </div>

          <p className="text-xs text-gray-600 mt-4">
            عضو منذ {user?.created_at ? new Date(user.created_at).toLocaleDateString('ar') : '—'}
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-white mb-4">تغيير كلمة المرور</h3>
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
        <h3 className="font-bold text-white mb-4">
          {perms === null ? 'الصلاحيات — مدير النظام (صلاحيات كاملة)' : 'صلاحياتي'}
        </h3>
        {perms === null && <p className="text-sm text-gray-500">المدير يمتلك جميع الصلاحيات تلقائيًا.</p>}
        {perms !== null && (
          <>
            {perms.length === 0 && <p className="text-sm text-gray-600">لم تُمنح لك صلاحيات بعد.</p>}
            <div className="flex flex-wrap gap-2">
              {perms.map((p) => (
                <span key={p} className="chip bg-white/[0.05] border-white/10 text-gray-300">
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
