import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSystemMemoryInfo,
  hasSystemMemoryPermission,
  requestSystemMemoryPermission,
} from '@/lib/system-memory';

const REFRESH_MS = 30_000;

export function useSystemMemory() {
  const [data, setData] = useState<chrome.system.memory.MemoryInfo | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const fetchAndSet = useCallback(async () => {
    const info = await getSystemMemoryInfo();
    if (!mounted.current) return;
    if (info) {
      setData(info);
      setError(null);
    } else {
      setData(null);
      const stillGranted = await hasSystemMemoryPermission();
      if (!mounted.current) return;
      if (stillGranted) {
        setError('Could not read memory.');
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      const granted = await hasSystemMemoryPermission();
      if (!mounted.current) return;
      setPermissionGranted(granted);
      setLoading(false);
      if (granted) {
        await fetchAndSet();
      }
    })();
    return () => {
      mounted.current = false;
    };
  }, [fetchAndSet]);

  useEffect(() => {
    if (!permissionGranted) return;
    const id = setInterval(fetchAndSet, REFRESH_MS);
    return () => clearInterval(id);
  }, [permissionGranted, fetchAndSet]);

  const requestPermission = useCallback(async () => {
    setError(null);
    const granted = await requestSystemMemoryPermission();
    if (!mounted.current) return;
    setPermissionGranted(granted);
    if (granted) {
      setLoading(true);
      await fetchAndSet();
      setLoading(false);
    }
  }, [fetchAndSet]);

  const refresh = useCallback(() => fetchAndSet(), [fetchAndSet]);

  return {
    data,
    permissionGranted,
    loading,
    error,
    requestPermission,
    refresh,
  };
}
