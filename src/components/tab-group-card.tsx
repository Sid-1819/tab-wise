import { X } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TabGroup } from '@/types/tab';
import { TabItem } from '@/components/tab-item';
import { formatBytes, calculateTotalMemory } from '@/lib/memory-utils';

interface TabGroupCardProps {
  group: TabGroup;
  onCloseTab: (tabId: number) => void;
  onCloseAll: (tabIds: number[]) => void;
  onTabClick: (tabId: number) => void;
  showMemory?: boolean;
}

const DEFAULT_FAVICON = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>';

export function TabGroupCard({ group, onCloseTab, onCloseAll, onTabClick, showMemory = true }: TabGroupCardProps) {
  const handleCloseAll = () => {
    const tabIds = group.tabs.map(tab => tab.id);
    onCloseAll(tabIds);
  };

  const totalMemory = calculateTotalMemory(group.tabs);
  const hasMemoryData = totalMemory > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <img
            src={group.favicon || DEFAULT_FAVICON}
            alt=""
            className="w-4 h-4 rounded"
            onError={(e) => {
              e.currentTarget.src = DEFAULT_FAVICON;
            }}
          />
          <span className="font-medium">
            {group.domain} ({group.tabs.length})
          </span>
          {showMemory && hasMemoryData && (
            <Badge variant="outline" className="font-mono text-xs">
              {formatBytes(totalMemory)}
            </Badge>
          )}
        </div>
        <Button
          variant="destructive"
          size="sm"
          className="h-8"
          onClick={handleCloseAll}
        >
          <X className="h-3 w-3 mr-1" />
          Close All
        </Button>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {group.tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            onClose={onCloseTab}
            onClick={onTabClick}
            showMemory={showMemory}
          />
        ))}
      </CardContent>
    </Card>
  );
}
