import type { Workspace } from '@/types/workspace';
import { workspaceStatus } from '@/lib/workspace-activity';
import { describeEvent } from '@/lib/workspace-insights';

/**
 * A plain-markdown "brief" of a workspace: for handoffs, standups, or pasting into
 * an AI chat so it starts with real context. Only what the user already has in the
 * workspace (their notes, saved links, titles) — nothing read from pages.
 */

const MAX_LINKS = 15;
const MAX_NOTES = 5;
const MAX_EVENTS = 6;

function day(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Keep link text from breaking markdown. */
function mdText(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/([[\]\\])/g, '\\$1').trim();
}

function safeUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.href.replace(/\)/g, '%29').replace(/\(/g, '%28');
  } catch {
    return null;
  }
}

export function buildBrief(ws: Workspace, now = Date.now()): string {
  const lines: string[] = [];
  const status = workspaceStatus(ws, now);
  lines.push(`# ${mdText(ws.name)}`);
  lines.push(`_${status[0].toUpperCase()}${status.slice(1)} · updated ${day(Math.max(ws.updatedAt, ws.lastOpenedAt ?? 0))}_`);

  const ctx: [string, string][] = [
    ['Focus', ws.context.currentFocus],
    ['Next action', ws.context.nextAction],
    ['Blocked by', ws.context.blockers],
    ['Waiting on', ws.context.waitingOn],
  ];
  const filled = ctx.filter(([, v]) => v.trim());
  if (filled.length) {
    lines.push('');
    for (const [k, v] of filled) lines.push(`**${k}:** ${v.trim().replace(/\n+/g, ' ')}`);
  }

  const last = ws.lastLeft?.lastActive;
  if (last) {
    const href = safeUrl(last.url);
    lines.push('', `**Last on:** ${href ? `[${mdText(last.title || last.url)}](${href})` : mdText(last.title || last.url)}`);
  }

  const links = ws.resources.filter((r) => safeUrl(r.url));
  if (links.length) {
    lines.push('', '## Key links');
    for (const r of links.slice(0, MAX_LINKS)) {
      const href = safeUrl(r.url) as string;
      const remark = r.remark?.trim() ? ` — ${mdText(r.remark)}` : '';
      lines.push(`- [${mdText(r.title || r.url)}](${href})${remark}`);
    }
    if (links.length > MAX_LINKS) lines.push(`- …and ${links.length - MAX_LINKS} more`);
  }

  if (ws.notes.length) {
    lines.push('', '## Notes');
    for (const n of ws.notes.slice(0, MAX_NOTES)) {
      const body = n.body.trim().split('\n');
      lines.push(`- ${body[0]}`);
      for (const rest of body.slice(1)) if (rest.trim()) lines.push(`  ${rest.trim()}`);
    }
    if (ws.notes.length > MAX_NOTES) lines.push(`- …and ${ws.notes.length - MAX_NOTES} older`);
  }

  const events = (ws.activity ?? []).filter((e) => e.type !== 'created').slice(0, MAX_EVENTS);
  if (events.length) {
    lines.push('', '## Recent activity');
    for (const e of events) lines.push(`- ${day(e.at)}: ${describeEvent(e)}`);
  }

  lines.push('', `_Brief from Tab Wise · ${day(now)}_`);
  return lines.join('\n') + '\n';
}
