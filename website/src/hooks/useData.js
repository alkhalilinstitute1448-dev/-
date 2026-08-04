import { useState, useCallback, useEffect, useRef } from 'react';
import api, { getErrorMessage } from '../api';

let connectivityDown = false;

function notifyBackendDown() {
  if (!connectivityDown) {
    connectivityDown = true;
    window.dispatchEvent(new CustomEvent('akm:backend-down'));
  }
}

function notifyBackendUp() {
  if (connectivityDown) {
    connectivityDown = false;
    window.dispatchEvent(new CustomEvent('akm:backend-up'));
  }
}

export function useData(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetcherRef.current();
      setData(res.data);
      setRetrying(false);
      notifyBackendUp();
    } catch (err) {
      setError(getErrorMessage(err));
      if (!err?.response) {
        setRetrying(true);
        notifyBackendDown();
      }
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!retrying) return;
    let cancelled = false;
    const iv = setInterval(() => {
      fetcherRef.current()
        .then((res) => {
          if (cancelled) return;
          setData(res.data);
          setError(null);
          setRetrying(false);
          notifyBackendUp();
        })
        .catch((err) => {
          if (cancelled) return;
          if (err?.response) {
            setError(getErrorMessage(err));
            setRetrying(false);
          }
        });
    }, 8000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [retrying]);

  return { data, setData, loading, error, retrying, reload: load };
}

export function useMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async (fn) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fn();
      return { ok: true, data: res?.data };
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  return { run, loading, error, setError };
}
