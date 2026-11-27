import { describe, expect, it } from 'vitest';
import { DEFAULT_SURFACE_MODE, resolveSurfaceMode, surfaceConfig } from './surface-mode';

describe('surface mode', () => {
  it('defaults to the side panel for anything unrecognised (existing users unchanged)', () => {
    expect(DEFAULT_SURFACE_MODE).toBe('sidepanel');
    for (const v of [undefined, null, '', 'sidepanel', 'Popup', 42, {}]) {
      expect(resolveSurfaceMode(v)).toBe('sidepanel');
    }
    expect(resolveSurfaceMode('popup')).toBe('popup');
  });

  it('popup mode sets a popup and stops the icon opening the panel; side panel mode is the reverse', () => {
    expect(surfaceConfig('popup')).toEqual({ popup: 'popup.html', openPanelOnActionClick: false });
    expect(surfaceConfig('sidepanel')).toEqual({ popup: '', openPanelOnActionClick: true });
  });
});
