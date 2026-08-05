import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../api';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [taskCounts, setTaskCounts] = useState({ active: 0, new: 0, in_progress: 0, in_review: 0, completed: 0, rejected: 0, total: 0 });
  const [notifications, setNotifications] = useState([]);
  const timerRef = useRef(null);

  const refreshCounts = useCallback(async () => {
    if (!user) return;
    try {
      const [n, t] = await Promise.all([
        api.get('/notifications/unread-count'),
        api.get('/task-requests/my-count'),
      ]);
      setUnreadCount(n.data.count);
      setTaskCounts(t.data);
    } catch {}
  }, [user]);

  const fetchList = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data);
    } catch {}
  }, [user]);

  const markRead = useCallback(async (id) => {
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try { await api.put(`/notifications/${id}/read`); } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((list) => list.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try { await api.put('/notifications/read-all'); } catch {}
  }, []);

  useEffect(() => {
    refreshCounts();
    timerRef.current = setInterval(refreshCounts, 30000);
    return () => clearInterval(timerRef.current);
  }, [refreshCounts]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        taskCounts,
        notifications,
        refreshCounts,
        fetchList,
        markRead,
        markAllRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
