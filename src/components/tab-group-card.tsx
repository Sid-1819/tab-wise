import { useState } from 'react';
import { X, Shield, Edit2, Bookmark, Trash2, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TabGroup, CustomGroupConfig } from '@/types/tab';
import { TabItem } from '@/components/tab-item';
import { getGroupBorderColor } from '@/lib/group-colors';
import { cn } from '@/lib/utils';

interface TabGroupCardProps {
  group: TabGroup;
  onCloseTab: (tabId: number) => void;
  onCloseAll: (tabIds: number[]) => void;
  onTabClick: (tabId: number) => void;
  onDuplicateTab?: (tabId: number) => void;
  showActivity?: boolean;
  onToggleImportant?: (groupId: string) => void;
  onEditGroup?: (groupId: string) => void;
  onDeleteGroup?: (groupId: string) => void;
  onConvertToCustom?: (group: TabGroup) => void;
  onAddTabToGroup?: (tabId: number, groupId: string) => void;
  onRemoveTabFromGroup?: (tabId: number, groupId: string) => void;
  onToggleTabImportant?: (tabId: number) => void;
  onTogglePin?: (tabId: number) => void;
  customGroups?: CustomGroupConfig[];
}

const DEFAULT_FAVICON = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>';

const groupActionBtn =
  'h-6 w-6 p-0 opacity-0 transition-opacity group-hover/card:opacity-100 focus-visible:opacity-100';

export function TabGroupCard({
  group,
  onCloseTab,
  onCloseAll,
  onTabClick,
  onDuplicateTab,
  showActivity = true,
  onToggleImportant,
  onEditGroup,
  onDeleteGroup,
  onConvertToCustom,
  onAddTabToGroup,
  onRemoveTabFromGroup,
  onToggleTabImportant,
  onTogglePin,
  customGroups = [],
}: TabGroupCardProps) {
  const isCustomGroup = group.type === 'custom';
  const isSingleAutoGroup = group.tabs.length === 1 && !isCustomGroup;
  const [collapsed, setCollapsed] = useState(false);

  const handleCloseAll = () => {
    const tabIds = group.tabs.map((tab) => tab.id);
    onCloseAll(tabIds);
  };

  const displayName = group.customName || group.domain;
  const borderColor = getGroupBorderColor(group.id, group.color);
  const groupBorderStyle = {
    borderLeftColor: borderColor,
    borderLeftWidth: '3px',
  } as const;

  const activeTabsInGroup = group.tabs.filter((tab) => {
    if (!tab.activity) return false;
    const now = Date.now();
    return now - tab.activity.lastVisited < 30 * 60 * 1000;
  }).length;

  const tabItemProps = (tab: (typeof group.tabs)[0]) => ({
    tab,
    onClose: onCloseTab,
    onClick: onTabClick,
    onDuplicate: onDuplicateTab,
    showActivity,
    customGroups,
    currentGroupId: isCustomGroup ? group.id : undefined,
    onAddToGroup: onAddTabToGroup,
    onRemoveFromGroup: onRemoveTabFromGroup,
    onToggleImportant: onToggleTabImportant,
    onTogglePin,
  });

  if (isSingleAutoGroup && group.tabs.length === 1) {
    return <TabItem {...tabItemProps(group.tabs[0])} />;
  }

  return (
    <Card
      className="group/card rounded-lg border border-l-[3px] border-hairline/70 shadow-none"
      style={groupBorderStyle}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          onClick={() => group.tabs.length > 1 && setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
        >
          {group.tabs.length > 1 && (
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
                collapsed && '-rotate-90'
              )}
            />
          )}
          {!isCustomGroup && (
            <img
              src={group.favicon || DEFAULT_FAVICON}
              alt=""
              className="h-3.5 w-3.5 shrink-0 rounded"
              onError={(e) => {
                e.currentTarget.src = DEFAULT_FAVICON;
              }}
            />
          )}
          {isCustomGroup && group.color && (
            <div
              className="h-3.5 w-3.5 shrink-0 rounded-full"
              style={{ backgroundColor: group.color }}
            />
          )}
          <span className="truncate text-sm font-semibold tracking-tight">
            {displayName}
            {group.tabs.length > 1 ? ` - ${group.tabs.length}` : ''}
          </span>
          {group.isImportant && (
            <Shield className="h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-500" />
          )}
          {showActivity && activeTabsInGroup > 0 && (
            <Badge variant="outline" className="shrink-0 text-[10px] text-green-600 px-1 py-0">
              {activeTabsInGroup} active
            </Badge>
          )}
          {isCustomGroup && (
            <Badge variant="secondary" className="shrink-0 text-[10px] px-1 py-0">
              Custom
            </Badge>
          )}
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          {!isCustomGroup && onConvertToCustom && (
            <Button
              variant="ghost"
              size="icon"
              className={groupActionBtn}
              onClick={() => onConvertToCustom(group)}
              aria-label={`Save ${displayName} as custom group`}
              title="Save as custom group"
            >
              <Bookmark className="h-3.5 w-3.5" aria-hidden />
            </Button>
          )}
          {isCustomGroup && onToggleImportant && (
            <Button
              variant="ghost"
              size="icon"
              className={groupActionBtn}
              onClick={() => onToggleImportant(group.id)}
              aria-label={
                group.isImportant
                  ? `Remove important mark from ${displayName}`
                  : `Mark ${displayName} as important`
              }
              title={group.isImportant ? 'Remove important mark' : 'Mark as important'}
            >
              <Shield
                className={cn(
                  'h-3.5 w-3.5',
                  group.isImportant && 'fill-amber-500 text-amber-500'
                )}
                aria-hidden
              />
            </Button>
          )}
          {isCustomGroup && onEditGroup && (
            <Button
              variant="ghost"
              size="icon"
              className={groupActionBtn}
              onClick={() => onEditGroup(group.id)}
              aria-label={`Edit ${displayName}`}
              title="Edit group"
            >
              <Edit2 className="h-3.5 w-3.5" aria-hidden />
            </Button>
          )}
          {isCustomGroup && onDeleteGroup && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                groupActionBtn,
                'text-destructive hover:text-destructive'
              )}
              onClick={() => onDeleteGroup(group.id)}
              aria-label={`Delete ${displayName}`}
              title="Delete group"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              groupActionBtn,
              'text-destructive hover:bg-destructive/10 hover:text-destructive'
            )}
            onClick={handleCloseAll}
            aria-label={`Close all tabs in ${displayName}`}
            title="Close all tabs"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="space-y-1 px-3 pb-3 pt-0 pr-5">
          {group.tabs.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              No tabs in this group
            </div>
          ) : (
            group.tabs.map((tab) => (
              <TabItem key={tab.id} {...tabItemProps(tab)} nestedInGroup />
            ))
          )}
        </CardContent>
      )}
    </Card>
  );
}
