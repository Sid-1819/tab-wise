import { useState, useEffect, useCallback } from 'react';
import { TabInfo } from '@/types/tab';
import { ActivityData, TabActivity } from '@/lib/activity-utils';

interface UseActivityMonitorOptions {
  tabs: TabInfo[];
  refreshInterval?: number; // in milliseconds
}

interface TabInfoWithActivity extends TabInfo {
  activity?: TabActivity;
}

export function useActivityMonitor({
  tabs,
  refreshInterval = 10000, // 10 seconds
}: UseActivityMonitorOptions) {
  const [activityData, setActivityData] = useState<ActivityData>({});

  const updateActivity = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getActivity' });
      if (response?.activity) {
        setActivityData(response.activity);
      }
    } catch (error) {
      console.debug('Failed to get activity data:', error);
    }
  }, []);

  // Update tabs with activity data
  const tabsWithActivity: TabInfoWithActivity[] = tabs.map((tab) => ({
    ...tab,
    activity: activityData[tab.id],
  }));

  // Periodic activity updates
  useEffect(() => {
    updateActivity();

    const interval = setInterval(() => {
      updateActivity();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, updateActivity]);

  // Listen for tab updates to refresh activity
  useEffect(() => {
    const handleMessage = (message: { action: string }) => {
      if (message.action === 'tabsUpdated') {
        updateActivity();
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [updateActivity]);

  return {
    tabsWithActivity,
    updateActivity,
    activityData,
  };
}

export type { TabInfoWithActivity };
