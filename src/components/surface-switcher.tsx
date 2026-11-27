import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import {
  SURFACE_MODE_KEY,
  getSurfaceMode,
  resolveSurfaceMode,
  setSurfaceMode,
  type SurfaceMode,
} from '@/lib/surface-mode';

/**
 * State and actions for "what does the toolbar icon open" (side panel or popup).
 * `surface` is the surface this UI is currently rendered in.
 */
export function useSurfaceChoice(surface: SurfaceMode) {
  const { toast } = useToast();
  const [mode, setMode] = useState<SurfaceMode>(surface);

  useEffect(() => {
    let cancelled = false;
    void getSurfaceMode().then((m) => !cancelled && setMode(m));
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes[SURFACE_MODE_KEY]) {
        setMode(resolveSurfaceMode(changes[SURFACE_MODE_KEY].newValue));
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      cancelled = true;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  const choose = async (next: SurfaceMode) => {
    if (next === mode) return;
    try {
      await setSurfaceMode(next);
      setMode(next);
      toast({
        title: next === 'popup' ? 'Toolbar icon now opens a popup' : 'Toolbar icon now opens the side panel',
        description:
          surface === next ? undefined : 'Takes effect the next time you click the icon. You can switch back anytime.',
      });
    } catch (e) {
      toast({ title: 'Could not save preference', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    }
  };

  /** Open the side panel right now (works from the popup, which is a user gesture). */
  const openSidePanel = async () => {
    try {
      const win = await chrome.windows.getCurrent();
      if (win.id != null) await chrome.sidePanel.open({ windowId: win.id });
      window.close();
    } catch (e) {
      toast({ title: 'Could not open the side panel', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    }
  };

  return { mode, choose, openSidePanel };
}
