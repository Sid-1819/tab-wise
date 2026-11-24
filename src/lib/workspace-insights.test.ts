import { describe, expect, it } from 'vitest';
import { attention, describeEvent, domainBreakdown, overview, pickResume, rhythm, timeline } from './workspace-insights';
import { recordEvent } from './workspace-activity';
import { addResources, createWorkspace, updateContext } from './workspace-model';

const DAY = 86_400_000;
const NOW = new Date(2026, 10, 8, 12).getTime();
const ok = (u: string) => u.startsWith('http');

describe('domainBreakdown', () => {
  it('groups by host, ignores www, folds the tail into other', () => {
    let ws = createWorkspace('w', NOW);
    const urls = ['https://github.com/a', 'https://www.github.com/b', 'https://figma.com/x', 'https://a.dev/1', 'https://b.dev/1', 'https://c.dev/1'];
    ws = addResources(ws, urls.map((url) => ({ url })), ok, NOW).workspace;
    const d = domainBreakdown(ws, 2);
    expect(d.top[0]).toEqual({ host: 'github.com', count: 2 });
    expect(d.top).toHaveLength(2);
    expect(d.other).toBe(3);
    expect(d.sites).toBe(5);
  });
});

describe('describeEvent / timeline', () => {
  it('writes human sentences', () => {
    expect(describeEvent({ at: 1, type: 'added', count: 1, label: 'Pricing', via: 'menu' })).toBe('Saved “Pricing” from the right-click menu');
    expect(describeEvent({ at: 1, type: 'added', count: 3 })).toBe('Saved 3 pages');
    expect(describeEvent({ at: 1, type: 'left', count: 1 })).toBe('Left with 1 tab open');
    const ws = recordEvent(createWorkspace('w', 1), { type: 'note' }, 5);
    expect(timeline(ws, 1)[0].text).toBe('Added a note');
  });
});

describe('attention', () => {
  it('flags blockers, waiting, staleness and missing next action', () => {
    let ws = createWorkspace('w', NOW - 20 * DAY);
    ws = updateContext(ws, { blockers: 'API keys', waitingOn: 'client' }, NOW - 20 * DAY);
    const a = attention(ws, NOW).map((x) => x.kind);
    expect(a).toEqual(['blocked', 'waiting', 'stale']);
    const fresh = createWorkspace('f', NOW);
    expect(attention(fresh, NOW).map((x) => x.kind)).toEqual(['no_next']);
    expect(attention({ ...fresh, archived: true }, NOW)).toEqual([]);
  });
});

describe('overview / rhythm / pickResume', () => {
  it('summarises and ignores archived', () => {
    const a = updateContext(createWorkspace('a', NOW), { nextAction: 'x' }, NOW);
    const b = { ...createWorkspace('b', NOW - 30 * DAY), archived: true };
    const o = overview([a, b], NOW);
    expect(o).toMatchObject({ live: 1, active: 1, pages: 0, needAttention: 0 });
    expect(rhythm([a, b], 3, NOW)).toEqual([0, 0, 1]);
  });
  it('prefers the most recently left workspace', () => {
    const a = { ...createWorkspace('a', 1), lastLeft: { at: 5, reason: 'window_closed' as const, tabs: [] } };
    const b = { ...createWorkspace('b', 1), lastLeft: { at: 9, reason: 'window_closed' as const, tabs: [] } };
    expect(pickResume([a, b])?.name).toBe('b');
    expect(pickResume([])).toBeUndefined();
  });
});
