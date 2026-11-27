import { useEffect, useState } from 'react';
import { FOCUS_KEY, type FocusSession } from '@/lib/focus-mode';
import { getActiveFocusSession } from '@/lib/focus-session';

/** The running focus session (or null), kept in sync with storage across panels and windows. */
export function useFocusSession(): FocusSession | null {
  const [session, setSession] = useState<FocusSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void getActiveFocusSession().then((s) => {
        if (!cancelled) setSession(s);
      });
    };
    load();
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes[FOCUS_KEY]) load();
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      cancelled = true;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  return session;
}
