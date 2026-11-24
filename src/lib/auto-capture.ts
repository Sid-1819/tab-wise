import type { LeaveReason } from '@/types/workspace';
import { matchWorkspace } from '@/lib/workspace-match';
import { applyLeave, type CachedTab, type WindowCache } from '@/lib/window-snapshot';
import { getWorkspaces, updateWorkspace } from '@/lib/workspace-storage';
import { watchSettings } from '@/lib/settings';

/**
 * Background "where did I leave off" capture.
 *
 * While you work we keep a tiny per-window cache of tab URLs/titles. When a window
 * closes — or on the next browser start for windows that vanished with a quit — we
 * match that cache against your workspaces (by tab overlap) and record lastLeft.
 * Nothing here reads page content, and incognito windows are never touched.
 */

const CACHE_KEY = 'windowCache' as const;
const DEBOUNCE_MS = 500;

/** Mirrors the user's "remember where I left off" switch. On until we learn otherwise. */
let captureEnabled = true;

let cacheQueue: Promise<unknown> = Promise.resolve();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function readCache(): Promise<WindowCache> {
  return new Promise((resolve) => {
    chrome.storage.local.get([CACHE_KEY], (r) => {
      const raw = r[CACHE_KEY];
      resolve(raw && typeof raw === 'object' ? (raw as WindowCache) : {});
    });
  });
}

function writeCache(cache: WindowCache): Promise<void> {
  return new Promise((resolve) => chrome.storage.local.set({ [CACHE_KEY]: cache }, () => resolve()));
}

/** Serialize cache read-modify-write (many tab events arrive at once). */
function mutateCache(fn: (c: WindowCache) => WindowCache | void): Promise<void> {
  const run = async () => {
    const cache = await readCache();
    const next = fn(cache) ?? cache;
    await writeCache(next);
  };
  const p = cacheQueue.then(run, run);
  cacheQueue = p.catch(() => undefined);
  return p;
}

async function snapshotWindow(windowId: number): Promise<void> {
  if (!captureEnabled) return;
  let win: chrome.windows.Window;
  try {
    win = await chrome.windows.get(windowId);
  } catch {
    return; // closed meanwhile; windows.onRemoved handles it
  }
  if (win.type !== 'normal' || win.incognito) return;
  const tabs = await chrome.tabs.query({ windowId });
  const cached: CachedTab[] = tabs
    .filter((t) => !t.incognito)
    .map((t) => ({
      url: t.url || t.pendingUrl || '',
      title: t.title,
      pinned: t.pinned,
      lastAccessed: t.lastAccessed,
      active: t.active,
    }));
  await mutateCache((c) => {
    c[String(windowId)] = { tabs: cached, updatedAt: Date.now() };
  });
}

export function scheduleWindowSnapshot(windowId: number | undefined): void {
  if (!captureEnabled) return;
  if (windowId == null || windowId < 0) return;
  const existing = timers.get(windowId);
  if (existing) clearTimeout(existing);
  timers.set(
    windowId,
    setTimeout(() => {
      timers.delete(windowId);
      void snapshotWindow(windowId);
    }, DEBOUNCE_MS),
  );
}

/** Move a window's cached tabs into the matching workspace (if any) and drop the cache entry. */
export async function finalizeWindow(windowId: number, reason: LeaveReason): Promise<void> {
  const pending = timers.get(windowId);
  if (pending) {
    clearTimeout(pending);
    timers.delete(windowId);
  }

  let entryTabs: CachedTab[] | undefined;
  let updatedAt = Date.now();
  await mutateCache((c) => {
    const entry = c[String(windowId)];
    if (entry) {
      entryTabs = entry.tabs;
      updatedAt = entry.updatedAt;
      delete c[String(windowId)];
    }
  });
  if (!entryTabs || !captureEnabled) return;

  const workspaces = await getWorkspaces();
  const match = matchWorkspace(
    entryTabs.map((t) => t.url),
    workspaces,
  );
  if (!match) return;
  const tabs = entryTabs;
  // `at` is when the window last changed (a close/quit moment), not when we noticed.
  await updateWorkspace(match.workspace.id, (ws) =>
    applyLeave(ws, tabs, reason, reason === 'browser_closed' ? updatedAt : Date.now()),
  );
}

/** Windows whose cache entry outlived them (browser quit/crash) are finalized on next start. */
export async function finalizeStaleWindows(): Promise<void> {
  const [cache, wins] = await Promise.all([readCache(), chrome.windows.getAll()]);
  const alive = new Set(wins.map((w) => String(w.id)));
  for (const id of Object.keys(cache)) {
    if (!alive.has(id)) await finalizeWindow(Number(id), 'browser_closed');
  }
}

export function registerAutoCapture(): void {
  // Turning the switch off also forgets what was cached, so nothing lingers.
  watchSettings((s) => {
    const turnedOn = s.autoCapture && !captureEnabled;
    captureEnabled = s.autoCapture;
    if (!s.autoCapture) void mutateCache(() => ({}));
    if (turnedOn) void chrome.windows.getAll().then((ws) => ws.forEach((w) => scheduleWindowSnapshot(w.id)));
  });
  chrome.tabs.onCreated.addListener((tab) => scheduleWindowSnapshot(tab.windowId));
  chrome.tabs.onUpdated.addListener((_id, info, tab) => {
    if (info.url || info.title || info.status === 'complete' || info.pinned !== undefined) {
      scheduleWindowSnapshot(tab.windowId);
    }
  });
  chrome.tabs.onActivated.addListener((info) => scheduleWindowSnapshot(info.windowId));
  chrome.tabs.onMoved.addListener((_id, info) => scheduleWindowSnapshot(info.windowId));
  chrome.tabs.onAttached.addListener((_id, info) => scheduleWindowSnapshot(info.newWindowId));
  chrome.tabs.onDetached.addListener((_id, info) => scheduleWindowSnapshot(info.oldWindowId));
  chrome.tabs.onRemoved.addListener((_id, info) => {
    // When a whole window closes every tab fires onRemoved first; ignoring those keeps
    // the cache at the state the user actually left, not an emptied-out window.
    if (!info.isWindowClosing) scheduleWindowSnapshot(info.windowId);
  });
  chrome.windows.onCreated.addListener((w) => scheduleWindowSnapshot(w.id));
  chrome.windows.onRemoved.addListener((id) => void finalizeWindow(id, 'window_closed'));
  chrome.runtime.onStartup.addListener(() => void finalizeStaleWindows());

  // Also covers a service-worker restart after a crash, and first run after install/update.
  void finalizeStaleWindows();
  chrome.windows.getAll().then((ws) => ws.forEach((w) => scheduleWindowSnapshot(w.id)));
}
