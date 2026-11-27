import {
  FOCUS_ALARM_END,
  FOCUS_ALARM_TICK,
  FOCUS_KEY,
  badgeText,
  isExpired,
  resolveFocusSession,
  startSession,
  statusTitle,
  type FocusSession,
} from '@/lib/focus-mode';

/** Chrome-facing half of focus mode: storage, alarms and the toolbar badge. Safe to call from the panel or the worker. */

const BADGE_COLOR = '#c2410c';

export function getFocusSession(): Promise<FocusSession | null> {
  return new Promise((resolve) =>
    chrome.storage.local.get([FOCUS_KEY], (r) => resolve(resolveFocusSession(r[FOCUS_KEY]))),
  );
}

/** The running session, or null. A session past its end time is ended on the spot. */
export async function getActiveFocusSession(now = Date.now()): Promise<FocusSession | null> {
  const session = await getFocusSession();
  if (session && isExpired(session, now)) {
    await endFocus();
    return null;
  }
  return session;
}

export interface StartFocusOptions {
  windowId: number;
  minutes: number | null;
  goal: string;
  stayOnSites: boolean;
}

export async function startFocus(opts: StartFocusOptions): Promise<FocusSession> {
  const tabs = await chrome.tabs.query({ windowId: opts.windowId });
  const session = startSession({
    ...opts,
    tabUrls: tabs.map((t) => t.url || t.pendingUrl || ''),
  });
  await chrome.alarms.clear(FOCUS_ALARM_END);
  await chrome.alarms.clear(FOCUS_ALARM_TICK);
  if (session.endsAt != null) await chrome.alarms.create(FOCUS_ALARM_END, { when: session.endsAt });
  await chrome.alarms.create(FOCUS_ALARM_TICK, { periodInMinutes: 1 });
  await chrome.storage.local.set({ [FOCUS_KEY]: session });
  return session;
}

export async function endFocus(): Promise<void> {
  await chrome.alarms.clear(FOCUS_ALARM_END);
  await chrome.alarms.clear(FOCUS_ALARM_TICK);
  await chrome.storage.local.remove(FOCUS_KEY);
}

// Counting is read-modify-write, so serialize it: several tabs can be blocked in the same moment.
let countQueue: Promise<unknown> = Promise.resolve();
export function recordBlocked(): Promise<FocusSession | null> {
  const next = countQueue.then(async () => {
    const session = await getFocusSession();
    if (!session) return null;
    const updated = { ...session, blocked: session.blocked + 1 };
    await chrome.storage.local.set({ [FOCUS_KEY]: updated });
    return updated;
  });
  countQueue = next.catch(() => undefined);
  return next;
}

// ---------- toolbar badge ----------
// The project badge (workspace-switch-browser) is per-tab, so focus has to be per-tab too to win.

export async function applyFocusBadgeToTab(tabId: number, session: FocusSession, now = Date.now()): Promise<void> {
  try {
    await Promise.all([
      chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR, tabId }),
      chrome.action.setBadgeText({ text: badgeText(session, now), tabId }),
      chrome.action.setTitle({ title: statusTitle(session, now), tabId }),
    ]);
  } catch {
    // The tab closed while we were setting it.
  }
}

export async function applyFocusBadgeToWindow(session: FocusSession, now = Date.now()): Promise<void> {
  const tabs = await chrome.tabs.query({ windowId: session.windowId }).catch(() => []);
  await Promise.all(tabs.filter((t) => t.id != null).map((t) => applyFocusBadgeToTab(t.id as number, session, now)));
}

export async function clearFocusBadgeFromWindow(windowId: number): Promise<void> {
  const tabs = await chrome.tabs.query({ windowId }).catch(() => []);
  await Promise.all(
    tabs
      .filter((t) => t.id != null)
      .map((t) =>
        Promise.all([
          chrome.action.setBadgeText({ text: '', tabId: t.id as number }),
          chrome.action.setTitle({ title: 'Open Tab Wise', tabId: t.id as number }),
        ]).catch(() => undefined),
      ),
  );
}
