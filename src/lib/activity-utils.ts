// Tab Activity Tracking Utilities

import { TabActivity } from '@/types/tab';

export type { TabActivity };

export interface ActivityData {
  [tabId: number]: TabActivity;
}

const STORAGE_KEY = 'tabActivityData';
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

/**
 * Get all activity data from storage
 */
export async function getActivityData(): Promise<ActivityData> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || {};
  } catch {
    return {};
  }
}

/**
 * Save activity data to storage
 */
export async function saveActivityData(data: ActivityData): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

/**
 * Record a tab activation (when user switches to a tab)
 */
export async function recordTabActivation(tabId: number, url: string): Promise<void> {
  const data = await getActivityData();
  const now = Date.now();

  if (!data[tabId]) {
    data[tabId] = {
      tabId,
      url,
      lastVisited: now,
      totalTimeSpent: 0,
      visitCount: 1,
    };
  } else {
    data[tabId].lastVisited = now;
    data[tabId].url = url;
    data[tabId].visitCount += 1;
  }

  await saveActivityData(data);
}

/**
 * Record time spent on a tab (called when switching away from a tab)
 */
export async function recordTimeSpent(tabId: number, duration: number): Promise<void> {
  const data = await getActivityData();

  if (data[tabId]) {
    data[tabId].totalTimeSpent += duration;
    await saveActivityData(data);
  }
}

/**
 * Clean up old activity data (older than 24 hours)
 */
export async function cleanupOldActivity(): Promise<void> {
  const data = await getActivityData();
  const now = Date.now();
  const cutoff = now - TWENTY_FOUR_HOURS;

  const cleanedData: ActivityData = {};

  for (const [tabId, activity] of Object.entries(data)) {
    // Keep if visited within 24 hours
    if (activity.lastVisited > cutoff) {
      cleanedData[Number(tabId)] = activity;
    }
  }

  await saveActivityData(cleanedData);
}

/**
 * Remove activity for closed tabs
 */
export async function removeTabActivity(tabId: number): Promise<void> {
  const data = await getActivityData();
  delete data[tabId];
  await saveActivityData(data);
}

/**
 * Get activity for a specific tab
 */
export async function getTabActivity(tabId: number): Promise<TabActivity | null> {
  const data = await getActivityData();
  return data[tabId] || null;
}

/**
 * Format "last visited" time as relative string
 */
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

/**
 * Format time spent as readable string
 */
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

/**
 * Get activity status color based on recency
 */
export function getActivityColor(lastVisited: number): string {
  const now = Date.now();
  const diff = now - lastVisited;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 5) return 'text-green-500'; // Very recent
  if (minutes < 30) return 'text-blue-500'; // Recent
  if (minutes < 60) return 'text-yellow-500'; // Somewhat stale
  return 'text-muted-foreground'; // Stale
}

/**
 * Get activity status
 */
export function getActivityStatus(lastVisited: number): 'active' | 'recent' | 'idle' | 'stale' {
  const now = Date.now();
  const diff = now - lastVisited;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 5) return 'active';
  if (minutes < 30) return 'recent';
  if (minutes < 120) return 'idle';
  return 'stale';
}
