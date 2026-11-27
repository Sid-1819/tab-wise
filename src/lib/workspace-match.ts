import { normalizeTabUrl } from '@/lib/url-normalize';
import type { Workspace } from '@/types/workspace';

/**
 * Stateless window <-> workspace matching. Window ids don't survive a browser
 * restart, so instead of storing bindings we ask "which workspace do these tabs
 * overlap with?" whenever we need to know.
 */

export const MIN_SHARED_TABS = 2;
export const MIN_COVERAGE = 0.6;

/** Normalized (tracking-param-free) URL set; non-web URLs are ignored. */
export function urlKeys(urls: string[]): Set<string> {
  const out = new Set<string>();
  for (const u of urls) {
    const k = normalizeTabUrl(u);
    if (k) out.add(k);
  }
  return out;
}

export function overlapCount(a: Set<string>, b: Set<string>): number {
  let n = 0;
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  for (const k of small) if (big.has(k)) n++;
  return n;
}

export interface WorkspaceMatch {
  workspace: Workspace;
  shared: number;
  /** shared / size of the workspace's own tab set (how much of it is open). */
  coverage: number;
}

/**
 * Best workspace for a set of open tab URLs: at least MIN_SHARED_TABS shared,
 * and at least MIN_COVERAGE of the workspace's tabs present. Ties go to the
 * higher coverage, then more shared tabs.
 */
export function matchWorkspace(
  tabUrls: string[],
  workspaces: Workspace[],
  basisOf: (ws: Workspace) => string[] = (ws) => ws.resources.map((r) => r.url),
): WorkspaceMatch | null {
  const open = urlKeys(tabUrls);
  let best: WorkspaceMatch | null = null;
  for (const ws of workspaces) {
    if (ws.archived) continue;
    const basis = urlKeys(basisOf(ws));
    if (basis.size === 0) continue;
    const shared = overlapCount(open, basis);
    const coverage = shared / basis.size;
    if (shared < MIN_SHARED_TABS) continue;
    if (coverage < MIN_COVERAGE) continue;
    if (
      !best ||
      coverage > best.coverage ||
      (coverage === best.coverage && shared > best.shared)
    ) {
      best = { workspace: ws, shared, coverage };
    }
  }
  return best;
}
