import { describe, expect, it } from 'vitest';

import { nextSelectedId, orderedTabIds, selectionAfterClose, shortcutAction } from './shortcuts';

describe('shortcutAction', () => {
  it('maps list keys when the panel is idle', () => {
    expect(shortcutAction({ key: 'j' }, 'idle')).toBe('move-next');
    expect(shortcutAction({ key: 'ArrowDown' }, 'idle')).toBe('move-next');
    expect(shortcutAction({ key: 'k' }, 'idle')).toBe('move-prev');
    expect(shortcutAction({ key: 'ArrowUp' }, 'idle')).toBe('move-prev');
    expect(shortcutAction({ key: 'Enter' }, 'idle')).toBe('open');
    expect(shortcutAction({ key: 'x' }, 'idle')).toBe('close');
    expect(shortcutAction({ key: 's' }, 'idle')).toBe('sleep');
    expect(shortcutAction({ key: 'r' }, 'idle')).toBe('reload');
    expect(shortcutAction({ key: 'n' }, 'idle')).toBe('new-tab');
    expect(shortcutAction({ key: '/' }, 'idle')).toBe('focus-search');
    expect(shortcutAction({ key: 'Escape' }, 'idle')).toBe('escape');
  });

  it('opens the palette on ctrl+k and cmd+k', () => {
    expect(shortcutAction({ key: 'k', ctrlKey: true }, 'idle')).toBe('open-palette');
    expect(shortcutAction({ key: 'k', metaKey: true }, 'search')).toBe('open-palette');
  });

  it('lets the search field keep letter keys', () => {
    expect(shortcutAction({ key: 'j' }, 'search')).toBeNull();
    expect(shortcutAction({ key: 'x' }, 'search')).toBeNull();
    expect(shortcutAction({ key: 'ArrowDown' }, 'search')).toBe('move-next');
    expect(shortcutAction({ key: 'Enter' }, 'search')).toBe('open');
    expect(shortcutAction({ key: 'Escape' }, 'search')).toBe('escape');
    expect(shortcutAction({ key: '/' }, 'search')).toBe('focus-search');
  });

  it('ignores modified letters', () => {
    expect(shortcutAction({ key: 'j', ctrlKey: true }, 'idle')).toBeNull();
    expect(shortcutAction({ key: 'J', shiftKey: true }, 'idle')).toBeNull();
    expect(shortcutAction({ key: 'k', altKey: true }, 'idle')).toBeNull();
  });
});

describe('selection movement', () => {
  const ids = [4, 8, 15];

  it('starts at the ends when nothing is selected', () => {
    expect(nextSelectedId(ids, null, 1)).toBe(4);
    expect(nextSelectedId(ids, null, -1)).toBe(15);
  });

  it('steps through the list and wraps at both ends', () => {
    expect(nextSelectedId(ids, 4, 1)).toBe(8);
    expect(nextSelectedId(ids, 15, 1)).toBe(4);
    expect(nextSelectedId(ids, 8, -1)).toBe(4);
    expect(nextSelectedId(ids, 4, -1)).toBe(15);
    expect(nextSelectedId([], 1, 1)).toBeNull();
  });

  it('selects the next row after a close', () => {
    expect(selectionAfterClose(ids, 8)).toBe(15);
    expect(selectionAfterClose(ids, 15)).toBe(8);
    expect(selectionAfterClose([8], 8)).toBeNull();
  });
});

describe('orderedTabIds', () => {
  it('walks into a group instead of stopping at its edge', () => {
    expect(
      orderedTabIds([
        { type: 'automatic', tabs: [{ id: 1 }] },
        { type: 'chrome', tabs: [{ id: 2 }, { id: 3 }] },
        { type: 'automatic', tabs: [{ id: 4 }] },
      ])
    ).toEqual([1, 2, 3, 4]);
  });

  it('follows subgroup order', () => {
    expect(
      orderedTabIds([
        {
          type: 'automatic',
          tabs: [{ id: 1 }, { id: 2 }, { id: 3 }],
          subgroups: [{ tabs: [{ id: 2 }] }, { tabs: [{ id: 3 }] }],
        },
      ])
    ).toEqual([2, 3, 1]);
  });
});
