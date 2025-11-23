import { useEffect, useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchBar } from '@/components/search-bar';
import { TabGroupCard } from '@/components/tab-group-card';
import { ThemeToggle } from '@/components/theme-toggle';
import { MemoryStats } from '@/components/memory-stats';
import { OptimizeButton } from '@/components/optimize-button';
import { SystemMemoryCard } from '@/components/system-memory-card';
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
import { useMemoryMonitor } from '@/hooks/use-memory-monitor';
import {
  getCustomGroups,
  toggleGroupFavorite,
  addCustomGroup,
  updateCustomGroup,
} from '@/lib/group-storage';
import { useToast } from '@/components/ui/use-toast';

export function Popup() {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSystemMemory, setShowSystemMemory] = useState(true);
  const [customGroups, setCustomGroups] = useState<CustomGroupConfig[]>([]);
  const [autoGroupStrategy, setAutoGroupStrategy] =
    useState<AutoGroupStrategy>('domain');
  const [enableAutoGrouping, setEnableAutoGrouping] = useState(true);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CustomGroupConfig | undefined>();
  const [tabsForNewGroup, setTabsForNewGroup] = useState<TabInfo[]>([]);
  const { toast } = useToast();
  const { theme } = useTheme();

  useEffect(() => {
    loadTabs();
    loadCustomGroups();
  }, []);

  const loadTabs = () => {
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
  };

  const loadCustomGroups = async () => {
    const groups = await getCustomGroups();
    setCustomGroups(groups);
  };

  // Use memory monitoring hook
  const { tabsWithMemory, updateMemory } = useMemoryMonitor({
    tabs,
    autoAlert: true,
    refreshInterval: 30000, // 30 seconds
  });

  const filteredTabs = useMemo(() => {
    if (!searchQuery) return tabsWithMemory;
    return filterTabs(tabsWithMemory, searchQuery);
  }, [tabsWithMemory, searchQuery]);

  const groupedTabs: GroupedTabs = useMemo(() => {
    const strategy = enableAutoGrouping ? autoGroupStrategy : 'domain';
    return groupTabs(filteredTabs, strategy, customGroups);
  }, [filteredTabs, autoGroupStrategy, enableAutoGrouping, customGroups]);

  const handleCloseTab = (tabId: number) => {
    chrome.tabs.remove(tabId, () => {
      setTabs((prevTabs) => prevTabs.filter((tab) => tab.id !== tabId));
      updateMemory();
    });
  };

  const handleCloseAll = (tabIds: number[]) => {
    chrome.tabs.remove(tabIds, () => {
      setTabs((prevTabs) => prevTabs.filter((tab) => !tabIds.includes(tab.id)));
      updateMemory();
    });
  };

  const handleOptimize = (tabIds: number[]) => {
    handleCloseAll(tabIds);
  };

  const handleTabClick = (tabId: number) => {
    chrome.tabs.update(tabId, { active: true });
    window.close();
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

  const handleSaveGroup = async (group: CustomGroupConfig) => {
    if (editingGroup) {
      await updateCustomGroup(group.id, group);
      toast({
        title: 'Group Updated',
        description: `"${group.name}" has been updated successfully.`,
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
  };

  const handleToggleFavorite = async (groupId: string) => {
    await toggleGroupFavorite(groupId);
    await loadCustomGroups();
    const group = customGroups.find((g) => g.id === groupId);
    if (group) {
      toast({
        title: group.isFavorite ? 'Removed from Favorites' : 'Added to Favorites',
        description: `"${group.name}" ${
          group.isFavorite ? 'removed from' : 'added to'
        } favorites.`,
      });
    }
  };

  const handleConvertToCustom = (group: TabGroup) => {
    const customGroup: CustomGroupConfig = {
      id: group.id.replace('auto_', 'custom_'),
      name: group.domain,
      color: GROUP_COLORS[0],
      tabIds: group.tabs.map((tab) => tab.id),
      createdAt: Date.now(),
      lastModified: Date.now(),
    };
    setEditingGroup(customGroup);
    setTabsForNewGroup(group.tabs);
    setShowGroupDialog(true);
  };

  const totalGroups = Object.keys(groupedTabs).length;

  // Organize groups with nesting
  const organizedGroups = useMemo(() => {
    const topLevelGroups: TabGroup[] = [];
    const childGroups = new Map<string, TabGroup[]>();

    Object.values(groupedTabs).forEach((group) => {
      if (group.parentGroupId) {
        if (!childGroups.has(group.parentGroupId)) {
          childGroups.set(group.parentGroupId, []);
        }
        childGroups.get(group.parentGroupId)!.push(group);
      } else {
        topLevelGroups.push(group);
      }
    });

    return { topLevelGroups, childGroups };
  }, [groupedTabs]);

  return (
    <div className="w-[600px] overflow-hidden p-4">
      <header className="flex items-center justify-between mb-5 pb-3 border-b">
        <div className="flex items-center gap-3">
          <img
            src={
              theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
                ? '/icons/tw_dark.png'
                : '/icons/tw_light.png'
            }
            alt="Tab Wise Logo"
            className="h-8 w-8"
          />
          <span className="text-xl font-bold">Tab Wise</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSystemMemory(!showSystemMemory)}
            className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors"
            title={showSystemMemory ? "Hide system memory" : "Show system memory"}
          >
            {showSystemMemory ? "Hide Memory" : "Show Memory"}
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          totalTabs={filteredTabs.length}
          totalGroups={totalGroups}
        />

        <SystemMemoryCard visible={showSystemMemory} />

        <MemoryStats tabs={tabsWithMemory} totalGroups={totalGroups} />

        <div className="mb-4">
          <OptimizeButton
            tabs={tabsWithMemory}
            onOptimize={handleOptimize}
            thresholdMB={100}
          />
        </div>

        <GroupToolbar
          onCreateGroup={handleCreateGroup}
          autoGroupStrategy={autoGroupStrategy}
          onStrategyChange={setAutoGroupStrategy}
          enableAutoGrouping={enableAutoGrouping}
          onToggleAutoGrouping={setEnableAutoGrouping}
        />

        <ScrollArea className="h-[500px]">
          <div className="space-y-4 pr-4">
            {organizedGroups.topLevelGroups.map((group) => (
              <div key={group.id}>
                <TabGroupCard
                  group={group}
                  onCloseTab={handleCloseTab}
                  onCloseAll={handleCloseAll}
                  onTabClick={handleTabClick}
                  showMemory={true}
                  onToggleFavorite={handleToggleFavorite}
                  onEditGroup={handleEditGroup}
                  onConvertToCustom={handleConvertToCustom}
                />
                {organizedGroups.childGroups.has(group.id) &&
                  organizedGroups.childGroups.get(group.id)!.map((childGroup) => (
                    <div key={childGroup.id} className="mt-2">
                      <TabGroupCard
                        group={childGroup}
                        onCloseTab={handleCloseTab}
                        onCloseAll={handleCloseAll}
                        onTabClick={handleTabClick}
                        showMemory={true}
                        onToggleFavorite={handleToggleFavorite}
                        onEditGroup={handleEditGroup}
                        onConvertToCustom={handleConvertToCustom}
                        isNested={true}
                        nestLevel={1}
                      />
                    </div>
                  ))}
              </div>
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
