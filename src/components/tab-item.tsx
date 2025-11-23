import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActivityBadge } from '@/components/activity-badge';
import { TabInfo } from '@/types/tab';
import { TabActivity } from '@/lib/activity-utils';
import { cn } from '@/lib/utils';

interface TabItemProps {
  tab: TabInfo & { activity?: TabActivity };
  onClose: (tabId: number) => void;
  onClick: (tabId: number) => void;
  showActivity?: boolean;
}

const DEFAULT_FAVICON = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>';

export function TabItem({ tab, onClose, onClick, showActivity = true }: TabItemProps) {
  const truncatedTitle = tab.title.length > 40
    ? tab.title.slice(0, 40) + '...'
    : tab.title;

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
