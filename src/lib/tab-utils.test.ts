import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/favicon', () => ({
  getTabFaviconUrl: () => '',
  DEFAULT_FAVICON: '',
}));

import { filterTabs, groupTabs } from './tab-utils';
import type { TabInfo } from '@/types/tab';

const tabs: TabInfo[] = [
  { id: 1, title: 'GitHub Pull Request', url: 'https://github.com/Sid-1819/tab-wise/pull/1' },
  { id: 2, title: 'Vitest Docs', url: 'https://vitest.dev/guide/' },
  { id: 3, title: 'Inbox', url: 'https://mail.example.com/' },
];

const encatchTabs: TabInfo[] = [
  { id: 10, title: 'Admin', url: 'https://admin.encatch.com/dashboard' },
  { id: 11, title: 'Admin Settings', url: 'https://admin.encatch.com/settings' },
  { id: 12, title: 'Infisical', url: 'https://infisical.encatch.com/secrets' },
  { id: 13, title: 'Encatch Home', url: 'https://encatch.com/' },
];

describe('groupTabs domain nesting', () => {
  it('creates subdomain subgroups when multiple hostnames share a domain', () => {
    const grouped = groupTabs(encatchTabs, 'domain', [], [], [], 1, false, 24 * 60 * 60 * 1000, true);
    const encatchGroup = grouped.auto_Encatch;

    expect(encatchGroup).toBeDefined();
    expect(encatchGroup.tabs).toHaveLength(4);
    expect(encatchGroup.subgroups).toHaveLength(3);
    expect(encatchGroup.subgroups?.map((sg) => sg.label).sort()).toEqual([
      'Admin',
      'Infisical',
      'Root',
    ]);
  });

  it('keeps a flat group when only one hostname is present', () => {
    const grouped = groupTabs(
      encatchTabs.filter((tab) => new URL(tab.url).hostname === 'admin.encatch.com'),
      'domain',
      [],
      [],
      [],
      1,
      false,
      24 * 60 * 60 * 1000,
      true
    );

    expect(grouped.auto_Encatch.subgroups).toBeUndefined();
  });

  it('does not nest when showNestedGroups is disabled', () => {
    const grouped = groupTabs(encatchTabs, 'domain', [], [], [], 1, false, 24 * 60 * 60 * 1000, false);

    expect(grouped.auto_Encatch.subgroups).toBeUndefined();
  });

  it('lists remaining tabs individually when auto grouping is disabled', () => {
    const grouped = groupTabs(
      encatchTabs,
      'domain',
      [],
      [],
      [],
      1,
      false,
      24 * 60 * 60 * 1000,
      true,
      false
    );
    const autoGroups = Object.values(grouped).filter((group) => group.type === 'automatic');

    expect(autoGroups).toHaveLength(4);
    expect(autoGroups.every((group) => group.tabs.length === 1)).toBe(true);
    expect(autoGroups.flatMap((group) => group.tabs.map((tab) => tab.id)).sort()).toEqual([
      10, 11, 12, 13,
    ]);
  });

  it('keeps custom groups when auto grouping is disabled', () => {
    const grouped = groupTabs(
      encatchTabs,
      'domain',
      [
        {
          id: 'g1',
          name: 'Work',
          color: '#fff',
          tabIds: [10],
          createdAt: 1,
          lastModified: 1,
        },
      ],
      [],
      [],
      1,
      false,
      24 * 60 * 60 * 1000,
      true,
      false
    );

    expect(grouped.g1.tabs.map((tab) => tab.id)).toEqual([10]);
    expect(Object.values(grouped).filter((group) => group.type === 'automatic')).toHaveLength(3);
  });
});

describe('groupTabs chrome groups', () => {
  const groupedTabs: TabInfo[] = [
    { id: 1, title: 'One', url: 'https://a.example/', chromeGroupId: 7, index: 1 },
    { id: 2, title: 'Two', url: 'https://b.example/', chromeGroupId: 7, index: 0 },
    { id: 3, title: 'Loose', url: 'https://c.example/' },
    { id: 4, title: 'Custom', url: 'https://d.example/', chromeGroupId: 7 },
  ];

  const chromeGroups = [{ id: 7, title: 'Research', color: '#1A73E8', collapsed: true }];

  it('pulls Chrome groups out before domain grouping and keeps a one-tab group', () => {
    const grouped = groupTabs(
      groupedTabs.slice(0, 3),
      'domain',
      [],
      [],
      [],
      1,
      false,
      24 * 60 * 60 * 1000,
      true,
      true,
      true,
      chromeGroups
    );
    const chromeGroup = grouped.chrome_7;

    expect(chromeGroup.type).toBe('chrome');
    expect(chromeGroup.customName).toBe('Research');
    expect(chromeGroup.color).toBe('#1A73E8');
    expect(chromeGroup.tabs.map((tab) => tab.id)).toEqual([2, 1]);
    expect(chromeGroup.collapsed).toBe(true);
    expect(grouped.auto_C.tabs.map((tab) => tab.id)).toEqual([3]);
  });

  it('keeps a tab in its TabWise group when it is also in a Chrome group', () => {
    const grouped = groupTabs(
      groupedTabs,
      'domain',
      [
        {
          id: 'mine',
          name: 'Mine',
          color: '#fff',
          tabIds: [4],
          createdAt: 1,
          lastModified: 1,
        },
      ],
      [],
      [],
      1,
      false,
      24 * 60 * 60 * 1000,
      true,
      true,
      true,
      chromeGroups
    );

    expect(grouped.mine.tabs.map((tab) => tab.id)).toEqual([4]);
    expect(grouped.chrome_7.tabs.map((tab) => tab.id)).toEqual([2, 1]);
  });

  it('leaves Chrome groups in the normal list when the toggle is off', () => {
    const grouped = groupTabs(
      groupedTabs.slice(0, 2),
      'domain',
      [],
      [],
      [],
      1,
      false,
      24 * 60 * 60 * 1000,
      true,
      true,
      false,
      chromeGroups
    );

    expect(grouped.chrome_7).toBeUndefined();
    expect(Object.values(grouped).every((group) => group.type === 'automatic')).toBe(true);
  });
});

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
