import {
  TabInfo,
  GroupedTabs,
  DomainMapping,
  AutoGroupStrategy,
  CustomGroupConfig,
} from '@/types/tab';

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

export function groupTabs(
  tabs: TabInfo[],
  strategy: AutoGroupStrategy = 'domain',
  customGroups: CustomGroupConfig[] = []
): GroupedTabs {
  const groups: GroupedTabs = {};

  // First, handle custom groups
  const tabsInCustomGroups = new Set<number>();
  customGroups.forEach((customGroup) => {
    const groupTabs = tabs.filter((tab) =>
      customGroup.tabIds.includes(tab.id)
    );

    if (groupTabs.length > 0) {
      const groupKey = customGroup.id;
      groups[groupKey] = {
        id: customGroup.id,
        domain: customGroup.name,
        tabs: groupTabs,
        type: 'custom',
        customName: customGroup.name,
        color: customGroup.color,
        isFavorite: customGroup.isFavorite,
        parentGroupId: customGroup.parentGroupId,
        createdAt: customGroup.createdAt,
        lastModified: customGroup.lastModified,
        favicon: groupTabs[0]?.favIconUrl,
      };

      groupTabs.forEach((tab) => tabsInCustomGroups.add(tab.id));
    }
  });

  // Then, apply auto-grouping to remaining tabs
  const remainingTabs = tabs.filter((tab) => !tabsInCustomGroups.has(tab.id));

  if (strategy === 'domain') {
    groupByDomain(remainingTabs, groups);
  } else if (strategy === 'content-similarity') {
    groupByContentSimilarity(remainingTabs, groups);
  } else if (strategy === 'time-of-day') {
    groupByTimeOfDay(remainingTabs, groups);
  } else if (strategy === 'activity-pattern') {
    groupByActivityPattern(remainingTabs, groups);
  } else if (strategy === 'project-context') {
    groupByProjectContext(remainingTabs, groups);
  }

  // Sort groups: favorites first, then by tab count
  const sortedGroups: GroupedTabs = {};
  Object.keys(groups)
    .sort((a, b) => {
      const groupA = groups[a];
      const groupB = groups[b];

      // Favorites first
      if (groupA.isFavorite && !groupB.isFavorite) return -1;
      if (!groupA.isFavorite && groupB.isFavorite) return 1;

      // Then by tab count
      return groupB.tabs.length - groupA.tabs.length;
    })
    .forEach((key) => {
      sortedGroups[key] = groups[key];
    });

  return sortedGroups;
}

function groupByDomain(tabs: TabInfo[], groups: GroupedTabs): void {
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

      const groupKey = `auto_${groupName}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          id: groupKey,
          domain: groupName,
          tabs: [],
          type: 'automatic',
          autoGroupStrategy: 'domain',
          createdAt: Date.now(),
          favicon: tab.favIconUrl,
        };
      }
      groups[groupKey].tabs.push(tab);
    } catch (e) {
      const groupName = 'Other';
      const groupKey = `auto_${groupName}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          id: groupKey,
          domain: groupName,
          tabs: [],
          type: 'automatic',
          autoGroupStrategy: 'domain',
          createdAt: Date.now(),
          favicon: tab.favIconUrl,
        };
      }
      groups[groupKey].tabs.push(tab);
    }
  });
}

// Group tabs by content similarity (based on URL patterns and keywords)
function groupByContentSimilarity(tabs: TabInfo[], groups: GroupedTabs): void {
  const keywords = ['docs', 'github', 'youtube', 'reddit', 'stackoverflow', 'medium'];

  tabs.forEach((tab) => {
    let groupName = 'Other';
    const lowerUrl = tab.url.toLowerCase();
    const lowerTitle = tab.title.toLowerCase();

    // Find matching keyword
    for (const keyword of keywords) {
      if (lowerUrl.includes(keyword) || lowerTitle.includes(keyword)) {
        groupName = keyword.charAt(0).toUpperCase() + keyword.slice(1);
        break;
      }
    }

    // If URL contains 'dev' or 'api', group as Development
    if (lowerUrl.includes('/dev') || lowerUrl.includes('/api') || lowerUrl.includes('developer')) {
      groupName = 'Development';
    }

    // If URL contains 'blog' or 'article', group as Reading
    if (lowerUrl.includes('blog') || lowerUrl.includes('article') || lowerUrl.includes('post')) {
      groupName = 'Reading';
    }

    const groupKey = `auto_${groupName}`;
    if (!groups[groupKey]) {
      groups[groupKey] = {
        id: groupKey,
        domain: groupName,
        tabs: [],
        type: 'automatic',
        autoGroupStrategy: 'content-similarity',
        createdAt: Date.now(),
        favicon: tab.favIconUrl,
      };
    }
    groups[groupKey].tabs.push(tab);
  });
}

// Group tabs by time of day (morning, afternoon, evening)
function groupByTimeOfDay(tabs: TabInfo[], groups: GroupedTabs): void {
  const currentHour = new Date().getHours();
  let timeGroupName: string;

  if (currentHour >= 5 && currentHour < 12) {
    timeGroupName = 'Morning Tabs';
  } else if (currentHour >= 12 && currentHour < 17) {
    timeGroupName = 'Afternoon Tabs';
  } else if (currentHour >= 17 && currentHour < 21) {
    timeGroupName = 'Evening Tabs';
  } else {
    timeGroupName = 'Night Tabs';
  }

  const groupKey = `auto_${timeGroupName}`;
  if (!groups[groupKey]) {
    groups[groupKey] = {
      id: groupKey,
      domain: timeGroupName,
      tabs: [],
      type: 'automatic',
      autoGroupStrategy: 'time-of-day',
      createdAt: Date.now(),
    };
  }
  groups[groupKey].tabs.push(...tabs);
}

// Group tabs by activity pattern (work, social, entertainment, etc.)
function groupByActivityPattern(tabs: TabInfo[], groups: GroupedTabs): void {
  const patterns = {
    Work: ['docs', 'drive', 'mail', 'calendar', 'slack', 'teams', 'zoom', 'notion', 'trello', 'asana'],
    Social: ['facebook', 'twitter', 'instagram', 'linkedin', 'reddit', 'tiktok'],
    Entertainment: ['youtube', 'netflix', 'spotify', 'twitch', 'hulu', 'prime'],
    Shopping: ['amazon', 'ebay', 'shop', 'store', 'cart'],
    Development: ['github', 'stackoverflow', 'gitlab', 'codepen', 'replit', 'dev.to'],
  };

  tabs.forEach((tab) => {
    let groupName = 'Other';
    const lowerUrl = tab.url.toLowerCase();

    for (const [pattern, keywords] of Object.entries(patterns)) {
      if (keywords.some((keyword) => lowerUrl.includes(keyword))) {
        groupName = pattern;
        break;
      }
    }

    const groupKey = `auto_${groupName}`;
    if (!groups[groupKey]) {
      groups[groupKey] = {
        id: groupKey,
        domain: groupName,
        tabs: [],
        type: 'automatic',
        autoGroupStrategy: 'activity-pattern',
        createdAt: Date.now(),
        favicon: tab.favIconUrl,
      };
    }
    groups[groupKey].tabs.push(tab);
  });
}

// Group tabs by project context (based on URL similarity)
function groupByProjectContext(tabs: TabInfo[], groups: GroupedTabs): void {
  const projectMap = new Map<string, TabInfo[]>();

  tabs.forEach((tab) => {
    try {
      const url = new URL(tab.url);
      // Use the base domain + first path segment as project identifier
      const pathSegments = url.pathname.split('/').filter(Boolean);
      const projectKey = pathSegments.length > 0
        ? `${url.hostname}/${pathSegments[0]}`
        : url.hostname;

      if (!projectMap.has(projectKey)) {
        projectMap.set(projectKey, []);
      }
      projectMap.get(projectKey)!.push(tab);
    } catch (e) {
      // Invalid URL, add to "Other"
      if (!projectMap.has('other')) {
        projectMap.set('other', []);
      }
      projectMap.get('other')!.push(tab);
    }
  });

  // Create groups from project map
  projectMap.forEach((projectTabs, projectKey) => {
    const groupName = projectKey === 'other'
      ? 'Other'
      : prettifyDomain(projectKey.split('/')[0]);

    const groupKey = `auto_${groupName}_${projectKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
    groups[groupKey] = {
      id: groupKey,
      domain: groupName,
      tabs: projectTabs,
      type: 'automatic',
      autoGroupStrategy: 'project-context',
      createdAt: Date.now(),
      favicon: projectTabs[0]?.favIconUrl,
    };
  });
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
