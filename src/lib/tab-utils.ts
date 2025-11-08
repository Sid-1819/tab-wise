import { TabInfo, GroupedTabs, DomainMapping } from '@/types/tab';

const KNOWN_DOMAINS: DomainMapping = {
  'google.com': 'Google',
  'youtube.com': 'YouTube',
  'github.com': 'GitHub',
  'stackoverflow.com': 'Stack Overflow',
  'facebook.com': 'Facebook',
  'twitter.com': 'Twitter',
  'linkedin.com': 'LinkedIn',
  'reddit.com': 'Reddit',
  'amazon.com': 'Amazon',
  'netflix.com': 'Netflix',
};

export function prettifyDomain(domain: string): string {
  if (KNOWN_DOMAINS[domain]) {
    return KNOWN_DOMAINS[domain];
  }

  const parts = domain.split('.');
  const main = parts.length > 2 ? parts[parts.length - 2] : parts[0];
  return main.charAt(0).toUpperCase() + main.slice(1);
}

export function groupTabs(tabs: TabInfo[]): GroupedTabs {
  const groups: GroupedTabs = {};

  tabs.forEach((tab) => {
    try {
      const url = new URL(tab.url);
      let groupName: string;

      if (url.protocol === 'chrome:' || url.protocol === 'chrome-extension:') {
        groupName = 'Chrome';
      } else if (url.protocol === 'file:') {
        groupName = 'Local Files';
      } else {
        const rawDomain = url.hostname.replace(/^www\./, '');
        groupName = prettifyDomain(rawDomain);
      }

      if (!groups[groupName]) {
        groups[groupName] = {
          domain: groupName,
          tabs: [],
          favicon: tab.favIconUrl
        };
      }
      groups[groupName].tabs.push(tab);
    } catch (e) {
      const groupName = 'Other';
      if (!groups[groupName]) {
        groups[groupName] = {
          domain: groupName,
          tabs: [],
          favicon: tab.favIconUrl
        };
      }
      groups[groupName].tabs.push(tab);
    }
  });

  // Sort by number of tabs (descending)
  const sortedGroups: GroupedTabs = {};
  Object.keys(groups)
    .sort((a, b) => groups[b].tabs.length - groups[a].tabs.length)
    .forEach((key) => {
      sortedGroups[key] = groups[key];
    });

  return sortedGroups;
}

export function filterTabs(
  tabs: TabInfo[],
  query: string
): TabInfo[] {
  const lowerQuery = query.toLowerCase();
  return tabs.filter(
    (tab) =>
      tab.title.toLowerCase().includes(lowerQuery) ||
      tab.url.toLowerCase().includes(lowerQuery)
  );
}
