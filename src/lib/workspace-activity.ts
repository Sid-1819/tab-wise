import type { ActivityEvent, ActivityType, Workspace } from '@/types/workspace';

/**
 * Pure helpers for the per-workspace activity log. Everything is derived from
 * events the extension already sees (adds, leaves, resumes, notes).
 */

export const MAX_EVENTS = 200;
export const COOLING_AFTER_DAYS = 3;
export const STALE_AFTER_DAYS = 10;
const DAY = 86_400_000;

/** Newest-first, capped. Returns a new workspace; never mutates. */
export function recordEvent(
  ws: Workspace,
  event: Omit<ActivityEvent, 'at'> & { at?: number },
  now = Date.now(),
): Workspace {
  const e: ActivityEvent = { ...event, at: event.at ?? now };
  const next = [e, ...(ws.activity ?? [])].sort((a, b) => b.at - a.at).slice(0, MAX_EVENTS);
  return { ...ws, activity: next };
}

/** Local calendar-day key, e.g. "2026-11-08". */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Events per local day for the last `days` days, oldest first (for a sparkline/strip). */
export function dailyCounts(ws: Workspace, days = 14, now = Date.now()): number[] {
  const counts = new Map<string, number>();
  for (const e of ws.activity ?? []) counts.set(dayKey(e.at), (counts.get(dayKey(e.at)) ?? 0) + 1);
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(counts.get(dayKey(d.getTime())) ?? 0);
  }
  return out;
}

export function activeDays(ws: Workspace, now = Date.now(), within = 30): number {
  const cutoff = now - within * DAY;
  const set = new Set<string>();
  for (const e of ws.activity ?? []) if (e.at >= cutoff) set.add(dayKey(e.at));
  return set.size;
}

/** Last time the user did anything with this workspace. */
export function lastTouched(ws: Workspace): number {
  let t = Math.max(ws.updatedAt, ws.lastOpenedAt ?? 0, ws.lastLeft?.at ?? 0);
  const first = ws.activity?.[0];
  if (first) t = Math.max(t, first.at);
  return t;
}

export type WorkspaceStatus = 'active' | 'cooling' | 'stale';

export function workspaceStatus(ws: Workspace, now = Date.now()): WorkspaceStatus {
  const idleDays = (now - lastTouched(ws)) / DAY;
  if (idleDays >= STALE_AFTER_DAYS) return 'stale';
  if (idleDays >= COOLING_AFTER_DAYS) return 'cooling';
  return 'active';
}

export function eventCount(ws: Workspace, type: ActivityType): number {
  return (ws.activity ?? []).filter((e) => e.type === type).length;
}

/** Defensive parse of stored events. */
export function sanitizeActivity(raw: unknown): ActivityEvent[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const types: ActivityType[] = ['created', 'added', 'left', 'resumed', 'note'];
  const vias = ['manual', 'menu', 'shortcut', 'suggestion'];
  const out: ActivityEvent[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const e = r as Partial<ActivityEvent>;
    if (typeof e.at !== 'number' || !types.includes(e.type as ActivityType)) continue;
    out.push({
      at: e.at,
      type: e.type as ActivityType,
      count: typeof e.count === 'number' ? e.count : undefined,
      label: typeof e.label === 'string' ? e.label.slice(0, 120) : undefined,
      via: vias.includes(e.via as string) ? e.via : undefined,
    });
  }
  out.sort((a, b) => b.at - a.at);
  return out.length ? out.slice(0, MAX_EVENTS) : undefined;
}
