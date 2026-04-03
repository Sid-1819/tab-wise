import {
  CustomGroupConfig,
  GroupingSettings,
  DEFAULT_GROUPING_SETTINGS,
} from '@/types/tab';

const STORAGE_KEYS = {
  CUSTOM_GROUPS: 'customGroups',
  GROUPING_SETTINGS: 'groupingSettings',
  IMPORTANT_TABS: 'importantTabs',
  IMPORTANT_GROUPS: 'importantGroups',
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

/**
 * Toggle important status for a tab
 */
export async function toggleTabImportant(tabId: number): Promise<void> {
  const importantTabs = [...(await getImportantTabs())];
  const index = importantTabs.indexOf(tabId);
  
  if (index >= 0) {
    importantTabs.splice(index, 1);
  } else {
    importantTabs.push(tabId);
  }
  
  await chrome.storage.local.set({ [STORAGE_KEYS.IMPORTANT_TABS]: importantTabs });
}

/**
 * Toggle important status for a group
 */
export async function toggleGroupImportant(groupId: string): Promise<void> {
  const groups = await getCustomGroups();
  const group = groups.find((g) => g.id === groupId);
  if (group) {
    await updateCustomGroup(groupId, {
      isImportant: !group.isImportant,
    });
  }
}

/**
 * Get list of important tab IDs
 */
export async function getImportantTabs(): Promise<number[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.IMPORTANT_TABS], (result) => {
      const raw = result[STORAGE_KEYS.IMPORTANT_TABS] || [];
      const ids = (Array.isArray(raw) ? raw : [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id));
      resolve(ids);
    });
  });
}

/**
 * Get list of important group IDs
 */
export async function getImportantGroups(): Promise<string[]> {
  const groups = await getCustomGroups();
  return groups.filter((g) => g.isImportant).map((g) => g.id);
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
