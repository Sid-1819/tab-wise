import { useEffect, useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchBar } from '@/components/search-bar';
import { TabGroupCard } from '@/components/tab-group-card';
import { ThemeToggle } from '@/components/theme-toggle';
import { MemoryStats } from '@/components/memory-stats';
import { OptimizeButton } from '@/components/optimize-button';
import { SystemMemoryCard } from '@/components/system-memory-card';
import { Toaster } from '@/components/ui/toaster';
import { TabInfo, GroupedTabs } from '@/types/tab';
import { groupTabs, filterTabs } from '@/lib/tab-utils';
import { useMemoryMonitor } from '@/hooks/use-memory-monitor';

export function Popup() {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSystemMemory, setShowSystemMemory] = useState(true);

  useEffect(() => {
    loadTabs();
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
    return groupTabs(filteredTabs);
  }, [filteredTabs]);

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

  const totalGroups = Object.keys(groupedTabs).length;

  return (
    <div className="w-[600px] overflow-hidden p-4">
      <header className="flex items-center justify-between mb-5 pb-3 border-b">
        <div className="flex items-center gap-3">
          <img src="/icons/tw_new.png" alt="Tab Wise" className="h-8" />
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

        <ScrollArea className="h-[500px]">
          <div className="space-y-4 pr-4">
            {Object.entries(groupedTabs).map(([domain, group]) => (
              <TabGroupCard
                key={domain}
                group={group}
                onCloseTab={handleCloseTab}
                onCloseAll={handleCloseAll}
                onTabClick={handleTabClick}
                showMemory={true}
              />
            ))}
          </div>
        </ScrollArea>
      </main>

      <Toaster />
    </div>
  );
}
