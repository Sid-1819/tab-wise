import type { ChangeEvent, ReactNode } from 'react';
import { ChevronDown, FolderPlus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AutoGroupStrategy } from '@/types/tab';
import { cn } from '@/lib/utils';

interface GroupToolbarProps {
  onCreateGroup: () => void;
  autoGroupStrategy: AutoGroupStrategy;
  onStrategyChange: (strategy: AutoGroupStrategy) => void;
  enableAutoGrouping: boolean;
  onToggleAutoGrouping: (enabled: boolean) => void;
  lastUsedInterval?: number;
  onLastUsedIntervalChange?: (interval: number) => void;
  enableAutoDelete?: boolean;
  onToggleAutoDelete?: (enabled: boolean) => void;
  autoDeleteThreshold?: number;
  onAutoDeleteThresholdChange?: (threshold: number) => void;
  showNestedGroups?: boolean;
  onShowNestedGroupsChange?: (enabled: boolean) => void;
  chromeGroupsAvailable?: boolean;
  showChromeGroups?: boolean;
  onShowChromeGroupsChange?: (enabled: boolean) => void;
}

const STRATEGY_LABELS: Record<AutoGroupStrategy, string> = {
  domain: 'By Domain',
  'content-similarity': 'By Content',
  'time-of-day': 'By Time of Day',
  'activity-pattern': 'By Activity',
  'project-context': 'By Project',
  'last-used': 'By Last Used',
};

const STRATEGY_HINTS: Record<AutoGroupStrategy, string> = {
  domain: 'Group tabs by their domain name (default)',
  'content-similarity': 'Group tabs by content type and keywords',
  'time-of-day': 'Group tabs based on current time of day',
  'activity-pattern': 'Group tabs by activity type (work, social, etc.)',
  'project-context': 'Group tabs by project based on URL patterns',
  'last-used': 'Group tabs by when they were last visited',
};

function SettingRow({
  id,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="flex min-w-0 flex-col gap-0.5 text-xs font-medium leading-tight">
        <span>{title}</span>
        <span className="text-[11px] font-normal leading-snug text-muted-foreground">{description}</span>
      </Label>
      <Switch id={id} className="shrink-0" checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h5 className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{children}</h5>;
}

function FieldSelect({
  id,
  value,
  onChange,
  children,
}: {
  id: string;
  value: string | number;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={onChange}
        className={cn(
          'h-8 w-full appearance-none rounded-md border border-input bg-background py-0 pl-2.5 pr-8 text-xs text-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  );
}

export function GroupToolbar({
  onCreateGroup,
  autoGroupStrategy,
  onStrategyChange,
  enableAutoGrouping,
  onToggleAutoGrouping,
  lastUsedInterval = 1,
  onLastUsedIntervalChange,
  enableAutoDelete = false,
  onToggleAutoDelete,
  autoDeleteThreshold = 24 * 60 * 60 * 1000,
  onAutoDeleteThresholdChange,
  showNestedGroups = true,
  onShowNestedGroupsChange,
  chromeGroupsAvailable = false,
  showChromeGroups = true,
  onShowChromeGroupsChange,
}: GroupToolbarProps) {
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 shrink-0 p-0 text-muted-foreground"
        onClick={onCreateGroup}
        aria-label="Create a new custom group"
        title="New group"
      >
        <FolderPlus className="h-3.5 w-3.5" aria-hidden />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 shrink-0 p-0 text-muted-foreground"
            aria-label="Grouping settings"
            title="Grouping settings"
          >
            <Settings className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className="w-72 max-h-[min(var(--radix-popover-content-available-height),calc(100dvh-1rem))] overflow-y-auto p-3"
        >
          <div className="grid gap-3">
            <h4 className="text-[13px] font-semibold leading-none">Grouping</h4>

            <SettingRow
              id="auto-grouping"
              title="Auto-group tabs"
              description="Sort open tabs into groups automatically"
              checked={enableAutoGrouping}
              onCheckedChange={onToggleAutoGrouping}
            />

            {enableAutoGrouping && (
              <div className="grid gap-1.5">
                <Label htmlFor="grouping-strategy" className="text-xs font-medium">Group by</Label>
                <FieldSelect
                  id="grouping-strategy"
                  value={autoGroupStrategy}
                  onChange={(event) => onStrategyChange(event.target.value as AutoGroupStrategy)}
                >
                  {Object.entries(STRATEGY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </FieldSelect>
                <p className="text-[11px] leading-snug text-muted-foreground">{STRATEGY_HINTS[autoGroupStrategy]}</p>

                {autoGroupStrategy === 'last-used' && onLastUsedIntervalChange && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="last-used-interval" className="text-xs font-medium">Time interval</Label>
                    <FieldSelect
                      id="last-used-interval"
                      value={lastUsedInterval}
                      onChange={(event) => onLastUsedIntervalChange(Number(event.target.value))}
                    >
                      <option value={1}>1 hour</option>
                      <option value={2}>2 hours</option>
                      <option value={3}>3 hours</option>
                      <option value={4}>4 hours</option>
                    </FieldSelect>
                  </div>
                )}

                {autoGroupStrategy === 'domain' && onShowNestedGroupsChange && (
                  <div className="mt-1">
                    <SettingRow
                      id="nested-groups"
                      title="Nest subdomains"
                      description="Group subdomains inside their main domain"
                      checked={showNestedGroups}
                      onCheckedChange={onShowNestedGroupsChange}
                    />
                  </div>
                )}
              </div>
            )}

            {chromeGroupsAvailable && onShowChromeGroupsChange && (
              <SettingRow
                id="chrome-groups"
                title="Show Chrome groups"
                description="Include groups made in Chrome itself"
                checked={showChromeGroups}
                onCheckedChange={onShowChromeGroupsChange}
              />
            )}

            <div className="grid gap-3 border-t border-border/60 pt-3">
              <SectionTitle>Cleanup</SectionTitle>
              <SettingRow
                id="auto-delete"
                title="Surface stale tabs"
                description="Collect tabs you haven't visited in a while"
                checked={enableAutoDelete}
                onCheckedChange={(enabled) => onToggleAutoDelete?.(enabled)}
              />

              {enableAutoDelete && onAutoDeleteThresholdChange && (
                <div className="grid gap-1.5">
                  <Label htmlFor="delete-threshold" className="text-xs font-medium">Stale after</Label>
                  <FieldSelect
                    id="delete-threshold"
                    value={autoDeleteThreshold / (60 * 60 * 1000)}
                    onChange={(event) => onAutoDeleteThresholdChange(Number(event.target.value) * 60 * 60 * 1000)}
                  >
                    <option value={4}>4 hours</option>
                    <option value={8}>8 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours</option>
                    <option value={48}>48 hours</option>
                    <option value={168}>1 week</option>
                  </FieldSelect>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Tabs not visited within this time appear in a stale group.
                  </p>
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
