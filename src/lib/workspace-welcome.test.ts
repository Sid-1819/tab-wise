import { describe, expect, it } from 'vitest';
import { awayLabel, clearWelcome, isWelcomeFresh, suggestNextAction } from './workspace-welcome';
import { createWorkspace, markOpened, sanitizeWorkspaces } from './workspace-model';
import { applyLeave } from './window-snapshot';

const H = 3_600_000;
const left = (at: number) => ({
  at,
  reason: 'window_closed' as const,
  tabs: [{ url: 'https://a.com/' }, { url: 'https://b.com/' }],
  lastActive: { url: 'https://a.com/x', title: 'Fix webhook retry logic - Stripe Docs' },
});

describe('markOpened → welcome back', () => {
  it('consumes lastLeft into a welcome-back note, once', () => {
    const ws = { ...createWorkspace('w', 1), lastLeft: left(1000) };
    const back = markOpened(ws, 5000);
    expect(back.lastLeft).toBeUndefined();
    expect(back.welcomeBack).toMatchObject({ at: 5000, leftAt: 1000, tabCount: 2 });
    // opening again with nothing new to come back from keeps the existing note
    expect(markOpened(back, 6000).welcomeBack?.leftAt).toBe(1000);
  });
  it('does nothing special when there was no leave', () => {
    expect(markOpened(createWorkspace('w', 1), 5).welcomeBack).toBeUndefined();
  });
  it('a newer leave replaces an undismissed welcome', () => {
    const back = markOpened({ ...createWorkspace('w', 1), lastLeft: left(1000) }, 5000);
    const again = applyLeave(back, [{ url: 'https://c.com/' }], 'window_closed', 9000);
    expect(again.welcomeBack).toBeUndefined();
    expect(again.lastLeft?.at).toBe(9000);
  });
  it('survives storage round trip', () => {
    const back = markOpened({ ...createWorkspace('w', 1), lastLeft: left(1000) }, 5000);
    expect(sanitizeWorkspaces([back])[0].welcomeBack?.lastActive?.title).toContain('webhook');
  });
});

describe('helpers', () => {
  it('freshness, clearing and away label', () => {
    const back = markOpened({ ...createWorkspace('w', 1), lastLeft: left(1000) }, 5000);
    expect(isWelcomeFresh(back, 5000 + H)).toBe(true);
    expect(isWelcomeFresh(back, 5000 + 13 * H)).toBe(false);
    expect(isWelcomeFresh({ ...back, archived: true }, 5001)).toBe(false);
    expect(clearWelcome(back).welcomeBack).toBeUndefined();
    expect([5 * 60_000, 40 * 60_000, 3 * H, 50 * H].map(awayLabel)).toEqual(['a few minutes', '40 minutes', '3 hours', '2 days']);
  });
  it('suggests a next step from the last page, trimming the site suffix', () => {
    const back = markOpened({ ...createWorkspace('w', 1), lastLeft: left(1000) }, 5000);
    expect(suggestNextAction(back)).toBe('Continue with “Fix webhook retry logic”');
    expect(suggestNextAction(createWorkspace('x', 1))).toBeNull();
    const host = { ...createWorkspace('h', 1), lastLeft: { ...left(1), lastActive: { url: 'https://www.figma.com/file/1' } } };
    expect(suggestNextAction(host)).toBe('Continue with “figma.com”');
  });
});
