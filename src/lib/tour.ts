/** One-time "what's new in 3.0" tour shown in the panel after install or upgrade. */
export const TOUR_KEY = 'tourSeenV3' as const;

export interface TourStep {
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: 'Workspaces keep each project together',
    body: 'Open Workspaces to save the pages a project needs, write your next step, and keep notes beside them. Tab Wise offers to save a window that looks like one project.',
  },
  {
    title: 'Adding pages takes no effort',
    body: 'Right-click any page, link or selected text to add it. Alt+Shift+W adds the current tab. Press Ctrl/Cmd+K and type “switch to” to jump between projects. Close a window and Tab Wise remembers where you left off.',
  },
  {
    title: 'You stay in control',
    body: 'The shield icon shows what is stored, turns features off, and exports a backup. Your saved sessions are now workspaces under Archived; nothing was deleted.',
  },
];

export function shouldShowTour(stored: unknown): boolean {
  return stored !== true;
}

export function markTourSeen(): Promise<void> {
  return new Promise((resolve) => chrome.storage.local.set({ [TOUR_KEY]: true }, () => resolve()));
}

export function readTourSeen(): Promise<boolean> {
  return new Promise((resolve) =>
    chrome.storage.local.get([TOUR_KEY], (r) => resolve(!shouldShowTour(r[TOUR_KEY]))),
  );
}
