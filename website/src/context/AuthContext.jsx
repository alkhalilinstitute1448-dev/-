import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

const RETRYABLE = (err) => !err?.response || [408, 502, 503, 504].includes(err?.response?.status);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('akm_user') || 'null');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('akm_token')));

  const login = useCallback(async (username, password) => {
    const payload = { username, password };
    let lastErr;
    for (let i = 0; i < 3; i++) {
      try {
        const { data } = await api.post('/auth/login', payload);
        localStorage.setItem('akm_token', data.token);
        localStorage.setItem('akm_user', JSON.stringify(data.user));
        setUser(data.user);
        setLoading(false);
        return data.user;
      } catch (err) {
        lastErr = err;
        if (!RETRYABLE(err) || i === 2) throw err;
        await sleep(3000);
      }
    }
    throw lastErr;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('akm_token');
    localStorage.removeItem('akm_user');
    setUser(null);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    for (let i = 0; i < 2; i++) {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
        localStorage.setItem('akm_user', JSON.stringify(data.user));
        setLoading(false);
        return;
      } catch (err) {
        if (i === 1 || !RETRYABLE(err)) {
          logout();
          setLoading(false);
          return;
        }
        await sleep(3000);
      }
    }
  }, [logout]);

  useEffect(() => {
    if (localStorage.getItem('akm_token')) refresh();
    else setLoading(false);
  }, [refresh]);

  const can = useCallback(
    (perm) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      return Array.isArray(user.permissions) && user.permissions.includes(perm);
    },
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, login, logout, refresh, can, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
