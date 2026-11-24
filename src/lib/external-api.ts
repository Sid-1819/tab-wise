import type { Workspace, WorkspaceRestoreTarget } from '@/types/workspace';
import { markOpened } from '@/lib/workspace-model';
import { getWorkspaces, updateWorkspace } from '@/lib/workspace-storage';
import { restoreWorkspaceResources } from '@/lib/workspace-browser';
import { getSettings } from '@/lib/settings';

/**
 * Messages the TabWise website may send to the extension
 * (chrome.runtime.sendMessage(EXTENSION_ID, ...) via externally_connectable).
 *
 * Keep this contract stable: the website and the extension ship independently.
 */
export type ExternalRequest =
  | { type: 'ping' }
  | { type: 'getWorkspaces' }
  | { type: 'restoreWorkspace'; workspaceId: string; target?: WorkspaceRestoreTarget };

export type ExternalResponse =
  | { ok: true; type: 'ping'; version: string; apiVersion: 1 }
  | { ok: true; type: 'getWorkspaces'; workspaces: Workspace[] }
  | { ok: true; type: 'restoreWorkspace'; opened: number; skipped: number }
  | { ok: false; error: 'bad_request' | 'not_found' | 'internal' | 'disabled'; message?: string };

/** Origins allowed to talk to the extension (manifest `externally_connectable` is the first gate). */
export const ALLOWED_ORIGINS = ['https://tabwise.visionly.dev', 'http://localhost:3000'];

export function isAllowedOrigin(origin: string | undefined): boolean {
  return !!origin && ALLOWED_ORIGINS.includes(origin);
}

export function parseExternalRequest(raw: unknown): ExternalRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  switch (m.type) {
    case 'ping':
    case 'getWorkspaces':
      return { type: m.type };
    case 'restoreWorkspace':
      if (typeof m.workspaceId !== 'string' || !m.workspaceId) return null;
      if (m.target !== undefined && m.target !== 'new' && m.target !== 'current') return null;
      return { type: 'restoreWorkspace', workspaceId: m.workspaceId, target: m.target };
    default:
      return null;
  }
}

export interface ExternalDeps {
  version: () => string;
  getWorkspaces: () => Promise<Workspace[]>;
  restore: (ws: Workspace, target: WorkspaceRestoreTarget) => Promise<{ opened: number; skipped: number }>;
  markOpened: (id: string) => Promise<unknown>;
  /** The user's "let the website read my workspaces" switch. */
  websiteAccess: () => Promise<boolean>;
}

const defaultDeps: ExternalDeps = {
  version: () => chrome.runtime.getManifest().version,
  getWorkspaces,
  restore: restoreWorkspaceResources,
  markOpened: (id) => updateWorkspace(id, (w) => markOpened(w)),
  websiteAccess: async () => (await getSettings()).websiteAccess,
};

export async function handleExternalRequest(
  raw: unknown,
  deps: ExternalDeps = defaultDeps,
): Promise<ExternalResponse> {
  const req = parseExternalRequest(raw);
  if (!req) return { ok: false, error: 'bad_request' };

  try {
    // Checked first so a switched-off extension reveals nothing, not even workspace counts.
    if (!(await deps.websiteAccess())) return { ok: false, error: 'disabled' };
    switch (req.type) {
      case 'ping':
        return { ok: true, type: 'ping', version: deps.version(), apiVersion: 1 };
      case 'getWorkspaces':
        return { ok: true, type: 'getWorkspaces', workspaces: await deps.getWorkspaces() };
      case 'restoreWorkspace': {
        const ws = (await deps.getWorkspaces()).find((w) => w.id === req.workspaceId);
        if (!ws) return { ok: false, error: 'not_found' };
        const { opened, skipped } = await deps.restore(ws, req.target ?? 'new');
        if (opened > 0) await deps.markOpened(ws.id);
        return { ok: true, type: 'restoreWorkspace', opened, skipped };
      }
    }
  } catch (e) {
    return { ok: false, error: 'internal', message: e instanceof Error ? e.message : undefined };
  }
}
