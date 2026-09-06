import { X, MoreVertical, FolderPlus, FolderMinus, Copy, Shield, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { TabInfo, CustomGroupConfig } from '@/types/tab';
import type { TabActivity } from '@/lib/activity-types';
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
  onDuplicate?: (tabId: number) => void;
  onToggleImportant?: (tabId: number) => void;
  onTogglePin?: (tabId: number) => void;
  /** Tab is rendered inside a multi-tab group card (indented nest styling). */
  nestedInGroup?: boolean;
}

import { DEFAULT_FAVICON } from '@/lib/favicon';

export function TabItem({
  tab,
  onClose,
  onClick,
  customGroups = [],
  onAddToGroup,
  onRemoveFromGroup,
  onDuplicate,
  onToggleImportant,
  onTogglePin,
  nestedInGroup = false,
}: TabItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Check if this tab is currently active
  const isActive = tab.active === true;

  const hasManageMenu =
    customGroups.length > 0 ||
    isInCustomGroup ||
    !!onDuplicate ||
    !!onToggleImportant ||
    !!onTogglePin;

  const tabActionBtn = 'h-5 w-5 shrink-0 p-0';

  return (
    <div
      className={cn(
        'group grid min-w-0 cursor-pointer items-center gap-1 rounded-md transition-colors',
        'grid-cols-[16px_minmax(0,1fr)_auto]',
        nestedInGroup ? 'py-1 pl-2 pr-0.5' : 'py-1 px-2',
        'hover:bg-accent',
        isActive && !nestedInGroup && 'border-l-2 border-primary bg-primary/10',
        isActive && nestedInGroup && 'bg-primary/10'
      )}
      onClick={() => onClick(tab.id)}
    >
      <img
        src={tab.favIconUrl || DEFAULT_FAVICON}
        alt=""
        className="h-4 w-4 shrink-0"
        onError={(e) => {
          e.currentTarget.src = DEFAULT_FAVICON;
        }}
      />
      <div className="min-w-0 overflow-hidden">
        <span
          className={cn(
            'block truncate text-xs',
            isActive ? 'font-medium text-primary' : 'font-normal text-foreground/90'
          )}
          title={tab.title}
        >
          {tab.title}
        </span>
      </div>

      <div
        className={cn(
          'relative z-10 flex shrink-0 items-center gap-0',
          isActive && 'min-w-5'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {tab.isImportant && (
          <Shield className="h-3 w-3 shrink-0 fill-amber-500 text-amber-500" aria-hidden />
        )}

        {tab.pinned && (
          <Pin className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
        )}

        {hasManageMenu && (
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  tabActionBtn,
                  'w-0 overflow-hidden opacity-0 transition-all group-hover:w-5 group-hover:opacity-100 focus-visible:w-5 focus-visible:opacity-100'
                )}
                aria-label={`Manage ${tab.title}`}
                title="Manage tab"
              >
                <MoreVertical className="h-3 w-3" aria-hidden />
              </Button>
            </PopoverTrigger>
          <PopoverContent className="w-48 p-1" align="end">
            <div className="text-xs font-medium text-muted-foreground px-2 py-1">
              Manage Tab
            </div>

            {/* Mark as Important option */}
            {onToggleImportant && (
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleImportant(tab.id);
                  setMenuOpen(false);
                }}
              >
                <Shield className={cn('h-3 w-3', tab.isImportant && 'fill-amber-500 text-amber-500')} />
                <span>{tab.isImportant ? 'Remove Important' : 'Mark as Important'}</span>
              </button>
            )}

            {onTogglePin && (
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(tab.id);
                  setMenuOpen(false);
                }}
              >
                <Pin className="h-3 w-3" />
                <span>{tab.pinned ? 'Unpin tab' : 'Pin tab'}</span>
              </button>
            )}

            {/* Duplicate tab option */}
            {onDuplicate && (
              <>
                {(onToggleImportant || onTogglePin) && <div className="border-t my-1" />}
                <button
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-left"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(tab.id);
                    setMenuOpen(false);
                  }}
                >
                  <Copy className="h-3 w-3" />
                  <span>Duplicate Tab</span>
                </button>
              </>
            )}

            {/* Add to group options */}
            {availableGroups.length > 0 && (
              <>
                {onDuplicate && <div className="border-t my-1" />}
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

            {availableGroups.length === 0 &&
              !isInCustomGroup &&
              !onDuplicate &&
              !onToggleImportant &&
              !onTogglePin && (
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
          className={cn(
            tabActionBtn,
            'text-muted-foreground/80 hover:text-foreground',
            !isActive && 'hidden group-hover:inline-flex'
          )}
          onClick={() => onClose(tab.id)}
          aria-label={`Close ${tab.title}`}
          title="Close tab"
        >
          <X className="h-3 w-3" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
