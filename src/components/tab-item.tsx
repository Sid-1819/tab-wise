import { X, MoreVertical, FolderPlus, FolderMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActivityBadge } from '@/components/activity-badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { TabInfo, CustomGroupConfig } from '@/types/tab';
import { TabActivity } from '@/lib/activity-utils';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface TabItemProps {
  tab: TabInfo & { activity?: TabActivity };
  onClose: (tabId: number) => void;
  onClick: (tabId: number) => void;
  showActivity?: boolean;
  customGroups?: CustomGroupConfig[];
  currentGroupId?: string;
  onAddToGroup?: (tabId: number, groupId: string) => void;
  onRemoveFromGroup?: (tabId: number, groupId: string) => void;
}

const DEFAULT_FAVICON = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>';

export function TabItem({
  tab,
  onClose,
  onClick,
  showActivity = true,
  customGroups = [],
  currentGroupId: _currentGroupId,
  onAddToGroup,
  onRemoveFromGroup,
}: TabItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const truncatedTitle = tab.title.length > 35
    ? tab.title.slice(0, 35) + '...'
    : tab.title;

  // Find which group this tab belongs to (if any)
  const tabInGroup = customGroups.find((g) => g.tabIds.includes(tab.id));
  const isInCustomGroup = !!tabInGroup;

  // Available groups to add this tab to (exclude current group)
  const availableGroups = customGroups.filter(
    (g) => !g.tabIds.includes(tab.id)
  );

  const handleAddToGroup = (groupId: string) => {
    onAddToGroup?.(tab.id, groupId);
    setMenuOpen(false);
  };

  const handleRemoveFromGroup = () => {
    if (tabInGroup) {
      onRemoveFromGroup?.(tab.id, tabInGroup.id);
      setMenuOpen(false);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-md transition-colors cursor-pointer group",
        "hover:bg-accent"
      )}
      onClick={() => onClick(tab.id)}
    >
      <img
        src={tab.favIconUrl || DEFAULT_FAVICON}
        alt=""
        className="w-4 h-4 shrink-0"
        onError={(e) => {
          e.currentTarget.src = DEFAULT_FAVICON;
        }}
      />
      <span className="flex-1 text-sm truncate">{truncatedTitle}</span>

      {showActivity && tab.activity && (
        <ActivityBadge
          activity={tab.activity}
          showLastVisited={true}
          showTimeSpent={false}
          compact={true}
        />
      )}

      {/* Group management menu */}
      {(customGroups.length > 0 || isInCustomGroup) && (
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1" align="end">
            <div className="text-xs font-medium text-muted-foreground px-2 py-1">
              Manage Tab
            </div>

            {/* Add to group options */}
            {availableGroups.length > 0 && (
              <>
                <div className="text-xs text-muted-foreground px-2 py-1 mt-1">
                  Add to group:
                </div>
                {availableGroups.map((group) => (
                  <button
                    key={group.id}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-left"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToGroup(group.id);
                    }}
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="truncate">{group.name}</span>
                    <FolderPlus className="h-3 w-3 ml-auto text-muted-foreground" />
                  </button>
                ))}
              </>
            )}

            {/* Remove from group option */}
            {isInCustomGroup && (
              <>
                <div className="border-t my-1" />
                <button
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-destructive/10 text-destructive text-left"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFromGroup();
                  }}
                >
                  <FolderMinus className="h-3 w-3" />
                  <span>Remove from "{tabInGroup?.name}"</span>
                </button>
              </>
            )}

            {availableGroups.length === 0 && !isInCustomGroup && (
              <div className="text-xs text-muted-foreground px-2 py-2">
                No groups available. Create a group first.
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onClose(tab.id);
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
