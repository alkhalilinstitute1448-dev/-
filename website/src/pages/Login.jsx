import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert, Button, Input } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.error || 'تعذر تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(1200px 600px at 50% -10%, rgba(201,149,44,0.14), transparent 60%), #0a0a0a',
      }}
      dir="rtl"
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-3xl font-extrabold text-gold-200 mb-2">
            AL-KHALIL MEDIA <span className="text-gold-500">✦</span>
          </div>
          <p className="text-gray-500 text-sm">نظام إدارة الفريق الإعلامي</p>
        </div>
        <form
          onSubmit={submit}
          className="rounded-2xl bg-dark-850 border border-dark-700/60 shadow-card p-8 space-y-5"
        >
          <h2 className="text-lg font-bold text-gold-200 text-center">تسجيل الدخول</h2>
          {error && <Alert type="error">{error}</Alert>}
          <Input label="اسم المستخدم" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          <Input
            label="كلمة المرور"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'جاري الدخول...' : 'دخول'}
          </Button>
        </form>
      </div>
    </div>
  );
}
