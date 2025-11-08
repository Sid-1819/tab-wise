import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatBytes } from '@/lib/memory-utils';
import { AlertTriangle, CheckCircle, HardDrive, Activity } from 'lucide-react';
import { MemoryInfo } from '@/types/tab';

interface SystemMemoryCardProps {
  visible?: boolean;
}

export function SystemMemoryCard({ visible = true }: SystemMemoryCardProps) {
  const [systemMemory, setSystemMemory] = useState<MemoryInfo | null>(null);
  const [browserMemory, setBrowserMemory] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMemoryInfo();
    const interval = setInterval(loadMemoryInfo, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const loadMemoryInfo = async () => {
    try {
      // Load system memory
      if (chrome.system && chrome.system.memory) {
        chrome.system.memory.getInfo((info) => {
          setSystemMemory(info);
        });
      }

      // Load browser memory (only available on Chrome Dev/Canary)
      await loadBrowserMemory();

      setLoading(false);
    } catch (error) {
      console.error('Failed to get memory info:', error);
      setLoading(false);
    }
  };

  const loadBrowserMemory = async () => {
    try {
      const chromeWithProcesses = chrome as any;

      if (!chromeWithProcesses.processes || !chromeWithProcesses.processes.getProcessInfo) {
        return;
      }

      const processes = await new Promise<any>((resolve) => {
        chromeWithProcesses.processes.getProcessInfo([], true, (info: any) => {
          resolve(info);
        });
      });

      // Sum up all Chrome process memory
      let totalBrowserMemory = 0;
      Object.values(processes).forEach((process: any) => {
        if (process.privateMemory) {
          totalBrowserMemory += process.privateMemory;
        }
      });

      setBrowserMemory(totalBrowserMemory);
    } catch (error) {
      console.debug('Browser memory tracking not available:', error);
    }
  };

  if (!visible || loading || !systemMemory) {
    return null;
  }

  const usedMemory = systemMemory.capacity - systemMemory.availableCapacity;
  const usedPercentage = (usedMemory / systemMemory.capacity) * 100;
  const availablePercentage = (systemMemory.availableCapacity / systemMemory.capacity) * 100;
  const browserPercentage = browserMemory > 0 ? (browserMemory / systemMemory.capacity) * 100 : 0;

  // Determine memory pressure level
  const getMemoryStatus = () => {
    if (availablePercentage > 30) return { level: 'healthy', color: 'text-green-600', icon: CheckCircle };
    if (availablePercentage > 15) return { level: 'moderate', color: 'text-orange-500', icon: AlertTriangle };
    return { level: 'critical', color: 'text-red-600', icon: AlertTriangle };
  };

  const status = getMemoryStatus();
  const StatusIcon = status.icon;

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">System Memory</span>
            </div>
            <Badge variant="outline" className="font-mono">
              {formatBytes(systemMemory.capacity)}
            </Badge>
          </div>

          {/* Browser Memory Usage */}
          {browserMemory > 0 && (
            <div className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded-md">
              <div className="flex items-center gap-1.5">
                <Activity className="h-3 w-3 text-blue-500" />
                <span className="text-muted-foreground">Browser Usage:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-blue-600">
                  {formatBytes(browserMemory)}
                </span>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {browserPercentage.toFixed(1)}%
                </Badge>
              </div>
            </div>
          )}

          {/* Memory Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>System Used: {formatBytes(usedMemory)}</span>
              <span>Available: {formatBytes(systemMemory.availableCapacity)}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  status.level === 'healthy'
                    ? 'bg-green-500'
                    : status.level === 'moderate'
                    ? 'bg-orange-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${usedPercentage}%` }}
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <StatusIcon className={`h-3 w-3 ${status.color}`} />
              <span className={status.color}>
                {usedPercentage.toFixed(1)}% system used • {availablePercentage.toFixed(1)}% available
              </span>
            </div>
          </div>

          {/* Warning if memory is low */}
          {status.level === 'critical' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                System memory is critically low. Consider closing some tabs to free up memory.
              </AlertDescription>
            </Alert>
          )}

          {status.level === 'moderate' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                System memory usage is high. Closing unused tabs may improve performance.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
