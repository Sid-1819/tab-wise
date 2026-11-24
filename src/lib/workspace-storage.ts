import type { Workspace } from '@/types/workspace';
import { sanitizeWorkspaces, sortWorkspaces } from '@/lib/workspace-model';

const STORAGE_KEY = 'workspaces' as const;

/**
 * chrome.storage has no transactions, so concurrent read-modify-write calls
 * (e.g. two quick edits) could overwrite each other. Serialize all writes.
 */
let writeQueue: Promise<unknown> = Promise.resolve();

function readRaw(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(result[STORAGE_KEY]);
    });
  });
}

function writeRaw(list: Workspace[]): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEY]: list }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

export async function getWorkspaces(): Promise<Workspace[]> {
  return sortWorkspaces(sanitizeWorkspaces(await readRaw()));
}

export async function getWorkspace(id: string): Promise<Workspace | undefined> {
  return (await getWorkspaces()).find((w) => w.id === id);
}

/** Apply `fn` to the stored list atomically (w.r.t. other calls in this context). */
function mutate(fn: (list: Workspace[]) => Workspace[]): Promise<Workspace[]> {
  const run = async () => {
    const current = sanitizeWorkspaces(await readRaw());
    const next = fn(current);
    await writeRaw(next);
    return sortWorkspaces(next);
  };
  const result = writeQueue.then(run, run);
  writeQueue = result.catch(() => undefined);
  return result;
}

export function upsertWorkspace(ws: Workspace): Promise<Workspace[]> {
  return mutate((list) => {
    const idx = list.findIndex((w) => w.id === ws.id);
    if (idx >= 0) {
      const copy = [...list];
      copy[idx] = ws;
      return copy;
    }
    return [...list, ws];
  });
}

/** Read the latest stored version, transform it, and persist (avoids stale-state overwrites). */
export function updateWorkspace(
  id: string,
  fn: (ws: Workspace) => Workspace,
): Promise<Workspace[]> {
  return mutate((list) => list.map((w) => (w.id === id ? fn(w) : w)));
}

export function deleteWorkspace(id: string): Promise<Workspace[]> {
  return mutate((list) => list.filter((w) => w.id !== id));
}

/** Add workspaces whose ids don't exist yet (used by one-time migrations). */
export function addMissingWorkspaces(items: Workspace[]): Promise<Workspace[]> {
  return mutate((list) => {
    const have = new Set(list.map((w) => w.id));
    return [...list, ...items.filter((w) => !have.has(w.id))];
  });
}
