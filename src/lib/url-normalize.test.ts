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

  it('treats http and https, and different query orders, as the same page', () => {
    const https = normalizeTabUrl('https://example.com/articles?b=2&id=42&a=1');
    const http = normalizeTabUrl('http://example.com/articles?a=1&id=42&b=2');
    expect(https).toBe('https://example.com/articles?a=1&b=2&id=42');
    expect(http).toBe(https);
  });

  it('drops extra tracking params and keeps meaningful ones', () => {
    expect(
      normalizeTabUrl('https://example.com/watch?si=abc&utm_id=9&v=dQw4w9WgXcQ&igshid=1&ref_src=tw')
    ).toBe('https://example.com/watch?v=dQw4w9WgXcQ');
  });

  it('keeps in-page routes and ignores text fragments', () => {
    expect(normalizeTabUrl('https://mail.google.com/mail/u/0/#inbox')).toBe(
      'https://mail.google.com/mail/u/0#inbox'
    );
    expect(normalizeTabUrl('https://mail.google.com/mail/u/0/#sent')).toBe(
      'https://mail.google.com/mail/u/0#sent'
    );
    expect(normalizeTabUrl('https://example.com/article#:~:text=hello')).toBe(
      'https://example.com/article'
    );
    expect(normalizeTabUrl('https://example.com/article#')).toBe('https://example.com/article');
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

  it('does not group different hash routes', () => {
    expect(
      findDuplicateClusters([
        { id: 1, url: 'https://mail.google.com/mail/u/0/#inbox' },
        { id: 2, url: 'https://mail.google.com/mail/u/0/#sent' },
      ])
    ).toEqual([]);
  });
});
