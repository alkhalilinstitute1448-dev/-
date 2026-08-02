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
        background:
          'radial-gradient(900px 500px at 80% -10%, rgba(43,71,221,0.28), transparent 60%), radial-gradient(700px 400px at 10% 110%, rgba(99,102,241,0.2), transparent 60%), #070b18',
      }}
      dir="rtl"
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-9">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-royal-500 to-indigo-600 text-white text-3xl shadow-glow mb-4">
            ✦
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Al-Khalil Media</h1>
          <p className="text-gray-500 text-sm mt-2">نظام إدارة الفريق الإعلامي</p>
        </div>

        <form onSubmit={submit} className="glass-strong rounded-3xl p-8 space-y-5 shadow-glass-lg">
          <h2 className="text-lg font-bold text-white text-center">تسجيل الدخول</h2>
          {error && <Alert type="error">{error}</Alert>}
          <Input label="اسم المستخدم" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          <Input label="كلمة المرور" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'جاري الدخول...' : 'دخول'}
          </Button>
        </form>
      </div>
    </div>
  );
}
