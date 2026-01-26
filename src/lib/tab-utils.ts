import {
  TabInfo,
  GroupedTabs,
  DomainMapping,
  AutoGroupStrategy,
  CustomGroupConfig,
  TabGroup,
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
  customGroups: CustomGroupConfig[] = [],
  importantTabs: number[] = [],
  importantGroups: string[] = [],
  lastUsedInterval: number = 1,
  enableAutoDelete: boolean = false,
  autoDeleteThreshold: number = 24 * 60 * 60 * 1000
): GroupedTabs {
  const groups: GroupedTabs = {};

  // First, handle custom groups - always show them, even if empty
  const tabsInCustomGroups = new Set<number>();
  customGroups.forEach((customGroup) => {
    const groupTabs = tabs.filter((tab) =>
      customGroup.tabIds.includes(tab.id)
    );

    // Always create the group, even if empty
    const groupKey = customGroup.id;
    groups[groupKey] = {
      id: customGroup.id,
      domain: customGroup.name,
      tabs: groupTabs,
      type: 'custom',
      customName: customGroup.name,
      color: customGroup.color,
      isImportant: customGroup.isImportant,
      createdAt: customGroup.createdAt,
      lastModified: customGroup.lastModified,
      favicon: groupTabs[0]?.favIconUrl,
    };

    groupTabs.forEach((tab) => tabsInCustomGroups.add(tab.id));
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
  } else if (strategy === 'last-used') {
    groupByLastUsed(remainingTabs, groups, lastUsedInterval, importantTabs);
  }

  // Add auto-delete group if enabled
  if (enableAutoDelete) {
    const autoDeleteGroup = createAutoDeleteGroup(
      remainingTabs,
      autoDeleteThreshold,
      importantTabs,
      importantGroups,
      customGroups
    );
    if (autoDeleteGroup && autoDeleteGroup.tabs.length > 0) {
      groups[autoDeleteGroup.id] = autoDeleteGroup;
    }
  }

  // Sort groups: important first, then by tab count
  const sortedGroups: GroupedTabs = {};
  Object.keys(groups)
    .sort((a, b) => {
      const groupA = groups[a];
      const groupB = groups[b];

      // Important first
      if (groupA.isImportant && !groupB.isImportant) return -1;
      if (!groupA.isImportant && groupB.isImportant) return 1;

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

/**
 * Group tabs by last used time
 */
function groupByLastUsed(
  tabs: TabInfo[],
  groups: GroupedTabs,
  intervalHours: number,
  importantTabs: number[]
): void {
  const now = Date.now();

  // Create buckets based on the selected interval
  // For interval N, create buckets: <N, N-2N, 2N-3N, 3N-4N, >4N
  const buckets = [
    { name: `Last used < ${intervalHours}h`, max: intervalHours * 60 * 60 * 1000 },
    { name: `Last used ${intervalHours}-${intervalHours * 2}h`, max: intervalHours * 2 * 60 * 60 * 1000 },
    { name: `Last used ${intervalHours * 2}-${intervalHours * 3}h`, max: intervalHours * 3 * 60 * 60 * 1000 },
    { name: `Last used ${intervalHours * 3}-${intervalHours * 4}h`, max: intervalHours * 4 * 60 * 60 * 1000 },
    { name: `Last used > ${intervalHours * 4}h`, max: Infinity },
  ];

  tabs.forEach((tab) => {
    // Skip important tabs - they stay in their current groups
    if (importantTabs.includes(tab.id)) {
      return;
    }

    const lastVisited = tab.activity?.lastVisited;
    if (!lastVisited) {
      // No activity data - put in oldest bucket
      const bucketName = buckets[buckets.length - 1].name;
      const groupKey = `auto_${bucketName.replace(/\s+/g, '_')}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          id: groupKey,
          domain: bucketName,
          tabs: [],
          type: 'automatic',
          autoGroupStrategy: 'last-used',
          createdAt: Date.now(),
        };
      }
      groups[groupKey].tabs.push(tab);
      return;
    }

    const timeSince = now - lastVisited;
    const bucket = buckets.find((b) => timeSince <= b.max) || buckets[buckets.length - 1];
    const groupKey = `auto_${bucket.name.replace(/\s+/g, '_')}`;

    if (!groups[groupKey]) {
      groups[groupKey] = {
        id: groupKey,
        domain: bucket.name,
        tabs: [],
        type: 'automatic',
        autoGroupStrategy: 'last-used',
        createdAt: Date.now(),
      };
    }
    groups[groupKey].tabs.push(tab);
  });
}

/**
 * Create auto-delete group for stale tabs
 */
function createAutoDeleteGroup(
  tabs: TabInfo[],
  threshold: number,
  importantTabs: number[],
  _importantGroups: string[],
  customGroups: CustomGroupConfig[]
): TabGroup | null {
  const now = Date.now();
  const staleTabs = tabs.filter((tab) => {
    // Skip important tabs
    if (importantTabs.includes(tab.id)) {
      return false;
    }

    // Skip tabs in important groups
    const tabGroup = customGroups.find((g) => g.tabIds.includes(tab.id));
    if (tabGroup && tabGroup.isImportant) {
      return false;
    }

    // Check if tab is stale
    const lastVisited = tab.activity?.lastVisited;
    if (!lastVisited) {
      return true; // No activity = stale
    }
    return now - lastVisited > threshold;
  });

  if (staleTabs.length === 0) {
    return null;
  }

  return {
    id: 'auto_delete_group',
    domain: 'Tabs to Delete',
    tabs: staleTabs,
    type: 'automatic',
    autoGroupStrategy: 'last-used',
    createdAt: Date.now(),
  };
}
