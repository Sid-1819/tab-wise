import { Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DuplicateCluster } from '@/lib/url-normalize';

interface DuplicateBannerProps {
  clusters: DuplicateCluster[];
  extraTabCount: number;
  onCloseDuplicates: () => void;
  onDismiss: () => void;
}

export function DuplicateBanner({
  clusters,
  extraTabCount,
  onCloseDuplicates,
  onDismiss,
}: DuplicateBannerProps) {
  if (clusters.length === 0) return null;

  return (
    <div className="flex items-center justify-between gap-2 mb-3 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <Copy className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
        <span className="truncate">
          {clusters.length} duplicate URL{clusters.length === 1 ? '' : 's'} —{' '}
          {extraTabCount} extra tab{extraTabCount === 1 ? '' : 's'}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={onCloseDuplicates}>
          Close extras
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={onDismiss}
          title="Hide until tabs change"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
