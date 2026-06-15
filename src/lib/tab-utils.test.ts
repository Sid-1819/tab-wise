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
});
