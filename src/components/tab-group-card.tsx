import { X, Shield, Edit2, Bookmark, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TabGroup, CustomGroupConfig } from '@/types/tab';
import { TabItem } from '@/components/tab-item';
import { cn } from '@/lib/utils'; // Used for Star className

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
  const handleCloseAll = () => {
    const tabIds = group.tabs.map((tab) => tab.id);
    onCloseAll(tabIds);
  };

  const displayName = group.customName || group.domain;
  const isCustomGroup = group.type === 'custom';

  // Calculate activity stats for the group
  const activeTabsInGroup = group.tabs.filter((tab) => {
    if (!tab.activity) return false;
    const now = Date.now();
    return now - tab.activity.lastVisited < 30 * 60 * 1000; // Active in last 30 mins
  }).length;

  return (
    <Card
      style={
        group.color && isCustomGroup
          ? { borderTopColor: group.color, borderTopWidth: '3px' }
          : undefined
      }
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          {!isCustomGroup && (
            <img
              src={group.favicon || DEFAULT_FAVICON}
              alt=""
              className="w-4 h-4 rounded"
              onError={(e) => {
                e.currentTarget.src = DEFAULT_FAVICON;
              }}
            />
          )}
          {isCustomGroup && group.color && (
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: group.color }}
            />
          )}
          <span className="font-medium">
            {displayName} ({group.tabs.length})
          </span>
          {group.isImportant && (
            <Shield className="h-4 w-4 fill-amber-500 text-amber-500" />
          )}
          {showActivity && activeTabsInGroup > 0 && (
            <Badge variant="outline" className="text-xs text-green-600">
              {activeTabsInGroup} active
            </Badge>
          )}
          {isCustomGroup && (
            <Badge variant="secondary" className="text-xs">
              Custom
            </Badge>
          )}
          {group.autoGroupStrategy && group.autoGroupStrategy !== 'domain' && (
            <Badge variant="outline" className="text-xs">
              {group.autoGroupStrategy.replace('-', ' ')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isCustomGroup && onConvertToCustom && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onConvertToCustom(group)}
              title="Save as custom group"
            >
              <Bookmark className="h-4 w-4" />
            </Button>
          )}
          {isCustomGroup && onToggleImportant && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onToggleImportant(group.id)}
              title={group.isImportant ? 'Remove important mark' : 'Mark as important'}
            >
              <Shield
                className={cn(
                  'h-4 w-4',
                  group.isImportant && 'fill-amber-500 text-amber-500'
                )}
              />
            </Button>
          )}
          {isCustomGroup && onEditGroup && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onEditGroup(group.id)}
              title="Edit group"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
          {isCustomGroup && onDeleteGroup && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              onClick={() => onDeleteGroup(group.id)}
              title="Delete group"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="destructive"
            size="icon"
            className="h-8 w-8"
            onClick={handleCloseAll}
            title="Close all tabs"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {group.tabs.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No tabs in this group
          </div>
        ) : (
          group.tabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              onClose={onCloseTab}
              onClick={onTabClick}
              onDuplicate={onDuplicateTab}
              showActivity={showActivity}
              customGroups={customGroups}
              currentGroupId={isCustomGroup ? group.id : undefined}
              onAddToGroup={onAddTabToGroup}
              onRemoveFromGroup={onRemoveTabFromGroup}
              onToggleImportant={onToggleTabImportant}
              onTogglePin={onTogglePin}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
