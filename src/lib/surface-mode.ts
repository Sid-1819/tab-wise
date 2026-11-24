/**
 * Where the toolbar icon opens TabWise: the side panel (default, unchanged for
 * existing users) or a popup. Chrome can't do both on one click, so we store one
 * preference and apply it to the action; the other surface stays reachable
 * (popup has an "Open side panel" button; the side panel has a context menu entry).
 */
export type SurfaceMode = 'sidepanel' | 'popup';

export const SURFACE_MODE_KEY = 'surfaceMode' as const;
export const DEFAULT_SURFACE_MODE: SurfaceMode = 'sidepanel';
export const POPUP_PATH = 'popup.html';

export function resolveSurfaceMode(raw: unknown): SurfaceMode {
  return raw === 'popup' ? 'popup' : DEFAULT_SURFACE_MODE;
}

/** What to tell chrome.action / chrome.sidePanel for a given mode. */
export function surfaceConfig(mode: SurfaceMode): { popup: string; openPanelOnActionClick: boolean } {
  return mode === 'popup'
    ? { popup: POPUP_PATH, openPanelOnActionClick: false }
    : { popup: '', openPanelOnActionClick: true };
}

export function getSurfaceMode(): Promise<SurfaceMode> {
  return new Promise((resolve) => {
    chrome.storage.local.get([SURFACE_MODE_KEY], (r) => resolve(resolveSurfaceMode(r[SURFACE_MODE_KEY])));
  });
}

export function setSurfaceMode(mode: SurfaceMode): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [SURFACE_MODE_KEY]: mode }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}

/** Apply the stored mode to the toolbar icon. Safe to call repeatedly. */
export async function applySurfaceMode(mode?: SurfaceMode): Promise<void> {
  const m = mode ?? (await getSurfaceMode());
  const cfg = surfaceConfig(m);
  await Promise.allSettled([
    chrome.action.setPopup({ popup: cfg.popup }),
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: cfg.openPanelOnActionClick }),
  ]);
}
