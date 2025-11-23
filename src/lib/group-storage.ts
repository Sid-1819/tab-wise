import {
  CustomGroupConfig,
  GroupingSettings,
  DEFAULT_GROUPING_SETTINGS,
} from '@/types/tab';

const STORAGE_KEYS = {
  CUSTOM_GROUPS: 'customGroups',
  GROUPING_SETTINGS: 'groupingSettings',
} as const;

export async function getCustomGroups(): Promise<CustomGroupConfig[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.CUSTOM_GROUPS], (result) => {
      resolve(result[STORAGE_KEYS.CUSTOM_GROUPS] || []);
    });
  });
}

export async function saveCustomGroups(
  groups: CustomGroupConfig[]
): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEYS.CUSTOM_GROUPS]: groups }, () => {
      resolve();
    });
  });
}

export async function addCustomGroup(
  group: CustomGroupConfig
): Promise<void> {
  const groups = await getCustomGroups();
  groups.push(group);
  await saveCustomGroups(groups);
}

export async function updateCustomGroup(
  groupId: string,
  updates: Partial<CustomGroupConfig>
): Promise<void> {
  const groups = await getCustomGroups();
  const index = groups.findIndex((g) => g.id === groupId);
  if (index !== -1) {
    groups[index] = { ...groups[index], ...updates, lastModified: Date.now() };
    await saveCustomGroups(groups);
  }
}

export async function deleteCustomGroup(groupId: string): Promise<void> {
  const groups = await getCustomGroups();
  const filtered = groups.filter((g) => g.id !== groupId);
  await saveCustomGroups(filtered);
}

export async function toggleGroupFavorite(groupId: string): Promise<void> {
  const groups = await getCustomGroups();
  const group = groups.find((g) => g.id === groupId);
  if (group) {
    await updateCustomGroup(groupId, {
      isFavorite: !group.isFavorite,
    });
  }
}

export async function getGroupingSettings(): Promise<GroupingSettings> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.GROUPING_SETTINGS], (result) => {
      resolve(result[STORAGE_KEYS.GROUPING_SETTINGS] || DEFAULT_GROUPING_SETTINGS);
    });
  });
}

export async function saveGroupingSettings(
  settings: GroupingSettings
): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEYS.GROUPING_SETTINGS]: settings }, () => {
      resolve();
    });
  });
}

export async function addTabToGroup(
  groupId: string,
  tabId: number
): Promise<void> {
  const groups = await getCustomGroups();
  const group = groups.find((g) => g.id === groupId);
  if (group && !group.tabIds.includes(tabId)) {
    group.tabIds.push(tabId);
    group.lastModified = Date.now();
    await saveCustomGroups(groups);
  }
}

export async function removeTabFromGroup(
  groupId: string,
  tabId: number
): Promise<void> {
  const groups = await getCustomGroups();
  const group = groups.find((g) => g.id === groupId);
  if (group) {
    group.tabIds = group.tabIds.filter((id) => id !== tabId);
    group.lastModified = Date.now();
    await saveCustomGroups(groups);
  }
}

export function generateGroupId(): string {
  return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
