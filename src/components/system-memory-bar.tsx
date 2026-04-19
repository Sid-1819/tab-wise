import { HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useSystemMemory } from '@/hooks/use-system-memory';
import { formatMemoryBytes } from '@/lib/system-memory';
import { cn } from '@/lib/utils';

export function SystemMemoryBar() {
  const { data, permissionGranted, loading, error, requestPermission } = useSystemMemory();

  if (!permissionGranted) {
    return (
      <div className="flex items-center justify-between gap-2 mb-2 p-2 rounded-md bg-muted/50">
        <span className="text-xs text-muted-foreground">System RAM</span>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={requestPermission}>
          Show system memory
        </Button>
      </div>
    );
  }

  const usedFraction =
    data && data.capacity > 0
      ? Math.min(
          1,
          Math.max(0, (data.capacity - data.availableCapacity) / data.capacity)
        )
      : 0;

  return (
    <div className="mb-2 p-2 rounded-md bg-muted/50">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-medium text-foreground truncate">System RAM</span>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground shrink-0 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="About system memory"
              >
                <HardDrive className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 text-sm" align="start">
              <div className="font-medium mb-1">System RAM</div>
              <div className="text-muted-foreground text-xs">
                Physical memory for this computer (total and available). This is not per-tab Chrome
                memory; individual tabs are not broken out here.
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {loading && !data ? (
          <span className="text-xs text-muted-foreground">Loading…</span>
        ) : data ? (
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {formatMemoryBytes(data.capacity - data.availableCapacity)} /{' '}
            {formatMemoryBytes(data.capacity)}
          </span>
        ) : null}
      </div>

      {data && data.capacity > 0 && (
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full bg-primary transition-[width] duration-300')}
            style={{ width: `${usedFraction * 100}%` }}
          />
        </div>
      )}

      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
    </div>
  );
}
