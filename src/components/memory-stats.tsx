import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatBytes, calculateTotalMemory } from '@/lib/memory-utils';
import { Activity, MemoryStick, TrendingUp } from 'lucide-react';
import { TabInfo } from '@/types/tab';

interface MemoryStatsProps {
  tabs: TabInfo[];
  totalGroups?: number;
}

export function MemoryStats({ tabs }: MemoryStatsProps) {
  const totalMemory = calculateTotalMemory(tabs);
  const averageMemory = tabs.length > 0 ? totalMemory / tabs.length : 0;
  const tabsWithMemory = tabs.filter((tab) => tab.memory && tab.memory > 0);

  if (tabsWithMemory.length === 0) {
    return null;
  }

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Activity className="h-3 w-3" />
              <span className="text-xs">Total</span>
            </div>
            <Badge variant="outline" className="font-mono">
              {formatBytes(totalMemory)}
            </Badge>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs">Average</span>
            </div>
            <Badge variant="outline" className="font-mono">
              {formatBytes(averageMemory)}
            </Badge>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <MemoryStick className="h-3 w-3" />
              <span className="text-xs">Tabs</span>
            </div>
            <Badge variant="outline" className="font-mono">
              {tabsWithMemory.length}/{tabs.length}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
