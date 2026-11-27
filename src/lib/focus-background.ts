import {
  FOCUS_ALARM_END,
  FOCUS_ALARM_TICK,
  FOCUS_KEY,
  isNavigationAllowed,
  resolveFocusSession,
  shouldBlockNewTab,
} from '@/lib/focus-mode';
import {
  applyFocusBadgeToTab,
  applyFocusBadgeToWindow,
  clearFocusBadgeFromWindow,
  endFocus,
  getActiveFocusSession,
  recordBlocked,
} from '@/lib/focus-session';
import { refreshProjectBadge } from '@/lib/workspace-switch-browser';

/**
 * Enforces focus mode. Listeners are registered at the top level of the worker, so they
 * survive it going to sleep; every handler re-reads the session from storage.
 */
export function registerFocusMode(): void {
  chrome.tabs.onCreated.addListener(async (tab) => {
    if (tab.id == null) return;
    const session = await getActiveFocusSession();
    if (!session) return;
    try {
      const win = await chrome.windows.get(tab.windowId, { populate: true });
      const block = shouldBlockNewTab(session, {
        windowId: tab.windowId,
        windowType: win.type,
        windowTabCount: win.tabs?.length ?? 1,
      });
      if (!block) return;
      await chrome.tabs.remove(tab.id);
      await recordBlocked();
    } catch {
      // The tab or window is already gone, which is the outcome we wanted.
    }
  });

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    const session = await getActiveFocusSession();
    if (!session || tab.windowId !== session.windowId) return;
    // Per-tab badges reset when a tab navigates, so put ours back.
    if (changeInfo.status === 'loading' || changeInfo.status === 'complete') {
      void applyFocusBadgeToTab(tabId, session);
    }
    if (!changeInfo.url || isNavigationAllowed(session, changeInfo.url)) return;
    try {
      await chrome.tabs.goBack(tabId);
      await recordBlocked();
    } catch {
      // Nothing to go back to (first page in this tab). Leave it rather than guess.
    }
  });

  chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
    const session = await getActiveFocusSession();
    if (session && session.windowId === windowId) void applyFocusBadgeToTab(tabId, session);
  });

  chrome.windows.onRemoved.addListener(async (windowId) => {
    const session = await getActiveFocusSession();
    if (session && session.windowId === windowId) await endFocus();
  });

  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === FOCUS_ALARM_END) {
      await endFocus();
    } else if (alarm.name === FOCUS_ALARM_TICK) {
      const session = await getActiveFocusSession();
      if (session) await applyFocusBadgeToWindow(session);
    }
  });

  // Window ids don't survive a browser restart, so a saved session would guard nothing.
  chrome.runtime.onStartup.addListener(() => void endFocus());

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[FOCUS_KEY]) return;
    const next = resolveFocusSession(changes[FOCUS_KEY].newValue);
    const prev = resolveFocusSession(changes[FOCUS_KEY].oldValue);
    if (next) {
      void applyFocusBadgeToWindow(next);
    } else if (prev) {
      void clearFocusBadgeFromWindow(prev.windowId).then(() => refreshProjectBadge());
    }
  });
}
