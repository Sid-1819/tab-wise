import { describe, expect, it } from 'vitest';

import { findDuplicateClusters, normalizeTabUrl } from './url-normalize';

describe('normalizeTabUrl', () => {
  it('normalizes duplicate http URLs by removing www, tracking params, and trailing slash', () => {
    expect(
      normalizeTabUrl('https://www.Example.com/articles/?utm_source=newsletter&gclid=abc&id=42')
    ).toBe('https://example.com/articles?id=42');
  });

  it('returns null for browser-internal or non-http URLs', () => {
    expect(normalizeTabUrl('chrome://extensions')).toBeNull();
    expect(normalizeTabUrl('file:///Users/example/report.pdf')).toBeNull();
  });
});

describe('findDuplicateClusters', () => {
  it('groups tabs with the same normalized URL', () => {
    expect(
      findDuplicateClusters([
        { id: 1, url: 'https://www.example.com/article/?utm_medium=social' },
        { id: 2, url: 'https://example.com/article' },
        { id: 3, url: 'https://example.com/other' },
      ])
    ).toEqual([{ normalizedUrl: 'https://example.com/article', tabIds: [1, 2] }]);
  });
});
