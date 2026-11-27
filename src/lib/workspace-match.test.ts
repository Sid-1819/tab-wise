import { describe, expect, it } from 'vitest';
import { matchWorkspace } from './workspace-match';
import { addResources, createWorkspace, isWorkspaceUrl } from './workspace-model';
import type { Workspace } from '@/types/workspace';

function ws(name: string, urls: string[]): Workspace {
  return addResources(createWorkspace(name, 1), urls.map((url) => ({ url })), isWorkspaceUrl).workspace;
}

describe('matchWorkspace', () => {
  const a = ws('A', ['https://a.com/1', 'https://a.com/2', 'https://a.com/3', 'https://a.com/4']);
  const b = ws('B', ['https://b.com/1', 'https://b.com/2']);

  it('matches when most of a workspace is open, ignoring tracking params and extras', () => {
    const m = matchWorkspace(['https://a.com/1?utm_source=x', 'https://www.a.com/2', 'https://a.com/3', 'https://other.com'], [a, b]);
    expect(m?.workspace.name).toBe('A');
    expect(m?.shared).toBe(3);
  });

  it('does not match below 60% coverage or with fewer than 2 shared tabs', () => {
    expect(matchWorkspace(['https://a.com/1', 'https://a.com/2'], [a])).toBeNull(); // 50%
    expect(matchWorkspace(['https://b.com/1'], [b])).toBeNull(); // only 1 shared
  });

  it('never binds a one-tab workspace', () => {
    const solo = ws('Solo', ['https://mail.example.com/']);
    expect(matchWorkspace(['https://mail.example.com/', 'https://x.com/1'], [solo])).toBeNull();
  });

  it('skips archived workspaces and picks the best match', () => {
    const arch = { ...a, archived: true };
    expect(matchWorkspace(a.resources.map((r) => r.url), [arch])).toBeNull();
    const a2 = ws('A2', ['https://a.com/1', 'https://a.com/2']);
    expect(matchWorkspace(['https://a.com/1', 'https://a.com/2'], [a, a2])?.workspace.name).toBe('A2'); // 100% beats 50%
  });
});
