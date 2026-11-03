export type ShortcutContext = 'idle' | 'search';

export type ShortcutAction =
  | 'move-next'
  | 'move-prev'
  | 'open'
  | 'close'
  | 'sleep'
  | 'reload'
  | 'new-tab'
  | 'focus-search'
  | 'escape'
  | 'open-palette';

export interface KeyEventLike {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

function hasModifier(event: KeyEventLike): boolean {
  return !!event.metaKey || !!event.ctrlKey || !!event.altKey;
}

export function shortcutAction(
  event: KeyEventLike,
  context: ShortcutContext
): ShortcutAction | null {
  const key = event.key;
  const paletteChord =
    key.toLowerCase() === 'k' &&
    (!!event.metaKey || !!event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey;

  if (paletteChord) return 'open-palette';
  if (hasModifier(event)) return null;

  if (key === 'ArrowDown') return 'move-next';
  if (key === 'ArrowUp') return 'move-prev';
  if (key === 'Enter') return 'open';
  if (key === 'Escape') return 'escape';
  if (key === '/') return 'focus-search';

  if (context === 'search') return null;

  if (key === 'j') return 'move-next';
  if (key === 'k') return 'move-prev';
  if (key === 'x') return 'close';
  if (key === 's') return 'sleep';
  if (key === 'r') return 'reload';
  if (key === 'n') return 'new-tab';
  return null;
}

export function nextSelectedId(
  ids: number[],
  selectedId: number | null,
  direction: 1 | -1
): number | null {
  if (ids.length === 0) return null;
  const index = selectedId == null ? -1 : ids.indexOf(selectedId);
  if (index < 0) return direction === 1 ? ids[0] : ids[ids.length - 1];
  return ids[(index + direction + ids.length) % ids.length];
}

export interface NavGroup {
  type: string;
  tabs: { id: number }[];
  subgroups?: { tabs: { id: number }[] }[];
}

/** Visual order: every tab, including ones inside a group or subgroup. */
export function orderedTabIds(groups: NavGroup[]): number[] {
  const ids: number[] = [];
  const seen = new Set<number>();
  const push = (id: number) => {
    if (seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };

  for (const group of groups) {
    const subgroups = group.subgroups ?? [];
    if (group.tabs.length === 1 && group.type === 'automatic') {
      push(group.tabs[0].id);
      continue;
    }
    if (subgroups.length >= 2) {
      const nested = new Set<number>();
      for (const subgroup of subgroups) {
        for (const tab of subgroup.tabs) {
          push(tab.id);
          nested.add(tab.id);
        }
      }
      for (const tab of group.tabs) {
        if (!nested.has(tab.id)) push(tab.id);
      }
      continue;
    }
    for (const tab of group.tabs) push(tab.id);
  }

  return ids;
}

export function selectionAfterClose(ids: number[], closedId: number): number | null {
  const index = ids.indexOf(closedId);
  if (index < 0) return ids[0] ?? null;
  return ids[index + 1] ?? ids[index - 1] ?? null;
}
