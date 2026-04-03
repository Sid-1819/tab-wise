import type {
  NamedSession,
  SavedSessionChromeGroup,
  SavedSessionTab,
  SessionRestoreTarget,
} from '@/types/session';

export function isLikelyRestorableUrl(url: string): boolean {
  if (!url || url.startsWith('javascript:')) return false;
  try {
    const u = new URL(url);
    if (u.protocol === 'chrome:' || u.protocol === 'devtools:' || u.protocol === 'edge:') {
      return false;
    }
    if (u.protocol === 'about:' && u.pathname !== '' && u.pathname !== 'blank') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function hasTabGroupsApi(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.tabGroups?.get;
}

export async function captureWindowSession(
  windowId: number,
  includeChromeGroups: boolean
): Promise<{ tabs: SavedSessionTab[]; chromeGroups?: SavedSessionChromeGroup[] }> {
  const chromeTabs = await chrome.tabs.query({ windowId });
  chromeTabs.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  const useGroups =
    includeChromeGroups && hasTabGroupsApi() && chrome.tabGroups !== undefined;
  const groupMeta = new Map<number, SavedSessionChromeGroup>();

  if (useGroups) {
    const none = chrome.tabGroups.TAB_GROUP_ID_NONE;
    const seen = new Set<number>();
    for (const t of chromeTabs) {
      const gid = t.groupId;
      if (gid == null || gid === none || seen.has(gid)) continue;
      seen.add(gid);
      try {
        const g = await chrome.tabGroups.get(gid);
        groupMeta.set(gid, {
          key: `g_${gid}`,
          title: g.title,
          color: g.color,
          collapsed: g.collapsed,
        });
      } catch {
        // Group may have been removed between query and get
      }
    }
  }

  const none = useGroups ? chrome.tabGroups!.TAB_GROUP_ID_NONE : -1;
  const tabs: SavedSessionTab[] = chromeTabs.map((t) => {
    const gid = t.groupId;
    const inGroup =
      useGroups && gid != null && gid !== none && groupMeta.has(gid);
    return {
      url: t.url || '',
      title: t.title,
      pinned: t.pinned,
      chromeGroupKey: inGroup ? `g_${gid}` : undefined,
    };
  });

  const chromeGroups =
    useGroups && groupMeta.size > 0 ? Array.from(groupMeta.values()) : undefined;

  return { tabs, chromeGroups };
}

export interface RestoreSessionResult {
  opened: number;
  skipped: number;
}

async function applyChromeGroups(
  windowId: number,
  session: NamedSession,
  pairs: { tabId: number; groupKey?: string }[]
): Promise<void> {
  if (!session.chromeGroups?.length || !hasTabGroupsApi()) return;

  const keyToTabIds = new Map<string, number[]>();
  for (const p of pairs) {
    if (!p.groupKey) continue;
    const list = keyToTabIds.get(p.groupKey) ?? [];
    list.push(p.tabId);
    keyToTabIds.set(p.groupKey, list);
  }

  for (const cg of session.chromeGroups) {
    const tabIds = keyToTabIds.get(cg.key);
    if (!tabIds?.length) continue;
    try {
      const groupId = await chrome.tabs.group({
        tabIds,
        createProperties: { windowId },
      });
      await chrome.tabGroups.update(groupId, {
        title: cg.title,
        color: cg.color,
        collapsed: cg.collapsed,
      });
    } catch {
      // Grouping may fail for single-tab edge cases or permissions
    }
  }
}

export async function restoreNamedSession(
  session: NamedSession,
  target: SessionRestoreTarget
): Promise<RestoreSessionResult> {
  const pairs: { tabId: number; groupKey?: string }[] = [];
  let skipped = 0;

  if (target === 'new') {
    const restorable = session.tabs.filter((t) => isLikelyRestorableUrl(t.url));
    if (restorable.length === 0) {
      return { opened: 0, skipped: session.tabs.length };
    }

    const win = await chrome.windows.create({
      url: restorable.map((t) => t.url),
      focused: true,
    });
    const windowId = win.id!;
    const tabsInWin = await chrome.tabs.query({ windowId });
    tabsInWin.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

    for (let i = 0; i < restorable.length; i++) {
      const spec = restorable[i];
      const ct = tabsInWin[i];
      if (ct?.id == null) continue;
      if (spec.pinned) {
        await chrome.tabs.update(ct.id, { pinned: true }).catch(() => {});
      }
      pairs.push({ tabId: ct.id, groupKey: spec.chromeGroupKey });
    }

    skipped = session.tabs.length - restorable.length;
    await applyChromeGroups(windowId, session, pairs);
    return { opened: pairs.length, skipped };
  }

  const current = await chrome.windows.getCurrent();
  const windowId = current.id!;

  for (const spec of session.tabs) {
    if (!isLikelyRestorableUrl(spec.url)) {
      skipped++;
      continue;
    }
    try {
      const ct = await chrome.tabs.create({
        windowId,
        url: spec.url,
        pinned: !!spec.pinned,
        active: false,
      });
      if (ct.id != null) {
        pairs.push({ tabId: ct.id, groupKey: spec.chromeGroupKey });
      }
    } catch {
      skipped++;
    }
  }

  await applyChromeGroups(windowId, session, pairs);
  return { opened: pairs.length, skipped };
}
