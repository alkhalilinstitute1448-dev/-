import { useEffect } from 'react';
import api from '../api';

const PING_INTERVAL = 4 * 60 * 1000;

export default function useKeepAlive() {
  useEffect(() => {
    const ping = () => api.get('/connection-status', { timeout: 20000 }).catch(() => {});
    const initial = setTimeout(ping, 600);
    const iv = setInterval(ping, PING_INTERVAL);
    const onVisible = () => {
      if (document.visibilityState === 'visible') ping();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', ping);
    return () => {
      clearTimeout(initial);
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', ping);
    };
  }, []);
}
