import type { Workspace } from '@/types/workspace';
import { nameForNew } from '@/lib/workspace-menu';

/**
 * First-run guidance: a brand-new user with no workspaces gets one friendly card that saves
 * the current window as a workspace and asks for a next step. It is shown once — saving or
 * dismissing it marks it done, so it never nags someone who deleted their workspaces later.
 */
export const FIRST_WORKSPACE_DONE_KEY = 'firstWorkspaceDone' as const;

export interface FirstWorkspaceInput {
  workspaces: Workspace[];
  /** Saved or dismissed before. */
  done: boolean;
  /** Pinned tabs and non-web pages don't count. */
  savableTabCount: number;
}

export function shouldOfferFirstWorkspace({ workspaces, done, savableTabCount }: FirstWorkspaceInput): boolean {
  if (done || savableTabCount < 1) return false;
  // Archived workspaces come from migrated sessions; they don't mean the user has started one.
  return !workspaces.some((w) => !w.archived);
}

/** Prefer the detected project name, then something derived from the first tab. */
export function firstWorkspaceName(
  detectedName: string | null | undefined,
  tabs: { url: string; title?: string }[],
): string {
  if (detectedName?.trim()) return detectedName.trim();
  if (tabs.length === 0) return 'My first project';
  return nameForNew(tabs, tabs[0]);
}

export function readFirstWorkspaceDone(): Promise<boolean> {
  return new Promise((resolve) =>
    chrome.storage.local.get([FIRST_WORKSPACE_DONE_KEY], (r) => resolve(r[FIRST_WORKSPACE_DONE_KEY] === true)),
  );
}

export function markFirstWorkspaceDone(): Promise<void> {
  return new Promise((resolve) =>
    chrome.storage.local.set({ [FIRST_WORKSPACE_DONE_KEY]: true }, () => resolve()),
  );
}
