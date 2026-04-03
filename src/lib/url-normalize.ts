/** Strip tracking params and normalize for duplicate detection (http/https only). */
const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
];

export function normalizeTabUrl(url: string): string | null {
  if (
    !url ||
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('about:') ||
    url.startsWith('edge://') ||
    url.startsWith('devtools:')
  ) {
    return null;
  }
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    let host = u.hostname.toLowerCase();
    if (host.startsWith('www.')) host = host.slice(4);
    const params = new URLSearchParams(u.search);
    for (const k of TRACKING_PARAMS) params.delete(k);
    const search = params.toString();
    let path = u.pathname;
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return `${u.protocol}//${host}${path || '/'}${search ? `?${search}` : ''}`;
  } catch {
    return null;
  }
}

export interface DuplicateCluster {
  normalizedUrl: string;
  tabIds: number[];
}

export function findDuplicateClusters(
  tabs: { id: number; url: string }[]
): DuplicateCluster[] {
  const map = new Map<string, number[]>();
  for (const tab of tabs) {
    const key = normalizeTabUrl(tab.url);
    if (!key) continue;
    const list = map.get(key);
    if (list) list.push(tab.id);
    else map.set(key, [tab.id]);
  }
  return [...map.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([normalizedUrl, tabIds]) => ({ normalizedUrl, tabIds }));
}

export function pickKeeperTabId(
  clusterTabIds: number[],
  tabs: { id: number; active?: boolean; windowId?: number; index?: number }[]
): number {
  const clusterTabs = tabs.filter((t) => clusterTabIds.includes(t.id));
  const active = clusterTabs.find((t) => t.active);
  if (active) return active.id;
  clusterTabs.sort(
    (a, b) =>
      (a.windowId ?? 0) - (b.windowId ?? 0) || (a.index ?? 0) - (b.index ?? 0)
  );
  return clusterTabs[0]?.id ?? clusterTabIds[0];
}
