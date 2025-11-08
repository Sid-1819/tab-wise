import { useState, useEffect, useCallback } from 'react';
import { TabInfo, MemoryThreshold, DEFAULT_MEMORY_THRESHOLD } from '@/types/tab';
import { getTabsMemory, getHighMemoryTabs } from '@/lib/memory-utils';
import { useToast } from '@/components/ui/use-toast';

interface UseMemoryMonitorOptions {
  tabs: TabInfo[];
  threshold?: MemoryThreshold;
  autoAlert?: boolean;
  refreshInterval?: number; // in milliseconds
}

export function useMemoryMonitor({
  tabs,
  threshold = DEFAULT_MEMORY_THRESHOLD,
  autoAlert = true,
  refreshInterval = 30000, // 30 seconds
}: UseMemoryMonitorOptions) {
  const [memoryData, setMemoryData] = useState<Map<number, number>>(new Map());
  const [lastAlertTime, setLastAlertTime] = useState<number>(0);
  const { toast } = useToast();

  const updateMemory = useCallback(async () => {
    try {
      const memoryMap = await getTabsMemory();
      setMemoryData(memoryMap);
      return memoryMap;
    } catch (error) {
      console.error('Failed to update memory:', error);
      return new Map();
    }
  }, []);

  // Update tabs with memory data
  const tabsWithMemory: TabInfo[] = tabs.map((tab) => ({
    ...tab,
    memory: memoryData.get(tab.id) || 0,
  }));

  // Check for high memory tabs and alert
  useEffect(() => {
    if (!autoAlert || tabsWithMemory.length === 0) return;

    const highMemoryTabs = getHighMemoryTabs(
      tabsWithMemory,
      threshold.critical
    );

    // Only alert once every 5 minutes to avoid spam
    const now = Date.now();
    if (highMemoryTabs.length > 0 && now - lastAlertTime > 300000) {
      toast({
        title: 'High Memory Usage Detected',
        description: `${highMemoryTabs.length} tab${
          highMemoryTabs.length > 1 ? 's are' : ' is'
        } using excessive memory. Consider closing them.`,
        variant: 'destructive',
      });
      setLastAlertTime(now);
    }
  }, [tabsWithMemory, threshold, autoAlert, lastAlertTime, toast]);

  // Periodic memory updates
  useEffect(() => {
    updateMemory();

    const interval = setInterval(() => {
      updateMemory();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, updateMemory]);

  return {
    tabsWithMemory,
    updateMemory,
    memoryData,
  };
}
