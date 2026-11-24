import type { Workspace } from '@/types/workspace';

/** How long a welcome-back card stays relevant. */
export const WELCOME_TTL_MS = 12 * 3_600_000;

export function isWelcomeFresh(ws: Workspace, now = Date.now()): boolean {
  return !!ws.welcomeBack && !ws.archived && now - ws.welcomeBack.at < WELCOME_TTL_MS;
}

/** "a few minutes", "3 hours", "2 days": how long they were away. */
export function awayLabel(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 10) return 'a few minutes';
  if (min < 60) return `${min} minutes`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'}`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'}`;
}

/** Drop a trailing " - Site Name" / " | Site" / " — Site" from a page title. */
function stripSite(title: string): string {
  const parts = title.split(/\s+[-–—|]\s+/);
  return parts.length > 1 && parts[0].length >= 8 ? parts[0] : title;
}

/**
 * A starting-point suggestion for "what's the next step?", from the page the user was
 * last on. It's only a prefill the user can edit — never saved on its own.
 */
export function suggestNextAction(ws: Workspace): string | null {
  const la = ws.welcomeBack?.lastActive ?? ws.lastLeft?.lastActive;
  if (!la) return null;
  let label = la.title?.trim() ? stripSite(la.title.trim()) : '';
  if (!label) {
    try {
      label = new URL(la.url).hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
  }
  label = label.length > 80 ? `${label.slice(0, 79)}…` : label;
  return `Continue with “${label}”`;
}

export function clearWelcome(ws: Workspace): Workspace {
  if (!ws.welcomeBack) return ws;
  const { welcomeBack: _drop, ...rest } = ws;
  return rest;
}
