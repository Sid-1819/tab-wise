// Side panel activity display helpers (extension page context).

import { ActivityData } from '@/lib/activity-types';

export function formatLastVisited(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'Just now';
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else {
    return `${days}d ago`;
  }
}

export function formatTimeSpent(milliseconds: number): string {
  if (milliseconds < 1000) {
    return '< 1s';
  }

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

export function getActivityColor(lastVisited: number): string {
  const now = Date.now();
  const diff = now - lastVisited;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 5) return 'text-green-500';
  if (minutes < 30) return 'text-blue-500';
  if (minutes < 60) return 'text-yellow-500';
  return 'text-muted-foreground';
}

export function getActivityStatus(lastVisited: number): 'active' | 'recent' | 'idle' | 'stale' {
  const now = Date.now();
  const diff = now - lastVisited;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 5) return 'active';
  if (minutes < 30) return 'recent';
  if (minutes < 120) return 'idle';
  return 'stale';
}

export function getTimeSinceLastUsed(tabId: number, activityData: ActivityData): number | null {
  const activity = activityData[tabId];
  if (!activity) return null;
  return Date.now() - activity.lastVisited;
}

export function isTabStale(tabId: number, threshold: number, activityData: ActivityData): boolean {
  const timeSince = getTimeSinceLastUsed(tabId, activityData);
  if (timeSince === null) return true;
  return timeSince > threshold;
}

export const STALE_THRESHOLD_OPTIONS = [
  { label: '1d', ms: 1 * 24 * 60 * 60 * 1000 },
  { label: '3d', ms: 3 * 24 * 60 * 60 * 1000 },
  { label: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: '14d', ms: 14 * 24 * 60 * 60 * 1000 },
] as const;

export const DEFAULT_STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

export interface StaleTabInput {
  id: number;
  active?: boolean;
  pinned?: boolean;
  isImportant?: boolean;
  lastAccessed?: number;
  activity?: { lastVisited?: number };
}

/** Prefer a recorded visit. Fall back to Chrome's lastAccessed. Unknown usage is not stale. */
export function lastUsedAt(tab: StaleTabInput): number | null {
  if (tab.activity?.lastVisited) return tab.activity.lastVisited;
  if (tab.lastAccessed) return tab.lastAccessed;
  return null;
}

export function getStaleTabs<T extends StaleTabInput>(
  tabs: T[],
  thresholdMs: number,
  importantGroupTabIds: ReadonlySet<number>,
  now = Date.now()
): T[] {
  return tabs.filter((tab) => {
    if (tab.active || tab.pinned || tab.isImportant) return false;
    if (importantGroupTabIds.has(tab.id)) return false;
    const used = lastUsedAt(tab);
    if (used == null) return false;
    return now - used > thresholdMs;
  });
}

export function getDiscardCandidates<T extends StaleTabInput & { discarded?: boolean; audible?: boolean }>(
  staleTabs: T[]
): T[] {
  return staleTabs.filter((tab) => !tab.discarded && !tab.audible);
}
