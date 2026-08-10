import { useState, useEffect } from 'react';

const DEFAULT_REFRESH_MS = 60_000;

export function useCurrentTime(refreshMs = DEFAULT_REFRESH_MS) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), refreshMs);
    return () => window.clearInterval(intervalId);
  }, [refreshMs]);

  return now;
}
