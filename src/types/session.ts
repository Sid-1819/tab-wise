/** Serialized Chrome tab group metadata (from chrome.tabGroups) */
export interface SavedSessionChromeGroup {
  /** Stable key referenced by SavedSessionTab.chromeGroupKey */
  key: string;
  title?: string;
  color?: chrome.tabGroups.ColorEnum;
  collapsed?: boolean;
}

export interface SavedSessionTab {
  url: string;
  title?: string;
  pinned?: boolean;
  /** Set when snapshot included Chrome tab groups */
  chromeGroupKey?: string;
}

export interface NamedSession {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  tabs: SavedSessionTab[];
  chromeGroups?: SavedSessionChromeGroup[];
}

export type SessionRestoreTarget = 'current' | 'new';
