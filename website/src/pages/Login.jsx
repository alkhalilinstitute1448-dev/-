import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Alert, Button, Input } from '../components/ui';
import Logo from '../components/Logo';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootMsg, setBootMsg] = useState('');

  useEffect(() => {
    let active = true;
    const check = () => {
      const t = setTimeout(() => {
        api.get('/connection-status', { timeout: 20000 })
          .then(() => { if (active) setBootMsg(''); })
          .catch(() => { if (active) setBootMsg('الخادم يبدأ التشغيل الآن... قد يستغرق أول اتصال ٢٠-٣٠ ثانية'); });
      }, 500);
      return t;
    };
    const timer = check();
    const keepAlive = setInterval(() => api.get('/connection-status', { timeout: 20000 }).catch(() => {}), 4 * 60 * 1000);
    return () => { active = false; clearTimeout(timer); clearInterval(keepAlive); };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('الرجاء إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    setError('');
    setLoading(true);
    setBootMsg('');
    try {
      await login(username.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.error || 'تعذر تسجيل الدخول — الخادم يبدأ التشغيل الآن، حاول مرة أخرى بعد ٣٠ ثانية');
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
        <div className="text-center mb-9">
          <Logo size="lg" showText={false} className="mx-auto" />
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-4">Al-Khalil Media</h1>
          <p className="text-gray-400 text-sm mt-2">نظام إدارة الفريق الإعلامي</p>
        </div>

        <form onSubmit={submit} className="glass-strong rounded-3xl p-8 space-y-5 shadow-glass-lg">
          <h2 className="text-lg font-bold text-white text-center">تسجيل الدخول</h2>
          {error && <Alert type="error">{error}</Alert>}
          {bootMsg && <Alert type="warning">{bootMsg}</Alert>}
          <Input label="اسم المستخدم" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" />
          <Input label="كلمة المرور" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'جاري الاتصال بالخادم...' : 'دخول'}
          </Button>
          <p className="text-center text-xs text-gray-600">
            {bootMsg ? 'الخادم يستيقظ الآن — انتظر قليلاً ولا تغلق الصفحة' : 'إذا توقّف الخادم عن العمل بعد فترة خمول، أول اتصال قد يستغرق ٢٠-٣٠ ثانية'}
          </p>
        </form>

        <p className="text-center text-xs text-gray-600 mt-6">© Al-Khalil Media — جميع الحقوق محفوظة</p>
      </div>
    </div>
  );
}
