export const SITE_URL = 'https://tabwise.visionly.dev';

const PENDING_WHATS_NEW_KEY = 'pendingWhatsNew';

export interface PendingWhatsNew {
  from: string;
  to: string;
}

export function majorVersion(version: string): number {
  const major = Number(version.split('.')[0]);
  return Number.isFinite(major) ? major : 0;
}

export function isMajorBump(from: string, to: string): boolean {
  return majorVersion(to) > majorVersion(from);
}

export function welcomeUrl(): string {
  return `${SITE_URL}/welcome?source=install`;
}

export function changelogUrl(from: string, to: string): string {
  const params = new URLSearchParams({ from, to });
  return `${SITE_URL}/changelog?${params.toString()}`;
}

function isPendingWhatsNew(value: unknown): value is PendingWhatsNew {
  if (!value || typeof value !== 'object') return false;
  const pending = value as PendingWhatsNew;
  return typeof pending.from === 'string' && typeof pending.to === 'string';
}

export async function getPendingWhatsNew(): Promise<PendingWhatsNew | null> {
  const result = await chrome.storage.local.get(PENDING_WHATS_NEW_KEY);
  const value = result[PENDING_WHATS_NEW_KEY];
  return isPendingWhatsNew(value) ? value : null;
}

export async function setPendingWhatsNew(pending: PendingWhatsNew): Promise<void> {
  await chrome.storage.local.set({ [PENDING_WHATS_NEW_KEY]: pending });
}

export async function clearPendingWhatsNew(): Promise<void> {
  await chrome.storage.local.remove(PENDING_WHATS_NEW_KEY);
}
