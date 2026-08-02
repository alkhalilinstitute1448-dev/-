import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { Loader } from './components/ui';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Attendance from './pages/Attendance';
import Tasks from './pages/Tasks';
import Lessons from './pages/Lessons';
import Captions from './pages/Captions';
import Reports from './pages/Reports';
import Archive from './pages/Archive';
import Users from './pages/Users';
import Assistant from './pages/Assistant';

function Protected({ children, perm }) {
  const { user, can, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (perm && !can(perm)) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

function RoutesView() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<Protected perm="dashboard.view"><Dashboard /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="/attendance" element={<Protected perm="attendance.view"><Attendance /></Protected>} />
      <Route path="/tasks" element={<Protected perm="tasks.view"><Tasks /></Protected>} />
      <Route path="/lessons" element={<Protected perm="lessons.view"><Lessons /></Protected>} />
      <Route path="/captions" element={<Protected perm="captions.view"><Captions /></Protected>} />
      <Route path="/reports" element={<Protected perm="reports.view"><Reports /></Protected>} />
      <Route path="/archive" element={<Protected perm="archive.view"><Archive /></Protected>} />
      <Route path="/users" element={<Protected perm="users.view"><Users /></Protected>} />
      <Route path="/assistant" element={<Protected perm="assistant.view"><Assistant /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RoutesView />
      </BrowserRouter>
    </AuthProvider>
  );
}
