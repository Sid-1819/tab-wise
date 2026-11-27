import { describe, expect, it } from 'vitest';
import {
  allowedHostsFor,
  badgeText,
  formatRemaining,
  hostKey,
  isExpired,
  isNavigationAllowed,
  remainingMs,
  resolveFocusSession,
  shouldBlockNewTab,
  startSession,
  statusTitle,
} from './focus-mode';

const T0 = 1_700_000_000_000;
const base = {
  windowId: 7,
  tabUrls: ['https://github.com/a/b', 'https://www.docs.example.co.uk/x', 'chrome://extensions'],
  minutes: 25,
  goal: '  finish pricing page  ',
  stayOnSites: false,
  now: T0,
};

describe('hostKey / allowedHostsFor', () => {
  it('reduces web URLs to their registrable domain', () => {
    expect(hostKey('https://www.github.com/a')).toBe('github.com');
    expect(hostKey('https://docs.example.co.uk/x')).toBe('example.co.uk');
  });
  it('ignores non-web pages', () => {
    expect(hostKey('chrome://extensions')).toBeNull();
    expect(hostKey('about:blank')).toBeNull();
    expect(hostKey('not a url')).toBeNull();
  });
  it('dedupes and sorts', () => {
    expect(allowedHostsFor(base.tabUrls)).toEqual(['example.co.uk', 'github.com']);
    expect(allowedHostsFor(['https://a.github.com', 'https://github.com'])).toEqual(['github.com']);
  });
});

describe('startSession', () => {
  it('sets the end time, trims the goal and records allowed hosts', () => {
    const s = startSession(base);
    expect(s.endsAt).toBe(T0 + 25 * 60_000);
    expect(s.goal).toBe('finish pricing page');
    expect(s.allowedHosts).toEqual(['example.co.uk', 'github.com']);
    expect(s.blocked).toBe(0);
  });
  it('has no end time without a timer', () => {
    expect(startSession({ ...base, minutes: null }).endsAt).toBeNull();
    expect(startSession({ ...base, minutes: 0 }).endsAt).toBeNull();
  });
  it('caps a very long goal', () => {
    expect(startSession({ ...base, goal: 'x'.repeat(500) }).goal.length).toBe(120);
  });
});

describe('time', () => {
  const s = startSession(base);
  it('knows when it has expired', () => {
    expect(isExpired(s, T0 + 25 * 60_000 - 1)).toBe(false);
    expect(isExpired(s, T0 + 25 * 60_000)).toBe(true);
    expect(isExpired(startSession({ ...base, minutes: null }), T0 + 1e12)).toBe(false);
  });
  it('reports remaining time, never negative', () => {
    expect(remainingMs(s, T0)).toBe(25 * 60_000);
    expect(remainingMs(s, T0 + 99 * 60_000)).toBe(0);
    expect(remainingMs(startSession({ ...base, minutes: null }), T0)).toBeNull();
  });
  it('formats the countdown', () => {
    expect(formatRemaining(23 * 60_000 + 5_000)).toBe('23:05');
    expect(formatRemaining(3_750_000)).toBe('1:02:30');
    expect(formatRemaining(0)).toBe('0:00');
  });
  it('shows ON without a timer and minutes with one', () => {
    expect(badgeText(startSession({ ...base, minutes: null }), T0)).toBe('ON');
    expect(badgeText(s, T0)).toBe('25m');
    expect(badgeText(s, T0 + 24 * 60_000 + 30_000)).toBe('1m');
    expect(badgeText(startSession({ ...base, minutes: 240 }), T0)).toBe('4h');
  });
  it('builds a readable tooltip', () => {
    expect(statusTitle({ ...s, blocked: 3 }, T0)).toBe('Tab Wise focus: 25m left · 3 blocked');
    expect(statusTitle({ ...startSession({ ...base, minutes: null }), blocked: 0 }, T0)).toBe(
      'Tab Wise focus: focus on · 0 blocked',
    );
  });
});

describe('shouldBlockNewTab', () => {
  const s = startSession(base);
  it('blocks any new tab in the focus window', () => {
    expect(shouldBlockNewTab(s, { windowId: 7, windowType: 'normal', windowTabCount: 4 })).toBe(true);
  });
  it('blocks a brand-new window (Cmd+N)', () => {
    expect(shouldBlockNewTab(s, { windowId: 9, windowType: 'normal', windowTabCount: 1 })).toBe(true);
  });
  it('leaves other existing windows alone', () => {
    expect(shouldBlockNewTab(s, { windowId: 9, windowType: 'normal', windowTabCount: 5 })).toBe(false);
  });
  it('leaves sign-in popups alone', () => {
    expect(shouldBlockNewTab(s, { windowId: 9, windowType: 'popup', windowTabCount: 1 })).toBe(false);
  });
});

describe('isNavigationAllowed', () => {
  const on = startSession({ ...base, stayOnSites: true });
  it('allows anything when stay-on-sites is off', () => {
    expect(isNavigationAllowed(startSession(base), 'https://news.ycombinator.com')).toBe(true);
  });
  it('allows the starting sites, including subdomains', () => {
    expect(isNavigationAllowed(on, 'https://gist.github.com/x')).toBe(true);
    expect(isNavigationAllowed(on, 'https://example.co.uk/y')).toBe(true);
  });
  it('blocks other sites', () => {
    expect(isNavigationAllowed(on, 'https://news.ycombinator.com')).toBe(false);
  });
  it('always allows non-web pages', () => {
    expect(isNavigationAllowed(on, 'chrome://settings')).toBe(true);
    expect(isNavigationAllowed(on, 'about:blank')).toBe(true);
  });
});

describe('resolveFocusSession', () => {
  it('round-trips a valid session', () => {
    const s = startSession(base);
    expect(resolveFocusSession(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it('rejects junk', () => {
    expect(resolveFocusSession(null)).toBeNull();
    expect(resolveFocusSession({})).toBeNull();
    expect(resolveFocusSession({ ...startSession(base), windowId: 'x' })).toBeNull();
    expect(resolveFocusSession({ ...startSession(base), allowedHosts: [1] })).toBeNull();
  });
  it('repairs a bad blocked count', () => {
    expect(resolveFocusSession({ ...startSession(base), blocked: -4 })?.blocked).toBe(0);
  });
});
