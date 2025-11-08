import { useEffect, useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchBar } from '@/components/search-bar';
import { TabGroupCard } from '@/components/tab-group-card';
import { ThemeToggle } from '@/components/theme-toggle';
import { TabInfo, GroupedTabs } from '@/types/tab';
import { groupTabs, filterTabs } from '@/lib/tab-utils';

export function Popup() {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredTabs = useMemo(() => {
    if (!searchQuery) return tabs;
    return filterTabs(tabs, searchQuery);
  }, [tabs, searchQuery]);

  const groupedTabs: GroupedTabs = useMemo(() => {
    return groupTabs(filteredTabs);
  }, [filteredTabs]);

  const handleCloseTab = (tabId: number) => {
    chrome.tabs.remove(tabId, () => {
      setTabs((prevTabs) => prevTabs.filter((tab) => tab.id !== tabId));
    });
  };

  const handleCloseAll = (tabIds: number[]) => {
    chrome.tabs.remove(tabIds, () => {
      setTabs((prevTabs) => prevTabs.filter((tab) => !tabIds.includes(tab.id)));
    });
  };

  const handleTabClick = (tabId: number) => {
    chrome.tabs.update(tabId, { active: true });
    window.close();
  };

  const totalGroups = Object.keys(groupedTabs).length;

  return (
    <div className="w-[600px] overflow-hidden p-4">
      <header className="flex items-center justify-between mb-5 pb-3 border-b">
       <img src="/icons/tw_new.png" alt="Tab Wise" className="h-8" />
        <ThemeToggle />
      </header>

      <main>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          totalTabs={filteredTabs.length}
          totalGroups={totalGroups}
        />

        <ScrollArea className="h-[500px]">
          <div className="space-y-4 pr-4">
            {Object.entries(groupedTabs).map(([domain, group]) => (
              <TabGroupCard
                key={domain}
                group={group}
                onCloseTab={handleCloseTab}
                onCloseAll={handleCloseAll}
                onTabClick={handleTabClick}
              />
            ))}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
