import { useState, type ComponentProps } from 'react';
import { X, Shield, Edit2, Bookmark, Trash2, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TabGroup, TabSubGroup, CustomGroupConfig } from '@/types/tab';
import { TabItem } from '@/components/tab-item';
import { getGroupBorderColor } from '@/lib/group-colors';
import { cn } from '@/lib/utils';
import { DEFAULT_FAVICON } from '@/lib/favicon';

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

const groupActionBtn =
  'h-5 w-5 shrink-0 p-0 opacity-0 transition-opacity group-hover/card:opacity-100 focus-visible:opacity-100';

const groupCloseBtn =
  'h-5 w-5 shrink-0 p-0 text-destructive/80 hover:bg-destructive/10 hover:text-destructive';

interface TabSubGroupSectionProps {
  subgroup: TabSubGroup;
  tabItemProps: (tab: TabSubGroup['tabs'][0]) => ComponentProps<typeof TabItem>;
}

function TabSubGroupSection({ subgroup, tabItemProps }: TabSubGroupSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const hasMultipleTabs = subgroup.tabs.length > 1;

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        className="grid min-w-0 w-full grid-cols-[12px_minmax(0,1fr)] items-center gap-1 rounded-md py-0.5 pl-1 pr-0.5 text-left hover:bg-accent/50"
        onClick={() => hasMultipleTabs && setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        {hasMultipleTabs && (
          <ChevronDown
            className={cn(
              'h-3 w-3 shrink-0 text-muted-foreground transition-transform',
              collapsed && '-rotate-90'
            )}
          />
        )}
        {!hasMultipleTabs && <span className="inline-block h-3 w-3 shrink-0" />}
        <span
          className="min-w-0 truncate text-xs font-medium text-muted-foreground"
          title={subgroup.label}
        >
          {subgroup.label}
          {hasMultipleTabs ? ` - ${subgroup.tabs.length}` : ''}
        </span>
      </button>
      {!collapsed && (
        <div className="space-y-0.5 pl-3">
          {subgroup.tabs.map((tab) => (
            <TabItem key={tab.id} {...tabItemProps(tab)} nestedInGroup />
          ))}
        </div>
      )}
    </div>
  );
}

export function TabGroupCard({
  group,
  onCloseTab,
  onCloseAll,
  onTabClick,
  onDuplicateTab,
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

  const tabItemProps = (tab: (typeof group.tabs)[0]) => ({
    tab,
    onClose: onCloseTab,
    onClick: onTabClick,
    onDuplicate: onDuplicateTab,
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

  const hasSubgroups = (group.subgroups?.length ?? 0) >= 2;
  const subgroupTabIds = new Set(
    group.subgroups?.flatMap((subgroup) => subgroup.tabs.map((tab) => tab.id)) ?? []
  );
  const orphanTabs = hasSubgroups
    ? group.tabs.filter((tab) => !subgroupTabIds.has(tab.id))
    : [];

  return (
    <Card
      className="group/card min-w-0 overflow-hidden rounded-lg border border-l-[3px] border-hairline/70 shadow-none"
      style={groupBorderStyle}
    >
      <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1 space-y-0 px-2 py-1">
        <button
          type="button"
          className="flex min-w-0 items-center gap-1 overflow-hidden text-left"
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
          <span
            className="min-w-0 truncate text-sm font-semibold tracking-tight"
            title={displayName}
          >
            {displayName}
            {group.tabs.length > 1 ? ` - ${group.tabs.length}` : ''}
          </span>
          {group.isImportant && (
            <Shield className="h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-500" />
          )}
        </button>
        <div className="flex shrink-0 items-center gap-0">
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
            className={groupCloseBtn}
            onClick={handleCloseAll}
            aria-label={`Close all tabs in ${displayName}`}
            title="Close all tabs"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="min-w-0 space-y-0.5 px-2 pb-1.5 pt-0">
          {group.tabs.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              No tabs in this group
            </div>
          ) : hasSubgroups ? (
            <>
              {group.subgroups!.map((subgroup) => (
                <TabSubGroupSection
                  key={subgroup.id}
                  subgroup={subgroup}
                  tabItemProps={tabItemProps}
                />
              ))}
              {orphanTabs.map((tab) => (
                <TabItem key={tab.id} {...tabItemProps(tab)} nestedInGroup />
              ))}
            </>
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
