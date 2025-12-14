import { useEffect, useState, useMemo, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchBar } from '@/components/search-bar';
import { TabGroupCard } from '@/components/tab-group-card';
import { ThemeToggle } from '@/components/theme-toggle';
import { ActivityStats } from '@/components/activity-stats';
import { Toaster } from '@/components/ui/toaster';
import { GroupToolbar } from '@/components/group-toolbar';
import { GroupDialog } from '@/components/group-dialog';
import { useTheme } from '@/components/theme-provider';
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
  toggleGroupFavorite,
  addCustomGroup,
  updateCustomGroup,
  deleteCustomGroup,
  addTabToGroup,
  removeTabFromGroup,
  cleanupDeadTabs,
} from '@/lib/group-storage';
import { useToast } from '@/components/ui/use-toast';

export function SidePanel() {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showActivity, setShowActivity] = useState(true);
  const [customGroups, setCustomGroups] = useState<CustomGroupConfig[]>([]);
  const [autoGroupStrategy, setAutoGroupStrategy] =
    useState<AutoGroupStrategy>('domain');
  const [enableAutoGrouping, setEnableAutoGrouping] = useState(true);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CustomGroupConfig | undefined>();
  const [tabsForNewGroup, setTabsForNewGroup] = useState<TabInfo[]>([]);
  const { toast } = useToast();
  const { theme } = useTheme();

  const loadTabs = useCallback(() => {
    chrome.tabs.query({}, (chromeTabs) => {
      const tabsInfo: TabInfo[] = chromeTabs.map((tab) => ({
        id: tab.id!,
        title: tab.title || '',
        url: tab.url || '',
        favIconUrl: tab.favIconUrl,
        active: tab.active,
        windowId: tab.windowId,
      }));
      setTabs(tabsInfo);
    });
  }, []);

  const loadCustomGroups = async () => {
    const groups = await getCustomGroups();
    setCustomGroups(groups);
  };

  useEffect(() => {
    loadTabs();
    loadCustomGroups();

    // Listen for real-time tab updates from background script
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
    return groupTabs(filteredTabs, strategy, customGroups);
  }, [filteredTabs, autoGroupStrategy, enableAutoGrouping, customGroups]);

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

  const handleToggleFavorite = async (groupId: string) => {
    const group = customGroups.find((g) => g.id === groupId);
    const wasFavorite = group?.isFavorite;
    await toggleGroupFavorite(groupId);
    await loadCustomGroups();
    if (group) {
      toast({
        title: wasFavorite ? 'Removed from Favorites' : 'Added to Favorites',
        description: `"${group.name}" ${wasFavorite ? 'removed from' : 'added to'} favorites.`,
      });
    }
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

  // Get all groups as a flat list
  const allGroups = useMemo(() => {
    return Object.values(groupedTabs);
  }, [groupedTabs]);

  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden p-3 bg-background">
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

          {showActivity && (
            <ActivityStats tabs={tabsWithActivity} totalGroups={totalGroups} />
          )}

          <GroupToolbar
            onCreateGroup={handleCreateGroup}
            autoGroupStrategy={autoGroupStrategy}
            onStrategyChange={setAutoGroupStrategy}
            enableAutoGrouping={enableAutoGrouping}
            onToggleAutoGrouping={setEnableAutoGrouping}
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
                onToggleFavorite={handleToggleFavorite}
                onEditGroup={handleEditGroup}
                onDeleteGroup={handleDeleteGroup}
                onConvertToCustom={handleConvertToCustom}
                onAddTabToGroup={handleAddTabToGroup}
                onRemoveTabFromGroup={handleRemoveTabFromGroup}
                customGroups={customGroups}
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
