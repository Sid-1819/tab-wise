import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchBar } from '@/components/search-bar';
import { TabGroupCard } from '@/components/tab-group-card';
import { ThemeToggle } from '@/components/theme-toggle';
import { ActivityStats } from '@/components/activity-stats';
import { Toaster } from '@/components/ui/toaster';
import { GroupToolbar } from '@/components/group-toolbar';
import { GroupDialog } from '@/components/group-dialog';
import { useTheme } from '@/components/theme-provider';
import { RecentlyClosed } from '@/components/recently-closed';
import { SavedSessions } from '@/components/saved-sessions';
import { DuplicateBanner } from '@/components/duplicate-banner';
import { SystemMemoryBar } from '@/components/system-memory-bar';
import {
  findDuplicateClusters,
  pickKeeperTabId,
} from '@/lib/url-normalize';
import {
  TabInfo,
  GroupedTabs,
  CustomGroupConfig,
  AutoGroupStrategy,
  TabGroup,
  GROUP_COLORS,
} from '@/types/tab';
import { groupTabs, filterTabs } from '@/lib/tab-utils';
import { useActivityMonitor } from '@/hooks/use-activity-monitor';
import {
  getCustomGroups,
  addCustomGroup,
  updateCustomGroup,
  deleteCustomGroup,
  addTabToGroup,
  removeTabFromGroup,
  cleanupDeadTabs,
  toggleTabImportant,
  toggleGroupImportant,
  getImportantTabs,
  getImportantGroups,
  getGroupingSettings,
  saveGroupingSettings,
} from '@/lib/group-storage';
import { useToast } from '@/components/ui/use-toast';

export function SidePanel() {
  const prevDuplicateSigRef = useRef<string>('');
  const [duplicateDismissSig, setDuplicateDismissSig] = useState<string | null>(null);

  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showActivity, setShowActivity] = useState(true);
  const [customGroups, setCustomGroups] = useState<CustomGroupConfig[]>([]);
  const [autoGroupStrategy, setAutoGroupStrategy] =
    useState<AutoGroupStrategy>('domain');
  const [enableAutoGrouping, setEnableAutoGrouping] = useState(true);
  const [lastUsedInterval, setLastUsedInterval] = useState(1);
  const [enableAutoDelete, setEnableAutoDelete] = useState(false);
  const [autoDeleteThreshold, setAutoDeleteThreshold] = useState(24 * 60 * 60 * 1000);
  const [importantTabs, setImportantTabs] = useState<number[]>([]);
  const [importantGroups, setImportantGroups] = useState<string[]>([]);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CustomGroupConfig | undefined>();
  const [tabsForNewGroup, setTabsForNewGroup] = useState<TabInfo[]>([]);
  const { toast } = useToast();
  const { theme } = useTheme();

  const loadTabs = useCallback(async () => {
    chrome.tabs.query({}, async (chromeTabs) => {
      const important = await getImportantTabs();
      const tabsInfo: TabInfo[] = chromeTabs.map((tab) => ({
        id: tab.id!,
        title: tab.title || '',
        url: tab.url || '',
        favIconUrl: tab.favIconUrl,
        active: tab.active,
        windowId: tab.windowId,
        index: tab.index,
        pinned: tab.pinned,
        isImportant: important.includes(tab.id!),
      }));
      setTabs(tabsInfo);
    });
  }, []);

  const loadCustomGroups = async () => {
    const groups = await getCustomGroups();
    setCustomGroups(groups);
    const important = await getImportantGroups();
    setImportantGroups(important);
  };

  const loadGroupingSettings = async () => {
    const settings = await getGroupingSettings();
    setAutoGroupStrategy(settings.autoGroupStrategies[0] || 'domain');
    setEnableAutoGrouping(settings.enableAutoGrouping);
    setLastUsedInterval(settings.lastUsedInterval || 1);
    setEnableAutoDelete(settings.enableAutoDeleteGrouping || false);
    setAutoDeleteThreshold(settings.autoDeleteThreshold || 24 * 60 * 60 * 1000);
  };

  const loadImportantTabs = async () => {
    const tabs = await getImportantTabs();
    setImportantTabs(tabs);
  };

  useEffect(() => {
    loadTabs();
    loadCustomGroups();
    loadGroupingSettings();
    loadImportantTabs();

    const handleMessage = (message: { action: string; payload?: unknown }) => {
      if (message.action === 'tabsUpdated') {
        loadTabs();
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [loadTabs]);

  // Clean up dead tabs from groups when tabs change
  useEffect(() => {
    if (tabs.length > 0) {
      const activeTabIds = tabs.map((t) => t.id);
      cleanupDeadTabs(activeTabIds).then(() => {
        loadCustomGroups();
      });
      // Reload important tabs to sync with current tabs
      loadImportantTabs();
    }
  }, [tabs]);

  // Use activity monitoring hook
  const { tabsWithActivity, updateActivity } = useActivityMonitor({
    tabs,
    refreshInterval: 10000, // 10 seconds
  });

  const filteredTabs = useMemo(() => {
    if (!searchQuery) return tabsWithActivity;
    return filterTabs(tabsWithActivity, searchQuery);
  }, [tabsWithActivity, searchQuery]);

  const groupedTabs: GroupedTabs = useMemo(() => {
    const strategy = enableAutoGrouping ? autoGroupStrategy : 'domain';
    return groupTabs(
      filteredTabs,
      strategy,
      customGroups,
      importantTabs,
      importantGroups,
      lastUsedInterval,
      enableAutoDelete,
      autoDeleteThreshold
    );
  }, [
    filteredTabs,
    autoGroupStrategy,
    enableAutoGrouping,
    customGroups,
    importantTabs,
    importantGroups,
    lastUsedInterval,
    enableAutoDelete,
    autoDeleteThreshold,
  ]);

  const handleCloseTab = (tabId: number) => {
    chrome.tabs.remove(tabId, () => {
      setTabs((prevTabs) => prevTabs.filter((tab) => tab.id !== tabId));
      updateActivity();
    });
  };

  const handleCloseAll = (tabIds: number[]) => {
    chrome.tabs.remove(tabIds, () => {
      setTabs((prevTabs) => prevTabs.filter((tab) => !tabIds.includes(tab.id)));
      updateActivity();
    });
  };

  const handleTabClick = (tabId: number) => {
    chrome.tabs.update(tabId, { active: true });
    chrome.tabs.get(tabId, (tab) => {
      if (tab.windowId) {
        chrome.windows.update(tab.windowId, { focused: true });
      }
    });
  };

  const handleTogglePin = (tabId: number) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || tab.id == null) return;
      chrome.tabs.update(tabId, { pinned: !tab.pinned }, () => {
        if (chrome.runtime.lastError) {
          toast({
            title: 'Could not pin tab',
            description: chrome.runtime.lastError.message,
            variant: 'destructive',
          });
          return;
        }
        loadTabs();
      });
    });
  };

  const handleDuplicateTab = (tabId: number) => {
    chrome.tabs.duplicate(tabId, () => {
      if (chrome.runtime.lastError) {
        toast({
          title: 'Error',
          description: 'Failed to duplicate tab. ' + chrome.runtime.lastError.message,
          variant: 'destructive',
        });
      } else {
        loadTabs(); // Refresh tabs list
        toast({
          title: 'Tab Duplicated',
          description: 'Tab has been duplicated successfully.',
        });
      }
    });
  };

  const handleCreateGroup = () => {
    setEditingGroup(undefined);
    setTabsForNewGroup([]);
    setShowGroupDialog(true);
  };

  const handleEditGroup = (groupId: string) => {
    const group = customGroups.find((g) => g.id === groupId);
    if (group) {
      setEditingGroup(group);
      setTabsForNewGroup([]);
      setShowGroupDialog(true);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    const group = customGroups.find((g) => g.id === groupId);
    if (group) {
      await deleteCustomGroup(groupId);
      await loadCustomGroups();
      toast({
        title: 'Group Deleted',
        description: `"${group.name}" has been deleted. Tabs are now ungrouped.`,
      });
    }
  };

  const handleSaveGroup = async (group: CustomGroupConfig) => {
    // Check if group already exists (editing) vs new group (creating/converting)
    const existingGroup = customGroups.find((g) => g.id === group.id);

    if (existingGroup) {
      await updateCustomGroup(group.id, group);
      toast({
        title: 'Group Updated',
        description: `"${group.name}" has been updated.`,
      });
    } else {
      await addCustomGroup(group);
      toast({
        title: 'Group Created',
        description: `"${group.name}" has been created with ${group.tabIds.length} tab(s).`,
      });
    }
    await loadCustomGroups();
    setTabsForNewGroup([]);
    setEditingGroup(undefined);
  };

  const handleToggleTabImportant = async (tabId: number) => {
    const before = await getImportantTabs();
    const wasImportant = before.includes(tabId);
    await toggleTabImportant(tabId);
    await loadImportantTabs();
    await loadTabs();
    toast({
      title: wasImportant ? 'Removed Important Mark' : 'Marked as Important',
      description: wasImportant
        ? 'Tab removed from important.'
        : 'Tab marked as important.',
    });
  };

  const handleToggleGroupImportant = async (groupId: string) => {
    const group = customGroups.find((g) => g.id === groupId);
    const wasImportant = group?.isImportant;
    await toggleGroupImportant(groupId);
    await loadCustomGroups();
    if (group) {
      toast({
        title: wasImportant ? 'Removed Important Mark' : 'Marked as Important',
        description: `"${group.name}" ${wasImportant ? 'removed from' : 'marked as'} important.`,
      });
    }
  };

  const handleLastUsedIntervalChange = async (interval: number) => {
    setLastUsedInterval(interval);
    const settings = await getGroupingSettings();
    await saveGroupingSettings({ ...settings, lastUsedInterval: interval });
  };

  const handleAutoDeleteToggle = async (enabled: boolean) => {
    setEnableAutoDelete(enabled);
    const settings = await getGroupingSettings();
    await saveGroupingSettings({ ...settings, enableAutoDeleteGrouping: enabled });
  };

  const handleAutoDeleteThresholdChange = async (threshold: number) => {
    setAutoDeleteThreshold(threshold);
    const settings = await getGroupingSettings();
    await saveGroupingSettings({ ...settings, autoDeleteThreshold: threshold });
  };

  const handleAddTabToGroup = async (tabId: number, groupId: string) => {
    await addTabToGroup(groupId, tabId);
    await loadCustomGroups();
    const group = customGroups.find((g) => g.id === groupId);
    toast({
      title: 'Tab Added',
      description: `Tab added to "${group?.name || 'group'}".`,
    });
  };

  const handleRemoveTabFromGroup = async (tabId: number, groupId: string) => {
    await removeTabFromGroup(groupId, tabId);
    await loadCustomGroups();
    const group = customGroups.find((g) => g.id === groupId);
    toast({
      title: 'Tab Removed',
      description: `Tab removed from "${group?.name || 'group'}".`,
    });
  };

  const handleConvertToCustom = (group: TabGroup) => {
    const customGroup: CustomGroupConfig = {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: group.domain,
      color: GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)],
      tabIds: group.tabs.map((tab) => tab.id),
      createdAt: Date.now(),
      lastModified: Date.now(),
    };
    setEditingGroup(customGroup);
    setTabsForNewGroup(group.tabs);
    setShowGroupDialog(true);
  };

  const totalGroups = Object.keys(groupedTabs).length;

  const allGroups = useMemo(() => {
    return Object.values(groupedTabs);
  }, [groupedTabs]);

  const duplicateClusters = useMemo(
    () => findDuplicateClusters(tabs),
    [tabs]
  );

  const duplicateSignature = useMemo(
    () =>
      duplicateClusters
        .map((c) => [...c.tabIds].sort((a, b) => a - b).join('-'))
        .sort()
        .join('|'),
    [duplicateClusters]
  );

  useEffect(() => {
    if (
      prevDuplicateSigRef.current !== '' &&
      prevDuplicateSigRef.current !== duplicateSignature
    ) {
      setDuplicateDismissSig(null);
    }
    prevDuplicateSigRef.current = duplicateSignature;
  }, [duplicateSignature]);

  const extraDuplicateTabCount = useMemo(
    () =>
      duplicateClusters.reduce((acc, c) => acc + Math.max(0, c.tabIds.length - 1), 0),
    [duplicateClusters]
  );

  const showDuplicateBanner =
    duplicateClusters.length > 0 && duplicateDismissSig !== duplicateSignature;

  const handleCloseDuplicates = useCallback(() => {
    const toClose: number[] = [];
    for (const cluster of duplicateClusters) {
      const keeper = pickKeeperTabId(cluster.tabIds, tabs);
      for (const id of cluster.tabIds) {
        if (id === keeper) continue;
        const tab = tabs.find((t) => t.id === id);
        if (tab?.pinned) continue;
        toClose.push(id);
      }
    }
    if (toClose.length === 0) {
      toast({
        title: 'Nothing to close',
        description: 'Duplicates are pinned or already unique.',
      });
      return;
    }
    chrome.tabs.remove(toClose, () => {
      if (chrome.runtime.lastError) {
        toast({
          title: 'Error',
          description: chrome.runtime.lastError.message,
          variant: 'destructive',
        });
        return;
      }
      loadTabs();
      updateActivity();
      toast({
        title: 'Duplicates closed',
        description: `Closed ${toClose.length} extra tab(s).`,
      });
    });
  }, [duplicateClusters, tabs, toast, loadTabs, updateActivity]);

  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className="w-full min-w-[500px] h-screen flex flex-col overflow-hidden p-3 bg-background box-border">
      <header className="flex items-center justify-between mb-3 pb-2 border-b shrink-0">
        <div className="flex items-center gap-2">
          <img
            src={isDarkMode ? '/icons/tw_dark_icon.png' : '/icons/tw_light_icon.png'}
            alt="Tab Wise Logo"
            className="h-6 w-6"
          />
          <span className="text-lg font-bold">Tab Wise</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowActivity(!showActivity)}
            className="text-xs px-1.5 py-0.5 rounded-md bg-muted hover:bg-muted/80 transition-colors"
            title={showActivity ? "Hide activity" : "Show activity"}
          >
            {showActivity ? "Hide" : "Activity"}
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="shrink-0">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            totalTabs={filteredTabs.length}
            totalGroups={totalGroups}
          />

          <div className="flex items-center gap-1 mb-2 flex-wrap">
            <SavedSessions onRestored={loadTabs} />
            <RecentlyClosed onRestored={loadTabs} />
          </div>

          {showDuplicateBanner && (
            <DuplicateBanner
              clusters={duplicateClusters}
              extraTabCount={extraDuplicateTabCount}
              onCloseDuplicates={handleCloseDuplicates}
              onDismiss={() => setDuplicateDismissSig(duplicateSignature)}
            />
          )}

          <SystemMemoryBar />

          {showActivity && (
            <ActivityStats tabs={tabsWithActivity} totalGroups={totalGroups} />
          )}

          <GroupToolbar
            onCreateGroup={handleCreateGroup}
            autoGroupStrategy={autoGroupStrategy}
            onStrategyChange={setAutoGroupStrategy}
            enableAutoGrouping={enableAutoGrouping}
            onToggleAutoGrouping={setEnableAutoGrouping}
            lastUsedInterval={lastUsedInterval}
            onLastUsedIntervalChange={handleLastUsedIntervalChange}
            enableAutoDelete={enableAutoDelete}
            onToggleAutoDelete={handleAutoDeleteToggle}
            autoDeleteThreshold={autoDeleteThreshold}
            onAutoDeleteThresholdChange={handleAutoDeleteThresholdChange}
          />
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-3 pr-2">
            {allGroups.map((group) => (
              <TabGroupCard
                key={group.id}
                group={group}
                onCloseTab={handleCloseTab}
                onCloseAll={handleCloseAll}
                onTabClick={handleTabClick}
                onDuplicateTab={handleDuplicateTab}
                showActivity={showActivity}
                onToggleImportant={handleToggleGroupImportant}
                onToggleTabImportant={handleToggleTabImportant}
                onEditGroup={handleEditGroup}
                onDeleteGroup={handleDeleteGroup}
                onConvertToCustom={handleConvertToCustom}
                onAddTabToGroup={handleAddTabToGroup}
                onRemoveTabFromGroup={handleRemoveTabFromGroup}
                customGroups={customGroups}
                onTogglePin={handleTogglePin}
              />
            ))}
          </div>
        </ScrollArea>
      </main>

      <GroupDialog
        open={showGroupDialog}
        onOpenChange={setShowGroupDialog}
        onSave={handleSaveGroup}
        editingGroup={editingGroup}
        selectedTabs={tabsForNewGroup}
        allGroups={customGroups}
      />

      <Toaster />
    </div>
  );
}
