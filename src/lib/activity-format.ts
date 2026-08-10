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
