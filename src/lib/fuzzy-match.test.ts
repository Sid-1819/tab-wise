import { describe, expect, it } from 'vitest';

import { fuzzyScore, scoreTab } from './fuzzy-match';
import type { TabInfo } from '@/types/tab';

describe('fuzzyScore', () => {
  it('scores exact substring matches higher than subsequence matches', () => {
    expect(fuzzyScore('GitHub Pull Request', 'github')).toBeGreaterThan(
      fuzzyScore('My Git Stuff', 'github')
    );
  });

  it('returns zero when the query character is not present', () => {
    expect(fuzzyScore('Inbox', 'z')).toBe(0);
  });

  it('matches skipped characters in order', () => {
    expect(fuzzyScore('Vitest Docs', 'vtdcs')).toBeGreaterThan(0);
  });
});

describe('scoreTab', () => {
  const tab: TabInfo = {
    id: 1,
    title: 'GitHub Pull Request',
    url: 'https://github.com/Sid-1819/tab-wise/pull/1',
  };

  it('uses the best score across title and url', () => {
    expect(scoreTab(tab, 'pull')).toBeGreaterThan(0);
    expect(scoreTab(tab, 'tab-wise')).toBeGreaterThan(0);
  });

  it('returns zero when any token fails to match', () => {
    expect(scoreTab(tab, 'github missing')).toBe(0);
  });
});
