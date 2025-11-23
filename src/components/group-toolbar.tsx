import { Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AutoGroupStrategy } from '@/types/tab';

interface GroupToolbarProps {
  onCreateGroup: () => void;
  autoGroupStrategy: AutoGroupStrategy;
  onStrategyChange: (strategy: AutoGroupStrategy) => void;
  enableAutoGrouping: boolean;
  onToggleAutoGrouping: (enabled: boolean) => void;
}

const STRATEGY_LABELS: Record<AutoGroupStrategy, string> = {
  domain: 'By Domain',
  'content-similarity': 'By Content',
  'time-of-day': 'By Time of Day',
  'activity-pattern': 'By Activity',
  'project-context': 'By Project',
};

export function GroupToolbar({
  onCreateGroup,
  autoGroupStrategy,
  onStrategyChange,
  enableAutoGrouping,
  onToggleAutoGrouping,
}: GroupToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onCreateGroup}
          title="Create a new custom group"
        >
          <Plus className="h-4 w-4 mr-1" />
          Create Group
        </Button>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-1" />
            Grouping Settings
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Grouping Settings</h4>
              <p className="text-sm text-muted-foreground">
                Configure how tabs are automatically grouped
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="auto-grouping" className="flex flex-col gap-1">
                <span>Auto-Grouping</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Enable automatic tab grouping
                </span>
              </Label>
              <Switch
                id="auto-grouping"
                checked={enableAutoGrouping}
                onCheckedChange={onToggleAutoGrouping}
              />
            </div>

            {enableAutoGrouping && (
              <div className="grid gap-2">
                <Label>Grouping Strategy</Label>
                <select
                  value={autoGroupStrategy}
                  onChange={(e) =>
                    onStrategyChange(e.target.value as AutoGroupStrategy)
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {Object.entries(STRATEGY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {autoGroupStrategy === 'domain' &&
                    'Group tabs by their domain name (default)'}
                  {autoGroupStrategy === 'content-similarity' &&
                    'Group tabs by content type and keywords'}
                  {autoGroupStrategy === 'time-of-day' &&
                    'Group tabs based on current time of day'}
                  {autoGroupStrategy === 'activity-pattern' &&
                    'Group tabs by activity type (work, social, etc.)'}
                  {autoGroupStrategy === 'project-context' &&
                    'Group tabs by project based on URL patterns'}
                </p>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
