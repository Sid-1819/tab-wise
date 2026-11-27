import { useCallback, useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const MAX_RECENT_TABS = 10;
/** Fetch extra sessions so we still get up to MAX_RECENT_TABS after filtering to tab-only. */
const SESSIONS_FETCH_CAP = 25;

function loadRecentTabSessions(): Promise<chrome.sessions.Session[]> {
  return new Promise((resolve, reject) => {
    chrome.sessions.getRecentlyClosed({ maxResults: SESSIONS_FETCH_CAP }, (sessions) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(sessions ?? []);
    });
  });
}

export function RecentlyClosed({ onRestored }: { onRestored?: () => void }) {
  const [sessions, setSessions] = useState<chrome.sessions.Session[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(() => {
    loadRecentTabSessions()
      .then(setSessions)
      .catch(() => setSessions([]));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onRemoved = () => refresh();
    chrome.tabs.onRemoved.addListener(onRemoved);
    return () => chrome.tabs.onRemoved.removeListener(onRemoved);
  }, [refresh]);

  const tabSessions = sessions
    .filter((s) => s.tab != null)
    .slice(0, MAX_RECENT_TABS);

  const restore = (sessionId?: string) => {
    const done = () => {
      if (!chrome.runtime.lastError) {
        onRestored?.();
        refresh();
        setOpen(false);
      }
    };
    if (sessionId) {
      chrome.sessions.restore(sessionId, done);
    } else {
      chrome.sessions.restore(done);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="relative h-7 w-7 shrink-0 p-0 text-muted-foreground"
            aria-label={`Recently closed tabs (${tabSessions.length})`}
            title={`Recently closed (${tabSessions.length})`}
          >
            <History className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="p-2 border-b text-sm font-medium">Recently closed tabs</div>
          <div className="max-h-64 overflow-y-auto p-1">
            {tabSessions.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">Nothing to restore yet.</p>
            ) : (
              tabSessions.map((s) => {
                const sid = s.tab?.sessionId;
                return (
                <button
                  key={sid ?? `${s.tab?.url}-${s.lastModified}`}
                  type="button"
                  className="w-full text-left px-2 py-2 rounded-md text-sm hover:bg-accent truncate"
                  onClick={() => restore(sid)}
                  title={s.tab?.url}
                >
                  {s.tab?.title || s.tab?.url || 'Untitled'}
                </button>
              );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
