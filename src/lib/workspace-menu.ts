import { matchWorkspace } from '@/lib/workspace-match';
import { detectProject } from '@/lib/project-detect';
import type { Workspace } from '@/types/workspace';

/**
 * Right-click "Add to workspace" menu: pure planning (testable) + a thin chrome layer.
 * Menu ids encode what a click means so the handler needs no extra state.
 */

export type MenuKind = 'page' | 'link' | 'selection';
export const MAX_RECENT = 5;
export const NEW_WORKSPACE = 'new' as const;
const PREFIX = 'tw';

export const PARENT_TITLE: Record<MenuKind, string> = {
  page: 'TabWise: add page to workspace',
  link: 'TabWise: add link to workspace',
  selection: 'TabWise: save selection as note in…',
};

export interface MenuEntry {
  id: string;
  parentId: string;
  title: string;
  kind: MenuKind;
  /** Visual-only separators have no target. */
  separator?: boolean;
}

export function childId(kind: MenuKind, target: string): string {
  return `${PREFIX}:${kind}:${target}`;
}
export function parentId(kind: MenuKind): string {
  return `${PREFIX}:parent:${kind}`;
}

export function parseMenuId(id: string): { kind: MenuKind; target: string } | null {
  const m = /^tw:(page|link|selection):(.+)$/.exec(id);
  return m ? { kind: m[1] as MenuKind, target: m[2] } : null;
}

function clip(s: string, n = 36): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/**
 * Order: the workspace this window already belongs to (starred), then the
 * most recently used others, then "New workspace".
 */
export function planMenu(
  workspaces: Workspace[],
  matchedId?: string,
  lastUsedId?: string,
): MenuEntry[] {
  const live = workspaces.filter((w) => !w.archived);
  const byId = new Map(live.map((w) => [w.id, w]));
  const order: Workspace[] = [];
  const push = (id?: string) => {
    const w = id ? byId.get(id) : undefined;
    if (w && !order.includes(w)) order.push(w);
  };
  push(matchedId);
  push(lastUsedId);
  for (const w of live) push(w.id); // already sorted most-recent-first by storage
  const picked = order.slice(0, MAX_RECENT);

  const out: MenuEntry[] = [];
  for (const kind of ['page', 'link', 'selection'] as MenuKind[]) {
    const parent = parentId(kind);
    for (const w of picked) {
      out.push({
        id: childId(kind, w.id),
        parentId: parent,
        kind,
        title: `${w.id === matchedId ? '★ ' : ''}${clip(w.name)}${w.id === matchedId ? ' (this window)' : ''}`,
      });
    }
    out.push({
      id: childId(kind, NEW_WORKSPACE),
      parentId: parent,
      kind,
      title: kind === 'selection' ? '+ New workspace with this note' : '+ New workspace from this',
    });
  }
  return out;
}

/** Which workspace the focused window belongs to, by tab overlap. */
export function matchedWorkspaceId(tabUrls: string[], workspaces: Workspace[]): string | undefined {
  return matchWorkspace(tabUrls, workspaces)?.workspace.id;
}

/** Name for a new workspace created from a right-click. */
export function nameForNew(
  windowTabs: { url: string; title?: string; groupTitle?: string }[],
  clicked: { url: string; title?: string },
): string {
  const detected = detectProject(windowTabs);
  if (detected) return detected.name;
  try {
    const host = new URL(clicked.url).hostname.replace(/^www\./, '');
    const base = host.split('.').slice(-2, -1)[0] || host;
    return `${base.charAt(0).toUpperCase()}${base.slice(1)} project`;
  } catch {
    return clicked.title ? clip(clicked.title, 30) : 'New workspace';
  }
}
