import { describe, expect, it } from 'vitest';
import { backupFileName, buildBackup, mergeWorkspaces, parseBackup } from './backup';
import { DEFAULT_SETTINGS, resolveSettings } from './settings';
import { clearActivityLog, clearLeaveState, formatBytes, summarize } from './data-controls';
import { addNote, createWorkspace } from './workspace-model';

describe('backup round trip', () => {
  it('exports and re-imports workspaces and settings', () => {
    const ws = addNote(createWorkspace('A', 5), 'hi', 6);
    const text = JSON.stringify(buildBackup([ws], { autoCapture: false, websiteAccess: true }, 99));
    const r = parseBackup(text);
    expect(r.ok && r.workspaces[0].notes[0].body).toBe('hi');
    expect(r.ok && r.settings).toEqual({ autoCapture: false, websiteAccess: true });
    expect(backupFileName(new Date(2026, 10, 9).getTime())).toBe('tabwise-backup-2026-11-09.json');
  });
  it('rejects junk, other apps, newer versions, and huge files', () => {
    expect(parseBackup('nope')).toMatchObject({ ok: false });
    expect(parseBackup(JSON.stringify({ app: 'other', version: 1, workspaces: [] }))).toMatchObject({ ok: false });
    expect(parseBackup(JSON.stringify({ app: 'tabwise', version: 99, workspaces: [] }))).toMatchObject({ ok: false, error: expect.stringContaining('newer') });
    expect(parseBackup(JSON.stringify({ app: 'tabwise', version: 1 }))).toMatchObject({ ok: false });
    expect(parseBackup('x'.repeat(26 * 1024 * 1024))).toMatchObject({ ok: false });
  });
  it('drops malformed workspaces instead of failing the whole import', () => {
    const r = parseBackup(JSON.stringify({ app: 'tabwise', version: 1, workspaces: [{ bad: 1 }, createWorkspace('ok', 1)] }));
    expect(r.ok && r.workspaces.map((w) => w.name)).toEqual(['ok']);
  });
});

describe('mergeWorkspaces', () => {
  it('adds new, prefers newer copies, never deletes', () => {
    const a = createWorkspace('A', 1);
    const b = createWorkspace('B', 1);
    const aNewer = { ...a, name: 'A2', updatedAt: 10 };
    const bOlder = { ...b, name: 'B-old', updatedAt: 0 };
    const c = createWorkspace('C', 1);
    const r = mergeWorkspaces([a, b], [aNewer, bOlder, c]);
    expect(r).toMatchObject({ added: 1, updated: 1, unchanged: 1 });
    expect(r.merged.map((w) => w.name).sort()).toEqual(['A2', 'B', 'C']);
    expect(mergeWorkspaces([a], []).merged).toHaveLength(1);
  });
});

describe('settings + data controls', () => {
  it('defaults on and tolerates garbage', () => {
    expect(resolveSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(resolveSettings({ autoCapture: 'no', websiteAccess: false })).toEqual({ autoCapture: true, websiteAccess: false });
  });
  it('summarizes and clears only what it should', () => {
    let ws = addNote(createWorkspace('A', 1), 'n', 2);
    ws = { ...ws, lastLeft: { at: 1, reason: 'window_closed', tabs: [] }, welcomeBack: { at: 2, leftAt: 1, tabCount: 0 } };
    expect(summarize([ws, { ...ws, archived: true }], 3)).toMatchObject({ workspaces: 2, archived: 1, notes: 2, rememberedWindows: 3 });
    const cleared = clearActivityLog(ws);
    expect(cleared.activity).toBeUndefined();
    expect(cleared.notes).toHaveLength(1);
    const forgot = clearLeaveState(ws);
    expect(forgot.lastLeft).toBeUndefined();
    expect(forgot.welcomeBack).toBeUndefined();
    expect(forgot.notes).toHaveLength(1);
    expect([500, 2048, 3 * 1024 * 1024].map(formatBytes)).toEqual(['500 B', '2.0 KB', '3.0 MB']);
  });
});
