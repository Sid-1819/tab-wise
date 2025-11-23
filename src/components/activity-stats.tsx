import { Clock, Timer, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TabInfo } from '@/types/tab';
import { formatTimeSpent } from '@/lib/activity-utils';

interface ActivityStatsProps {
  tabs: TabInfo[];
  totalGroups?: number;
}

export function ActivityStats({ tabs }: ActivityStatsProps) {
  // Calculate stats
  const tabsWithActivity = tabs.filter((tab) => tab.activity);
  const totalTimeSpent = tabsWithActivity.reduce(
    (sum, tab) => sum + (tab.activity?.totalTimeSpent || 0),
    0
  );

  // Find most active tabs (by time spent)
  const activeTabsCount = tabsWithActivity.filter(
    (tab) => {
      const now = Date.now();
      const lastVisited = tab.activity?.lastVisited || 0;
      return now - lastVisited < 30 * 60 * 1000; // Active in last 30 minutes
    }
  ).length;

  // Find stale tabs (not visited in over 2 hours)
  const staleTabsCount = tabs.filter((tab) => {
    if (!tab.activity) return true; // Never visited = stale
    const now = Date.now();
    return now - tab.activity.lastVisited > 2 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="grid grid-cols-3 gap-2 mb-3">
      <div className="flex flex-col items-center p-2 rounded-md bg-muted/50">
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <Timer className="h-3 w-3" />
          <span>Time Today</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {formatTimeSpent(totalTimeSpent)}
        </Badge>
      </div>

      <div className="flex flex-col items-center p-2 rounded-md bg-muted/50">
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <Clock className="h-3 w-3" />
          <span>Active</span>
        </div>
        <Badge variant="default" className="text-xs bg-green-500/80">
          {activeTabsCount} tabs
        </Badge>
      </div>

      <div className="flex flex-col items-center p-2 rounded-md bg-muted/50">
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <Layers className="h-3 w-3" />
          <span>Stale</span>
        </div>
        <Badge variant={staleTabsCount > 5 ? "destructive" : "outline"} className="text-xs">
          {staleTabsCount} tabs
        </Badge>
      </div>
    </div>
  );
}
