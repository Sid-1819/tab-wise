import { useCallback, useEffect, useMemo, useState } from 'react';
import { Hand, History, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import type { TabInfo, ChromeTabGroupInput } from '@/types/tab';
import type { Workspace } from '@/types/workspace';
import { detectProject, isDismissed, suggestionKeys, type TabLite } from '@/lib/project-detect';
import { matchWorkspace } from '@/lib/workspace-match';
import { addResources, createWorkspace, isWorkspaceUrl, markOpened } from '@/lib/workspace-model';
import { getWorkspaces, updateWorkspace, upsertWorkspace } from '@/lib/workspace-storage';
import { restoreWorkspaceResources } from '@/lib/workspace-browser';
import { clearLeave } from '@/lib/window-snapshot';
import { dismissSuggestion, getDismissedSuggestions } from '@/lib/dismissed-suggestions';
import { timeAgo } from '@/lib/time-ago';
import { awayLabel, clearWelcome, isWelcomeFresh, suggestNextAction } from '@/lib/workspace-welcome';
import { updateContext } from '@/lib/workspace-model';
import { watchSettings } from '@/lib/settings';

interface Props {
  tabs: TabInfo[];
  chromeGroups: ChromeTabGroupInput[];
  currentWindowId: number | null;
  onTabsChanged?: () => void;
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
export function ResumeAndSuggest({ tabs, chromeGroups, currentWindowId, onTabsChanged }: Props) {
  const { toast } = useToast();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [dismissed, setDismissed] = useState<string[][]>([]);
  const [nameDraft, setNameDraft] = useState<{ sig: string; name: string } | null>(null);
  const [autoCapture, setAutoCapture] = useState(true);
  const [nextDraft, setNextDraft] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => watchSettings((s) => setAutoCapture(s.autoCapture)), []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void Promise.all([getWorkspaces(), getDismissedSuggestions()]).then(([w, d]) => {
        if (cancelled) return;
        setWorkspaces(w);
        setDismissed(d);
      });
    };
    load();
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && (changes.workspaces || changes.dismissedProjectSuggestions)) load();
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

  /** Project suggestion for the current window, unless already saved or dismissed. */
  const suggestion = useMemo(() => {
    if (!autoCapture || currentWindowId == null) return null;
    const winTabs: TabLite[] = (tabsByWindow.get(currentWindowId) ?? []).map((t) => ({
      id: t.id,
      url: t.url,
      title: t.title,
      pinned: t.pinned,
      groupId: t.chromeGroupId,
      groupTitle: t.chromeGroupId != null ? groupTitles.get(t.chromeGroupId) || undefined : undefined,
    }));
    const s = detectProject(winTabs);
    if (!s) return null;
    if (matchWorkspace(winTabs.map((t) => t.url), workspaces)) return null;
    if (isDismissed(s, dismissed)) return null;
    return s;
  }, [autoCapture, tabsByWindow, currentWindowId, groupTitles, workspaces, dismissed]);

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

  if (!suggestion && resumable.length === 0 && !welcome) return null;

  return (
    <div className="mb-2 flex shrink-0 flex-col gap-1.5" data-testid="resume-and-suggest">
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

      {suggestion ? (
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
