// Background Service Worker for Tab Wise Extension
// Handles real-time tab events, side panel management, and activity tracking

import {
  recordTabActivation,
  recordTimeSpent,
  removeTabActivity,
  cleanupOldActivity,
  getActivityData,
  type ActivityData,
} from './lib/activity-utils';

// Message types for communication between sidepanel and background
export interface BackgroundMessage {
  action: 'getTabs' | 'tabsUpdated' | 'closeTabs' | 'switchToTab' | 'getActivity';
  payload?: unknown;
}

export interface TabUpdatePayload {
  tabId: number;
  changeInfo: chrome.tabs.TabChangeInfo;
  tab: chrome.tabs.Tab;
}

// Store for managing state
let cachedTabs: chrome.tabs.Tab[] = [];
let activeTabId: number | null = null;
let activeTabStartTime: number | null = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Tab Wise extension installed');
  refreshTabs();
  cleanupOldActivity(); // Clean old activity data on install
});

// Cleanup old activity data periodically (every hour)
setInterval(() => {
  cleanupOldActivity();
}, 60 * 60 * 1000);

// Refresh tabs cache
async function refreshTabs(): Promise<chrome.tabs.Tab[]> {
  cachedTabs = await chrome.tabs.query({});
  return cachedTabs;
}

// Broadcast tab updates to all extension pages
function broadcastTabUpdate(type: string, data?: unknown) {
  chrome.runtime.sendMessage({
    action: 'tabsUpdated',
    payload: { type, data, tabs: cachedTabs },
  }).catch(() => {
    // Ignore errors when no listeners are available
  });
}

// Track time spent when switching away from a tab
async function recordPreviousTabTime() {
  if (activeTabId !== null && activeTabStartTime !== null) {
    const duration = Date.now() - activeTabStartTime;
    // Only record if spent more than 1 second
    if (duration > 1000) {
      await recordTimeSpent(activeTabId, duration);
    }
  }
}

// Tab event listeners for real-time updates
chrome.tabs.onCreated.addListener(async (tab) => {
  await refreshTabs();
  broadcastTabUpdate('created', tab);
});

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  // Record time if the removed tab was active
  if (activeTabId === tabId) {
    await recordPreviousTabTime();
    activeTabId = null;
    activeTabStartTime = null;
  }
  // Remove activity data for closed tab
  await removeTabActivity(tabId);
  await refreshTabs();
  broadcastTabUpdate('removed', { tabId, removeInfo });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only broadcast on significant changes
  if (changeInfo.status === 'complete' || changeInfo.title || changeInfo.url) {
    await refreshTabs();
    broadcastTabUpdate('updated', { tabId, changeInfo, tab });
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  // Record time spent on previous tab
  await recordPreviousTabTime();

  // Get the newly activated tab
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);

    // Record activation of new tab
    await recordTabActivation(activeInfo.tabId, tab.url || '');

    // Update tracking state
    activeTabId = activeInfo.tabId;
    activeTabStartTime = Date.now();
  } catch {
    // Tab might have been closed
  }

  await refreshTabs();
  broadcastTabUpdate('activated', activeInfo);
});

chrome.tabs.onMoved.addListener(async (tabId, moveInfo) => {
  await refreshTabs();
  broadcastTabUpdate('moved', { tabId, moveInfo });
});

chrome.tabs.onAttached.addListener(async (tabId, attachInfo) => {
  await refreshTabs();
  broadcastTabUpdate('attached', { tabId, attachInfo });
});

chrome.tabs.onDetached.addListener(async (tabId, detachInfo) => {
  await refreshTabs();
  broadcastTabUpdate('detached', { tabId, detachInfo });
});

// Handle window focus changes to track time more accurately
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus, record time spent
    await recordPreviousTabTime();
    activeTabStartTime = null;
  } else {
    // Browser gained focus, restart timer
    if (activeTabId !== null) {
      activeTabStartTime = Date.now();
    }
  }
});

// Handle messages from side panel
chrome.runtime.onMessage.addListener((message: BackgroundMessage, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(message: BackgroundMessage): Promise<unknown> {
  switch (message.action) {
    case 'getTabs': {
      const tabs = await refreshTabs();
      return { tabs };
    }

    case 'getActivity': {
      const activity = await getActivityData();
      return { activity };
    }

    case 'closeTabs': {
      const tabIds = message.payload as number[];
      if (tabIds && tabIds.length > 0) {
        await chrome.tabs.remove(tabIds);
        await refreshTabs();
        return { success: true };
      }
      return { success: false, error: 'No tab IDs provided' };
    }

    case 'switchToTab': {
      const tabId = message.payload as number;
      if (tabId) {
        await chrome.tabs.update(tabId, { active: true });
        // Also focus the window containing this tab
        const tab = await chrome.tabs.get(tabId);
        if (tab.windowId) {
          await chrome.windows.update(tab.windowId, { focused: true });
        }
        return { success: true };
      }
      return { success: false, error: 'No tab ID provided' };
    }

    default:
      return { success: false, error: 'Unknown action' };
  }
}

// Initialize active tab tracking on startup
async function initializeActiveTab() {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id) {
      activeTabId = activeTab.id;
      activeTabStartTime = Date.now();
      await recordTabActivation(activeTab.id, activeTab.url || '');
    }
  } catch {
    // Ignore errors
  }
}

initializeActiveTab();

// Set up side panel behavior - open on action click (extension icon)
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
  // Side panel API might not be available in older Chrome versions
});

// Create context menu for opening side panel
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'openTabWiseSidePanel',
    title: 'Open Tab Wise in Side Panel',
    contexts: ['page', 'action'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'openTabWiseSidePanel') {
    try {
      let windowId = tab?.windowId;
      if (windowId === undefined) {
        const currentWindow = await chrome.windows.getCurrent();
        windowId = currentWindow.id;
      }
      if (windowId !== undefined) {
        await chrome.sidePanel.open({ windowId });
      }
    } catch (error) {
      console.error('Failed to open side panel from context menu:', error);
    }
  }
});

export type { ActivityData };
