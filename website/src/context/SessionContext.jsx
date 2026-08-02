import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../api';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const { user } = useAuth();
  const [status, setStatus] = useState('idle'); // idle | checking | in_room | ended
  const [session, setSession] = useState(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [toast, setToast] = useState(null);

  const sessionRef = useRef(null);
  const checkingInRef = useRef(false);

  sessionRef.current = session;

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(null), 6000);
  }, []);

  const syncSession = useCallback((row, extraStatus) => {
    setSession(row);
    if (row?.check_in && !row?.check_out) {
      setStatus(extraStatus || 'in_room');
    } else {
      setStatus(row?.check_in ? 'ended' : 'idle');
    }
  }, []);

  const loadMySession = useCallback(async () => {
    try {
      const { data } = await api.get('/attendance/me');
      const row = data.today;
      if (row) {
        setSession(row);
        if (row.check_in && !row.check_out) setStatus('in_room');
        else if (row.check_in) setStatus('ended');
      }
    } catch {}
  }, []);

  const checkIn = useCallback(async () => {
    if (checkingInRef.current) return;
    checkingInRef.current = true;
    setStatus('checking');
    try {
      const { data } = await api.post('/attendance/check-in');
      setStatus('in_room');
      setSession({ date: data.date, check_in: data.check_in, session_start: new Date().toISOString() });
      showToast('تم تسجيل حضورك بنجاح. أهلاً بك ✦');
    } catch (err) {
      setStatus('idle');
      showToast(err?.response?.data?.error || 'تعذر تسجيل الحضور', 'warning');
    } finally {
      checkingInRef.current = false;
    }
  }, [showToast]);

  const endSession = useCallback(async () => {
    try {
      await api.post('/attendance/check-out');
    } catch {}
    setStatus('ended');
    setSession((s) => (s ? { ...s, check_out: s.check_out || new Date().toLocaleTimeString('en-GB', { hour12: false }) } : s));
    showToast('تم إنهاء جلسة العمل. نشكرك على عمل اليوم ✦', 'info');
  }, [showToast]);

  useEffect(() => {
    if (!user) return;
    loadMySession();

    const tick = setInterval(() => {
      const s = sessionRef.current;
      if (s?.check_in && !s?.check_out && s?.session_start) {
        setSessionSeconds(Math.max(0, Math.floor((Date.now() - new Date(s.session_start).getTime()) / 1000)));
      } else {
        setSessionSeconds(0);
      }
    }, 1000);

    const hb = setInterval(() => {
      api.post('/attendance/heartbeat').catch(() => {});
    }, 30000);

    return () => {
      clearInterval(tick);
      clearInterval(hb);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <SessionContext.Provider
      value={{
        status,
        session,
        sessionSeconds,
        toast,
        checkIn,
        endSession,
        showToast,
        syncSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
