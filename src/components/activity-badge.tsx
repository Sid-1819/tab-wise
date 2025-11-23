import { Clock, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TabActivity, formatLastVisited, formatTimeSpent, getActivityColor } from '@/lib/activity-utils';
import { cn } from '@/lib/utils';

interface ActivityBadgeProps {
  activity?: TabActivity;
  showTimeSpent?: boolean;
  showLastVisited?: boolean;
  compact?: boolean;
}

export function ActivityBadge({
  activity,
  showTimeSpent = false,
  showLastVisited = true,
  compact = true,
}: ActivityBadgeProps) {
  if (!activity) {
    return null;
  }

  const lastVisitedText = formatLastVisited(activity.lastVisited);
  const timeSpentText = formatTimeSpent(activity.totalTimeSpent);
  const colorClass = getActivityColor(activity.lastVisited);

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {showLastVisited && (
          <Badge variant="outline" className={cn('text-xs px-1.5 py-0', colorClass)}>
            <Clock className="h-3 w-3 mr-1" />
            {lastVisitedText}
          </Badge>
        )}
        {showTimeSpent && activity.totalTimeSpent > 0 && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            <Timer className="h-3 w-3 mr-1" />
            {timeSpentText}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 text-xs">
      {showLastVisited && (
        <div className={cn('flex items-center gap-1', colorClass)}>
          <Clock className="h-3 w-3" />
          <span>Last visited: {lastVisitedText}</span>
        </div>
      )}
      {showTimeSpent && activity.totalTimeSpent > 0 && (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Timer className="h-3 w-3" />
          <span>Time today: {timeSpentText}</span>
        </div>
      )}
    </div>
  );
}
