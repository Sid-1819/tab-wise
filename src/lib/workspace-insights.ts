import type { ActivityEvent, Workspace } from '@/types/workspace';
import { dailyCounts, lastTouched, workspaceStatus, type WorkspaceStatus } from '@/lib/workspace-activity';

/** Read-only summaries derived from a workspace. Shared by the extension and the website. */

const DAY = 86_400_000;

export function idleDays(ws: Workspace, now = Date.now()): number {
  return Math.max(0, Math.floor((now - lastTouched(ws)) / DAY));
}

export interface DomainCount {
  host: string;
  count: number;
}

/** Resources grouped by site, biggest first; the rest folded into one "other" count. */
export function domainBreakdown(ws: Workspace, limit = 5): { top: DomainCount[]; other: number; sites: number } {
  const counts = new Map<string, number>();
  for (const r of ws.resources) {
    let host: string;
    try {
      host = new URL(r.url).hostname.replace(/^www\./, '');
    } catch {
      continue;
    }
    counts.set(host, (counts.get(host) ?? 0) + 1);
  }
  const all = [...counts.entries()]
    .map(([host, count]) => ({ host, count }))
    .sort((a, b) => b.count - a.count || a.host.localeCompare(b.host));
  const top = all.slice(0, limit);
  const other = all.slice(limit).reduce((n, d) => n + d.count, 0);
  return { top, other, sites: all.length };
}

export interface TimelineItem {
  at: number;
  type: ActivityEvent['type'];
  text: string;
}

const VIA: Record<NonNullable<ActivityEvent['via']>, string> = {
  manual: '',
  menu: ' from the right-click menu',
  shortcut: ' with the shortcut',
  suggestion: ' from a suggestion',
};

export function describeEvent(e: ActivityEvent): string {
  switch (e.type) {
    case 'created':
      return 'Workspace created';
    case 'added': {
      const via = e.via ? VIA[e.via] : '';
      if (e.count === 1 && e.label) return `Saved “${e.label}”${via}`;
      return `Saved ${e.count ?? 1} page${(e.count ?? 1) === 1 ? '' : 's'}${via}`;
    }
    case 'left':
      return `Left with ${e.count ?? 0} tab${e.count === 1 ? '' : 's'} open`;
    case 'resumed':
      return 'Picked it back up';
    case 'note':
      return 'Added a note';
  }
}

export function timeline(ws: Workspace, limit = 8): TimelineItem[] {
  return (ws.activity ?? []).slice(0, limit).map((e) => ({ at: e.at, type: e.type, text: describeEvent(e) }));
}

export type AttentionKind = 'blocked' | 'waiting' | 'stale' | 'cooling' | 'no_next';
export interface Attention {
  kind: AttentionKind;
  text: string;
}

/** Things worth the user's eye, most important first. */
export function attention(ws: Workspace, now = Date.now()): Attention[] {
  if (ws.archived) return [];
  const out: Attention[] = [];
  const blockers = ws.context.blockers.trim();
  const waiting = ws.context.waitingOn.trim();
  if (blockers) out.push({ kind: 'blocked', text: `Blocked by ${blockers}` });
  if (waiting) out.push({ kind: 'waiting', text: `Waiting on ${waiting}` });
  const status = workspaceStatus(ws, now);
  const days = idleDays(ws, now);
  if (status === 'stale') out.push({ kind: 'stale', text: `Untouched for ${days} days. Resume or archive?` });
  else if (status === 'cooling') out.push({ kind: 'cooling', text: `Quiet for ${days} days` });
  if (!ws.context.nextAction.trim() && status !== 'stale') out.push({ kind: 'no_next', text: 'No next action set' });
  return out;
}

export const STATUS_LABEL: Record<WorkspaceStatus, string> = {
  active: 'Active',
  cooling: 'Cooling',
  stale: 'Stale',
};

/** Events per day across all live workspaces, oldest first (for a heatmap). */
export function rhythm(workspaces: Workspace[], days = 28, now = Date.now()): number[] {
  const total = new Array<number>(days).fill(0);
  for (const ws of workspaces) {
    if (ws.archived) continue;
    dailyCounts(ws, days, now).forEach((n, i) => (total[i] += n));
  }
  return total;
}

export interface Overview {
  live: number;
  active: number;
  pages: number;
  notes: number;
  needAttention: number;
}

export function overview(workspaces: Workspace[], now = Date.now()): Overview {
  const live = workspaces.filter((w) => !w.archived);
  return {
    live: live.length,
    active: live.filter((w) => workspaceStatus(w, now) === 'active').length,
    pages: live.reduce((n, w) => n + w.resources.length, 0),
    notes: live.reduce((n, w) => n + w.notes.length, 0),
    needAttention: live.filter((w) => attention(w, now).some((a) => a.kind !== 'no_next')).length,
  };
}

/** The workspace to put in the "resume" hero: freshest one with something to resume. */
export function pickResume(workspaces: Workspace[]): Workspace | undefined {
  const live = workspaces.filter((w) => !w.archived);
  const withLeft = live.filter((w) => w.lastLeft).sort((a, b) => (b.lastLeft?.at ?? 0) - (a.lastLeft?.at ?? 0));
  return withLeft[0] ?? [...live].sort((a, b) => lastTouched(b) - lastTouched(a))[0];
}
