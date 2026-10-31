import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useTheme } from 'next-themes';
import { MessageSquare, Plus, BarChart2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchBar } from '@/components/search-bar';
import { TabGroupCard } from '@/components/tab-group-card';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { ActivityStats } from '@/components/activity-stats';
import { Toaster } from '@/components/ui/toaster';
import { GroupToolbar } from '@/components/group-toolbar';
import { GroupDialog } from '@/components/group-dialog';
import { Button } from '@/components/ui/button';
import { RecentlyClosed } from '@/components/recently-closed';
import { SavedSessions } from '@/components/saved-sessions';
import { DuplicateBanner } from '@/components/duplicate-banner';
import { StaleTabsBanner } from '@/components/stale-tabs-banner';
import { WindowSection } from '@/components/window-section';
import { SystemMemoryBar } from '@/components/system-memory-bar';
import { useIsClient } from '@/hooks/use-is-client';
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
import { DEFAULT_STALE_THRESHOLD_MS, getDiscardCandidates, getStaleTabs } from '@/lib/activity-format';
import { moveTabToNewWindow, moveTabToWindow } from '@/lib/window-utils';
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
  getStaleThresholdMs,
  saveStaleThresholdMs,
  getWindowScope,
  saveWindowScope,
  type WindowScope,
} from '@/lib/group-storage';
import { getTabFaviconUrl } from '@/lib/favicon';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

const FEEDBACK_URL = 'https://form.encatch.com/s/a29991a5-0c38-48c0-8fd8-61462f58821c';

function SidePanelWordmark({ tabCount, groupCount }: { tabCount: number; groupCount: number }) {
  const { resolvedTheme } = useTheme();
  const mounted = useIsClient();

  const logoSrc =
    mounted && resolvedTheme === 'dark'
      ? '/icons/tw_dark_icon.png'
      : '/icons/tw_light_icon.png';

  return (
    <div className="flex min-w-0 items-center gap-2">
      <img
        src={logoSrc}
        alt="Tab Wise"
        className="h-5 w-auto shrink-0 object-contain"
      />
      <span className="text-[11px] text-muted-foreground truncate tabular-nums">
        {tabCount} tabs · {groupCount} groups
      </span>
    </div>
  );
}

export function SidePanel() {
  const prevDuplicateSigRef = useRef<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [duplicateDismissSig, setDuplicateDismissSig] = useState<string | null>(null);

  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showActivity, setShowActivity] = useState(false);
  const [customGroups, setCustomGroups] = useState<CustomGroupConfig[]>([]);
  const [autoGroupStrategy, setAutoGroupStrategy] =
    useState<AutoGroupStrategy>('domain');
  const [enableAutoGrouping, setEnableAutoGrouping] = useState(true);
  const [lastUsedInterval, setLastUsedInterval] = useState(1);
  const [enableAutoDelete, setEnableAutoDelete] = useState(false);
  const [autoDeleteThreshold, setAutoDeleteThreshold] = useState(24 * 60 * 60 * 1000);
  const [showNestedGroups, setShowNestedGroups] = useState(true);
  const [importantTabs, setImportantTabs] = useState<number[]>([]);
  const [importantGroups, setImportantGroups] = useState<string[]>([]);
  const [staleThresholdMs, setStaleThresholdMs] = useState(DEFAULT_STALE_THRESHOLD_MS);
  const [windowScope, setWindowScope] = useState<WindowScope>('all');
  const [currentWindowId, setCurrentWindowId] = useState<number | null>(null);
  const [browserWindows, setBrowserWindows] = useState<{ id: number; focused: boolean }[]>([]);
  const [collapsedWindows, setCollapsedWindows] = useState<number[]>([]);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CustomGroupConfig | undefined>();
  const [tabsForNewGroup, setTabsForNewGroup] = useState<TabInfo[]>([]);
  const { toast } = useToast();

  const loadTabs = useCallback(async () => {
    const [chromeTabs, chromeWindows, current] = await Promise.all([
      chrome.tabs.query({}),
      chrome.windows.getAll({ windowTypes: ['normal'] }),
      chrome.windows.getCurrent(),
    ]);
    const important = await getImportantTabs();
    const tabsInfo: TabInfo[] = chromeTabs.map((tab) => ({
      id: tab.id!,
      title: tab.title || '',
      url: tab.url || '',
      favIconUrl: getTabFaviconUrl(tab.url || ''),
      active: tab.active,
      windowId: tab.windowId,
      index: tab.index,
      pinned: tab.pinned,
      discarded: tab.discarded,
      audible: tab.audible,
      lastAccessed: tab.lastAccessed,
      isImportant: important.includes(tab.id!),
    }));
    setTabs(tabsInfo);
    setBrowserWindows(
      chromeWindows
        .filter((win): win is chrome.windows.Window & { id: number } => win.id != null)
        .map((win) => ({ id: win.id, focused: win.focused }))
    );
    if (current?.id != null) setCurrentWindowId(current.id);
  }, []);

  const loadCustomGroups = useCallback(async () => {
    const groups = await getCustomGroups();
    setCustomGroups(groups);
    const important = await getImportantGroups();
    setImportantGroups(important);
  }, []);

  const loadGroupingSettings = useCallback(async () => {
    const settings = await getGroupingSettings();
    setAutoGroupStrategy(settings.autoGroupStrategies[0] || 'domain');
    setEnableAutoGrouping(settings.enableAutoGrouping ?? true);
    setLastUsedInterval(settings.lastUsedInterval || 1);
    setEnableAutoDelete(settings.enableAutoDeleteGrouping || false);
    setAutoDeleteThreshold(settings.autoDeleteThreshold || 24 * 60 * 60 * 1000);
    setShowNestedGroups(settings.showNestedGroups ?? true);
    setStaleThresholdMs(await getStaleThresholdMs());
    setWindowScope(await getWindowScope());
  }, []);

  const loadImportantTabs = useCallback(async () => {
    const tabs = await getImportantTabs();
    setImportantTabs(tabs);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadTabs();
      void loadCustomGroups();
      void loadGroupingSettings();
      void loadImportantTabs();
    }, 0);

    const handleMessage = (message: { action: string; payload?: unknown }) => {
      if (message.action === 'tabsUpdated') {
        loadTabs();
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    const refreshWindows = () => {
      void loadTabs();
    };
    chrome.windows.onCreated.addListener(refreshWindows);
    chrome.windows.onRemoved.addListener(refreshWindows);
    chrome.windows.onFocusChanged.addListener(refreshWindows);

    return () => {
      window.clearTimeout(timeoutId);
      chrome.runtime.onMessage.removeListener(handleMessage);
      chrome.windows.onCreated.removeListener(refreshWindows);
      chrome.windows.onRemoved.removeListener(refreshWindows);
      chrome.windows.onFocusChanged.removeListener(refreshWindows);
    };
  }, [loadTabs, loadCustomGroups, loadGroupingSettings, loadImportantTabs]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const isTypingElsewhere =
        target.isContentEditable ||
        target.tagName === 'TEXTAREA' ||
        (target.tagName === 'INPUT' && target !== searchInputRef.current);

      if (isTypingElsewhere) return;

      const isSlash =
        event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey;

      if (!isSlash) return;

      event.preventDefault();
      searchInputRef.current?.focus();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Clean up dead tabs from groups when tabs change
  useEffect(() => {
    if (tabs.length === 0) return;

    const activeTabIds = tabs.map((t) => t.id);
    void cleanupDeadTabs(activeTabIds).then(() => {
      void loadCustomGroups();
      void loadImportantTabs();
    });
  }, [tabs, loadCustomGroups, loadImportantTabs]);

  // Use activity monitoring hook
  const { tabsWithActivity, updateActivity } = useActivityMonitor({
    tabs,
    refreshInterval: 10000, // 10 seconds
  });

  const scopedTabs = useMemo(() => {
    if (windowScope === 'current' && currentWindowId != null) {
      return tabsWithActivity.filter((tab) => tab.windowId === currentWindowId);
    }
    return tabsWithActivity;
  }, [tabsWithActivity, windowScope, currentWindowId]);

  const filteredTabs = useMemo(() => {
    if (!searchQuery) return scopedTabs;
    return filterTabs(scopedTabs, searchQuery);
  }, [scopedTabs, searchQuery]);

  const buildGroups = useCallback(
    (groupTabsSource: TabInfo[], groupsForCall: CustomGroupConfig[]) => {
      const grouped: GroupedTabs = groupTabs(
        groupTabsSource,
        autoGroupStrategy,
        groupsForCall,
        importantTabs,
        importantGroups,
        lastUsedInterval,
        enableAutoDelete,
        autoDeleteThreshold,
        showNestedGroups,
        enableAutoGrouping
      );
      return Object.values(grouped);
    },
    [
      autoGroupStrategy,
      enableAutoGrouping,
      importantTabs,
      importantGroups,
      lastUsedInterval,
      enableAutoDelete,
      autoDeleteThreshold,
      showNestedGroups,
    ]
  );

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

  const handleCreateNewTab = () => {
    chrome.tabs.create({}, (newTab) => {
      if (chrome.runtime.lastError) {
        toast({
          title: 'Error',
          description: 'Failed to create new tab. ' + chrome.runtime.lastError.message,
          variant: 'destructive',
        });
      } else {
        loadTabs();
        if (newTab?.id) {
          handleTabClick(newTab.id);
        }
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

  const handleAutoGroupingToggle = async (enabled: boolean) => {
    setEnableAutoGrouping(enabled);
    const settings = await getGroupingSettings();
    await saveGroupingSettings({ ...settings, enableAutoGrouping: enabled });
  };

  const handleStrategyChange = async (strategy: AutoGroupStrategy) => {
    setAutoGroupStrategy(strategy);
    const settings = await getGroupingSettings();
    await saveGroupingSettings({ ...settings, autoGroupStrategies: [strategy] });
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

  const handleShowNestedGroupsChange = async (enabled: boolean) => {
    setShowNestedGroups(enabled);
    const settings = await getGroupingSettings();
    await saveGroupingSettings({ ...settings, showNestedGroups: enabled });
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

  const orderedWindows = useMemo(() => {
    return [...browserWindows].sort((a, b) => {
      if (a.focused !== b.focused) return a.focused ? -1 : 1;
      return a.id - b.id;
    });
  }, [browserWindows]);

  const windowLabels = useMemo(() => {
    const labels = new Map<number, string>();
    orderedWindows.forEach((win, index) => {
      const count = tabs.filter((tab) => tab.windowId === win.id).length;
      labels.set(win.id, `Window ${index + 1} · ${count} tab${count === 1 ? '' : 's'}`);
    });
    return labels;
  }, [orderedWindows, tabs]);

  const moveTargets = useMemo(
    () =>
      orderedWindows.map((win) => ({
        id: win.id,
        label: windowLabels.get(win.id) ?? `Window ${win.id}`,
      })),
    [orderedWindows, windowLabels]
  );

  const sections = useMemo(() => {
    const windowIds = [
      ...new Set(
        filteredTabs
          .map((tab) => tab.windowId)
          .filter((id): id is number => id != null)
      ),
    ];
    const showHeaders = windowScope === 'all' && windowIds.length >= 2;
    if (!showHeaders) {
      return [
        {
          windowId: currentWindowId,
          label: '',
          tabCount: filteredTabs.length,
          focused: true,
          showHeader: false,
          windowLabel: undefined as string | undefined,
          groups: buildGroups(filteredTabs, customGroups),
        },
      ];
    }

    const openTabIds = new Set(tabs.map((tab) => tab.id));
    const emptyCustomGroups = customGroups.filter(
      (group) => !group.tabIds.some((id) => openTabIds.has(id))
    );
    const focusedWindowId =
      orderedWindows.find((win) => win.focused)?.id ?? orderedWindows[0]?.id;
    const knownWindowIds = new Set(orderedWindows.map((win) => win.id));
    const sectionWindows = [
      ...orderedWindows.filter((win) => windowIds.includes(win.id)),
      ...windowIds
        .filter((id) => !knownWindowIds.has(id))
        .map((id) => ({ id, focused: false })),
    ];

    return sectionWindows.map((win) => {
        const windowTabs = filteredTabs.filter((tab) => tab.windowId === win.id);
        const groupsInWindow = customGroups.filter((group) =>
          group.tabIds.some((id) => windowTabs.some((tab) => tab.id === id))
        );
        const groupsForWindow =
          win.id === focusedWindowId
            ? [...groupsInWindow, ...emptyCustomGroups]
            : groupsInWindow;
        const windowIndex = orderedWindows.findIndex((item) => item.id === win.id);
        const label = windowIndex >= 0 ? `Window ${windowIndex + 1}` : 'Window';
        return {
          windowId: win.id,
          label,
          tabCount: windowTabs.length,
          focused: win.focused,
          showHeader: windowTabs.length > 1,
          windowLabel: windowTabs.length === 1 ? label : undefined,
          groups: buildGroups(windowTabs, groupsForWindow),
        };
      });
  }, [
    filteredTabs,
    tabs,
    windowScope,
    currentWindowId,
    orderedWindows,
    customGroups,
    buildGroups,
  ]);

  const allGroups = useMemo(
    () => sections.flatMap((section) => section.groups),
    [sections]
  );

  // Match visible groups: custom groups + auto groups with 2+ tabs.
  // Single-tab auto groups render as flat tab rows, not group cards.
  const totalGroups = useMemo(
    () =>
      allGroups.filter(
        (group) => group.type === 'custom' || group.tabs.length > 1
      ).length,
    [allGroups]
  );

  const duplicateClusters = useMemo(
    () => findDuplicateClusters(scopedTabs),
    [scopedTabs]
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

  const importantGroupTabIds = useMemo(() => {
    const ids = new Set<number>();
    for (const group of customGroups) {
      if (!group.isImportant) continue;
      for (const id of group.tabIds) ids.add(id);
    }
    return ids;
  }, [customGroups]);

  const staleTabs = useMemo(
    () => getStaleTabs(scopedTabs, staleThresholdMs, importantGroupTabIds),
    [scopedTabs, staleThresholdMs, importantGroupTabIds]
  );

  const discardCandidates = useMemo(
    () => getDiscardCandidates(staleTabs),
    [staleTabs]
  );

  const handleStaleThresholdChange = async (ms: number) => {
    setStaleThresholdMs(ms);
    await saveStaleThresholdMs(ms);
  };

  const handleWindowScopeChange = async (scope: WindowScope) => {
    setWindowScope(scope);
    await saveWindowScope(scope);
  };

  const handleCloseStale = () => {
    const ids = staleTabs.map((tab) => tab.id);
    if (ids.length === 0) return;
    chrome.tabs.remove(ids, () => {
      if (chrome.runtime.lastError) {
        toast({
          title: 'Could not close tabs',
          description: chrome.runtime.lastError.message,
          variant: 'destructive',
        });
        return;
      }
      loadTabs();
      updateActivity();
      toast({
        title: 'Stale tabs closed',
        description: `Closed ${ids.length} tab${ids.length === 1 ? '' : 's'}.`,
      });
    });
  };

  const handleDiscardStale = async () => {
    const ids = discardCandidates.map((tab) => tab.id);
    if (ids.length === 0) {
      toast({
        title: 'Nothing to sleep',
        description: 'Those tabs are playing audio or already sleeping.',
      });
      return;
    }
    let discarded = 0;
    for (const id of ids) {
      try {
        await chrome.tabs.discard(id);
        discarded += 1;
      } catch {
        // Chrome refuses the active tab and some internal pages.
      }
    }
    await loadTabs();
    toast({
      title: discarded > 0 ? 'Tabs sleeping' : 'Nothing discarded',
      description:
        discarded > 0
          ? `Discarded ${discarded} tab${discarded === 1 ? '' : 's'}.`
          : 'Chrome kept these tabs awake.',
    });
  };

  const handleReloadTab = (tabId: number) => {
    chrome.tabs.reload(tabId, () => {
      if (chrome.runtime.lastError) {
        toast({
          title: 'Could not reload tab',
          description: chrome.runtime.lastError.message,
          variant: 'destructive',
        });
        return;
      }
      loadTabs();
    });
  };

  const handleMoveToWindow = async (tabId: number, windowId: number) => {
    try {
      await moveTabToWindow(tabId, windowId);
      await loadTabs();
    } catch (error) {
      toast({
        title: 'Could not move tab',
        description: error instanceof Error ? error.message : 'Move failed.',
        variant: 'destructive',
      });
    }
  };

  const handleMoveToNewWindow = async (tabId: number) => {
    try {
      await moveTabToNewWindow(tabId);
      await loadTabs();
    } catch (error) {
      toast({
        title: 'Could not move tab',
        description: error instanceof Error ? error.message : 'Move failed.',
        variant: 'destructive',
      });
    }
  };

  const handleFocusWindow = (windowId: number) => {
    chrome.windows.update(windowId, { focused: true }, () => {
      if (chrome.runtime.lastError) {
        toast({
          title: 'Could not focus window',
          description: chrome.runtime.lastError.message,
          variant: 'destructive',
        });
      }
    });
  };

  const toggleWindowCollapsed = (windowId: number) => {
    setCollapsedWindows((current) =>
      current.includes(windowId)
        ? current.filter((id) => id !== windowId)
        : [...current, windowId]
    );
  };

  return (
    <div className="w-full min-w-0 h-screen flex flex-col overflow-hidden p-2 bg-background box-border">
      <header className="mb-1.5 flex shrink-0 items-center justify-between gap-1.5 border-b border-hairline/70 bg-background/80 pb-1.5 backdrop-blur-md">
        <SidePanelWordmark tabCount={filteredTabs.length} groupCount={totalGroups} />
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            aria-label="Send feedback or report a bug"
            onClick={() => chrome.tabs.create({ url: FEEDBACK_URL })}
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            aria-label={showActivity ? 'Hide activity stats' : 'Show activity stats'}
            title={showActivity ? 'Hide activity stats' : 'Show activity stats'}
            onClick={() => setShowActivity(!showActivity)}
          >
            <BarChart2 className={cn('h-3.5 w-3.5', showActivity && 'text-primary')} />
          </Button>
          <ThemeSwitcher />
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="shrink-0">
          <SearchBar ref={searchInputRef} value={searchQuery} onChange={setSearchQuery} />

          <div className="mb-2 grid h-7 grid-cols-2 gap-0.5 rounded-md bg-muted/70 p-0.5">
            <button
              type="button"
              className={cn(
                'rounded-[5px] text-[11px] leading-none',
                windowScope === 'current'
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => void handleWindowScopeChange('current')}
            >
              This window
            </button>
            <button
              type="button"
              className={cn(
                'rounded-[5px] text-[11px] leading-none',
                windowScope === 'all'
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => void handleWindowScopeChange('all')}
            >
              All windows
            </button>
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-1">
            <SavedSessions onRestored={loadTabs} />
            <RecentlyClosed onRestored={loadTabs} />
            <GroupToolbar
              onCreateGroup={handleCreateGroup}
              autoGroupStrategy={autoGroupStrategy}
              onStrategyChange={(strategy) => void handleStrategyChange(strategy)}
              enableAutoGrouping={enableAutoGrouping}
              onToggleAutoGrouping={(enabled) => void handleAutoGroupingToggle(enabled)}
              lastUsedInterval={lastUsedInterval}
              onLastUsedIntervalChange={handleLastUsedIntervalChange}
              enableAutoDelete={enableAutoDelete}
              onToggleAutoDelete={handleAutoDeleteToggle}
              autoDeleteThreshold={autoDeleteThreshold}
              onAutoDeleteThresholdChange={handleAutoDeleteThresholdChange}
              showNestedGroups={showNestedGroups}
              onShowNestedGroupsChange={handleShowNestedGroupsChange}
            />
          </div>

          {showDuplicateBanner && (
            <DuplicateBanner
              clusters={duplicateClusters}
              extraTabCount={extraDuplicateTabCount}
              onCloseDuplicates={handleCloseDuplicates}
              onDismiss={() => setDuplicateDismissSig(duplicateSignature)}
            />
          )}

          <StaleTabsBanner
            tabs={staleTabs.map((tab) => ({ id: tab.id, title: tab.title }))}
            discardCount={discardCandidates.length}
            thresholdMs={staleThresholdMs}
            onThresholdChange={(ms) => void handleStaleThresholdChange(ms)}
            onClose={handleCloseStale}
            onDiscard={() => void handleDiscardStale()}
          />

          {showActivity && (
            <>
              <SystemMemoryBar />
              <ActivityStats tabs={tabsWithActivity} totalGroups={totalGroups} />
            </>
          )}
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="min-w-0 space-y-1 py-0.5">
            <button
              type="button"
              onClick={handleCreateNewTab}
              aria-label="New tab"
              title="New tab"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current">
                <Plus className="h-2.5 w-2.5" aria-hidden />
              </span>
              New tab
            </button>
            {sections.map((section) => {
              const cards = section.groups.map((group) => (
                <TabGroupCard
                  key={`${section.windowId ?? 'current'}-${group.id}`}
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
                  onReloadTab={handleReloadTab}
                  moveTargets={moveTargets}
                  onMoveToWindow={(tabId, windowId) => void handleMoveToWindow(tabId, windowId)}
                  onMoveToNewWindow={(tabId) => void handleMoveToNewWindow(tabId)}
                  windowLabel={section.windowLabel}
                />
              ));
              if (!section.showHeader || section.windowId == null) {
                return (
                  <div key={section.windowId ?? 'single-window'} className="min-w-0 space-y-1">
                    {cards}
                  </div>
                );
              }
              return (
                <WindowSection
                  key={section.windowId}
                  label={section.label}
                  tabCount={section.tabCount}
                  focused={section.focused}
                  collapsed={collapsedWindows.includes(section.windowId)}
                  onToggle={() => toggleWindowCollapsed(section.windowId!)}
                  onFocus={() => handleFocusWindow(section.windowId!)}
                >
                  {cards}
                </WindowSection>
              );
            })}
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
