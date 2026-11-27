import { useCallback, useEffect, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ClipboardCopy,
  ExternalLink,
  FolderPlus,
  Layers,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FaviconImg } from '@/components/favicon-img';
import { useToast } from '@/components/ui/use-toast';
import { getTabFaviconUrl } from '@/lib/favicon';
import { cn } from '@/lib/utils';
import { nameForNew } from '@/lib/workspace-menu';
import { buildBrief } from '@/lib/workspace-brief';
import { timeAgo } from '@/lib/time-ago';
import { StatusChip, WorkspacePulse } from '@/components/workspace-pulse';
import { lastTouched } from '@/lib/workspace-activity';
import type { Workspace, WorkspaceContext } from '@/types/workspace';
import {
  addNote,
  addResources,
  createWorkspace,
  deleteNote,
  isWorkspaceUrl,
  markOpened,
  removeResource,
  renameWorkspace,
  setArchived,
  updateContext,
  updateNote,
} from '@/lib/workspace-model';
import {
  deleteWorkspace,
  getWorkspaces,
  updateWorkspace,
  upsertWorkspace,
} from '@/lib/workspace-storage';
import {
  captureActiveTabResource,
  captureWindowResources,
  captureWindowSnapshot,
  isLikelyRestorableUrl,
  restoreWorkspaceResources,
} from '@/lib/workspace-browser';

const textareaClass =
  'w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring/40';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

export function WorkspacesView({ onTabsChanged }: { onTabsChanged?: () => void }) {
  const { toast } = useToast();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getWorkspaces()
        .then((list) => {
          if (!cancelled) setWorkspaces(list);
        })
        .catch((e) => {
          if (!cancelled) {
            toast({ title: 'Could not load workspaces', description: errMsg(e), variant: 'destructive' });
          }
        })
        .finally(() => {
          if (!cancelled) setLoaded(true);
        });
    };
    load();
    // Stay in sync if storage changes elsewhere (another side panel, window).
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.workspaces) load();
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      cancelled = true;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, [toast]);

  const run = useCallback(
    async (fn: () => Promise<Workspace[] | void>, failTitle: string) => {
      try {
        const next = await fn();
        if (next) setWorkspaces(next);
      } catch (e) {
        toast({ title: failTitle, description: errMsg(e), variant: 'destructive' });
      }
    },
    [toast],
  );

  const create = async () => {
    const ws = createWorkspace(newName);
    await run(() => upsertWorkspace(ws), 'Could not create workspace');
    setNewName('');
    setSelectedId(ws.id);
  };

  /** One-click "save this whole window" (replaces the old Sessions feature). Keeps tab groups. */
  const saveWindow = async () => {
    try {
      const [snapshot, inputs] = await Promise.all([captureWindowSnapshot(), captureWindowResources()]);
      if (!snapshot) {
        toast({ title: 'Nothing to save', description: 'This window has no web pages yet.', variant: 'destructive' });
        return;
      }
      const name =
        newName.trim() ||
        nameForNew(snapshot.tabs, snapshot.tabs[0]) ||
        `Window ${new Date().toLocaleDateString()}`;
      let ws = createWorkspace(name);
      ws = addResources(ws, inputs.filter((i) => !i.pinned), isWorkspaceUrl, Date.now(), 'manual').workspace;
      ws = { ...ws, snapshot };
      await run(() => upsertWorkspace(ws), 'Could not save window');
      setNewName('');
      toast({
        title: 'Window saved',
        description: `“${ws.name}” with ${snapshot.tabs.length} tab${snapshot.tabs.length === 1 ? '' : 's'}${
          snapshot.chromeGroups ? ' and your tab groups' : ''
        }.`,
      });
    } catch (e) {
      toast({ title: 'Could not save window', description: errMsg(e), variant: 'destructive' });
    }
  };

  const selected = workspaces.find((w) => w.id === selectedId);

  if (selectedId && selected) {
    return (
      <WorkspaceDetail
        key={selected.id}
        workspace={selected}
        onBack={() => setSelectedId(null)}
        onTabsChanged={onTabsChanged}
        run={run}
      />
    );
  }

  // Live workspaces first, most recently touched on top.
  const visible = workspaces
    .filter((w) => (showArchived ? true : !w.archived))
    .sort((a, b) => Number(a.archived ?? false) - Number(b.archived ?? false) || lastTouched(b) - lastTouched(a));
  const archivedCount = workspaces.filter((w) => w.archived).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <form
        className="flex shrink-0 gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New workspace (e.g. Client website)"
          className="h-8 text-xs"
          aria-label="New workspace name"
        />
        <Button type="submit" size="sm" className="h-8 shrink-0 px-2" aria-label="Create workspace">
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0 gap-1 px-2 text-[11px]"
          title="Save this whole window (with tab groups) as a workspace"
          onClick={() => void saveWindow()}
        >
          <FolderPlus className="h-3.5 w-3.5" />
          Save window
        </Button>
      </form>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-1.5 pr-1">
          {loaded && visible.length === 0 && (
            <div className="rounded-md border border-dashed border-border p-4 text-center">
              <Layers className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              <p className="text-xs font-medium">One workspace per project</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Save the tabs you have open now, then jot down your next step. Next time, pick up right where you left off.
              </p>
              <Button size="sm" className="mt-3 h-7 text-[11px]" onClick={() => void saveWindow()}>
                <FolderPlus className="mr-1 h-3.5 w-3.5" />
                Save this window as a workspace
              </Button>
            </div>
          )}
          {visible.map((ws) => (
            <button
              key={ws.id}
              type="button"
              onClick={() => setSelectedId(ws.id)}
              className={cn(
                'rounded-md border border-border bg-card p-2 text-left transition-colors hover:bg-accent/50',
                ws.archived && 'opacity-60',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{ws.name}</span>
                {!ws.archived && <StatusChip workspace={ws} className="shrink-0" />}
              </div>
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {ws.context.nextAction ? `Next: ${ws.context.nextAction}` : 'No next action set'}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {ws.resources.length} page{ws.resources.length === 1 ? '' : 's'} · touched {timeAgo(lastTouched(ws))}
              </p>
            </button>
          ))}
          {archivedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] text-muted-foreground"
              onClick={() => setShowArchived((v) => !v)}
            >
              {showArchived ? 'Hide' : 'Show'} archived ({archivedCount})
            </Button>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface DetailProps {
  workspace: Workspace;
  onBack: () => void;
  onTabsChanged?: () => void;
  run: (fn: () => Promise<Workspace[] | void>, failTitle: string) => Promise<void>;
}

interface ContextFieldDef {
  key: keyof WorkspaceContext;
  label: string;
  placeholder: string;
  primary?: boolean;
}

function ContextField({
  field,
  value,
  setDraft,
  onSave,
}: {
  field: ContextFieldDef;
  value: string;
  setDraft: React.Dispatch<React.SetStateAction<Partial<WorkspaceContext>>>;
  onSave: (key: keyof WorkspaceContext) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{field.label}</span>
      <textarea
        rows={field.primary ? 2 : 1}
        className={textareaClass}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
        onBlur={() => onSave(field.key)}
      />
    </label>
  );
}

function WorkspaceDetail({ workspace: ws, onBack, onTabsChanged, run }: DetailProps) {
  const { toast } = useToast();
  // Drafts hold only what the user is currently typing; everything else reads
  // straight from the stored workspace so external edits show up immediately.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [ctxDraft, setCtxDraft] = useState<Partial<WorkspaceContext>>({});
  const [noteDraft, setNoteDraft] = useState('');
  const [editingNote, setEditingNote] = useState<{ id: string; body: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const name = nameDraft ?? ws.name;
  const ctx: WorkspaceContext = { ...ws.context, ...ctxDraft };

  const update = (fn: (w: Workspace) => Workspace, failTitle = 'Could not save') =>
    run(() => updateWorkspace(ws.id, fn), failTitle);

  const saveContextField = (key: keyof WorkspaceContext) => {
    const draft = ctxDraft[key];
    setCtxDraft(({ [key]: _dropped, ...rest }) => rest);
    if (draft === undefined || draft.trim() === ws.context[key]) return;
    void update((w) => updateContext(w, { [key]: draft.trim() }));
  };

  const addResult = (r: { added: number; duplicates: number; skipped: number }) => {
    const parts = [`${r.added} added`];
    if (r.duplicates) parts.push(`${r.duplicates} already saved`);
    if (r.skipped) parts.push(`${r.skipped} skipped (not web pages)`);
    toast({ title: r.added ? 'Saved to workspace' : 'Nothing new to save', description: parts.join(', ') });
  };

  const saveWindow = async () => {
    try {
      const inputs = await captureWindowResources();
      let summary = { added: 0, duplicates: 0, skipped: 0 };
      await run(
        () =>
          updateWorkspace(ws.id, (w) => {
            const r = addResources(w, inputs, isWorkspaceUrl);
            summary = r;
            return r.workspace;
          }),
        'Could not save tabs',
      );
      addResult(summary);
    } catch (e) {
      toast({ title: 'Could not read tabs', description: errMsg(e), variant: 'destructive' });
    }
  };

  const saveActiveTab = async () => {
    try {
      const input = await captureActiveTabResource();
      if (!input) {
        toast({ title: 'No active tab URL', variant: 'destructive' });
        return;
      }
      let summary = { added: 0, duplicates: 0, skipped: 0 };
      await run(
        () =>
          updateWorkspace(ws.id, (w) => {
            const r = addResources(w, [input], isWorkspaceUrl);
            summary = r;
            return r.workspace;
          }),
        'Could not save tab',
      );
      addResult(summary);
    } catch (e) {
      toast({ title: 'Could not read tab', description: errMsg(e), variant: 'destructive' });
    }
  };

  const restore = async (target: 'current' | 'new') => {
    try {
      const { opened, skipped } = await restoreWorkspaceResources(ws, target);
      if (opened === 0) {
        toast({
          title: 'Nothing to open',
          description: 'This workspace has no restorable resources yet.',
          variant: 'destructive',
        });
        return;
      }
      await update((w) => markOpened(w));
      onTabsChanged?.();
      toast({
        title: 'Workspace opened',
        description: `Opened ${opened} tab(s).${skipped ? ` ${skipped} skipped.` : ''}`,
      });
    } catch (e) {
      toast({ title: 'Could not open workspace', description: errMsg(e), variant: 'destructive' });
    }
  };

  const fields: ContextFieldDef[] = [
    { key: 'currentFocus', label: 'Current focus', placeholder: 'What are you working on?', primary: true },
    { key: 'nextAction', label: 'Next action', placeholder: 'The very next concrete step', primary: true },
    { key: 'blockers', label: 'Blocked by', placeholder: 'Anything stopping progress' },
    { key: 'waitingOn', label: 'Waiting on', placeholder: 'Person / reply / decision' },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <Input
          value={name}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => {
            const draft = nameDraft;
            setNameDraft(null);
            if (draft?.trim()) void update((w) => renameWorkspace(w, draft));
          }}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="h-7 flex-1 border-transparent px-1 text-sm font-medium focus-visible:border-input"
          aria-label="Workspace name"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          title="Copy a markdown brief (for handoffs or an AI chat)"
          aria-label="Copy brief"
          onClick={() => {
            navigator.clipboard
              .writeText(buildBrief(ws))
              .then(() => toast({ title: 'Brief copied', description: 'Paste it into a doc, a message, or an AI chat.' }))
              .catch(() => toast({ title: 'Could not copy', variant: 'destructive' }));
          }}
        >
          <ClipboardCopy className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          title={ws.archived ? 'Unarchive' : 'Archive'}
          aria-label={ws.archived ? 'Unarchive workspace' : 'Archive workspace'}
          onClick={() => void update((w) => setArchived(w, !w.archived))}
        >
          {ws.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn('h-7 p-0', confirmDelete ? 'px-2 text-destructive' : 'w-7')}
          aria-label="Delete workspace"
          onBlur={() => setConfirmDelete(false)}
          onClick={() => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              return;
            }
            void run(() => deleteWorkspace(ws.id), 'Could not delete').then(onBack);
          }}
        >
          {confirmDelete ? <span className="text-[11px]">Confirm delete</span> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 pb-2 pr-1">
          {/* Resume card: status, next step and any blocker, in one place */}
          <div className="min-w-0 rounded-md border border-primary/30 bg-primary/5 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Pick up where you left off
              </p>
              <StatusChip workspace={ws} />
            </div>
            <p className="mt-1 break-words text-xs">
              {ws.context.nextAction || 'Set a next action below so future-you knows where to start.'}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Touched {timeAgo(lastTouched(ws))} · {ws.resources.length} {ws.resources.length === 1 ? 'page' : 'pages'}
            </p>
            {ws.context.blockers.trim() && (
              <p className="mt-1.5 break-words text-[11px] text-destructive">Blocked by {ws.context.blockers.trim()}</p>
            )}
            <div className="mt-2 flex gap-1">
              <Button size="sm" className="h-7 flex-1 text-[11px]" onClick={() => void restore('new')}>
                Open in new window
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 flex-1 text-[11px]"
                onClick={() => void restore('current')}
              >
                Open here
              </Button>
            </div>
          </div>

          {/* Context: the two fields that matter stay visible; the rest tuck away until used */}
          <section className="flex flex-col gap-2">
            {fields
              .filter((f) => f.primary)
              .map((f) => (
                <ContextField key={f.key} field={f} value={ctx[f.key]} setDraft={setCtxDraft} onSave={saveContextField} />
              ))}
            <details
              className="group/more"
              open={!!(ws.context.blockers.trim() || ws.context.waitingOn.trim()) || undefined}
            >
              <summary className="cursor-pointer select-none text-[11px] text-muted-foreground hover:text-foreground">
                Blocked by / waiting on
              </summary>
              <div className="mt-2 flex flex-col gap-2">
                {fields
                  .filter((f) => !f.primary)
                  .map((f) => (
                    <ContextField key={f.key} field={f} value={ctx[f.key]} setDraft={setCtxDraft} onSave={saveContextField} />
                  ))}
              </div>
            </details>
          </section>

          {/* Resources */}
          <section>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Resources ({ws.resources.length})
              </h3>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-6 px-1.5 text-[11px]" onClick={() => void saveActiveTab()}>
                  <Plus className="mr-1 h-3 w-3" />
                  This tab
                </Button>
                <Button variant="outline" size="sm" className="h-6 px-1.5 text-[11px]" onClick={() => void saveWindow()}>
                  <FolderPlus className="mr-1 h-3 w-3" />
                  This window
                </Button>
              </div>
            </div>
            {ws.resources.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                No resources yet. Save the tabs this project needs.
              </p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {ws.resources.map((r) => (
                  <li
                    key={r.id}
                    className="group flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-accent/50"
                  >
                    <FaviconImg src={getTabFaviconUrl(r.url)} className="h-3.5 w-3.5 shrink-0" />
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      title={r.url}
                      onClick={() => isLikelyRestorableUrl(r.url) && void chrome.tabs.create({ url: r.url })}
                    >
                      <span className="block truncate text-xs">{r.title || r.url}</span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {(() => {
                          try {
                            return new URL(r.url).hostname;
                          } catch {
                            return r.url;
                          }
                        })()}
                      </span>
                    </button>
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    <button
                      type="button"
                      aria-label="Remove resource"
                      className="shrink-0 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={() => void update((w) => removeResource(w, r.id))}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Notes */}
          <section>
            <h3 className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Notes ({ws.notes.length})
            </h3>
            <textarea
              rows={2}
              className={textareaClass}
              placeholder="Add a note or decision… (Cmd/Ctrl+Enter to save)"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && noteDraft.trim()) {
                  void update((w) => addNote(w, noteDraft));
                  setNoteDraft('');
                }
              }}
            />
            <div className="mt-1 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[11px]"
                disabled={!noteDraft.trim()}
                onClick={() => {
                  void update((w) => addNote(w, noteDraft));
                  setNoteDraft('');
                }}
              >
                Add note
              </Button>
            </div>
            <ul className="mt-1 flex flex-col gap-1.5">
              {ws.notes.map((n) => (
                <li key={n.id} className="group rounded-md border border-border bg-card p-1.5">
                  {editingNote?.id === n.id ? (
                    <textarea
                      autoFocus
                      rows={3}
                      className={textareaClass}
                      value={editingNote.body}
                      onChange={(e) => setEditingNote({ id: n.id, body: e.target.value })}
                      onBlur={() => {
                        void update((w) => updateNote(w, n.id, editingNote.body));
                        setEditingNote(null);
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="w-full whitespace-pre-wrap break-words text-left text-xs"
                      onClick={() => setEditingNote({ id: n.id, body: n.body })}
                    >
                      {n.body}
                    </button>
                  )}
                  <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{timeAgo(n.updatedAt)}</span>
                    <button
                      type="button"
                      aria-label="Delete note"
                      className="opacity-0 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={() => void update((w) => deleteNote(w, n.id))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <details className="rounded-md border border-border px-2 py-1.5">
            <summary className="cursor-pointer select-none text-[11px] text-muted-foreground hover:text-foreground">
              Activity
            </summary>
            <div className="mt-2">
              <WorkspacePulse workspace={ws} />
            </div>
          </details>
        </div>
      </ScrollArea>
    </div>
  );
}
