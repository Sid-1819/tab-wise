import { registrableDomain } from '@/lib/project-detect';

/**
 * Focus mode: for the length of a session, new tabs (and brand-new windows) are closed, and
 * optionally tabs can't navigate off the sites they started on. Uses tab URLs only — never page
 * content. This file is pure logic; the browser wiring lives in focus-session.ts.
 */
export const FOCUS_KEY = 'focusSession' as const;
export const FOCUS_ALARM_END = 'focus-end' as const;
export const FOCUS_ALARM_TICK = 'focus-tick' as const;

export const TIMER_PRESETS: { minutes: number | null; label: string }[] = [
  { minutes: 25, label: '25 min' },
  { minutes: 50, label: '50 min' },
  { minutes: 90, label: '90 min' },
  { minutes: null, label: 'No limit' },
];

export const MAX_GOAL_LENGTH = 120;

export interface FocusSession {
  /** The one window this session guards. */
  windowId: number;
  startedAt: number;
  /** null = no time limit. */
  endsAt: number | null;
  goal: string;
  stayOnSites: boolean;
  /** Registrable domains of the web tabs open when the session started. */
  allowedHosts: string[];
  /** New tabs and off-site navigations stopped so far. */
  blocked: number;
}

export interface StartFocusInput {
  windowId: number;
  /** URLs of the tabs open in the window right now. */
  tabUrls: string[];
  minutes: number | null;
  goal: string;
  stayOnSites: boolean;
  now?: number;
}

/** The site a URL belongs to, or null for anything that isn't a normal web page. */
export function hostKey(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return registrableDomain(u.hostname.toLowerCase().replace(/^www\./, ''));
  } catch {
    return null;
  }
}

export function allowedHostsFor(urls: string[]): string[] {
  const hosts = new Set<string>();
  for (const url of urls) {
    const key = hostKey(url);
    if (key) hosts.add(key);
  }
  return [...hosts].sort();
}

export function startSession(input: StartFocusInput): FocusSession {
  const now = input.now ?? Date.now();
  const minutes = input.minutes != null && input.minutes > 0 ? input.minutes : null;
  return {
    windowId: input.windowId,
    startedAt: now,
    endsAt: minutes != null ? now + minutes * 60_000 : null,
    goal: input.goal.trim().slice(0, MAX_GOAL_LENGTH),
    stayOnSites: input.stayOnSites,
    allowedHosts: allowedHostsFor(input.tabUrls),
    blocked: 0,
  };
}

/** Validate whatever came back from storage; never trust it blindly. */
export function resolveFocusSession(raw: unknown): FocusSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.windowId !== 'number' || typeof r.startedAt !== 'number') return null;
  if (r.endsAt !== null && typeof r.endsAt !== 'number') return null;
  if (typeof r.goal !== 'string' || typeof r.stayOnSites !== 'boolean') return null;
  if (!Array.isArray(r.allowedHosts) || !r.allowedHosts.every((h) => typeof h === 'string')) return null;
  return {
    windowId: r.windowId,
    startedAt: r.startedAt,
    endsAt: r.endsAt as number | null,
    goal: r.goal,
    stayOnSites: r.stayOnSites,
    allowedHosts: r.allowedHosts as string[],
    blocked: typeof r.blocked === 'number' && r.blocked >= 0 ? r.blocked : 0,
  };
}

export function isExpired(session: FocusSession, now = Date.now()): boolean {
  return session.endsAt != null && now >= session.endsAt;
}

export function remainingMs(session: FocusSession, now = Date.now()): number | null {
  return session.endsAt == null ? null : Math.max(0, session.endsAt - now);
}

export interface NewTabContext {
  windowId: number;
  windowType: string | undefined;
  /** Tabs in that window, including the new one. */
  windowTabCount: number;
}

/**
 * A new tab is blocked in the focus window, and also when it is the lone tab of a brand-new
 * normal window (Cmd+N). Popups (sign-in windows) and tabs added to other existing windows
 * are left alone.
 */
export function shouldBlockNewTab(session: FocusSession, ctx: NewTabContext): boolean {
  if (ctx.windowId === session.windowId) return true;
  return ctx.windowType === 'normal' && ctx.windowTabCount <= 1;
}

/** Non-web pages (chrome://, about:blank, extension pages) are always allowed. */
export function isNavigationAllowed(session: FocusSession, url: string): boolean {
  if (!session.stayOnSites) return true;
  const key = hostKey(url);
  return key === null || session.allowedHosts.includes(key);
}

/** Short text for the toolbar badge: "ON" without a timer, otherwise the time left. */
export function badgeText(session: FocusSession, now = Date.now()): string {
  const left = remainingMs(session, now);
  if (left === null) return 'ON';
  const minutes = Math.max(1, Math.ceil(left / 60_000));
  return minutes >= 100 ? `${Math.round(minutes / 60)}h` : `${minutes}m`;
}

/** "23:05" or "1:12:30". */
export function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function blockedLabel(count: number): string {
  return `${count} blocked`;
}

export function statusTitle(session: FocusSession, now = Date.now()): string {
  const left = remainingMs(session, now);
  const time = left === null ? 'focus on' : `${badgeText(session, now)} left`;
  return `Tab Wise focus: ${time} · ${blockedLabel(session.blocked)}`;
}
