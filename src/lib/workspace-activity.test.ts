import { describe, expect, it } from 'vitest';
import {
  MAX_EVENTS,
  activeDays,
  dailyCounts,
  recordEvent,
  sanitizeActivity,
  workspaceStatus,
} from './workspace-activity';
import { addNote, addResources, createWorkspace, markOpened, sanitizeWorkspaces } from './workspace-model';
import { applyLeave } from './window-snapshot';

const DAY = 86_400_000;
const NOW = new Date(2026, 10, 8, 12, 0, 0).getTime();
const ok = (u: string) => u.startsWith('http');

describe('activity recording', () => {
  it('logs created, added (with label), resumed and note events newest-first', () => {
    let ws = createWorkspace('w', NOW - 4000);
    ws = addResources(ws, [{ url: 'https://a.com', title: 'A page' }], ok, NOW - 3000, 'menu').workspace;
    ws = markOpened(ws, NOW - 2000);
    ws = addNote(ws, 'hello', NOW - 1000);
    expect(ws.activity?.map((e) => e.type)).toEqual(['note', 'resumed', 'added', 'created']);
    expect(ws.activity?.[2]).toMatchObject({ count: 1, label: 'A page', via: 'menu' });
  });

  it('does not log duplicates or auto-folded tabs as user adds', () => {
    let ws = createWorkspace('w', 1);
    ws = addResources(ws, [{ url: 'https://a.com' }], ok, 2).workspace;
    const before = ws.activity?.length;
    ws = addResources(ws, [{ url: 'https://a.com' }], ok, 3).workspace;
    expect(ws.activity?.length).toBe(before);
    ws = addResources(ws, [{ url: 'https://b.com' }], ok, 4, 'auto').workspace;
    expect(ws.activity?.length).toBe(before);
  });

  it('records a left event when a leave snapshot is applied', () => {
    const ws = applyLeave(
      createWorkspace('w', 1),
      [{ url: 'https://a.com' }, { url: 'https://b.com' }],
      'window_closed',
      50,
    );
    expect(ws.activity?.[0]).toMatchObject({ type: 'left', count: 2, at: 50 });
  });

  it('caps the log', () => {
    let ws = createWorkspace('w', 1);
    for (let i = 0; i < MAX_EVENTS + 20; i++) ws = recordEvent(ws, { type: 'note' }, 10 + i);
    expect(ws.activity?.length).toBe(MAX_EVENTS);
    expect(ws.activity?.[0].at).toBe(10 + MAX_EVENTS + 19);
  });
});

describe('derived views', () => {
  it('buckets events per local day, oldest first', () => {
    let ws = createWorkspace('w', NOW - 20 * DAY);
    ws = recordEvent(ws, { type: 'note' }, NOW);
    ws = recordEvent(ws, { type: 'note' }, NOW - 1000);
    ws = recordEvent(ws, { type: 'note' }, NOW - 2 * DAY);
    const c = dailyCounts(ws, 5, NOW);
    expect(c).toEqual([0, 0, 1, 0, 2]);
    expect(activeDays(ws, NOW)).toBe(3); // includes the 'created' day, 20 days ago
  });

  it('classifies active / cooling / stale by idle time', () => {
    const ws = createWorkspace('w', NOW - 30 * DAY);
    expect(workspaceStatus(ws, NOW)).toBe('stale');
    expect(workspaceStatus(recordEvent(ws, { type: 'note' }, NOW - 4 * DAY), NOW)).toBe('cooling');
    expect(workspaceStatus(recordEvent(ws, { type: 'note' }, NOW - 1 * DAY), NOW)).toBe('active');
  });
});

describe('sanitizing', () => {
  it('drops malformed events and survives a round trip', () => {
    expect(sanitizeActivity('nope')).toBeUndefined();
    const out = sanitizeActivity([{ at: 1, type: 'note' }, { at: 'x', type: 'note' }, { at: 2, type: 'bogus' }, null]);
    expect(out).toEqual([{ at: 1, type: 'note', count: undefined, label: undefined, via: undefined }]);
    const ws = createWorkspace('w', 5);
    expect(sanitizeWorkspaces([ws])[0].activity?.[0].type).toBe('created');
  });
});
