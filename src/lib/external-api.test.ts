import { describe, expect, it, vi } from 'vitest';
import {
  handleExternalRequest,
  isAllowedOrigin,
  parseExternalRequest,
  type ExternalDeps,
} from './external-api';
import { createWorkspace } from './workspace-model';

function deps(over: Partial<ExternalDeps> = {}): ExternalDeps {
  const ws = { ...createWorkspace('A'), id: 'ws_1' };
  return {
    version: () => '9.9.9',
    getWorkspaces: async () => [ws],
    restore: vi.fn(async () => ({ opened: 2, skipped: 1 })),
    markOpened: vi.fn(async () => undefined),
    websiteAccess: async () => true,
    ...over,
  };
}

describe('parseExternalRequest', () => {
  it('accepts valid messages', () => {
    expect(parseExternalRequest({ type: 'ping' })).toEqual({ type: 'ping' });
    expect(parseExternalRequest({ type: 'restoreWorkspace', workspaceId: 'x', target: 'current' })).toEqual({
      type: 'restoreWorkspace',
      workspaceId: 'x',
      target: 'current',
    });
  });

  it('rejects malformed messages', () => {
    for (const bad of [null, 'ping', {}, { type: 'nope' }, { type: 'restoreWorkspace' }, { type: 'restoreWorkspace', workspaceId: '' }, { type: 'restoreWorkspace', workspaceId: 'x', target: 'tab' }]) {
      expect(parseExternalRequest(bad)).toBeNull();
    }
  });
});

describe('isAllowedOrigin', () => {
  it('only allows the site and local dev', () => {
    expect(isAllowedOrigin('https://tabwise.visionly.dev')).toBe(true);
    expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
    expect(isAllowedOrigin('https://evil.com')).toBe(false);
    expect(isAllowedOrigin('https://tabwise.visionly.dev.evil.com')).toBe(false);
    expect(isAllowedOrigin(undefined)).toBe(false);
  });
});

describe('handleExternalRequest', () => {
  it('pings with version', async () => {
    expect(await handleExternalRequest({ type: 'ping' }, deps())).toEqual({
      ok: true,
      type: 'ping',
      version: '9.9.9',
      apiVersion: 1,
    });
  });

  it('returns workspaces', async () => {
    const r = await handleExternalRequest({ type: 'getWorkspaces' }, deps());
    expect(r.ok && r.type === 'getWorkspaces' && r.workspaces.map((w) => w.id)).toEqual(['ws_1']);
  });

  it('restores into a new window by default and marks opened', async () => {
    const d = deps();
    const r = await handleExternalRequest({ type: 'restoreWorkspace', workspaceId: 'ws_1' }, d);
    expect(r).toEqual({ ok: true, type: 'restoreWorkspace', opened: 2, skipped: 1 });
    expect(d.restore).toHaveBeenCalledWith(expect.objectContaining({ id: 'ws_1' }), 'new');
    expect(d.markOpened).toHaveBeenCalledWith('ws_1');
  });

  it('does not mark opened when nothing opened', async () => {
    const d = deps({ restore: vi.fn(async () => ({ opened: 0, skipped: 3 })) });
    await handleExternalRequest({ type: 'restoreWorkspace', workspaceId: 'ws_1' }, d);
    expect(d.markOpened).not.toHaveBeenCalled();
  });

  it('reports not_found, bad_request and internal errors', async () => {
    expect(await handleExternalRequest({ type: 'restoreWorkspace', workspaceId: 'zzz' }, deps())).toEqual({
      ok: false,
      error: 'not_found',
    });
    expect(await handleExternalRequest({ type: 'x' }, deps())).toEqual({ ok: false, error: 'bad_request' });
    const r = await handleExternalRequest(
      { type: 'getWorkspaces' },
      deps({ getWorkspaces: async () => { throw new Error('boom'); } }),
    );
    expect(r).toEqual({ ok: false, error: 'internal', message: 'boom' });
  });

  it('answers nothing but "disabled" when the user turned website access off', async () => {
    const d = deps({ websiteAccess: async () => false });
    for (const req of [{ type: 'ping' }, { type: 'getWorkspaces' }, { type: 'restoreWorkspace', workspaceId: 'ws_1' }]) {
      expect(await handleExternalRequest(req, d)).toEqual({ ok: false, error: 'disabled' });
    }
    expect(d.restore).not.toHaveBeenCalled();
  });
});
