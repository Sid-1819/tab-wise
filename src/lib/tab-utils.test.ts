import { describe, expect, it } from 'vitest';

import { filterTabs } from './tab-utils';
import type { TabInfo } from '@/types/tab';

const tabs: TabInfo[] = [
  { id: 1, title: 'GitHub Pull Request', url: 'https://github.com/Sid-1819/tab-wise/pull/1' },
  { id: 2, title: 'Vitest Docs', url: 'https://vitest.dev/guide/' },
  { id: 3, title: 'Inbox', url: 'https://mail.example.com/' },
];

describe('filterTabs', () => {
  it('filters tabs by title case-insensitively', () => {
    expect(filterTabs(tabs, 'github')).toEqual([tabs[0]]);
  });

  it('filters tabs by URL case-insensitively', () => {
    expect(filterTabs(tabs, 'VITEST.DEV')).toEqual([tabs[1]]);
  });

  it('returns all tabs for an empty query', () => {
    expect(filterTabs(tabs, '')).toEqual(tabs);
  });

  it('matches typos with subsequence scoring', () => {
    expect(filterTabs(tabs, 'gthub')).toEqual([tabs[0]]);
  });

  it('matches out-of-order query tokens across title words', () => {
    expect(filterTabs(tabs, 'pr git')).toEqual([tabs[0]]);
  });

  it('requires all tokens to match for multi-word queries', () => {
    expect(filterTabs(tabs, 'vitest guide')).toEqual([tabs[1]]);
    expect(filterTabs(tabs, 'vitest inbox')).toEqual([]);
  });

  it('returns no matches for unrelated queries', () => {
    expect(filterTabs(tabs, 'xyzabc')).toEqual([]);
  });

  it('ranks exact matches above weaker subsequence matches', () => {
    const rankingTabs: TabInfo[] = [
      { id: 1, title: 'GitHub Issues', url: 'https://github.com/issues' },
      { id: 2, title: 'Guitar Hit Umbrella Box', url: 'https://example.com/notes' },
    ];

    expect(filterTabs(rankingTabs, 'github').map((tab) => tab.id)).toEqual([1, 2]);
  });
});
