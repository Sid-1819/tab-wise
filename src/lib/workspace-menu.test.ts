import { describe, expect, it } from 'vitest';
import { createWorkspace } from './workspace-model';
import { childId, nameForNew, parseMenuId, planMenu } from './workspace-menu';

const mk = (name: string, archived = false) => ({ ...createWorkspace(name, 1), archived: archived || undefined });

describe('planMenu', () => {
  it('stars the matched workspace first, then last used, then the rest, and caps the list', () => {
    const list = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((n) => mk(n));
    const entries = planMenu(list, list[3].id, list[5].id).filter((e) => e.kind === 'page');
    expect(entries[0].title).toBe('★ D (this window)');
    expect(entries[1].title).toBe('F');
    expect(entries.length).toBe(5 + 1); // 5 workspaces + "new"
    expect(entries[entries.length - 1].title).toContain('New workspace');
  });

  it('skips archived workspaces and offers all three contexts', () => {
    const a = mk('Live');
    const b = mk('Gone', true);
    const entries = planMenu([a, b]);
    expect(entries.some((e) => e.title.includes('Gone'))).toBe(false);
    expect(new Set(entries.map((e) => e.kind))).toEqual(new Set(['page', 'link', 'selection']));
  });

  it('works with no workspaces (only the new option)', () => {
    expect(planMenu([]).filter((e) => e.kind === 'page')).toHaveLength(1);
  });
});

describe('menu ids', () => {
  it('round-trips', () => {
    expect(parseMenuId(childId('link', 'ws_1'))).toEqual({ kind: 'link', target: 'ws_1' });
    expect(parseMenuId('openTabWiseSidePanel')).toBeNull();
    expect(parseMenuId('tw:parent:page')).toBeNull();
  });
});

describe('nameForNew', () => {
  it('falls back to the site name when no project is detected', () => {
    expect(nameForNew([], { url: 'https://www.stripe.com/docs' })).toBe('Stripe project');
  });
});
