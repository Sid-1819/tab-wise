import { describe, expect, it } from 'vitest';
import { findWindowFor, initials } from './workspace-switch';
import { addResources, createWorkspace } from './workspace-model';

const ws = addResources(
  createWorkspace('Billing API', 1),
  ['a', 'b', 'c'].map((x) => ({ url: `https://${x}.com/` })),
  (u) => u.startsWith('http'),
  1,
).workspace;

describe('findWindowFor', () => {
  it('picks the window with the most of the workspace open', () => {
    const id = findWindowFor(ws, [
      { id: 1, urls: ['https://a.com/', 'https://x.com/'] },
      { id: 2, urls: ['https://a.com/', 'https://b.com/', 'https://c.com/'] },
      { id: 3, urls: ['https://z.com/'] },
    ]);
    expect(id).toBe(2);
  });
  it('returns undefined when no window holds it', () => {
    expect(findWindowFor(ws, [{ id: 1, urls: ['https://a.com/'] }, { id: 2, urls: [] }])).toBeUndefined();
    expect(findWindowFor(ws, [])).toBeUndefined();
  });
});

describe('initials', () => {
  it('handles words, single names, symbols and non-latin', () => {
    expect(initials('Billing API')).toBe('BA');
    expect(initials('Podcast')).toBe('PO');
    expect(initials('  client-website redesign ')).toBe('CW');
    expect(initials('— —')).toBe('');
    expect(initials('日本 語')).toBe('日語');
  });
});
