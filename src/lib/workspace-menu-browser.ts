import { isWorkspacesEnabled } from '@/lib/settings';
import {
  NEW_WORKSPACE,
  PARENT_TITLE,
  matchedWorkspaceId,
  nameForNew,
  parentId,
  parseMenuId,
  planMenu,
  type MenuKind,
} from '@/lib/workspace-menu';
import { addNote, addResources, createWorkspace, isWorkspaceUrl } from '@/lib/workspace-model';
import { getWorkspaces, updateWorkspace, upsertWorkspace } from '@/lib/workspace-storage';
import type { Workspace } from '@/types/workspace';
import { noteFlash, refreshProjectBadge } from '@/lib/workspace-switch-browser';

/**
 * chrome.* side of the right-click menu: build it, handle clicks, give feedback.
 * Reads only what the user clicked (page URL/title, link, selected text).
 */

export const SIDE_PANEL_MENU_ID = 'openTabWiseSidePanel';
export const ADD_COMMAND = 'add-to-workspace';
const LAST_TARGET_KEY = 'menuLastTarget' as const;
const CONTEXTS = {
  page: ['page'],
  link: ['link'],
  selection: ['selection'],
} as const satisfies Record<MenuKind, readonly [string]>;

// ---------- feedback ----------

type Feedback = 'added' | 'duplicate' | 'error';
const BADGE: Record<Feedback, { text: string; color: string }> = {
  added: { text: '✓', color: '#16a34a' },
  duplicate: { text: '=', color: '#6b7280' },
  error: { text: '!', color: '#dc2626' },
};

async function flash(kind: Feedback, tabId?: number): Promise<void> {
  const { text, color } = BADGE[kind];
  const scope = tabId != null ? { tabId } : {};
  try {
    noteFlash();
    await chrome.action.setBadgeBackgroundColor({ color, ...scope });
    await chrome.action.setBadgeText({ text, ...scope });
    // Hand the badge back to the project initials once the confirmation has been seen.
    setTimeout(() => void refreshProjectBadge(), 2100);
  } catch {
    // tab may have closed
  }
}

// ---------- menu building ----------

let buildQueue: Promise<unknown> = Promise.resolve();
let lastSignature = '';

async function lastTarget(): Promise<string | undefined> {
  const r = await chrome.storage.local.get([LAST_TARGET_KEY]);
  return typeof r[LAST_TARGET_KEY] === 'string' ? r[LAST_TARGET_KEY] : undefined;
}

async function focusedWindowUrls(): Promise<string[]> {
  try {
    const win = await chrome.windows.getLastFocused({ populate: true });
    if (win.incognito || win.type !== 'normal') return [];
    return (win.tabs ?? []).map((t) => t.url || t.pendingUrl || '');
  } catch {
    return [];
  }
}

function createItem(props: chrome.contextMenus.CreateProperties): Promise<void> {
  return new Promise((resolve) => {
    chrome.contextMenus.create(props, () => {
      void chrome.runtime.lastError; // swallow duplicate-id races
      resolve();
    });
  });
}

async function build(force: boolean): Promise<void> {
  const enabled = await isWorkspacesEnabled();
  const [workspaces, last, urls] = await Promise.all([getWorkspaces(), lastTarget(), focusedWindowUrls()]);
  const matched = matchedWorkspaceId(urls, workspaces);
  const entries = enabled ? planMenu(workspaces, matched, last) : [];
  const signature = JSON.stringify([enabled, entries.map((e) => [e.id, e.title])]);
  if (!force && signature === lastSignature) return;
  lastSignature = signature;

  await new Promise<void>((r) => chrome.contextMenus.removeAll(() => r()));
  await createItem({
    id: SIDE_PANEL_MENU_ID,
    title: 'Open Tab Wise in Side Panel',
    contexts: ['page', 'action'],
  });
  for (const kind of enabled ? (Object.keys(CONTEXTS) as MenuKind[]) : []) {
    await createItem({ id: parentId(kind), title: PARENT_TITLE[kind], contexts: [...CONTEXTS[kind]] });
  }
  for (const e of entries) {
    await createItem({ id: e.id, parentId: e.parentId, title: e.title, contexts: [...CONTEXTS[e.kind]] });
  }
}

export function rebuildMenus(force = false): Promise<void> {
  const run = () => build(force);
  const p = buildQueue.then(run, run);
  buildQueue = p.catch(() => undefined);
  return p;
}

let debounce: ReturnType<typeof setTimeout> | undefined;
function scheduleRebuild() {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => void rebuildMenus(), 400);
}

// ---------- adding ----------

async function windowTabs(windowId?: number) {
  if (windowId == null) return [];
  const tabs = await chrome.tabs.query({ windowId });
  return tabs.map((t) => ({ url: t.url || '', title: t.title }));
}

function hostLabel(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

interface Clicked {
  kind: MenuKind;
  url: string;
  title?: string;
  /** Selected text for notes. */
  text?: string;
  pageUrl?: string;
  pageTitle?: string;
}

async function addTo(targetId: string, c: Clicked, windowId?: number, via: 'menu' | 'shortcut' = 'menu') {
  const usable = c.kind === 'selection' ? isWorkspaceUrl(c.pageUrl ?? '') || !!c.text : isWorkspaceUrl(c.url);
  if (!usable) return 'error' as const;

  const apply = (w: Workspace): { ws: Workspace; changed: boolean } => {
    if (c.kind === 'selection') {
      const source = c.pageUrl && isWorkspaceUrl(c.pageUrl) ? `\n— ${c.pageTitle || hostLabel(c.pageUrl)} (${c.pageUrl})` : '';
      const next = addNote(w, `${c.text}${source}`);
      return { ws: next, changed: next !== w };
    }
    const r = addResources(
      w,
      [{ url: c.url, title: c.title || hostLabel(c.url), kind: c.kind === 'link' ? 'link' : 'tab' }],
      isWorkspaceUrl,
      Date.now(),
      via,
    );
    return { ws: r.workspace, changed: r.added > 0 };
  };

  let changed = false;
  let resolvedId = targetId;
  if (targetId === NEW_WORKSPACE) {
    const tabs = await windowTabs(windowId);
    const name = nameForNew(tabs, { url: c.pageUrl || c.url, title: c.pageTitle || c.title });
    const fresh = createWorkspace(name);
    const out = apply({ ...fresh, origin: 'auto' });
    changed = out.changed;
    resolvedId = fresh.id;
    await upsertWorkspace(out.ws);
  } else {
    await updateWorkspace(targetId, (w) => {
      const out = apply(w);
      changed = out.changed;
      return out.ws;
    });
  }
  await chrome.storage.local.set({ [LAST_TARGET_KEY]: resolvedId });
  return changed ? ('added' as const) : ('duplicate' as const);
}

export async function handleMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab,
): Promise<boolean> {
  const parsed = parseMenuId(String(info.menuItemId));
  if (!parsed || !(await isWorkspacesEnabled())) return false;
  const pageUrl = info.pageUrl || tab?.url || '';
  try {
    const clicked: Clicked =
      parsed.kind === 'link'
        ? { kind: 'link', url: info.linkUrl ?? '', pageUrl, pageTitle: tab?.title }
        : parsed.kind === 'selection'
          ? { kind: 'selection', url: pageUrl, text: info.selectionText?.trim(), pageUrl, pageTitle: tab?.title }
          : { kind: 'page', url: pageUrl, title: tab?.title, pageUrl, pageTitle: tab?.title };
    if (parsed.kind === 'selection' && !clicked.text) {
      await flash('error', tab?.id);
      return true;
    }
    const result = await addTo(parsed.target, clicked, tab?.windowId);
    await flash(result, tab?.id);
  } catch (e) {
    console.error('Add to workspace failed:', e);
    await flash('error', tab?.id);
  }
  return true;
}

/** Keyboard shortcut: add the active tab to this window's workspace (or the last used one). */
export async function handleAddCommand(): Promise<void> {
  if (!(await isWorkspacesEnabled())) return;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.url) return;
  try {
    const [workspaces, last, urls] = await Promise.all([getWorkspaces(), lastTarget(), focusedWindowUrls()]);
    const live = workspaces.filter((w) => !w.archived);
    const target =
      matchedWorkspaceId(urls, workspaces) ??
      (live.some((w) => w.id === last) ? last : undefined) ??
      live[0]?.id ??
      NEW_WORKSPACE;
    const result = await addTo(
      target,
      { kind: 'page', url: tab.url, title: tab.title, pageUrl: tab.url, pageTitle: tab.title },
      tab.windowId,
      'shortcut',
    );
    await flash(result, tab.id);
  } catch (e) {
    console.error('Add by shortcut failed:', e);
    await flash('error', tab.id);
  }
}

export function registerWorkspaceMenu(): void {
  chrome.runtime.onInstalled.addListener(() => void rebuildMenus(true));
  chrome.runtime.onStartup.addListener(() => void rebuildMenus(true));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.workspaces || changes.settings || changes[LAST_TARGET_KEY])) scheduleRebuild();
  });
  chrome.windows.onFocusChanged.addListener(scheduleRebuild);
  chrome.tabs.onActivated.addListener(scheduleRebuild);
  chrome.commands.onCommand.addListener((cmd) => {
    if (cmd === ADD_COMMAND) void handleAddCommand();
  });
  chrome.contextMenus.onClicked.addListener((info, tab) => void handleMenuClick(info, tab));
  void rebuildMenus(true); // worker (re)start
}
