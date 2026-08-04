import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Alert, Button } from '../components/ui';
import ProfileForm, { profileFromUser } from '../components/ProfileForm';
import Logo from '../components/Logo';

export default function CompleteProfile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => profileFromUser(user));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin' || (user.dob && user.gender)) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.dob || !form.gender) {
      setError('تاريخ الميلاد والجنس حقلان مطلوبان للاستمرار');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put('/auth/profile', form);
      updateUser(data.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || 'تعذر حفظ البيانات');
    } finally {
      setSaving(false);
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
      <div className="w-full max-w-2xl animate-[floatIn_.4s_ease]">
        <div className="text-center mb-6">
          <Logo size="lg" showText={false} className="mx-auto" />
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-4">إكمال البيانات الشخصية</h1>
          <p className="text-gray-400 text-sm mt-2">
            مرحباً <span className="text-white font-semibold">{user?.name}</span> — أكمل بياناتك الشخصية للدخول إلى النظام.
          </p>
        </div>

        <form onSubmit={submit} className="glass-strong rounded-3xl p-6 sm:p-8 space-y-5 shadow-glass-lg">
          {error && <Alert type="error">{error}</Alert>}
          <Alert type="warning">
            يجب تعبئة <b>تاريخ الميلاد</b> و<b>الجنس</b> على الأقل — ولا يمكنك استخدام النظام حتى اكتمالها. بقية البيانات اختيارية ويمكن تعديلها لاحقاً من صفحة العضو.
          </Alert>
          <ProfileForm form={form} setForm={setForm} />
          <div className="flex flex-col sm:flex-row gap-2">
            <Button type="submit" size="lg" className="flex-1" disabled={saving}>
              {saving ? 'جارٍ الحفظ...' : 'حفظ والمتابعة'}
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={() => { logout(); navigate('/login', { replace: true }); }}>
              تسجيل الخروج
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
