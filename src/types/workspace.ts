import type { SavedSessionChromeGroup, SavedSessionTab } from '@/types/session';

export const WORKSPACE_SCHEMA_VERSION = 1 as const;

export type WorkspaceResourceKind = 'tab' | 'link';

export interface WorkspaceResource {
  id: string;
  kind: WorkspaceResourceKind;
  url: string;
  title?: string;
  pinned?: boolean;
  /** Optional per-resource remark, e.g. "why this tab matters". */
  remark?: string;
  addedAt: number;
}

export interface WorkspaceNote {
  id: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

/** User-authored project context: what you're doing and what happens next. */
export interface WorkspaceContext {
  currentFocus: string;
  nextAction: string;
  blockers: string;
  waitingOn: string;
}

/** A tab as it was when the user last left the workspace's window. */
export interface LeftTab {
  url: string;
  title?: string;
  pinned?: boolean;
}

export type LeaveReason = 'window_closed' | 'browser_closed';

/**
 * Auto-captured "where you left off". Derived from tab state only
 * (URLs, titles, Chrome's lastAccessed) — never from page content.
 */
export interface LastLeft {
  at: number;
  reason: LeaveReason;
  tabs: LeftTab[];
  /** The tab the user was on most recently when they left. */
  lastActive?: { url: string; title?: string };
}

export type ActivityType = 'created' | 'added' | 'left' | 'resumed' | 'note';

/**
 * One thing that happened in a workspace. Powers the timeline, activity strip and
 * status. Counts and titles only — no page content.
 */
export interface ActivityEvent {
  at: number;
  type: ActivityType;
  /** Tabs added / tabs left open, where relevant. */
  count?: number;
  /** Short label, e.g. the title of an added page. */
  label?: string;
  /** Where an 'added' event came from. */
  via?: 'manual' | 'menu' | 'shortcut' | 'suggestion';
}

/**
 * A saved window state (from "Save window" or an imported session). Unlike lastLeft it
 * can carry Chrome tab-group names and colors, so restoring brings the groups back.
 */
export interface SavedSnapshot {
  at: number;
  tabs: SavedSessionTab[];
  chromeGroups?: SavedSessionChromeGroup[];
}

/**
 * Set when the user comes back to a workspace they had left. Drives the one-time
 * "welcome back" card; consumed (cleared) when dismissed, replaced by the next leave.
 */
export interface WelcomeBack {
  /** When they came back. */
  at: number;
  /** When they had left. */
  leftAt: number;
  lastActive?: { url: string; title?: string };
  tabCount: number;
}

export interface Workspace {
  id: string;
  schemaVersion: typeof WORKSPACE_SCHEMA_VERSION;
  name: string;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt?: number;
  archived?: boolean;
  /** 'auto' when created from an accepted project suggestion. */
  origin?: 'manual' | 'auto' | 'imported';
  /** Snapshot captured automatically when the window closed. */
  lastLeft?: LastLeft;
  welcomeBack?: WelcomeBack;
  /** Saved window state incl. tab groups (see SavedSnapshot). */
  snapshot?: SavedSnapshot;
  context: WorkspaceContext;
  resources: WorkspaceResource[];
  notes: WorkspaceNote[];
  /** Newest first, capped (see workspace-activity). */
  activity?: ActivityEvent[];
}

export type WorkspaceRestoreTarget = 'current' | 'new';
