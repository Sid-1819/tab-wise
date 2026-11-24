import type { SavedSessionChromeGroup, SavedSessionTab } from '@/types/session';
import type { Workspace } from '@/types/workspace';

/**
 * What to reopen for a workspace: the newest of the auto-captured "where you left"
 * state and a saved window snapshot (which keeps tab groups); else the curated list.
 */
export function restoreSource(ws: Workspace): {
  tabs: SavedSessionTab[];
  chromeGroups?: SavedSessionChromeGroup[];
  from: 'left' | 'snapshot' | 'resources';
} {
  const left = ws.lastLeft;
  const snap = ws.snapshot;
  if (snap && (!left || snap.at >= left.at)) {
    return { tabs: snap.tabs, chromeGroups: snap.chromeGroups, from: 'snapshot' };
  }
  if (left) {
    return {
      tabs: left.tabs.map((t) => ({ url: t.url, title: t.title, pinned: t.pinned })),
      from: 'left',
    };
  }
  return {
    tabs: ws.resources.map((r) => ({ url: r.url, title: r.title, pinned: r.pinned })),
    from: 'resources',
  };
}
