import { X, Star, Edit2, ChevronRight, Bookmark } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TabGroup } from '@/types/tab';
import { TabItem } from '@/components/tab-item';
import { formatBytes, calculateTotalMemory } from '@/lib/memory-utils';
import { cn } from '@/lib/utils';

interface TabGroupCardProps {
  group: TabGroup;
  onCloseTab: (tabId: number) => void;
  onCloseAll: (tabIds: number[]) => void;
  onTabClick: (tabId: number) => void;
  showMemory?: boolean;
  onToggleFavorite?: (groupId: string) => void;
  onEditGroup?: (groupId: string) => void;
  onConvertToCustom?: (group: TabGroup) => void;
  isNested?: boolean;
  nestLevel?: number;
}

const DEFAULT_FAVICON = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>';

export function TabGroupCard({
  group,
  onCloseTab,
  onCloseAll,
  onTabClick,
  showMemory = true,
  onToggleFavorite,
  onEditGroup,
  onConvertToCustom,
  isNested = false,
  nestLevel: _nestLevel = 0,
}: TabGroupCardProps) {
  const handleCloseAll = () => {
    const tabIds = group.tabs.map((tab) => tab.id);
    onCloseAll(tabIds);
  };

  const totalMemory = calculateTotalMemory(group.tabs);
  const hasMemoryData = totalMemory > 0;

  const displayName = group.customName || group.domain;
  const isCustomGroup = group.type === 'custom';

  return (
    <Card
      className={cn(
        isNested && 'ml-6 border-l-4',
        isNested && group.color && `border-l-[${group.color}]`
      )}
      style={
        isNested && group.color
          ? { borderLeftColor: group.color }
          : group.color && isCustomGroup
          ? { borderTopColor: group.color, borderTopWidth: '3px' }
          : undefined
      }
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          {isNested && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          {!isCustomGroup && (
            <img
              src={group.favicon || DEFAULT_FAVICON}
              alt=""
              className="w-4 h-4 rounded"
              onError={(e) => {
                e.currentTarget.src = DEFAULT_FAVICON;
              }}
            />
          )}
          {isCustomGroup && group.color && (
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: group.color }}
            />
          )}
          <span className="font-medium">
            {displayName} ({group.tabs.length})
          </span>
          {group.isFavorite && (
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          )}
          {showMemory && hasMemoryData && (
            <Badge variant="outline" className="font-mono text-xs">
              {formatBytes(totalMemory)}
            </Badge>
          )}
          {isCustomGroup && (
            <Badge variant="secondary" className="text-xs">
              Custom
            </Badge>
          )}
          {group.autoGroupStrategy && group.autoGroupStrategy !== 'domain' && (
            <Badge variant="outline" className="text-xs">
              {group.autoGroupStrategy.replace('-', ' ')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isCustomGroup && onConvertToCustom && (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => onConvertToCustom(group)}
              title="Convert to custom group"
            >
              <Bookmark className="h-3 w-3 mr-1" />
              Save
            </Button>
          )}
          {isCustomGroup && onToggleFavorite && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onToggleFavorite(group.id)}
              title={group.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star
                className={cn(
                  'h-4 w-4',
                  group.isFavorite && 'fill-yellow-400 text-yellow-400'
                )}
              />
            </Button>
          )}
          {isCustomGroup && onEditGroup && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onEditGroup(group.id)}
              title="Edit group"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            className="h-8"
            onClick={handleCloseAll}
          >
            <X className="h-3 w-3 mr-1" />
            Close All
          </Button>
        </div>
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
