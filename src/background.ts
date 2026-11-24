// Background Service Worker for Tab Wise Extension
// Handles real-time tab events, side panel management, and activity tracking

import {
  recordTabActivation,
  recordTimeSpent,
  removeTabActivity,
  cleanupOldActivity,
  getActivityData,
} from './lib/activity-storage';
import type { ActivityData } from './lib/activity-types';
import { handleExternalRequest, isAllowedOrigin } from './lib/external-api';
import { registerAutoCapture } from './lib/auto-capture';
import { migrateSessionsToWorkspaces } from './lib/session-migration-browser';
import {
  handleAddCommand,
  handleMenuClick,
  registerWorkspaceMenu,
} from './lib/workspace-menu-browser';
import { registerProjectBadge } from './lib/workspace-switch-browser';
import { SURFACE_MODE_KEY, applySurfaceMode, resolveSurfaceMode } from './lib/surface-mode';
import {
  changelogUrl,
  isMajorBump,
  setPendingWhatsNew,
  welcomeUrl,
} from './lib/release-landing';

// Message types for communication between sidepanel and background
export interface BackgroundMessage {
  action: 'getTabs' | 'tabsUpdated' | 'closeTabs' | 'switchToTab' | 'getActivity';
  payload?: unknown;
}

export interface TabUpdatePayload {
  tabId: number;
  changeInfo: chrome.tabs.OnUpdatedInfo;
  tab: chrome.tabs.Tab;
}

// Store for managing state
let cachedTabs: chrome.tabs.Tab[] = [];
let activeTabId: number | null = null;
let activeTabStartTime: number | null = null;

// Initialize extension and announce install or update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Tab Wise extension installed');
  refreshTabs();
  cleanupOldActivity();
  void openReleaseLanding(details);
});

async function openReleaseLanding(details: chrome.runtime.InstalledDetails) {
  if (details.reason === 'install') {
    await chrome.tabs.create({ url: welcomeUrl() });
    return;
  }

  if (details.reason !== 'update' || !details.previousVersion) return;

  const current = chrome.runtime.getManifest().version;
  if (details.previousVersion === current) return;

  await setPendingWhatsNew({ from: details.previousVersion, to: current });

  if (!isMajorBump(details.previousVersion, current)) return;

  const url = changelogUrl(details.previousVersion, current);
  const existing = await chrome.tabs.query({ url });
  if (existing.length > 0) return;
  await chrome.tabs.create({ url });
}

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
chrome.runtime.onMessage.addListener((message: BackgroundMessage, sender, sendResponse) => {
  // Security fix: Validate the sender of the message to ensure it originates from the extension's own trusted UI
  // and not from a content script injected into an untrusted web page or an external source.
  if (sender.id !== chrome.runtime.id || sender.tab) {
    sendResponse({ success: false, error: 'Unauthorized sender' });
    return false;
  }
  handleMessage(message).then(sendResponse);
  return true; // Keep channel open for async response
});

// Remember where each window was left so workspaces can offer "resume".
registerAutoCapture();
// 3.0: saved sessions became (archived) workspaces. One-time and idempotent.
void migrateSessionsToWorkspaces().catch((e) => console.error('Session migration failed:', e));
// Right-click "add to workspace" + keyboard shortcut (also owns the side-panel menu item).
registerWorkspaceMenu();
registerProjectBadge();
// Test hook so e2e can drive the menu handlers (native menus can't be clicked headless).
// Constant-folded away in normal builds.
if (import.meta.env.MODE === 'e2e') {
  Object.assign(globalThis, { __tw: { handleMenuClick, handleAddCommand } });
}

// Messages from the TabWise website (see manifest `externally_connectable`).
// Origin is re-checked here as defense in depth.
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  const origin = sender.origin ?? (sender.url ? new URL(sender.url).origin : undefined);
  if (!isAllowedOrigin(origin)) {
    sendResponse({ ok: false, error: 'bad_request' });
    return false;
  }
  void handleExternalRequest(message).then(sendResponse);
  return true; // async response
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

// What the toolbar icon opens (side panel by default, or a popup) follows the user's
// preference. Re-applied on every worker start because action state isn't persisted.
void applySurfaceMode();
chrome.runtime.onStartup.addListener(() => void applySurfaceMode());
chrome.runtime.onInstalled.addListener(() => void applySurfaceMode());
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[SURFACE_MODE_KEY]) {
    void applySurfaceMode(resolveSurfaceMode(changes[SURFACE_MODE_KEY].newValue));
  }
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
