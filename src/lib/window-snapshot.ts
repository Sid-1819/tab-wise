import type { LastLeft, LeaveReason, LeftTab, Workspace } from '@/types/workspace';
import { addResources, isWorkspaceUrl } from '@/lib/workspace-model';
import { recordEvent } from '@/lib/workspace-activity';

/** Tab info cached per window while the user works (written by the background worker). */
export interface CachedTab {
  url: string;
  title?: string;
  pinned?: boolean;
  lastAccessed?: number;
  active?: boolean;
}

export interface WindowCacheEntry {
  tabs: CachedTab[];
  updatedAt: number;
}

export type WindowCache = Record<string, WindowCacheEntry>;

/** Most recently used web tab: highest lastAccessed, else the active tab. */
export function pickLastActive(tabs: CachedTab[]): { url: string; title?: string } | undefined {
  const web = tabs.filter((t) => isWorkspaceUrl(t.url));
  if (web.length === 0) return undefined;
  const byAccess = [...web].sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));
  const pick = byAccess[0].lastAccessed ? byAccess[0] : (web.find((t) => t.active) ?? web[0]);
  return { url: pick.url, title: pick.title };
}

export function buildLastLeft(tabs: CachedTab[], reason: LeaveReason, at: number): LastLeft | null {
  const web: LeftTab[] = tabs
    .filter((t) => isWorkspaceUrl(t.url))
    .map((t) => ({ url: t.url, title: t.title, pinned: t.pinned || undefined }));
  if (web.length === 0) return null;
  return { at, reason, tabs: web, lastActive: pickLastActive(tabs) };
}

/**
 * Apply a leave snapshot: record lastLeft, and fold any tabs we hadn't seen
 * before into the curated resource list (additive only — never deletes).
 */
export function applyLeave(ws: Workspace, tabs: CachedTab[], reason: LeaveReason, at: number): Workspace {
  const lastLeft = buildLastLeft(tabs, reason, at);
  if (!lastLeft) return ws;
  const withNew = addResources(
    ws,
    lastLeft.tabs.filter((t) => !t.pinned),
    isWorkspaceUrl,
    at,
    'auto',
  ).workspace;
  // A fresh leave supersedes any welcome-back that was never dismissed.
  const { welcomeBack: _stale, ...base } = withNew;
  return recordEvent({ ...base, lastLeft }, { type: 'left', count: lastLeft.tabs.length }, at);
}

/** Clear lastLeft once the user has resumed (so the card doesn't linger). */
export function clearLeave(ws: Workspace): Workspace {
  if (!ws.lastLeft) return ws;
  const { lastLeft: _drop, ...rest } = ws;
  return rest;
}
