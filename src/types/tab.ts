export interface TabActivity {
  tabId: number;
  url: string;
  lastVisited: number; // timestamp
  totalTimeSpent: number; // milliseconds spent in last 24 hours
  visitCount: number; // number of times activated in last 24 hours
}

export interface TabInfo {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  active?: boolean;
  windowId?: number;
  activity?: TabActivity; // Activity tracking data
}

export type GroupType = 'automatic' | 'custom';
export type AutoGroupStrategy = 'domain' | 'content-similarity' | 'time-of-day' | 'activity-pattern' | 'project-context';

export interface TabGroup {
  id: string; // Unique identifier for the group
  domain: string;
  tabs: TabInfo[];
  favicon?: string;

  // Custom grouping features
  type: GroupType; // 'automatic' or 'custom'
  customName?: string; // User-defined name for custom groups
  color?: string; // Custom color for the group
  isFavorite?: boolean; // Whether the group is favorited

  // Auto-grouping metadata
  autoGroupStrategy?: AutoGroupStrategy; // Strategy used for auto-grouping
  createdAt?: number; // Timestamp when group was created
  lastModified?: number; // Timestamp when group was last modified
}

export interface GroupedTabs {
  [domain: string]: TabGroup;
}

export interface DomainMapping {
  [key: string]: string;
}

export interface CustomGroupConfig {
  id: string;
  name: string;
  color: string;
  tabIds: number[]; // Tab IDs that belong to this group
  isFavorite?: boolean;
  createdAt: number;
  lastModified: number;
}

export interface GroupingSettings {
  enableAutoGrouping: boolean;
  autoGroupStrategies: AutoGroupStrategy[];
  defaultGroupType: GroupType;
  showNestedGroups: boolean;
  favoritesFirst: boolean;
}

export const DEFAULT_GROUPING_SETTINGS: GroupingSettings = {
  enableAutoGrouping: true,
  autoGroupStrategies: ['domain'],
  defaultGroupType: 'automatic',
  showNestedGroups: true,
  favoritesFirst: true,
};

export const GROUP_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#22C55E', // Green
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#D946EF', // Fuchsia
  '#EC4899', // Pink
];
