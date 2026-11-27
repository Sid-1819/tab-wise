import type { Workspace } from '@/types/workspace';
import { sanitizeWorkspaces } from '@/lib/workspace-model';
import { resolveSettings, type Settings } from '@/lib/settings';

/** Portable JSON backup of everything TabWise keeps. Local file only; nothing is uploaded. */

export const BACKUP_VERSION = 1 as const;
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

export interface Backup {
  app: 'tabwise';
  version: typeof BACKUP_VERSION;
  exportedAt: number;
  workspaces: Workspace[];
  settings: Settings;
}

export function buildBackup(workspaces: Workspace[], settings: Settings, now = Date.now()): Backup {
  return { app: 'tabwise', version: BACKUP_VERSION, exportedAt: now, workspaces, settings };
}

export function backupFileName(now = Date.now()): string {
  const d = new Date(now);
  const p = (n: number) => String(n).padStart(2, '0');
  return `tabwise-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}

export type ParsedBackup =
  | { ok: true; workspaces: Workspace[]; settings?: Settings }
  | { ok: false; error: string };

export function parseBackup(text: string): ParsedBackup {
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, error: 'That file is too large to be a TabWise backup.' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file isn’t valid JSON.' };
  }
  if (!raw || typeof raw !== 'object' || (raw as Backup).app !== 'tabwise') {
    return { ok: false, error: 'That doesn’t look like a TabWise backup.' };
  }
  const b = raw as Partial<Backup>;
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) {
    return { ok: false, error: 'This backup was made by a newer TabWise. Update the extension and try again.' };
  }
  if (!Array.isArray(b.workspaces)) return { ok: false, error: 'The backup has no workspaces.' };
  return {
    ok: true,
    workspaces: sanitizeWorkspaces(b.workspaces),
    settings: b.settings ? resolveSettings(b.settings) : undefined,
  };
}

export interface MergeResult {
  merged: Workspace[];
  added: number;
  updated: number;
  unchanged: number;
}

/**
 * Non-destructive import: unknown workspaces are added; for ids that exist, the more
 * recently updated copy wins. Nothing already here is ever deleted.
 */
export function mergeWorkspaces(existing: Workspace[], incoming: Workspace[]): MergeResult {
  const byId = new Map(existing.map((w) => [w.id, w]));
  let added = 0;
  let updated = 0;
  let unchanged = 0;
  for (const w of incoming) {
    const have = byId.get(w.id);
    if (!have) {
      byId.set(w.id, w);
      added++;
    } else if (w.updatedAt > have.updatedAt) {
      byId.set(w.id, w);
      updated++;
    } else {
      unchanged++;
    }
  }
  return { merged: [...byId.values()], added, updated, unchanged };
}
