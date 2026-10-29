/** Strip tracking params and normalize for duplicate detection (http/https only). */
const TRACKING_EXACT = new Set([
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'si',
  'igshid',
  'ref_src',
]);

function isTrackingParam(key: string): boolean {
  const normalized = key.toLowerCase();
  return normalized.startsWith('utm_') || TRACKING_EXACT.has(normalized);
}

/** Drop empty hashes and scroll-to-text fragments. Keep routes like #inbox. */
function canonicalHash(hash: string): string {
  if (!hash || hash === '#') return '';
  const body = hash.startsWith('#') ? hash.slice(1) : hash;
  if (body.startsWith(':~:')) return '';
  return `#${body}`;
}

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
    const entries = [...u.searchParams.entries()]
      .filter(([key]) => !isTrackingParam(key))
      .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
    const search = new URLSearchParams(entries).toString();
    let path = u.pathname;
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    const hash = canonicalHash(u.hash);
    return `https://${host}${path || '/'}${search ? `?${search}` : ''}${hash}`;
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
