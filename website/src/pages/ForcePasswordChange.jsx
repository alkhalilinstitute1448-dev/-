import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Alert, Button, Input } from '../components/ui';
import Logo from '../components/Logo';

export default function ForcePasswordChange() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ current: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.current || !form.newPassword) {
      setError('يرجى إدخال كلمة المرور الحالية والجديدة');
      return;
    }
    if (form.newPassword.length < 6) {
      setError('كلمة المرور الجديدة يجب ألا تقل عن ٦ أحرف');
      return;
    }
    if (form.newPassword !== form.confirm) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }
    setLoading(true);
    try {
      await api.put('/auth/password', { current: form.current, newPassword: form.newPassword });
      await refresh();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || 'تعذر تغيير كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          'radial-gradient(900px 500px at 80% -10%, rgba(63,107,255,0.22), transparent 60%), radial-gradient(700px 400px at 10% 110%, rgba(88,101,242,0.16), transparent 60%), #070B1E',
      }}
      dir="rtl"
    >
      <div className="w-full max-w-md animate-[floatIn_.4s_ease]">
        <div className="text-center mb-8">
          <Logo size="lg" showText={false} className="mx-auto" />
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-4">تغيير كلمة المرور</h1>
          <p className="text-gray-400 text-sm mt-2">
            مرحباً <span className="text-white font-semibold">{user?.name}</span> — يجب تغيير كلمة المرور المؤقتة قبل استخدام النظام.
          </p>
        </div>

        <form onSubmit={submit} className="glass-strong rounded-3xl p-8 space-y-5 shadow-glass-lg">
          {error && <Alert type="error">{error}</Alert>}
          <Alert type="warning">
            تستخدم كلمة مرور مؤقتة صادرة عن الإدارة. قم بإنشاء كلمة مرور خاصة بك الآن.
          </Alert>
          <Input label="كلمة المرور المؤقتة الحالية" type="password" value={form.current}
            onChange={(e) => setForm({ ...form, current: e.target.value })} autoFocus />
          <Input label="كلمة المرور الجديدة" type="password" hint="٦ أحرف على الأقل" value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
          <Input label="تأكيد كلمة المرور الجديدة" type="password" value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'جارٍ الحفظ...' : 'حفظ كلمة المرور الجديدة'}
          </Button>
          <button
            type="button"
            className="w-full text-center text-xs text-gray-500 hover:text-red-300 transition-colors"
            onClick={() => { logout(); navigate('/login', { replace: true }); }}
          >
            تسجيل الخروج
          </button>
        </form>
      </div>
    </div>
  );
}
