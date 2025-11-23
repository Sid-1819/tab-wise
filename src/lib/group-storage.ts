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

/**
 * Clean up dead tab references from all groups
 * Removes tab IDs that no longer exist in the browser
 */
export async function cleanupDeadTabs(activeTabIds: number[]): Promise<void> {
  const groups = await getCustomGroups();
  let hasChanges = false;

  for (const group of groups) {
    const validTabIds = group.tabIds.filter((id) => activeTabIds.includes(id));
    if (validTabIds.length !== group.tabIds.length) {
      group.tabIds = validTabIds;
      group.lastModified = Date.now();
      hasChanges = true;
    }
  }

  if (hasChanges) {
    await saveCustomGroups(groups);
  }
}

/**
 * Move a tab from one group to another (or remove from current group)
 */
export async function moveTabToGroup(
  tabId: number,
  targetGroupId: string | null
): Promise<void> {
  const groups = await getCustomGroups();

  // Remove from all existing groups first
  for (const group of groups) {
    const index = group.tabIds.indexOf(tabId);
    if (index !== -1) {
      group.tabIds.splice(index, 1);
      group.lastModified = Date.now();
    }
  }

  // Add to target group if specified
  if (targetGroupId) {
    const targetGroup = groups.find((g) => g.id === targetGroupId);
    if (targetGroup && !targetGroup.tabIds.includes(tabId)) {
      targetGroup.tabIds.push(tabId);
      targetGroup.lastModified = Date.now();
    }
  }

  await saveCustomGroups(groups);
}

/**
 * Get the group a tab belongs to (if any)
 */
export async function getTabGroup(tabId: number): Promise<CustomGroupConfig | null> {
  const groups = await getCustomGroups();
  return groups.find((g) => g.tabIds.includes(tabId)) || null;
}
