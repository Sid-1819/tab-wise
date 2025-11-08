import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Zap, Trash2, Info } from 'lucide-react';
import { TabInfo } from '@/types/tab';
import { getHighMemoryTabs, formatBytes } from '@/lib/memory-utils';
import { useToast } from '@/components/ui/use-toast';

interface OptimizeButtonProps {
  tabs: TabInfo[];
  onOptimize: (tabIds: number[]) => void;
  thresholdMB?: number;
}

export function OptimizeButton({
  tabs,
  onOptimize,
  thresholdMB = 100,
}: OptimizeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const highMemoryTabs = getHighMemoryTabs(tabs, thresholdMB);

  if (highMemoryTabs.length === 0) {
    return null;
  }

  const handleOptimize = () => {
    const tabIds = highMemoryTabs.map((tab) => tab.id);
    onOptimize(tabIds);
    setIsOpen(false);

    toast({
      title: 'Memory Optimized',
      description: `Closed ${highMemoryTabs.length} high-memory tab${highMemoryTabs.length > 1 ? 's' : ''}`,
    });
  };

  const totalMemory = highMemoryTabs.reduce(
    (sum, tab) => sum + (tab.memory || 0),
    0
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          className="gap-2"
        >
          <Zap className="h-4 w-4" />
          Optimize Memory
          <Badge variant="secondary" className="ml-1">
            {highMemoryTabs.length}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium text-sm">High Memory Tabs</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Found {highMemoryTabs.length} tab{highMemoryTabs.length > 1 ? 's' : ''} using
              over {thresholdMB} MB each
            </p>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {highMemoryTabs.slice(0, 5).map((tab) => (
              <div
                key={tab.id}
                className="flex items-center justify-between text-xs p-2 rounded-md bg-muted"
              >
                <span className="truncate flex-1">{tab.title}</span>
                <Badge variant="destructive" className="ml-2">
                  {formatBytes(tab.memory || 0)}
                </Badge>
              </div>
            ))}
            {highMemoryTabs.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                + {highMemoryTabs.length - 5} more
              </p>
            )}
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-muted-foreground">Total to free:</span>
              <span className="font-semibold">{formatBytes(totalMemory)}</span>
            </div>

            <Button
              onClick={handleOptimize}
              variant="destructive"
              size="sm"
              className="w-full gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Close {highMemoryTabs.length} Tab{highMemoryTabs.length > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
