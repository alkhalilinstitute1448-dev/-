import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

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
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('akm_token', data.token);
    localStorage.setItem('akm_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('akm_token');
    localStorage.removeItem('akm_user');
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      localStorage.setItem('akm_user', JSON.stringify(data.user));
    } catch {
      logout();
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
