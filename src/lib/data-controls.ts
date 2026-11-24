import type { Workspace } from '@/types/workspace';

/** Pure helpers for "what TabWise stores" and the clear/forget actions. */

export interface StorageSummary {
  workspaces: number;
  archived: number;
  pages: number;
  notes: number;
  activityEvents: number;
  rememberedWindows: number;
}

export function summarize(workspaces: Workspace[], rememberedWindows: number): StorageSummary {
  return {
    workspaces: workspaces.length,
    archived: workspaces.filter((w) => w.archived).length,
    pages: workspaces.reduce((n, w) => n + w.resources.length, 0),
    notes: workspaces.reduce((n, w) => n + w.notes.length, 0),
    activityEvents: workspaces.reduce((n, w) => n + (w.activity?.length ?? 0), 0),
    rememberedWindows,
  };
}

/** Forget the activity timeline (counts, charts, "recently"). Keeps pages, notes, context. */
export function clearActivityLog(ws: Workspace): Workspace {
  if (!ws.activity) return ws;
  const { activity: _drop, ...rest } = ws;
  return rest;
}

/** Forget where windows were left and the welcome-back note. Keeps everything you saved. */
export function clearLeaveState(ws: Workspace): Workspace {
  if (!ws.lastLeft && !ws.welcomeBack) return ws;
  const { lastLeft: _a, welcomeBack: _b, ...rest } = ws;
  return rest;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
