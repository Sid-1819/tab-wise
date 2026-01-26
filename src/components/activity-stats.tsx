import { Target, Gauge, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TabInfo } from '@/types/tab';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ActivityStatsProps {
  tabs: TabInfo[];
  totalGroups?: number;
}

export function ActivityStats({ tabs }: ActivityStatsProps) {
  const tabsWithActivity = tabs.filter((tab) => tab.activity);
  
  // Calculate Focus Score: average time per tab visit
  const totalTimeSpent = tabsWithActivity.reduce(
    (sum, tab) => sum + (tab.activity?.totalTimeSpent || 0),
    0
  );
  const totalVisitCount = tabsWithActivity.reduce(
    (sum, tab) => sum + (tab.activity?.visitCount || 0),
    0
  );
  const focusScoreMinutes = totalVisitCount > 0 
    ? (totalTimeSpent / totalVisitCount) / (1000 * 60)
    : 0;
  
  // Get focus score color
  const getFocusColor = (minutes: number) => {
    if (minutes >= 3) return 'bg-green-500/80';
    if (minutes >= 1) return 'bg-yellow-500/80';
    return 'bg-red-500/80';
  };

  // Calculate Tab Velocity: tabs switched per hour
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const hoursSinceStartOfDay = Math.max(
    (Date.now() - startOfDay.getTime()) / (1000 * 60 * 60),
    1
  );
  const tabVelocity = totalVisitCount / hoursSinceStartOfDay;
  
  // Get velocity color
  const getVelocityColor = (velocity: number) => {
    if (velocity < 10) return 'bg-green-500/80';
    if (velocity < 20) return 'bg-yellow-500/80';
    return 'bg-red-500/80';
  };

  // Calculate Deep Dive Tabs: tabs visited 3+ times
  const deepDiveTabs = tabsWithActivity.filter(
    (tab) => (tab.activity?.visitCount || 0) >= 3
  ).length;
  
  // Get deep dive color
  const getDeepDiveColor = (count: number) => {
    if (count >= 5) return 'bg-green-500/80';
    if (count >= 2) return 'bg-yellow-500/80';
    return 'bg-red-500/80';
  };

  return (
    <div className="grid grid-cols-3 gap-2 mb-3">
      {/* Focus Score */}
      <Popover>
        <PopoverTrigger asChild>
          <div className="flex flex-col items-center p-2 rounded-md bg-muted/50 cursor-help">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Target className="h-3 w-3" />
              <span>Focus</span>
            </div>
            <Badge 
              variant="default" 
              className={cn('text-xs', getFocusColor(focusScoreMinutes))}
            >
              {focusScoreMinutes > 0 ? `${focusScoreMinutes.toFixed(1)}m avg` : '0m'}
            </Badge>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 text-sm">
          <div className="font-medium mb-1">Focus Score</div>
          <div className="text-muted-foreground text-xs">
            Average time spent per tab visit. Higher = more focused browsing.
            <br />
            <br />
            Calculation: Total time spent ÷ Total visits
          </div>
        </PopoverContent>
      </Popover>

      {/* Tab Velocity */}
      <Popover>
        <PopoverTrigger asChild>
          <div className="flex flex-col items-center p-2 rounded-md bg-muted/50 cursor-help">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Gauge className="h-3 w-3" />
              <span>Velocity</span>
            </div>
            <Badge 
              variant="default" 
              className={cn('text-xs', getVelocityColor(tabVelocity))}
            >
              {Math.round(tabVelocity)}/hr
            </Badge>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 text-sm">
          <div className="font-medium mb-1">Tab Velocity</div>
          <div className="text-muted-foreground text-xs">
            Number of tab switches per hour. Lower = more deliberate browsing.
            <br />
            <br />
            Calculation: Total visits ÷ Hours since start of day
          </div>
        </PopoverContent>
      </Popover>

      {/* Deep Dive Tabs */}
      <Popover>
        <PopoverTrigger asChild>
          <div className="flex flex-col items-center p-2 rounded-md bg-muted/50 cursor-help">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" />
              <span>Deep Dive</span>
            </div>
            <Badge 
              variant="default" 
              className={cn('text-xs', getDeepDiveColor(deepDiveTabs))}
            >
              {deepDiveTabs} deep
            </Badge>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 text-sm">
          <div className="font-medium mb-1">Deep Dive Tabs</div>
          <div className="text-muted-foreground text-xs">
            Tabs visited 3+ times today. Higher = more focused, engaged browsing.
            <br />
            <br />
            Calculation: Count of tabs with visitCount ≥ 3
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
