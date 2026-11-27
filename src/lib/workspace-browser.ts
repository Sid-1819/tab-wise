import type { Workspace, WorkspaceRestoreTarget } from '@/types/workspace';
import { isLikelyRestorableUrl, restoreNamedSession } from '@/lib/session-capture-restore';
import type { NamedSession } from '@/types/session';
import type { ResourceInput } from '@/lib/workspace-model';
import { restoreSource } from '@/lib/workspace-restore';
import { captureWindowSession } from '@/lib/session-capture-restore';
import type { SavedSnapshot } from '@/types/workspace';

/** Tabs in the given window (or current window) as resource inputs. */
export async function captureWindowResources(windowId?: number): Promise<ResourceInput[]> {
  const id = windowId ?? (await chrome.windows.getCurrent()).id;
  if (id == null) return [];
  const tabs = await chrome.tabs.query({ windowId: id });
  tabs.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return tabs.map((t) => ({
    url: t.url || t.pendingUrl || '',
    title: t.title,
    pinned: t.pinned,
    kind: 'tab' as const,
  }));
}

export async function captureActiveTabResource(): Promise<ResourceInput | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return null;
  return { url: tab.url, title: tab.title, pinned: tab.pinned, kind: 'tab' };
}

/**
 * Reopen a workspace's resources. Reuses the proven session restore path
 * (pinned tabs, URL filtering, new-window vs current-window).
 */
export function restoreWorkspaceResources(ws: Workspace, target: WorkspaceRestoreTarget) {
  // Newest of: where you left off / a saved window snapshot (keeps tab groups) / curated list.
  const src = restoreSource(ws);
  const asSession: NamedSession = {
    id: ws.id,
    name: ws.name,
    createdAt: ws.createdAt,
    updatedAt: ws.updatedAt,
    tabs: src.tabs,
    chromeGroups: src.chromeGroups,
  };
  return restoreNamedSession(asSession, target);
}

/** Snapshot of a whole window, including Chrome tab groups, for "Save window". */
export async function captureWindowSnapshot(windowId?: number): Promise<SavedSnapshot | null> {
  const id = windowId ?? (await chrome.windows.getCurrent()).id;
  if (id == null) return null;
  const { tabs, chromeGroups } = await captureWindowSession(id, true);
  const restorable = tabs.filter((t) => isLikelyRestorableUrl(t.url));
  if (restorable.length === 0) return null;
  const keys = new Set(restorable.map((t) => t.chromeGroupKey).filter((k): k is string => !!k));
  const groups = chromeGroups?.filter((g) => keys.has(g.key));
  return { at: Date.now(), tabs: restorable, chromeGroups: groups?.length ? groups : undefined };
}

export { isLikelyRestorableUrl };
