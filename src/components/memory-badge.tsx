import { Badge } from '@/components/ui/badge';
import { formatBytes, bytesToMB, getMemoryStatus } from '@/lib/memory-utils';
import { MemoryStick } from 'lucide-react';

interface MemoryBadgeProps {
  memoryBytes?: number;
  showIcon?: boolean;
}

export function MemoryBadge({ memoryBytes, showIcon = true }: MemoryBadgeProps) {
  if (!memoryBytes || memoryBytes <= 0) {
    return null;
  }

  const memoryMB = bytesToMB(memoryBytes);
  const status = getMemoryStatus(memoryMB);

  const variantMap = {
    low: 'secondary',
    medium: 'default',
    high: 'warning',
    critical: 'destructive',
  } as const;

  return (
    <Badge variant={variantMap[status]} className="gap-1">
      {showIcon && <MemoryStick className="h-3 w-3" />}
      {formatBytes(memoryBytes)}
    </Badge>
  );
}
