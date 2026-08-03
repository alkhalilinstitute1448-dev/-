import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

const RETRYABLE = (err) => !err?.response || [408, 502, 503, 504].includes(err?.response?.status);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalizeUser(u) {
  if (!u) return u;
  if (typeof u.permissions === 'string') {
    try {
      u.permissions = JSON.parse(u.permissions);
    } catch {
      u.permissions = [];
    }
  }
  return u;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return normalizeUser(JSON.parse(localStorage.getItem('akm_user') || 'null'));
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(() => {
    if (!localStorage.getItem('akm_token')) return false;
    try {
      return !JSON.parse(localStorage.getItem('akm_user') || 'null');
    } catch {
      return true;
    }
  });

  const login = useCallback(async (username, password) => {
    const payload = { username, password };
    let lastErr;
    for (let i = 0; i < 3; i++) {
      try {
        const { data } = await api.post('/auth/login', payload);
        localStorage.setItem('akm_token', data.token);
        localStorage.setItem('akm_user', JSON.stringify(data.user));
        const normalized = normalizeUser(data.user);
        setUser(normalized);
        setLoading(false);
        return normalized;
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
    for (let i = 0; i < 4; i++) {
      try {
        const { data } = await api.get('/auth/me');
        const normalized = normalizeUser(data.user);
        setUser(normalized);
        localStorage.setItem('akm_user', JSON.stringify(normalized));
        setLoading(false);
        return;
      } catch (err) {
        if (err?.response?.status === 401) {
          logout();
          return;
        }
        if (i === 3) {
          setLoading(false);
          return;
        }
        await sleep(4000);
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
