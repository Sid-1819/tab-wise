import { describe, expect, it } from 'vitest';
import { applyLeave, buildLastLeft, clearLeave, pickLastActive } from './window-snapshot';
import { addResources, createWorkspace, isWorkspaceUrl, sanitizeWorkspaces } from './workspace-model';

const tabs = [
  { url: 'https://a.com/1', title: 'One', lastAccessed: 100 },
  { url: 'https://a.com/2', title: 'Two', lastAccessed: 300 },
  { url: 'https://a.com/3', title: 'Three', lastAccessed: 200, pinned: true },
  { url: 'chrome://settings', title: 'Settings', lastAccessed: 999 },
];

describe('pickLastActive', () => {
  it('picks the most recently accessed web tab', () => {
    expect(pickLastActive(tabs)).toEqual({ url: 'https://a.com/2', title: 'Two' });
  });
  it('falls back to the active tab, then the first', () => {
    expect(pickLastActive([{ url: 'https://x.com/1' }, { url: 'https://x.com/2', active: true }])?.url).toBe('https://x.com/2');
    expect(pickLastActive([{ url: 'https://x.com/1' }, { url: 'https://x.com/2' }])?.url).toBe('https://x.com/1');
    expect(pickLastActive([{ url: 'chrome://x' }])).toBeUndefined();
  });
});

describe('buildLastLeft / applyLeave', () => {
  it('keeps only web tabs and records the last active one', () => {
    const l = buildLastLeft(tabs, 'window_closed', 5)!;
    expect(l.tabs.map((t) => t.url)).toEqual(['https://a.com/1', 'https://a.com/2', 'https://a.com/3']);
    expect(l.lastActive?.title).toBe('Two');
    expect(buildLastLeft([{ url: 'chrome://x' }], 'window_closed', 5)).toBeNull();
  });

  it('adds unseen tabs to resources (not pinned) and never removes existing ones', () => {
    let ws = createWorkspace('W', 1);
    ws = addResources(ws, [{ url: 'https://a.com/1' }, { url: 'https://old.com/9' }], isWorkspaceUrl).workspace;
    const out = applyLeave(ws, tabs, 'browser_closed', 50);
    const urls = out.resources.map((r) => r.url);
    expect(urls).toContain('https://old.com/9'); // kept although not open at leave
    expect(urls).toContain('https://a.com/2'); // newly seen
    expect(urls).not.toContain('https://a.com/3'); // pinned ignored
    expect(out.lastLeft).toMatchObject({ at: 50, reason: 'browser_closed' });
  });

  it('returns the workspace untouched when no web tabs', () => {
    const ws = createWorkspace('W', 1);
    expect(applyLeave(ws, [{ url: 'chrome://x' }], 'window_closed', 1)).toBe(ws);
  });

  it('clearLeave removes lastLeft', () => {
    const ws = applyLeave(createWorkspace('W', 1), tabs, 'window_closed', 5);
    expect(clearLeave(ws).lastLeft).toBeUndefined();
  });
});

describe('sanitizeWorkspaces keeps lastLeft', () => {
  it('round-trips and drops malformed lastLeft', () => {
    const ws = applyLeave(createWorkspace('W', 1), tabs, 'window_closed', 5);
    expect(sanitizeWorkspaces([ws])[0].lastLeft?.lastActive?.title).toBe('Two');
    expect(sanitizeWorkspaces([{ id: 'x', name: 'n', lastLeft: { at: 'bad' } }])[0].lastLeft).toBeUndefined();
  });
});
