import { normalizeTabUrl } from '@/lib/url-normalize';
import { overlapCount, urlKeys } from '@/lib/workspace-match';

/**
 * Heuristic "this window looks like one project" detection.
 * Uses only URLs, titles and Chrome tab-group names — never page content.
 * Favors precision: when unsure, suggest nothing.
 */

export interface TabLite {
  id?: number;
  url: string;
  title?: string;
  pinned?: boolean;
  /** Title of the Chrome tab group this tab is in, if any. */
  groupTitle?: string;
  groupId?: number;
}

export interface ProjectSuggestion {
  name: string;
  tabs: TabLite[];
  /** Why we think so — shown to the user so the guess is explainable. */
  reason: string;
  source: 'tab_group' | 'repo' | 'domain' | 'title_topic';
}

export const MIN_PROJECT_TABS = 3;
const MIN_SHARE = 0.5;

/** Communication / entertainment hosts that belong to the person, not a project. */
const AMBIENT_HOSTS = new Set([
  'mail.google.com',
  'outlook.live.com',
  'outlook.office.com',
  'calendar.google.com',
  'web.whatsapp.com',
  'app.slack.com',
  'discord.com',
  'open.spotify.com',
  'netflix.com',
  'facebook.com',
  'instagram.com',
  'x.com',
  'twitter.com',
]);

const TWO_LEVEL_TLDS = new Set(['co.uk', 'com.au', 'co.in', 'co.nz', 'com.br', 'co.jp', 'com.sg']);

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'your', 'you', 'how', 'what', 'new', 'home',
  'page', 'login', 'sign', 'dashboard', 'untitled', 'google', 'search', 'docs', 'github', 'issues',
  'pull', 'request', 'requests', 'tab', 'wise', 'about', 'blank',
]);

function hostOf(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function registrableDomain(host: string): string {
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return host;
  const parts = host.split('.');
  if (parts.length <= 2) return host;
  const last2 = parts.slice(-2).join('.');
  return TWO_LEVEL_TLDS.has(last2) ? parts.slice(-3).join('.') : last2;
}

const AUTH_HOST_PREFIXES = ['accounts.', 'login.', 'auth.', 'sso.', 'signin.', 'id.'];
const AUTH_PATH = /\/(sign-?in|log-?in|sign-?up|oauth2?|sso|auth)(\/|$)/i;

/** Sign-in / auth screens (including redirects from mail etc.) never describe a project. */
export function isAuthPage(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    return AUTH_HOST_PREFIXES.some((p) => host.startsWith(p)) || AUTH_PATH.test(u.pathname);
  } catch {
    return false;
  }
}

function isProjectTab(t: TabLite): boolean {
  if (t.pinned) return false;
  const host = hostOf(t.url);
  if (!host) return false;
  return !AMBIENT_HOSTS.has(host) && !isAuthPage(t.url);
}

export interface ProjectKey {
  key: string;
  /** Human-friendly name for this key. */
  label: string;
  kind: 'repo' | 'domain';
}

/** Key identifying the "thing" a URL belongs to (repo, file, ticket project, else domain). */
export function projectKeyOf(url: string): ProjectKey | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = hostOf(url);
  if (!host) return null;
  const seg = u.pathname.split('/').filter(Boolean);

  if ((host === 'github.com' || host === 'gitlab.com' || host === 'bitbucket.org') && seg.length >= 2) {
    const reserved = new Set(['orgs', 'settings', 'marketplace', 'notifications', 'topics', 'explore']);
    if (!reserved.has(seg[0])) {
      return { key: `${host}/${seg[0]}/${seg[1]}`, label: seg[1], kind: 'repo' };
    }
  }
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return { key: `${host}:${u.port || '80'}`, label: `localhost:${u.port || '80'}`, kind: 'repo' };
  }
  if (host.endsWith('figma.com') && (seg[0] === 'file' || seg[0] === 'design') && seg[2]) {
    const name = decodeURIComponent(seg[2]).replace(/-/g, ' ');
    return { key: `figma/${seg[1]}`, label: name, kind: 'repo' };
  }
  if (host.endsWith('atlassian.net') || host.endsWith('linear.app')) {
    const m = u.pathname.match(/\/([A-Z][A-Z0-9]+)-\d+/);
    if (m) return { key: `${host}/${m[1]}`, label: m[1], kind: 'repo' };
  }
  const reg = registrableDomain(host);
  return { key: reg, label: reg, kind: 'domain' };
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function tokens(title: string): string[] {
  return (title.toLowerCase().match(/[a-z][a-z0-9]{3,}/g) ?? []).filter((w) => !STOPWORDS.has(w));
}

/** A word present in at least half the titles (and ≥3 tabs) hints at a shared topic. */
function sharedTitleTopic(tabs: TabLite[]): string | null {
  const counts = new Map<string, number>();
  for (const t of tabs) {
    for (const w of new Set(tokens(t.title ?? ''))) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  let best: [string, number] | null = null;
  for (const [w, c] of counts) {
    if (c >= 3 && c / tabs.length >= MIN_SHARE && (!best || c > best[1])) best = [w, c];
  }
  return best ? best[0] : null;
}

function dominant<T>(items: T[], keyOf: (t: T) => string | null): { key: string; items: T[] } | null {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const k = keyOf(it);
    if (!k) continue;
    const g = groups.get(k) ?? [];
    g.push(it);
    groups.set(k, g);
  }
  let best: { key: string; items: T[] } | null = null;
  for (const [key, g] of groups) if (!best || g.length > best.items.length) best = { key, items: g };
  return best;
}

/**
 * Suggest at most one project per call for a single window's tabs.
 * Order of confidence: named Chrome tab group > shared repo/file > shared domain > shared title topic.
 */
export function detectProject(windowTabs: TabLite[]): ProjectSuggestion | null {
  const tabs = windowTabs.filter(isProjectTab);
  if (tabs.length < MIN_PROJECT_TABS) return null;

  // 1. A named Chrome tab group is the user's own label — strongest signal.
  const grouped = dominant(
    tabs.filter((t) => t.groupTitle?.trim()),
    (t) => t.groupTitle!.trim(),
  );
  if (grouped && grouped.items.length >= MIN_PROJECT_TABS) {
    return {
      name: grouped.key,
      tabs: grouped.items,
      reason: `Your tab group “${grouped.key}” has ${grouped.items.length} tabs`,
      source: 'tab_group',
    };
  }

  // 2/3. A shared repo / file / ticket project, or a shared domain.
  const byKey = dominant(tabs, (t) => projectKeyOf(t.url)?.key ?? null);
  if (byKey && byKey.items.length >= MIN_PROJECT_TABS && byKey.items.length / tabs.length >= MIN_SHARE) {
    const pk = projectKeyOf(byKey.items[0].url)!;
    if (pk.kind === 'repo') {
      return {
        name: capitalize(pk.label),
        tabs: tabs,
        reason: `${byKey.items.length} of ${tabs.length} tabs are in ${pk.label}`,
        source: 'repo',
      };
    }
    return {
      name: `${capitalize(pk.label.split('.')[0])} work`,
      tabs: tabs,
      reason: `${byKey.items.length} of ${tabs.length} tabs are on ${pk.label}`,
      source: 'domain',
    };
  }

  // 4. A word most titles share.
  const topic = sharedTitleTopic(tabs);
  if (topic) {
    return {
      name: capitalize(topic),
      tabs,
      reason: `Most tabs mention “${topic}”`,
      source: 'title_topic',
    };
  }
  return null;
}

/** True if `suggestion` substantially overlaps a previously dismissed one. */
export function isDismissed(suggestion: ProjectSuggestion, dismissed: string[][]): boolean {
  const keys = urlKeys(suggestion.tabs.map((t) => t.url));
  if (keys.size === 0) return true;
  return dismissed.some((d) => {
    const dk = new Set(d);
    return overlapCount(keys, dk) / Math.min(keys.size, dk.size || 1) >= 0.6;
  });
}

export function suggestionKeys(suggestion: ProjectSuggestion): string[] {
  return [...urlKeys(suggestion.tabs.map((t) => t.url))].slice(0, 40);
}

export { normalizeTabUrl };
