import { TabInfo, MemoryInfo } from '@/types/tab';

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return 'N/A';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Convert bytes to megabytes
 */
export function bytesToMB(bytes: number): number {
  return bytes / (1024 * 1024);
}

/**
 * Get memory usage for all tabs
 * Note: The processes API is only available in Chrome Dev/Canary channels
 * On stable Chrome, this will return an empty map and features will be hidden
 */
export async function getTabsMemory(): Promise<Map<number, number>> {
  const memoryMap = new Map<number, number>();

  try {
    // Check if processes API is available (only in Dev/Canary Chrome)
    const chromeWithProcesses = chrome as any;

    // The processes API is not available on stable Chrome
    if (!chromeWithProcesses.processes || !chromeWithProcesses.processes.getProcessInfo) {
      // Silently return empty map - this is expected on stable Chrome
      // Memory features will gracefully hide themselves
      return memoryMap;
    }

    // Get all processes with memory info
    const processes = await new Promise<any>((resolve) => {
      chromeWithProcesses.processes.getProcessInfo([], true, (info: any) => {
        resolve(info);
      });
    });

    // Map tab IDs to their memory usage
    Object.values(processes).forEach((process: any) => {
      if (process.type === 'tab' && process.tabs && process.tabs.length > 0) {
        const memory = process.privateMemory || 0;
        process.tabs.forEach((tabId: number) => {
          memoryMap.set(tabId, memory);
        });
      }
    });
  } catch (error) {
    // Silently handle error - memory features are optional
    console.debug('Memory tracking not available:', error);
  }

  return memoryMap;
}

/**
 * Get system memory info
 */
export async function getSystemMemory(): Promise<MemoryInfo | null> {
  try {
    if (!chrome.system || !chrome.system.memory) {
      return null;
    }

    return new Promise((resolve) => {
      chrome.system.memory.getInfo((info) => {
        resolve(info);
      });
    });
  } catch (error) {
    console.error('Error getting system memory:', error);
    return null;
  }
}

/**
 * Calculate total memory for tabs
 */
export function calculateTotalMemory(tabs: TabInfo[]): number {
  return tabs.reduce((total, tab) => total + (tab.memory || 0), 0);
}

/**
 * Sort tabs by memory usage (descending)
 */
export function sortTabsByMemory(tabs: TabInfo[]): TabInfo[] {
  return [...tabs].sort((a, b) => (b.memory || 0) - (a.memory || 0));
}

/**
 * Get high memory tabs above threshold
 */
export function getHighMemoryTabs(
  tabs: TabInfo[],
  thresholdMB: number
): TabInfo[] {
  const thresholdBytes = thresholdMB * 1024 * 1024;
  return tabs.filter((tab) => (tab.memory || 0) > thresholdBytes);
}

/**
 * Get memory color based on usage
 */
export function getMemoryColor(memoryMB: number): string {
  if (memoryMB < 50) return 'text-muted-foreground';
  if (memoryMB < 100) return 'text-primary';
  if (memoryMB < 200) return 'text-orange-500';
  return 'text-destructive';
}

/**
 * Get memory status
 */
export function getMemoryStatus(memoryMB: number): 'low' | 'medium' | 'high' | 'critical' {
  if (memoryMB < 50) return 'low';
  if (memoryMB < 100) return 'medium';
  if (memoryMB < 200) return 'high';
  return 'critical';
}

/**
 * Calculate memory percentage of system total
 */
export function calculateMemoryPercentage(
  usedMemory: number,
  totalMemory: number
): number {
  if (totalMemory === 0) return 0;
  return (usedMemory / totalMemory) * 100;
}
