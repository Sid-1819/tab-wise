// Background-only activity persistence (service worker context).
// Keep separate from side panel utilities to avoid shared extension chunks.

import { ActivityData } from '@/lib/activity-types';

const STORAGE_KEY = 'tabActivityData';
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export async function getActivityData(): Promise<ActivityData> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return (result[STORAGE_KEY] as ActivityData | undefined) ?? {};
  } catch {
    return {};
  }
}

export async function saveActivityData(data: ActivityData): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

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

export async function recordTimeSpent(tabId: number, duration: number): Promise<void> {
  const data = await getActivityData();

  if (data[tabId]) {
    data[tabId].totalTimeSpent += duration;
    await saveActivityData(data);
  }
}

export async function cleanupOldActivity(): Promise<void> {
  const data = await getActivityData();
  const now = Date.now();
  const cutoff = now - TWENTY_FOUR_HOURS;

  const cleanedData: ActivityData = {};

  for (const [tabId, activity] of Object.entries(data)) {
    if (activity.lastVisited > cutoff) {
      cleanedData[Number(tabId)] = activity;
    }
  }

  await saveActivityData(cleanedData);
}

export async function removeTabActivity(tabId: number): Promise<void> {
  const data = await getActivityData();
  delete data[tabId];
  await saveActivityData(data);
}

export async function getTabActivity(tabId: number) {
  const data = await getActivityData();
  return data[tabId] || null;
}
