import { useCallback, useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { NamedSession, SessionRestoreTarget } from '@/types/session';
import {
  deleteNamedSession,
  generateSessionId,
  getNamedSessions,
  upsertNamedSession,
} from '@/lib/session-storage';
import {
  captureWindowSession,
  hasTabGroupsApi,
  isLikelyRestorableUrl,
  restoreNamedSession,
} from '@/lib/session-capture-restore';
import { useToast } from '@/components/ui/use-toast';

function formatShortDate(ts: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleDateString();
  }
}

export function SavedSessions({ onRestored }: { onRestored?: () => void }) {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<NamedSession[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [includeGroups, setIncludeGroups] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const groupsAvailable = hasTabGroupsApi();

  const refresh = useCallback(() => {
    getNamedSessions().then(setSessions);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveCurrentWindow = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({
        title: 'Name required',
        description: 'Enter a name for this session.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const current = await chrome.windows.getCurrent();
      const windowId = current.id;
      if (windowId == null) {
        throw new Error('No active window');
      }

      const { tabs, chromeGroups } = await captureWindowSession(
        windowId,
        groupsAvailable && includeGroups
      );
      const restorable = tabs.filter((t) => isLikelyRestorableUrl(t.url));
      const groupKeys = new Set(
        restorable.map((t) => t.chromeGroupKey).filter((k): k is string => !!k)
      );
      const chromeGroupsFiltered =
        chromeGroups?.filter((g) => groupKeys.has(g.key)) ?? undefined;
      const hasGroups = !!chromeGroupsFiltered?.length;
      const tabsToStore = hasGroups
        ? restorable
        : restorable.map(({ chromeGroupKey: _k, ...rest }) => rest);
      if (restorable.length === 0) {
        toast({
          title: 'Nothing to save',
          description: 'This window has no tabs with URLs to snapshot.',
          variant: 'destructive',
        });
        return;
      }

      const now = Date.now();
      const session: NamedSession = {
        id: generateSessionId(),
        name: trimmed,
        createdAt: now,
        updatedAt: now,
        tabs: tabsToStore,
        chromeGroups: hasGroups ? chromeGroupsFiltered : undefined,
      };

      await upsertNamedSession(session);
      setName('');
      refresh();
      toast({
        title: 'Session saved',
        description: `"${trimmed}" (${tabsToStore.length} tab${tabsToStore.length === 1 ? '' : 's'})`,
      });
    } catch (e) {
      toast({
        title: 'Could not save session',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const runRestore = async (session: NamedSession, target: SessionRestoreTarget) => {
    try {
      const { opened, skipped } = await restoreNamedSession(session, target);
      if (opened === 0) {
        toast({
          title: 'Nothing restored',
          description: 'No restorable URLs in this session (e.g. only internal Chrome pages).',
          variant: 'destructive',
        });
        return;
      }
      onRestored?.();
      const skipMsg = skipped > 0 ? ` ${skipped} URL(s) skipped.` : '';
      toast({
        title: 'Session restored',
        description: `Opened ${opened} tab(s).${skipMsg}`,
      });
    } catch (e) {
      toast({
        title: 'Restore failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const remove = async (session: NamedSession) => {
    await deleteNamedSession(session.id);
    refresh();
    toast({ title: 'Session removed', description: `"${session.name}" deleted.` });
  };

  const startRename = (s: NamedSession) => {
    setEditingId(s.id);
    setEditName(s.name);
  };

  const commitRename = async (s: NamedSession) => {
    const trimmed = editName.trim();
    setEditingId(null);
    if (!trimmed || trimmed === s.name) return;
    await upsertNamedSession({ ...s, name: trimmed, updatedAt: Date.now() });
    refresh();
    toast({ title: 'Renamed', description: `"${trimmed}"` });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground px-2">
          Sessions ({sessions.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b border-border/60 space-y-2">
          <div className="flex gap-1.5">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name…"
              className="h-7 text-xs flex-1 min-w-0"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void saveCurrentWindow();
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              className="h-7 px-2 text-xs shrink-0"
              onClick={() => void saveCurrentWindow()}
            >
              Save
            </Button>
          </div>
          {groupsAvailable && (
            <div className="flex items-center justify-between gap-2">
              <Label
                htmlFor="session-groups"
                className="text-[11px] text-muted-foreground font-normal cursor-pointer"
              >
                Tab groups
              </Label>
              <Switch
                id="session-groups"
                className="scale-75 origin-right"
                checked={includeGroups}
                onCheckedChange={setIncludeGroups}
              />
            </div>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-3">None saved yet.</p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className="rounded-md px-2 py-1.5 hover:bg-accent/60 text-left"
              >
                {editingId === s.id ? (
                  <div className="flex gap-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-6 text-xs"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void commitRename(s);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => void commitRename(s)}
                    >
                      Done
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-sm truncate flex-1 min-w-0" title={s.name}>
                        {s.name}
                      </span>
                      <button
                        type="button"
                        className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent shrink-0"
                        title="Rename"
                        onClick={() => startRename(s)}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="p-1 rounded-sm text-muted-foreground hover:text-destructive hover:bg-accent shrink-0"
                        title="Delete"
                        onClick={() => void remove(s)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {s.tabs.length} tab{s.tabs.length === 1 ? '' : 's'}
                        {s.chromeGroups?.length
                          ? ` · ${s.chromeGroups.length} group${s.chromeGroups.length === 1 ? '' : 's'}`
                          : ''}{' '}
                        · {formatShortDate(s.updatedAt)}
                      </span>
                      <span className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          className="text-[11px] text-muted-foreground hover:text-foreground px-1 py-0.5 rounded-sm hover:bg-accent"
                          onClick={() => void runRestore(s, 'current')}
                        >
                          Here
                        </button>
                        <span className="text-muted-foreground/40 text-[10px]">·</span>
                        <button
                          type="button"
                          className="text-[11px] text-muted-foreground hover:text-foreground px-1 py-0.5 rounded-sm hover:bg-accent"
                          onClick={() => void runRestore(s, 'new')}
                        >
                          New
                        </button>
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
