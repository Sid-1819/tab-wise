export interface TabInfo {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  active?: boolean;
  windowId?: number;
  memory?: number; // Memory usage in bytes
}

export interface TabGroup {
  domain: string;
  tabs: TabInfo[];
  favicon?: string;
  totalMemory?: number; // Total memory for the group in bytes
}

export interface GroupedTabs {
  [domain: string]: TabGroup;
}

export interface DomainMapping {
  [key: string]: string;
}

export interface MemoryInfo {
  capacity: number; // Total system memory
  availableCapacity: number; // Available system memory
}

export interface ProcessMemory {
  tabId: number;
  memory: number; // Memory in bytes
}

export interface MemoryThreshold {
  warning: number; // Warning threshold in MB
  critical: number; // Critical threshold in MB
}

export const DEFAULT_MEMORY_THRESHOLD: MemoryThreshold = {
  warning: 100, // 100 MB per tab
  critical: 200, // 200 MB per tab
};
