import { FaviconImg } from '@/components/favicon-img';
import { getTabFaviconUrl } from '@/lib/favicon';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/time-ago';
import type { Workspace } from '@/types/workspace';
import { dailyCounts, workspaceStatus, type WorkspaceStatus } from '@/lib/workspace-activity';
import { STATUS_LABEL, domainBreakdown, timeline } from '@/lib/workspace-insights';

const STATUS_STYLE: Record<WorkspaceStatus, string> = {
  active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  cooling: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  stale: 'bg-muted text-muted-foreground',
};
const DOT_STYLE: Record<WorkspaceStatus, string> = {
  active: 'bg-emerald-500',
  cooling: 'bg-amber-500',
  stale: 'bg-muted-foreground/50',
};

export function StatusChip({ workspace, className }: { workspace: Workspace; className?: string }) {
  const s = workspaceStatus(workspace);
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium', STATUS_STYLE[s], className)}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT_STYLE[s])} aria-hidden />
      {STATUS_LABEL[s]}
    </span>
  );
}

/** Tiny bar strip of recent activity. Decorative; the numbers are also shown as text elsewhere. */
export function Spark({ values, className, tall = false }: { values: number[]; className?: string; tall?: boolean }) {
  const max = Math.max(1, ...values);
  const h = tall ? 28 : 14;
  return (
    <div className={cn('flex items-end gap-px', className)} style={{ height: h }} aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          className={cn('w-full rounded-[1px]', v > 0 ? 'bg-primary' : 'bg-muted')}
          style={{ height: v > 0 ? Math.max(3, Math.round((v / max) * h)) : 2, opacity: v > 0 ? 0.45 + 0.55 * (v / max) : 1 }}
        />
      ))}
    </div>
  );
}

/**
 * Secondary detail for the workspace screen: activity, where the pages are, recent events.
 * Status, blockers and counts are shown elsewhere, so they are intentionally not repeated here.
 */
export function WorkspacePulse({ workspace: ws }: { workspace: Workspace }) {
  const days = dailyCounts(ws, 14);
  const { top, other } = domainBreakdown(ws, 4);
  const events = timeline(ws, 5);
  const total = Math.max(1, ws.resources.length);

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label="Workspace pulse" data-testid="workspace-pulse">
      <div>
        <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
          <span>Last 14 days</span>
          <span>today</span>
        </div>
        <Spark values={days} className="w-full" />
      </div>

      {top.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] text-muted-foreground">Where the pages are</div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            {top.map((d, i) => (
              <span key={d.host} className="h-full bg-primary" style={{ width: `${(d.count / total) * 100}%`, opacity: 1 - i * 0.18 }} />
            ))}
          </div>
          <ul className="mt-1.5 flex flex-wrap gap-1">
            {top.map((d) => (
              <li key={d.host} className="inline-flex max-w-full items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-[10px]">
                <FaviconImg src={getTabFaviconUrl(`https://${d.host}`)} className="h-3 w-3 shrink-0" />
                <span className="truncate">{d.host}</span> <span className="text-muted-foreground">{d.count}</span>
              </li>
            ))}
            {other > 0 && <li className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">+{other} more</li>}
          </ul>
        </div>
      )}

      {events.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] text-muted-foreground">Recently</div>
          <ol className="flex flex-col gap-1 border-l border-border pl-2">
            {events.map((e, i) => (
              <li key={`${e.at}-${i}`} className="flex justify-between gap-2 text-[11px]">
                <span className="min-w-0 break-words">{e.text}</span>
                <span className="shrink-0 text-muted-foreground">{timeAgo(e.at)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
