/**
 * User-facing privacy/behavior switches. Everything defaults to on so upgrading
 * users keep today's behavior; each can be turned off in "Privacy & data".
 */
export interface Settings {
  /** Remember where each window was left, and suggest projects from open tabs. */
  autoCapture: boolean;
  /** Let the TabWise website (allow-listed origins only) read and open your workspaces. */
  websiteAccess: boolean;
  /** Master switch for the Workspaces feature (beta). Off until switched on. */
  workspaces: boolean;
}

export const SETTINGS_KEY = 'settings' as const;
export const DEFAULT_SETTINGS: Settings = { autoCapture: true, websiteAccess: true, workspaces: false };

export function resolveSettings(raw: unknown): Settings {
  const r = raw && typeof raw === 'object' ? (raw as Partial<Settings>) : {};
  return {
    autoCapture: typeof r.autoCapture === 'boolean' ? r.autoCapture : DEFAULT_SETTINGS.autoCapture,
    websiteAccess: typeof r.websiteAccess === 'boolean' ? r.websiteAccess : DEFAULT_SETTINGS.websiteAccess,
    workspaces: typeof r.workspaces === 'boolean' ? r.workspaces : DEFAULT_SETTINGS.workspaces,
  };
}

export function getSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.local.get([SETTINGS_KEY], (r) => resolve(resolveSettings(r[SETTINGS_KEY])));
  });
}

export async function isWorkspacesEnabled(): Promise<boolean> {
  return (await getSettings()).workspaces;
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await new Promise<void>((resolve, reject) => {
    chrome.storage.local.set({ [SETTINGS_KEY]: next }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
  return next;
}

/** Call back now and on every change. Returns an unsubscribe function. */
export function watchSettings(cb: (s: Settings) => void): () => void {
  void getSettings().then(cb);
  const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'local' && changes[SETTINGS_KEY]) cb(resolveSettings(changes[SETTINGS_KEY].newValue));
  };
  chrome.storage.onChanged.addListener(onChanged);
  return () => chrome.storage.onChanged.removeListener(onChanged);
}
