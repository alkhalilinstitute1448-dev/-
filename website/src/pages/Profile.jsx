import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData, useMutation } from '../hooks/useData';
import api from '../api';
import { Card, PageHeader, Button, Input, Alert, Badge, Avatar } from '../components/ui';
import ProfileForm, { profileFromUser } from '../components/ProfileForm';
import { useSession } from '../context/SessionContext';
import { permissionLabel } from '../utils/permissions';
import { formatDuration } from '../utils/time';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { status, sessionSeconds, checkIn, showToast } = useSession();
  const { run, loading, error, setError } = useMutation();
  const [passwords, setPasswords] = useState({ current: '', newPassword: '' });
  const [ok, setOk] = useState('');
  const [form, setForm] = useState(() => profileFromUser(user));
  const [saved, setSaved] = useState(false);
  const me = useData(() => api.get('/attendance/me'));
  const active = status === 'in_room';

  const changePassword = async () => {
    setOk('');
    setError('');
    if (passwords.newPassword.length < 6) {
      setError('كلمة المرور الجديدة يجب ألا تقل عن ٦ أحرف');
      return;
    }
    const r = await run(() => api.put('/auth/password', passwords));
    if (r.ok) {
      setOk('تم تغيير كلمة المرور بنجاح');
      setPasswords({ current: '', newPassword: '' });
    }
  };

  const saveProfile = async () => {
    setError('');
    setSaved(false);
    const r = await run(() => api.put('/auth/profile', form));
    if (r.ok) {
      updateUser(r.data.user);
      setSaved(true);
      showToast('تم حفظ البيانات الشخصية ✦');
    }
  };

  const perms = user?.role === 'admin' ? null : (user?.permissions || []);
  const today = me.data?.today;
  const joined = user?.joined_at || user?.created_at;
  const incomplete = user?.role !== 'admin' && (!user?.dob || !user?.gender);

  return (
    <>
      <PageHeader title="صفحة العضو" subtitle="بياناتك الشخصية وجلستك وصلاحياتك" />
      {incomplete && (
        <div className="mb-6">
          <Alert type="warning">
            بياناتك الشخصية غير مكتملة — أكمل <b>تاريخ الميلاد</b> و<b>الجنس</b> من النموذج أدناه.
          </Alert>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar user={user} size="xl" statusDot dotClass={active ? 'bg-emerald-400' : 'bg-gray-600'} />
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
                    {active ? 'في جلسة عمل' : 'خارج العمل'}
                  </span>
                </div>
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
              <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={checkIn} disabled={status === 'checking'}>
                {status === 'checking' ? 'جارِ التسجيل...' : 'تسجيل الحضور'}
              </Button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="glass rounded-2xl px-4 py-3">
              <p className="text-[11px] text-gray-500">عضو منذ</p>
              <p className="text-gray-200 font-semibold mt-0.5">{joined ? new Date(joined).toLocaleDateString('ar') : '—'}</p>
            </div>
            <div className="glass rounded-2xl px-4 py-3">
              <p className="text-[11px] text-gray-500">تاريخ الميلاد</p>
              <p className="text-gray-200 font-semibold mt-0.5">{user?.dob || '—'}</p>
            </div>
            <div className="glass rounded-2xl px-4 py-3">
              <p className="text-[11px] text-gray-500">الجنس</p>
              <p className="text-gray-200 font-semibold mt-0.5">
                {user?.gender === 'male' ? 'ذكر' : user?.gender === 'female' ? 'أنثى' : '—'}
              </p>
            </div>
            <div className="glass rounded-2xl px-4 py-3">
              <p className="text-[11px] text-gray-500">الهاتف</p>
              <p className="text-gray-200 font-semibold mt-0.5" dir="ltr">{user?.phone || '—'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">البيانات الشخصية</h3>
            {saved && <span className="chip text-emerald-300 bg-emerald-500/10 border-emerald-500/30">✓ تم الحفظ</span>}
          </div>
          {error && <div className="mb-3"><Alert type="error">{error}</Alert></div>}
          <ProfileForm form={form} setForm={setForm} />
          <Button className="mt-5 w-full" onClick={saveProfile} disabled={loading}>
            {loading ? 'جاري الحفظ...' : 'حفظ البيانات الشخصية'}
          </Button>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-6">
        <Card className="p-6">
          <h3 className="font-bold text-white mb-4">تغيير كلمة المرور</h3>
          {ok && <div className="mb-3"><Alert type="success">{ok}</Alert></div>}
          {error && <div className="mb-3"><Alert type="error">{error}</Alert></div>}
          <div className="space-y-4">
            <Input label="كلمة المرور الحالية" type="password" value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} />
            <Input label="كلمة المرور الجديدة" type="password" hint="٦ أحرف على الأقل" value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
            <Button onClick={changePassword} disabled={loading || !passwords.current || !passwords.newPassword}>
              {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
            </Button>
          </div>
        </Card>

        <Card className="p-6">
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
      </div>
    </>
  );
}
