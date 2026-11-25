import { describe, expect, it } from 'vitest';
import { firstWorkspaceName, shouldOfferFirstWorkspace } from './first-workspace';
import { createWorkspace } from './workspace-model';

const live = createWorkspace('Live');
const archived = { ...createWorkspace('Old session'), archived: true };

describe('shouldOfferFirstWorkspace', () => {
  it('offers to a new user with savable tabs', () => {
    expect(shouldOfferFirstWorkspace({ workspaces: [], done: false, savableTabCount: 3 })).toBe(true);
  });
  it('does not offer once done, even with no workspaces left', () => {
    expect(shouldOfferFirstWorkspace({ workspaces: [], done: true, savableTabCount: 3 })).toBe(false);
  });
  it('does not offer when a live workspace exists', () => {
    expect(shouldOfferFirstWorkspace({ workspaces: [live], done: false, savableTabCount: 3 })).toBe(false);
  });
  it('still offers when the only workspaces are archived (migrated sessions)', () => {
    expect(shouldOfferFirstWorkspace({ workspaces: [archived], done: false, savableTabCount: 2 })).toBe(true);
  });
  it('does not offer with nothing to save', () => {
    expect(shouldOfferFirstWorkspace({ workspaces: [], done: false, savableTabCount: 0 })).toBe(false);
  });
});

describe('firstWorkspaceName', () => {
  it('uses the detected project name', () => {
    expect(firstWorkspaceName('  Tab-wise ', [])).toBe('Tab-wise');
  });
  it('falls back to a name from the first tab for a mixed window', () => {
    const tabs = [
      { url: 'https://github.com/a/b', title: 'a/b' },
      { url: 'https://vercel.com/x', title: 'Deploy' },
    ];
    expect(firstWorkspaceName(null, tabs)).toBe('Github project');
  });
  it('has a friendly default with no tabs', () => {
    expect(firstWorkspaceName(undefined, [])).toBe('My first project');
  });
});
