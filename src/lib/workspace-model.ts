import { normalizeTabUrl } from '@/lib/url-normalize';
import { recordEvent, sanitizeActivity } from '@/lib/workspace-activity';
import {
  WORKSPACE_SCHEMA_VERSION,
  type ActivityEvent,
  type LastLeft,
  type LeftTab,
  type SavedSnapshot,
  type WelcomeBack,
  type Workspace,
  type WorkspaceContext,
  type WorkspaceNote,
  type WorkspaceResource,
} from '@/types/workspace';

/**
 * Pure workspace operations. No chrome.* access here so everything is unit-testable.
 * Every mutator returns a new Workspace and bumps updatedAt.
 */

export const EMPTY_CONTEXT: WorkspaceContext = {
  currentFocus: '',
  nextAction: '',
  blockers: '',
  waitingOn: '',
};

let idCounter = 0;
export function generateId(prefix: string): string {
  idCounter = (idCounter + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function createWorkspace(name: string, now = Date.now()): Workspace {
  return {
    id: generateId('ws'),
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    name: name.trim() || 'Untitled workspace',
    createdAt: now,
    updatedAt: now,
    context: { ...EMPTY_CONTEXT },
    resources: [],
    notes: [],
    activity: [{ at: now, type: 'created' }],
  };
}

function touch(ws: Workspace, now: number): Workspace {
  return { ...ws, updatedAt: now };
}

/** Only real web pages make useful workspace resources (no about:, chrome-extension:, file:, etc). */
export function isWorkspaceUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url.trim());
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/** Key used to detect "same page" across resources. Falls back to the raw URL. */
export function resourceKey(url: string): string {
  return normalizeTabUrl(url) ?? url.trim();
}

export interface ResourceInput {
  url: string;
  title?: string;
  pinned?: boolean;
  kind?: WorkspaceResource['kind'];
}

export interface AddResourcesResult {
  workspace: Workspace;
  added: number;
  duplicates: number;
  skipped: number;
}

/**
 * Add resources, ignoring duplicates (by normalized URL) and unusable URLs.
 * `isUsable` is injected so this module has no chrome dependency.
 */
export function addResources(
  ws: Workspace,
  inputs: ResourceInput[],
  isUsable: (url: string) => boolean,
  now = Date.now(),
  /** 'auto' (background folding of leave snapshots) is not logged as user activity. */
  via: ActivityEvent['via'] | 'auto' = 'manual',
): AddResourcesResult {
  const seen = new Set(ws.resources.map((r) => resourceKey(r.url)));
  const next = [...ws.resources];
  let added = 0;
  let duplicates = 0;
  let skipped = 0;

  for (const input of inputs) {
    const url = input.url?.trim() ?? '';
    if (!url || !isUsable(url)) {
      skipped++;
      continue;
    }
    const key = resourceKey(url);
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    next.push({
      id: generateId('res'),
      kind: input.kind ?? 'tab',
      url,
      title: input.title?.trim() || undefined,
      pinned: input.pinned || undefined,
      addedAt: now,
    });
    added++;
  }

  let workspace = added > 0 ? touch({ ...ws, resources: next }, now) : ws;
  if (added > 0 && via !== 'auto') {
    const first = inputs.find((i) => i.url?.trim() && isUsable(i.url.trim()));
    workspace = recordEvent(
      workspace,
      { type: 'added', count: added, label: added === 1 ? first?.title?.trim() || undefined : undefined, via },
      now,
    );
  }
  return {
    workspace,
    added,
    duplicates,
    skipped,
  };
}

export function removeResource(ws: Workspace, resourceId: string, now = Date.now()): Workspace {
  if (!ws.resources.some((r) => r.id === resourceId)) return ws;
  return touch({ ...ws, resources: ws.resources.filter((r) => r.id !== resourceId) }, now);
}

export function setResourceRemark(
  ws: Workspace,
  resourceId: string,
  remark: string,
  now = Date.now(),
): Workspace {
  const trimmed = remark.trim();
  return touch(
    {
      ...ws,
      resources: ws.resources.map((r) =>
        r.id === resourceId ? { ...r, remark: trimmed || undefined } : r,
      ),
    },
    now,
  );
}

export function updateContext(
  ws: Workspace,
  patch: Partial<WorkspaceContext>,
  now = Date.now(),
): Workspace {
  return touch({ ...ws, context: { ...ws.context, ...patch } }, now);
}

export function renameWorkspace(ws: Workspace, name: string, now = Date.now()): Workspace {
  const trimmed = name.trim();
  if (!trimmed || trimmed === ws.name) return ws;
  return touch({ ...ws, name: trimmed }, now);
}

export function setArchived(ws: Workspace, archived: boolean, now = Date.now()): Workspace {
  return touch({ ...ws, archived: archived || undefined }, now);
}

/** Records that the user opened/restored the workspace without changing "edited" time. */
export function markOpened(ws: Workspace, now = Date.now()): Workspace {
  const opened = recordEvent({ ...ws, lastOpenedAt: now }, { type: 'resumed' }, now);
  if (!ws.lastLeft) return opened;
  // Coming back: consume the "where you left" state into a one-time welcome-back note.
  const { lastLeft, ...rest } = opened;
  return {
    ...rest,
    welcomeBack: {
      at: now,
      leftAt: lastLeft!.at,
      lastActive: lastLeft!.lastActive,
      tabCount: lastLeft!.tabs.length,
    },
  };
}

export function addNote(ws: Workspace, body: string, now = Date.now()): Workspace {
  const trimmed = body.trim();
  if (!trimmed) return ws;
  const note: WorkspaceNote = {
    id: generateId('note'),
    body: trimmed,
    createdAt: now,
    updatedAt: now,
  };
  return recordEvent(touch({ ...ws, notes: [note, ...ws.notes] }, now), { type: 'note' }, now);
}

export function updateNote(
  ws: Workspace,
  noteId: string,
  body: string,
  now = Date.now(),
): Workspace {
  const trimmed = body.trim();
  if (!trimmed) return deleteNote(ws, noteId, now);
  return touch(
    {
      ...ws,
      notes: ws.notes.map((n) => (n.id === noteId ? { ...n, body: trimmed, updatedAt: now } : n)),
    },
    now,
  );
}

export function deleteNote(ws: Workspace, noteId: string, now = Date.now()): Workspace {
  if (!ws.notes.some((n) => n.id === noteId)) return ws;
  return touch({ ...ws, notes: ws.notes.filter((n) => n.id !== noteId) }, now);
}

/** Most recently touched first; archived workspaces sink to the end. */
export function sortWorkspaces(list: Workspace[]): Workspace[] {
  return [...list].sort((a, b) => {
    if (!!a.archived !== !!b.archived) return a.archived ? 1 : -1;
    const at = Math.max(a.updatedAt, a.lastOpenedAt ?? 0);
    const bt = Math.max(b.updatedAt, b.lastOpenedAt ?? 0);
    return bt - at;
  });
}

function sanitizeSnapshot(raw: unknown): SavedSnapshot | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const s = raw as Partial<SavedSnapshot>;
  if (typeof s.at !== 'number' || !Array.isArray(s.tabs)) return undefined;
  const tabs = s.tabs.filter((t) => !!t && typeof t.url === 'string');
  if (tabs.length === 0) return undefined;
  const groups = Array.isArray(s.chromeGroups)
    ? s.chromeGroups.filter((g) => !!g && typeof g.key === 'string')
    : undefined;
  return { at: s.at, tabs, chromeGroups: groups?.length ? groups : undefined };
}

function sanitizeWelcome(raw: unknown): WelcomeBack | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const w = raw as Partial<WelcomeBack>;
  if (typeof w.at !== 'number' || typeof w.leftAt !== 'number') return undefined;
  const la = w.lastActive;
  return {
    at: w.at,
    leftAt: w.leftAt,
    tabCount: typeof w.tabCount === 'number' ? w.tabCount : 0,
    lastActive: la && typeof la.url === 'string' ? { url: la.url, title: typeof la.title === 'string' ? la.title : undefined } : undefined,
  };
}

function sanitizeLastLeft(raw: unknown): LastLeft | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const l = raw as Partial<LastLeft>;
  if (typeof l.at !== 'number' || !Array.isArray(l.tabs)) return undefined;
  const tabs = l.tabs.filter((t): t is LeftTab => !!t && typeof t.url === 'string');
  const la = l.lastActive;
  return {
    at: l.at,
    reason: l.reason === 'browser_closed' ? 'browser_closed' : 'window_closed',
    tabs,
    lastActive: la && typeof la.url === 'string' ? { url: la.url, title: typeof la.title === 'string' ? la.title : undefined } : undefined,
  };
}

/**
 * Defensive parse of whatever is in storage. Drops malformed entries instead of
 * throwing so one corrupt record never hides the rest of the user's workspaces.
 */
export function sanitizeWorkspaces(raw: unknown): Workspace[] {
  if (!Array.isArray(raw)) return [];
  const out: Workspace[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const w = item as Partial<Workspace>;
    if (typeof w.id !== 'string' || typeof w.name !== 'string') continue;
    const ctx = (w.context ?? {}) as Partial<WorkspaceContext>;
    out.push({
      id: w.id,
      schemaVersion: WORKSPACE_SCHEMA_VERSION,
      name: w.name,
      createdAt: typeof w.createdAt === 'number' ? w.createdAt : Date.now(),
      updatedAt: typeof w.updatedAt === 'number' ? w.updatedAt : Date.now(),
      lastOpenedAt: typeof w.lastOpenedAt === 'number' ? w.lastOpenedAt : undefined,
      archived: w.archived ? true : undefined,
      origin: w.origin === 'auto' || w.origin === 'imported' ? w.origin : undefined,
      snapshot: sanitizeSnapshot(w.snapshot),
      lastLeft: sanitizeLastLeft(w.lastLeft),
      welcomeBack: sanitizeWelcome(w.welcomeBack),
      context: {
        currentFocus: typeof ctx.currentFocus === 'string' ? ctx.currentFocus : '',
        nextAction: typeof ctx.nextAction === 'string' ? ctx.nextAction : '',
        blockers: typeof ctx.blockers === 'string' ? ctx.blockers : '',
        waitingOn: typeof ctx.waitingOn === 'string' ? ctx.waitingOn : '',
      },
      resources: Array.isArray(w.resources)
        ? w.resources.filter(
            (r): r is WorkspaceResource =>
              !!r && typeof r.id === 'string' && typeof r.url === 'string',
          )
        : [],
      activity: sanitizeActivity(w.activity),
      notes: Array.isArray(w.notes)
        ? w.notes.filter(
            (n): n is WorkspaceNote =>
              !!n && typeof n.id === 'string' && typeof n.body === 'string',
          )
        : [],
    });
  }
  return out;
}
