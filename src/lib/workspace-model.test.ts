import { describe, expect, it } from 'vitest';
import {
  addNote,
  addResources,
  createWorkspace,
  deleteNote,
  isWorkspaceUrl,
  markOpened,
  removeResource,
  renameWorkspace,
  sanitizeWorkspaces,
  setArchived,
  sortWorkspaces,
  updateContext,
  updateNote,
} from './workspace-model';

const usable = (u: string) => u.startsWith('http');

describe('createWorkspace', () => {
  it('trims the name and falls back when empty', () => {
    expect(createWorkspace('  Client A ').name).toBe('Client A');
    expect(createWorkspace('   ').name).toBe('Untitled workspace');
  });
});

describe('addResources', () => {
  it('adds new resources and bumps updatedAt', () => {
    const ws = createWorkspace('w', 1);
    const r = addResources(ws, [{ url: 'https://a.com', title: 'A' }], usable, 5);
    expect(r.added).toBe(1);
    expect(r.workspace.resources[0].title).toBe('A');
    expect(r.workspace.updatedAt).toBe(5);
  });

  it('dedupes by normalized URL (tracking params, www, existing items)', () => {
    let ws = createWorkspace('w', 1);
    ws = addResources(ws, [{ url: 'https://www.a.com/x?utm_source=z' }], usable).workspace;
    const r = addResources(
      ws,
      [{ url: 'https://a.com/x' }, { url: 'https://a.com/x' }, { url: 'https://b.com' }],
      usable,
    );
    expect(r.added).toBe(1);
    expect(r.duplicates).toBe(2);
    expect(r.workspace.resources).toHaveLength(2);
  });

  it('skips unusable and empty URLs without changing the workspace', () => {
    const ws = createWorkspace('w', 1);
    const r = addResources(ws, [{ url: 'chrome://settings' }, { url: '  ' }], usable, 9);
    expect(r.skipped).toBe(2);
    expect(r.workspace).toBe(ws);
  });
});

describe('resources and context', () => {
  it('removes a resource, ignoring unknown ids', () => {
    const ws = addResources(createWorkspace('w', 1), [{ url: 'https://a.com' }], usable).workspace;
    expect(removeResource(ws, 'nope')).toBe(ws);
    expect(removeResource(ws, ws.resources[0].id).resources).toHaveLength(0);
  });

  it('updates context fields independently', () => {
    const ws = updateContext(createWorkspace('w'), { nextAction: 'Email client' });
    const ws2 = updateContext(ws, { waitingOn: 'Brand colors' });
    expect(ws2.context).toMatchObject({ nextAction: 'Email client', waitingOn: 'Brand colors' });
  });

  it('rename ignores blank names', () => {
    const ws = createWorkspace('w');
    expect(renameWorkspace(ws, '  ')).toBe(ws);
    expect(renameWorkspace(ws, 'New').name).toBe('New');
  });

  it('markOpened does not change updatedAt', () => {
    const ws = createWorkspace('w', 10);
    const opened = markOpened(ws, 99);
    expect(opened.lastOpenedAt).toBe(99);
    expect(opened.updatedAt).toBe(10);
  });
});

describe('notes', () => {
  it('adds newest first, ignores blank, edits, and deletes', () => {
    let ws = createWorkspace('w', 1);
    expect(addNote(ws, '   ')).toBe(ws);
    ws = addNote(ws, 'first', 2);
    ws = addNote(ws, 'second', 3);
    expect(ws.notes.map((n) => n.body)).toEqual(['second', 'first']);
    ws = updateNote(ws, ws.notes[0].id, 'second!', 4);
    expect(ws.notes[0].body).toBe('second!');
    ws = updateNote(ws, ws.notes[0].id, '   ', 5); // blank edit deletes
    expect(ws.notes.map((n) => n.body)).toEqual(['first']);
    expect(deleteNote(ws, 'missing')).toBe(ws);
  });
});

describe('sortWorkspaces', () => {
  it('orders by recent activity and sinks archived', () => {
    const a = { ...createWorkspace('a', 1), updatedAt: 100 };
    const b = { ...createWorkspace('b', 1), updatedAt: 50, lastOpenedAt: 200 };
    const c = setArchived({ ...createWorkspace('c', 1), updatedAt: 999 }, true, 999);
    expect(sortWorkspaces([a, c, b]).map((w) => w.name)).toEqual(['b', 'a', 'c']);
  });
});

describe('sanitizeWorkspaces', () => {
  it('returns [] for non-arrays and drops malformed entries', () => {
    expect(sanitizeWorkspaces(undefined)).toEqual([]);
    expect(sanitizeWorkspaces({})).toEqual([]);
    const good = createWorkspace('ok');
    const out = sanitizeWorkspaces([null, 5, { id: 1 }, good]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(good.id);
  });

  it('fills missing fields on partially-formed records', () => {
    const out = sanitizeWorkspaces([{ id: 'x', name: 'n', resources: [{ id: 'r', url: 'u' }, {}] }]);
    expect(out[0].context.nextAction).toBe('');
    expect(out[0].notes).toEqual([]);
    expect(out[0].resources).toHaveLength(1);
  });
});

describe('isWorkspaceUrl', () => {
  it('accepts only http(s) pages', () => {
    expect(isWorkspaceUrl('https://a.com/x')).toBe(true);
    expect(isWorkspaceUrl('http://localhost:3000')).toBe(true);
    for (const u of ['about:blank', 'chrome://settings', 'chrome-extension://abc/p.html', 'file:///a', 'javascript:1', '', 'nope']) {
      expect(isWorkspaceUrl(u)).toBe(false);
    }
  });
});
