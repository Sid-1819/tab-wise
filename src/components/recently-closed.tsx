import { useCallback, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

function loadRecentTabSessions(): Promise<chrome.sessions.Session[]> {
  return new Promise((resolve, reject) => {
    chrome.sessions.getRecentlyClosed({ maxResults: 15 }, (sessions) => {
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

  const tabSessions = sessions.filter((s) => s.tab != null);

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

  const undoLast = () => {
    restore();
  };

  return (
    <div className="flex items-center gap-2 mb-2">
      <Button variant="outline" size="sm" className="h-8" onClick={undoLast}>
        <RotateCcw className="h-3.5 w-3.5 mr-1" />
        Undo close
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 text-muted-foreground">
            Recently closed ({tabSessions.length})
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
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
    </div>
  );
}
