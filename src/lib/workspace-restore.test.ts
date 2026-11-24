import { describe, expect, it } from 'vitest';
import { restoreSource } from './workspace-restore';
import { createWorkspace } from './workspace-model';
import { planMigration, sessionToWorkspace, migratedId } from './session-migration';
import type { NamedSession } from '@/types/session';

const session: NamedSession = {
  id: 's1',
  name: 'Sprint 12',
  createdAt: 1000,
  updatedAt: 2000,
  tabs: [
    { url: 'https://a.com/', title: 'A', chromeGroupKey: 'g1' },
    { url: 'https://b.com/', pinned: true },
    { url: 'chrome://settings' },
  ],
  chromeGroups: [
    { key: 'g1', title: 'Docs', color: 'blue' },
    { key: 'g2', title: 'Unused', color: 'red' },
  ],
};

describe('sessionToWorkspace', () => {
  it('keeps tabs, groups and timestamps; archives; skips unrestorable and unused groups', () => {
    const ws = sessionToWorkspace(session);
    expect(ws).toMatchObject({ id: migratedId('s1'), name: 'Sprint 12', archived: true, origin: 'imported', createdAt: 1000, updatedAt: 2000 });
    expect(ws.snapshot?.tabs.map((t) => t.url)).toEqual(['https://a.com/', 'https://b.com/']);
    expect(ws.snapshot?.chromeGroups).toEqual([{ key: 'g1', title: 'Docs', color: 'blue' }]);
    expect(ws.resources.map((r) => r.url)).toEqual(['https://a.com/']); // pinned excluded from curated list
    expect(ws.activity?.[0].type).toBe('created');
  });
  it('handles an empty session', () => {
    const ws = sessionToWorkspace({ ...session, tabs: [] });
    expect(ws.snapshot).toBeUndefined();
  });
});

describe('planMigration', () => {
  it('is idempotent and ignores malformed sessions', () => {
    const first = planMigration([session, { bad: true } as unknown as NamedSession], []);
    expect(first).toHaveLength(1);
    expect(planMigration([session], first)).toEqual([]);
  });
});

describe('restoreSource', () => {
  it('prefers the newest of left-state and snapshot, else resources', () => {
    const base = createWorkspace('w', 1);
    expect(restoreSource(base).from).toBe('resources');
    const snap = { at: 10, tabs: [{ url: 'https://s.com/' }], chromeGroups: [{ key: 'g', title: 'T' }] };
    const left = { at: 20, reason: 'window_closed' as const, tabs: [{ url: 'https://l.com/' }] };
    expect(restoreSource({ ...base, snapshot: snap }).from).toBe('snapshot');
    expect(restoreSource({ ...base, lastLeft: left }).from).toBe('left');
    expect(restoreSource({ ...base, snapshot: snap, lastLeft: left }).from).toBe('left');
    expect(restoreSource({ ...base, snapshot: { ...snap, at: 30 }, lastLeft: left }).from).toBe('snapshot');
  });
});
