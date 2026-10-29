import { Clock, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STALE_THRESHOLD_OPTIONS } from '@/lib/activity-format';

interface StaleTabsBannerProps {
  tabs: { id: number; title: string }[];
  discardCount: number;
  thresholdMs: number;
  onThresholdChange: (ms: number) => void;
  onClose: () => void;
  onDiscard: () => void;
}

export function StaleTabsBanner({
  tabs,
  discardCount,
  thresholdMs,
  onThresholdChange,
  onClose,
  onDiscard,
}: StaleTabsBannerProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="mb-3 rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {tabs.length} unused tab{tabs.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <label className="sr-only" htmlFor="stale-threshold">
            Unused for
          </label>
          <select
            id="stale-threshold"
            className="h-7 rounded-md border border-input bg-background px-1.5 text-xs"
            value={thresholdMs}
            onChange={(event) => onThresholdChange(Number(event.target.value))}
          >
            {STALE_THRESHOLD_OPTIONS.map((option) => (
              <option key={option.ms} value={option.ms}>
                {option.label}
              </option>
            ))}
          </select>
          {discardCount > 0 && (
            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={onDiscard}>
              <Moon className="mr-1 h-3.5 w-3.5" />
              Sleep
            </Button>
          )}
          <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
      <ul className="mt-2 max-h-24 space-y-0.5 overflow-y-auto">
        {tabs.map((tab) => (
          <li key={tab.id} className="truncate text-xs text-muted-foreground" title={tab.title}>
            {tab.title || 'Untitled'}
          </li>
        ))}
      </ul>
    </div>
  );
}
