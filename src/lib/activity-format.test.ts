import { describe, expect, it } from 'vitest';

import { getDiscardCandidates, getStaleTabs } from './activity-format';

const DAY = 24 * 60 * 60 * 1000;
const now = 1_700_000_000_000;

describe('getStaleTabs', () => {
  const tabs = [
    { id: 1, title: 'old', lastAccessed: now - 8 * DAY },
    { id: 2, title: 'recent', activity: { lastVisited: now - DAY } },
    { id: 3, title: 'active', active: true, lastAccessed: now - 10 * DAY },
    { id: 4, title: 'pinned', pinned: true, lastAccessed: now - 10 * DAY },
    { id: 5, title: 'important', isImportant: true, lastAccessed: now - 10 * DAY },
    { id: 6, title: 'protected', lastAccessed: now - 10 * DAY },
    { id: 7, title: 'unknown' },
  ];

  it('returns unused tabs and skips protected or unknown ones', () => {
    expect(getStaleTabs(tabs, 7 * DAY, new Set([6]), now).map((tab) => tab.id)).toEqual([1]);
  });

  it('prefers activity.lastVisited over lastAccessed', () => {
    const visitedRecently = {
      id: 8,
      lastAccessed: now - 30 * DAY,
      activity: { lastVisited: now - DAY },
    };
    expect(getStaleTabs([visitedRecently], 7 * DAY, new Set(), now)).toEqual([]);
  });
});

describe('getDiscardCandidates', () => {
  it('skips discarded and audible tabs', () => {
    const stale = [
      { id: 1 },
      { id: 2, discarded: true },
      { id: 3, audible: true },
    ];
    expect(getDiscardCandidates(stale).map((tab) => tab.id)).toEqual([1]);
  });
});
