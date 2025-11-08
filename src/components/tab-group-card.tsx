import { X } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TabGroup } from '@/types/tab';
import { TabItem } from '@/components/tab-item';

interface TabGroupCardProps {
  group: TabGroup;
  onCloseTab: (tabId: number) => void;
  onCloseAll: (tabIds: number[]) => void;
  onTabClick: (tabId: number) => void;
}

const DEFAULT_FAVICON = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>';

export function TabGroupCard({ group, onCloseTab, onCloseAll, onTabClick }: TabGroupCardProps) {
  const handleCloseAll = () => {
    const tabIds = group.tabs.map(tab => tab.id);
    onCloseAll(tabIds);
  };

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
          />
        ))}
      </CardContent>
    </Card>
  );
}
