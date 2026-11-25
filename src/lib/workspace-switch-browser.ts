import { findWindowFor, initials, type WindowLite } from '@/lib/workspace-switch';
import { matchedWorkspaceId } from '@/lib/workspace-menu';
import { restoreWorkspaceResources } from '@/lib/workspace-browser';
import { markOpened } from '@/lib/workspace-model';
import { getWorkspaces, updateWorkspace } from '@/lib/workspace-storage';
import type { Workspace } from '@/types/workspace';
import { applyFocusBadgeToTab, getFocusSession } from '@/lib/focus-session';

/** Windows a workspace could live in: normal, non-incognito. */
async function candidateWindows(): Promise<WindowLite[]> {
  const wins = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
  return wins
    .filter((w) => w.id != null && !w.incognito)
    .map((w) => ({
      id: w.id as number,
      focused: w.focused,
      urls: (w.tabs ?? []).map((t) => t.url || t.pendingUrl || ''),
    }));
}

export type SwitchResult = { mode: 'focused'; windowId: number } | { mode: 'opened'; tabs: number };

/**
 * Switch to a project: jump to the window that already has it, otherwise reopen it in a
 * new window. The window you're leaving is untouched; its state is captured on close.
 */
export async function switchToWorkspace(ws: Workspace): Promise<SwitchResult> {
  const windowId = findWindowFor(ws, await candidateWindows());
  if (windowId != null) {
    await chrome.windows.update(windowId, { focused: true });
    await updateWorkspace(ws.id, (w) => markOpened(w));
    return { mode: 'focused', windowId };
  }
  const { opened } = await restoreWorkspaceResources(ws, 'new');
  if (opened > 0) await updateWorkspace(ws.id, (w) => markOpened(w));
  return { mode: 'opened', tabs: opened };
}

// ---------- toolbar badge: which project is this window? ----------

const BADGE_COLOR = '#334155';
let lastFlash = 0;

export function noteFlash(): void {
  lastFlash = Date.now();
}

/** Show the active tab's project initials on the toolbar icon (and in its tooltip). */
export async function refreshProjectBadge(): Promise<void> {
  // Don't fight the add-to-workspace confirmation badge.
  if (Date.now() - lastFlash < 2000) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab?.id == null) return;
    const win = await chrome.windows.get(tab.windowId, { populate: true });
    if (win.incognito || win.type !== 'normal') return;
    // A focus session owns the badge in its window.
    const focus = await getFocusSession();
    if (focus && focus.windowId === win.id) {
      await applyFocusBadgeToTab(tab.id, focus);
      return;
    }
    const workspaces = await getWorkspaces();
    const id = matchedWorkspaceId(
      (win.tabs ?? []).map((t) => t.url || t.pendingUrl || ''),
      workspaces,
    );
    const ws = workspaces.find((w) => w.id === id);
    await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR, tabId: tab.id });
    await chrome.action.setBadgeText({ text: ws ? initials(ws.name) : '', tabId: tab.id });
    await chrome.action.setTitle({ title: ws ? `Tab Wise — ${ws.name}` : 'Open Tab Wise', tabId: tab.id });
  } catch {
    // tab/window went away mid-update
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;
function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void refreshProjectBadge(), 600);
}

export function registerProjectBadge(): void {
  chrome.tabs.onActivated.addListener(schedule);
  chrome.tabs.onUpdated.addListener((_id, info) => {
    if (info.status === 'complete' || info.url) schedule();
  });
  chrome.windows.onFocusChanged.addListener(schedule);
  chrome.storage.onChanged.addListener((c, area) => {
    if (area === 'local' && c.workspaces) schedule();
  });
  schedule();
}
