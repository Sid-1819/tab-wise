import { useEffect, useState } from 'react';
import { getWorkspaces } from '@/lib/workspace-storage';
import type { Workspace } from '@/types/workspace';

/** Live list of workspaces (stays in sync with storage changes from anywhere). */
export function useWorkspaceList(): Workspace[] {
  const [list, setList] = useState<Workspace[]>([]);
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      void getWorkspaces()
        .then((l) => {
          if (!cancelled) setList(l);
        })
        .catch(() => undefined);
    load();
    const onChanged = (c: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && c.workspaces) load();
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      cancelled = true;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);
  return list;
}
