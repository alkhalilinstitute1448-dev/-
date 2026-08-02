import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../api';

const SessionContext = createContext(null);

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function SessionProvider({ children }) {
  const { user } = useAuth();
  const [geo, setGeo] = useState(null);
  const [coords, setCoords] = useState(null);
  const [distance, setDistance] = useState(null);
  const [permission, setPermission] = useState('prompt'); // prompt | granted | denied | unsupported
  const [inRoom, setInRoom] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | in_room | leaving | ended | checking | no_permission
  const [session, setSession] = useState(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [leaveNotice, setLeaveNotice] = useState(false);
  const [toast, setToast] = useState(null);

  const watchIdRef = useRef(null);
  const leavingSinceRef = useRef(null);
  const noticeShownRef = useRef(false);
  const checkingInRef = useRef(false);
  const heartbeatRef = useRef(null);
  const sessionRef = useRef(null);
  const geoRef = useRef(null);
  const lastFixedRef = useRef(null);
  const lastHeartbeatInsideRef = useRef(null);
  const lastCheckinAttemptRef = useRef(0);
  const coordsRef = useRef(null);

  sessionRef.current = session;
  geoRef.current = geo;

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(null), 6000);
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const { data } = await api.get('/settings');
      setGeo(data.geo);
    } catch {
      setGeo({ name: 'جامع إبراهيم الخليل – مساكن برزة', lat: 33.538, lng: 36.321, radius: 100, margin: 20, grace_minutes: 2 });
    }
  }, []);

  const loadMySession = useCallback(async () => {
    try {
      const { data } = await api.get('/attendance/me');
      const row = data.today;
      if (row) {
        setSession(row);
        if (row.check_in && !row.check_out) setStatus('in_room');
      }
    } catch {}
  }, []);

  const syncSession = useCallback((row, extraStatus) => {
    setSession(row);
    if (row?.check_in && !row?.check_out) {
      setStatus(extraStatus || 'in_room');
    } else {
      setStatus(row?.check_in ? 'ended' : 'idle');
    }
  }, []);

  const endSession = useCallback(async () => {
    try {
      await api.post('/attendance/check-out');
    } catch {}
    setLeaveNotice(false);
    leavingSinceRef.current = null;
    noticeShownRef.current = false;
    setStatus('ended');
    setSession((s) => (s ? { ...s, check_out: s.check_out || new Date().toLocaleTimeString('en-GB', { hour12: false }) } : s));
    showToast('تم إنهاء جلسة العمل. نشكرك على عمل اليوم ✦', 'info');
  }, [showToast]);

  const dismissLeaveNotice = useCallback(() => {
    setLeaveNotice(false);
    noticeShownRef.current = false;
    leavingSinceRef.current = null;
    setStatus('in_room');
  }, []);

  const sendHeartbeat = useCallback(async (lat, lng) => {
    try {
      const { data } = await api.post('/attendance/heartbeat', { lat, lng });
      if (data.status === 'auto_ended') {
        setStatus('ended');
        setLeaveNotice(false);
        leavingSinceRef.current = null;
        noticeShownRef.current = false;
        setSession(null);
        showToast('انتهت جلستك تلقائيًا لأنك غادرت نطاق غرفة الإعلام', 'warning');
        return;
      }
      if (data.session && !sessionRef.current?.check_in) {
        setSession(data.session);
        if (data.session.check_in && !data.session.check_out) setStatus('in_room');
      }
    } catch {}
  }, [showToast]);

  const handlePosition = useCallback(
    (lat, lng) => {
      const g = geoRef.current;
      if (!g) return;
      const dist = distanceMeters(lat, lng, g.lat, g.lng);
      const rounded = Math.round(dist);
      const inside = dist <= g.radius + g.margin;

      const prevDist = lastFixedRef.current_dist ?? -1;
      const prevInside = lastFixedRef.current_inside === true;
      const meaningful = Math.abs(rounded - prevDist) > 3 || inside !== prevInside;
      lastFixedRef.current_dist = rounded;
      lastFixedRef.current_inside = inside;

      if (meaningful) {
        coordsRef.current = { lat, lng };
        setCoords({ lat, lng });
        setDistance(rounded);
        setInRoom(inside);
      }

      const cur = sessionRef.current;

      if (inside) {
        leavingSinceRef.current = null;
        if (noticeShownRef.current) {
          setLeaveNotice(false);
          noticeShownRef.current = false;
        }
        if (cur && cur.check_in && !cur.check_out) {
          setStatus('in_room');
        } else if (!checkingInRef.current && Date.now() - lastCheckinAttemptRef.current > 30000) {
          checkingInRef.current = true;
          lastCheckinAttemptRef.current = Date.now();
          api
            .post('/attendance/check-in', { lat, lng })
            .then(({ data }) => {
              setStatus('in_room');
              setSession({ date: data.date, check_in: data.check_in, session_start: new Date().toISOString() });
              showToast('تم تسجيل حضورك بنجاح. أهلاً بك في غرفة الإعلام ✦');
            })
            .catch((err) => {
              setStatus('idle');
            })
            .finally(() => {
              checkingInRef.current = false;
            });
        }
      } else {
        if (cur && cur.check_in && !cur.check_out) {
          setStatus('leaving');
          if (!leavingSinceRef.current) leavingSinceRef.current = Date.now();
          const graceMs = g.grace_minutes * 60 * 1000;
          if (!noticeShownRef.current && Date.now() - leavingSinceRef.current >= graceMs) {
            noticeShownRef.current = true;
            setLeaveNotice(true);
          }
        }
      }

      // throttled heartbeat (every 25s) or on inside-state change since last send
      const now = Date.now();
      const stateChanged = lastHeartbeatInsideRef.current !== null && inside !== lastHeartbeatInsideRef.current;
      if (!lastFixedRef.current || now - lastFixedRef.current > 25000 || stateChanged) {
        lastFixedRef.current = now;
        lastHeartbeatInsideRef.current = inside;
        sendHeartbeat(lat, lng);
      }
    },
    [sendHeartbeat, showToast]
  );

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setPermission('unsupported');
      setStatus('no_permission');
      return;
    }
    setPermission('granted');
    setStatus('checking');
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => handlePosition(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermission('denied');
          setStatus('no_permission');
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
  }, [handlePosition]);

  useEffect(() => {
    if (!user) return;
    loadConfig();
    loadMySession();
    requestLocation();

    const tick = setInterval(() => {
      const s = sessionRef.current;
      if (s?.check_in && !s?.check_out && s?.session_start) {
        setSessionSeconds(Math.max(0, Math.floor((Date.now() - new Date(s.session_start).getTime()) / 1000)));
      } else {
        setSessionSeconds(0);
      }
    }, 1000);

    const hb = setInterval(() => {
      const c = coordsRef.current;
      if (c) sendHeartbeat(c.lat, c.lng);
    }, 30000);
    heartbeatRef.current = hb;

    return () => {
      clearInterval(tick);
      clearInterval(hb);
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <SessionContext.Provider
      value={{
        geo,
        coords,
        distance,
        permission,
        inRoom,
        status,
        session,
        sessionSeconds,
        leaveNotice,
        toast,
        requestLocation,
        endSession,
        dismissLeaveNotice,
        showToast,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
