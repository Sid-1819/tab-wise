import { useCallback, useEffect, useMemo, useState } from 'react';
import { FolderPlus, Hand, History, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import type { TabInfo, ChromeTabGroupInput } from '@/types/tab';
import type { Workspace } from '@/types/workspace';
import { detectProject, isDismissed, suggestionKeys, type TabLite } from '@/lib/project-detect';
import { matchWorkspace } from '@/lib/workspace-match';
import { addResources, createWorkspace, isWorkspaceUrl, markOpened } from '@/lib/workspace-model';
import { getWorkspaces, updateWorkspace, upsertWorkspace } from '@/lib/workspace-storage';
import { captureWindowResources, captureWindowSnapshot, restoreWorkspaceResources } from '@/lib/workspace-browser';
import { clearLeave } from '@/lib/window-snapshot';
import { dismissSuggestion, getDismissedSuggestions } from '@/lib/dismissed-suggestions';
import { timeAgo } from '@/lib/time-ago';
import { awayLabel, clearWelcome, isWelcomeFresh, suggestNextAction } from '@/lib/workspace-welcome';
import { updateContext } from '@/lib/workspace-model';
import { watchSettings } from '@/lib/settings';
import {
  FIRST_WORKSPACE_DONE_KEY,
  firstWorkspaceName,
  markFirstWorkspaceDone,
  readFirstWorkspaceDone,
  shouldOfferFirstWorkspace,
} from '@/lib/first-workspace';
import { markTourSeen } from '@/lib/tour';

interface Props {
  tabs: TabInfo[];
  chromeGroups: ChromeTabGroupInput[];
  currentWindowId: number | null;
  onTabsChanged?: () => void;
  /** Called after the first workspace is saved, so the panel can show it. */
  onFirstWorkspace?: () => void;
}

function hostOrUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

const MAX_RESUME_CARDS = 2;

/**
 * Two automatic prompts, both suggestions the user can ignore:
 *  - "These tabs look like a project" (current window) -> save as workspace
 *  - "You left <workspace> — last on <tab>" -> resume it
 * Uses tab URLs/titles/group names only; never reads page content.
 */
export function ResumeAndSuggest({ tabs, chromeGroups, currentWindowId, onTabsChanged, onFirstWorkspace }: Props) {
  const { toast } = useToast();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [dismissed, setDismissed] = useState<string[][]>([]);
  const [nameDraft, setNameDraft] = useState<{ sig: string; name: string } | null>(null);
  const [autoCapture, setAutoCapture] = useState(true);
  const [nextDraft, setNextDraft] = useState<{ id: string; text: string } | null>(null);
  const [workspacesLoaded, setWorkspacesLoaded] = useState(false);
  const [firstDone, setFirstDone] = useState<boolean | null>(null);
  const [firstDraft, setFirstDraft] = useState<{ name?: string; next: string }>({ next: '' });
  const [savingFirst, setSavingFirst] = useState(false);

  useEffect(() => watchSettings((s) => setAutoCapture(s.autoCapture)), []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void Promise.all([getWorkspaces(), getDismissedSuggestions()]).then(([w, d]) => {
        if (cancelled) return;
        setWorkspaces(w);
        setDismissed(d);
        setWorkspacesLoaded(true);
      });
      void readFirstWorkspaceDone().then((done) => !cancelled && setFirstDone(done));
    };
    load();
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && (changes.workspaces || changes.dismissedProjectSuggestions || changes[FIRST_WORKSPACE_DONE_KEY])) load();
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      cancelled = true;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  const groupTitles = useMemo(
    () => new Map(chromeGroups.map((g) => [g.id, g.title?.trim() || ''])),
    [chromeGroups],
  );

  const tabsByWindow = useMemo(() => {
    const map = new Map<number, TabInfo[]>();
    for (const t of tabs) {
      if (t.windowId == null) continue;
      const list = map.get(t.windowId) ?? [];
      list.push(t);
      map.set(t.windowId, list);
    }
    return map;
  }, [tabs]);

  /** Resume cards: workspaces with a lastLeft that aren't currently open in any window. */
  const resumable = useMemo(() => {
    const windows = [...tabsByWindow.values()].map((ts) => ts.map((t) => t.url));
    return workspaces
      .filter((w) => w.lastLeft && !w.archived)
      .filter((w) => {
        const basis = (w.lastLeft?.tabs ?? []).map((t) => t.url);
        return !windows.some((urls) => matchWorkspace(urls, [w], () => basis));
      })
      .sort((a, b) => (b.lastLeft?.at ?? 0) - (a.lastLeft?.at ?? 0))
      .slice(0, MAX_RESUME_CARDS);
  }, [workspaces, tabsByWindow]);

  /** The freshest "you just came back" note, shown once until dismissed. */
  const welcome = useMemo(
    () =>
      workspaces
        .filter((w) => isWelcomeFresh(w))
        .sort((a, b) => (b.welcomeBack?.at ?? 0) - (a.welcomeBack?.at ?? 0))[0],
    [workspaces],
  );

  /** Tabs of the current window in the shape project detection expects. */
  const winTabsLite = useMemo<TabLite[]>(() => {
    if (currentWindowId == null) return [];
    return (tabsByWindow.get(currentWindowId) ?? []).map((t) => ({
      id: t.id,
      url: t.url,
      title: t.title,
      pinned: t.pinned,
      groupId: t.chromeGroupId,
      groupTitle: t.chromeGroupId != null ? groupTitles.get(t.chromeGroupId) || undefined : undefined,
    }));
  }, [tabsByWindow, currentWindowId, groupTitles]);

  /** Project suggestion for the current window, unless already saved or dismissed. */
  const suggestion = useMemo(() => {
    if (!autoCapture || currentWindowId == null) return null;
    const s = detectProject(winTabsLite);
    if (!s) return null;
    if (matchWorkspace(winTabsLite.map((t) => t.url), workspaces)) return null;
    if (isDismissed(s, dismissed)) return null;
    return s;
  }, [autoCapture, winTabsLite, currentWindowId, workspaces, dismissed]);

  /** First-run: a new user with no workspaces gets one guided card, even when no project is detected. */
  const savableTabs = useMemo(
    () => winTabsLite.filter((t) => !t.pinned && isWorkspaceUrl(t.url)),
    [winTabsLite],
  );
  const showFirst =
    workspacesLoaded &&
    firstDone !== null &&
    shouldOfferFirstWorkspace({ workspaces, done: firstDone, savableTabCount: savableTabs.length });
  const detectedName = useMemo(() => detectProject(winTabsLite)?.name ?? null, [winTabsLite]);
  const firstName = firstDraft.name ?? firstWorkspaceName(detectedName, savableTabs);

  const dismissFirst = () => {
    setFirstDone(true);
    void markFirstWorkspaceDone();
  };

  const saveFirst = async () => {
    setSavingFirst(true);
    try {
      const windowId = currentWindowId ?? undefined;
      const [snapshot, inputs] = await Promise.all([captureWindowSnapshot(windowId), captureWindowResources(windowId)]);
      let ws = createWorkspace(firstName);
      ws = addResources(ws, inputs.filter((i) => !i.pinned), isWorkspaceUrl, Date.now(), 'manual').workspace;
      if (ws.resources.length === 0) {
        toast({ title: 'Nothing to save', description: 'This window has no web pages yet.', variant: 'destructive' });
        return;
      }
      const next = firstDraft.next.trim();
      if (next) ws = updateContext(ws, { nextAction: next });
      if (snapshot) ws = { ...ws, snapshot };
      await upsertWorkspace(ws);
      setFirstDone(true);
      await Promise.all([markFirstWorkspaceDone(), markTourSeen()]);
      toast({
        title: 'Your first workspace is saved',
        description: next
          ? 'Close this window any time. Tab Wise will remind you where to start.'
          : 'Add a next step in the workspace so future-you knows where to start.',
      });
      onFirstWorkspace?.();
    } catch (e) {
      toast({ title: 'Could not save', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setSavingFirst(false);
    }
  };

  const suggestionSig = suggestion ? suggestionKeys(suggestion).join('|') : '';
  const draftName = nameDraft && nameDraft.sig === suggestionSig ? nameDraft.name : suggestion?.name ?? '';

  const saveSuggestion = useCallback(async () => {
    if (!suggestion) return;
    try {
      let ws = createWorkspace(draftName || suggestion.name);
      ws = addResources(
        ws,
        suggestion.tabs.map((t) => ({ url: t.url, title: t.title })),
        isWorkspaceUrl,
        Date.now(),
        'suggestion',
      ).workspace;
      ws = { ...ws, origin: 'auto' };
      await upsertWorkspace(ws);
      toast({ title: 'Workspace created', description: `“${ws.name}” with ${ws.resources.length} tabs. Add a next action anytime.` });
    } catch (e) {
      toast({ title: 'Could not save', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    }
  }, [suggestion, draftName, toast]);

  const resume = async (ws: Workspace) => {
    try {
      const { opened } = await restoreWorkspaceResources(ws, 'new');
      if (opened === 0) {
        toast({ title: 'Nothing to reopen', variant: 'destructive' });
        return;
      }
      await updateWorkspace(ws.id, (w) => markOpened(w));
      onTabsChanged?.();
    } catch (e) {
      toast({ title: 'Could not resume', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    }
  };

  if (!showFirst && !suggestion && resumable.length === 0 && !welcome) return null;

  return (
    <div className="mb-2 flex shrink-0 flex-col gap-1.5" data-testid="resume-and-suggest">
      {showFirst ? (
        <div className="min-w-0 rounded-md border border-primary/30 bg-primary/5 p-2.5" data-testid="first-workspace">
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Start your first workspace
            </p>
            <button
              type="button"
              aria-label="Not now"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={dismissFirst}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Save this window as a project. Close it whenever you like and pick up exactly where you left off.
          </p>
          <label className="mt-2 block">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Name</span>
            <Input
              value={firstName}
              onChange={(e) => setFirstDraft((d) => ({ ...d, name: e.target.value }))}
              className="mt-0.5 h-7 px-1.5 text-xs"
              aria-label="Workspace name"
            />
          </label>
          <label className="mt-1.5 block">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Next step (optional)
            </span>
            <Input
              value={firstDraft.next}
              onChange={(e) => setFirstDraft((d) => ({ ...d, next: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && !savingFirst && void saveFirst()}
              placeholder="The very next thing to do here"
              className="mt-0.5 h-7 px-1.5 text-xs"
              aria-label="Next step"
            />
          </label>
          <Button size="sm" className="mt-2 h-7 w-full text-[11px]" disabled={savingFirst} onClick={() => void saveFirst()}>
            <FolderPlus className="mr-1 h-3.5 w-3.5" />
            Save {savableTabs.length} {savableTabs.length === 1 ? 'tab' : 'tabs'} as a workspace
          </Button>
        </div>
      ) : null}
      {welcome ? <WelcomeBackCard ws={welcome} draft={nextDraft} setDraft={setNextDraft} /> : null}
      {resumable.map((ws) => {
        const last = ws.lastLeft!.lastActive;
        return (
          <div key={ws.id} className="rounded-md border border-primary/30 bg-primary/5 p-2" data-testid="resume-card">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <History className="h-3 w-3" /> Pick up where you left off
                </p>
                <p className="mt-0.5 truncate text-xs font-medium">{ws.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  Left {timeAgo(ws.lastLeft!.at)}
                  {last ? ` · last on ${last.title?.trim() || hostOrUrl(last.url)}` : ''}
                </p>
                {ws.context.nextAction ? (
                  <p className="mt-0.5 line-clamp-2 text-[11px]">Next: {ws.context.nextAction}</p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label={`Dismiss resume for ${ws.name}`}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => void updateWorkspace(ws.id, clearLeave)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <Button size="sm" className="mt-1.5 h-6 w-full text-[11px]" onClick={() => void resume(ws)}>
              Resume ({ws.lastLeft!.tabs.length} tabs)
            </Button>
          </div>
        );
      })}

      {suggestion && !showFirst ? (
        <div className="rounded-md border border-border bg-card p-2" data-testid="project-suggestion">
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Looks like a project
            </p>
            <button
              type="button"
              aria-label="Not now"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => void dismissSuggestion(suggestionKeys(suggestion))}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{suggestion.reason}</p>
          <div className="mt-1.5 flex gap-1">
            <Input
              value={draftName}
              onChange={(e) => setNameDraft({ sig: suggestionSig, name: e.target.value })}
              className="h-6 flex-1 px-1.5 text-xs"
              aria-label="Workspace name"
            />
            <Button size="sm" className="h-6 shrink-0 px-2 text-[11px]" onClick={() => void saveSuggestion()}>
              Save {suggestion.tabs.length} tabs
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WelcomeBackCard({
  ws,
  draft,
  setDraft,
}: {
  ws: Workspace;
  draft: { id: string; text: string } | null;
  setDraft: (d: { id: string; text: string } | null) => void;
}) {
  const wb = ws.welcomeBack!;
  const suggestion = suggestNextAction(ws);
  const text = draft && draft.id === ws.id ? draft.text : ws.context.nextAction || suggestion || '';
  const lastTitle = wb.lastActive ? wb.lastActive.title?.trim() || hostOrUrl(wb.lastActive.url) : null;
  const unchanged = text.trim() === ws.context.nextAction.trim();

  const save = () => {
    const next = text.trim();
    void updateWorkspace(ws.id, (w) => clearWelcome(next ? updateContext(w, { nextAction: next }) : w));
    setDraft(null);
  };

  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-2" data-testid="welcome-back">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <Hand className="h-3 w-3" /> Welcome back
          </p>
          <p className="mt-0.5 truncate text-xs font-medium">{ws.name}</p>
          <p className="text-[11px] text-muted-foreground">
            You were away {awayLabel(wb.at - wb.leftAt)} · {wb.tabCount} tab{wb.tabCount === 1 ? '' : 's'} reopened
            {lastTitle ? ` · last on ${lastTitle}` : ''}
          </p>
        </div>
        <button
          type="button"
          aria-label={`Dismiss welcome back for ${ws.name}`}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => void updateWorkspace(ws.id, clearWelcome)}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <label className="mt-1.5 block">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {ws.context.nextAction ? 'Next step (still right?)' : "What's the next step?"}
        </span>
        <div className="mt-0.5 flex gap-1">
          <Input
            value={text}
            onChange={(e) => setDraft({ id: ws.id, text: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="The very next concrete step"
            className="h-6 flex-1 px-1.5 text-xs"
            aria-label="Next step"
          />
          <Button size="sm" className="h-6 shrink-0 px-2 text-[11px]" onClick={save}>
            {unchanged || !text.trim() ? 'Got it' : 'Save'}
          </Button>
        </div>
      </label>
    </div>
  );
}
