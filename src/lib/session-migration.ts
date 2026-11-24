import type { NamedSession } from '@/types/session';
import type { Workspace } from '@/types/workspace';
import { isLikelyRestorableUrl } from '@/lib/session-capture-restore';
import { addResources, createWorkspace, isWorkspaceUrl } from '@/lib/workspace-model';

/**
 * Saved sessions became workspaces in 3.0. Each session turns into an *archived*
 * workspace (so the dashboard isn't flooded) that keeps every tab and its Chrome
 * tab-group info as a snapshot. The id is derived from the session id, so running
 * the migration twice never duplicates anything.
 */

export const MIGRATION_FLAG = 'sessionsMigratedV3' as const;

export function migratedId(sessionId: string): string {
  return `ws_from_${sessionId}`;
}

export function sessionToWorkspace(session: NamedSession): Workspace {
  const base = createWorkspace(session.name, session.createdAt);
  const tabs = session.tabs.filter((t) => isLikelyRestorableUrl(t.url));
  const withResources = addResources(
    base,
    tabs.filter((t) => !t.pinned),
    isWorkspaceUrl,
    session.createdAt,
    'auto',
  ).workspace;
  const groupKeys = new Set(tabs.map((t) => t.chromeGroupKey).filter((k): k is string => !!k));
  const groups = session.chromeGroups?.filter((g) => groupKeys.has(g.key));
  return {
    ...withResources,
    id: migratedId(session.id),
    updatedAt: session.updatedAt,
    archived: true,
    origin: 'imported',
    snapshot: tabs.length
      ? { at: session.updatedAt, tabs, chromeGroups: groups?.length ? groups : undefined }
      : undefined,
  };
}

/** Workspaces to add: one per session not already migrated. Never touches existing ones. */
export function planMigration(sessions: NamedSession[], existing: Workspace[]): Workspace[] {
  const have = new Set(existing.map((w) => w.id));
  const out: Workspace[] = [];
  for (const s of sessions) {
    if (!s || typeof s.id !== 'string' || typeof s.name !== 'string' || !Array.isArray(s.tabs)) continue;
    if (have.has(migratedId(s.id))) continue;
    out.push(sessionToWorkspace(s));
  }
  return out;
}
