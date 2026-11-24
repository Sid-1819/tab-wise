import { matchWorkspace } from '@/lib/workspace-match';
import type { Workspace } from '@/types/workspace';

export interface WindowLite {
  id: number;
  urls: string[];
  focused?: boolean;
}

/**
 * The open window that already holds this workspace (same URL-overlap rule used
 * everywhere else), preferring the one with the most of its tabs open.
 */
export function findWindowFor(ws: Workspace, windows: WindowLite[]): number | undefined {
  let best: { id: number; score: number } | undefined;
  for (const w of windows) {
    const m = matchWorkspace(w.urls, [ws], (x) => [
      ...x.resources.map((r) => r.url),
      ...(x.lastLeft?.tabs.map((t) => t.url) ?? []),
    ]);
    if (!m) continue;
    const score = m.coverage * 1000 + m.shared;
    if (!best || score > best.score) best = { id: w.id, score };
  }
  return best?.id;
}

/** "Billing API" -> "BA", "Podcast" -> "PO". For the toolbar badge. */
export function initials(name: string): string {
  const words = name
    .trim()
    .split(/[\s\-_/]+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w));
  if (words.length === 0) return '';
  const first = (w: string) => Array.from(w.replace(/[^\p{L}\p{N}]/gu, ''))[0] ?? '';
  const letters =
    words.length >= 2
      ? first(words[0]) + first(words[1])
      : Array.from(words[0].replace(/[^\p{L}\p{N}]/gu, '')).slice(0, 2).join('');
  return letters.toUpperCase();
}
