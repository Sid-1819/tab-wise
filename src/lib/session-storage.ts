import type { NamedSession } from '@/types/session';

const STORAGE_KEY = 'namedSessions' as const;

export async function getNamedSessions(): Promise<NamedSession[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const raw = result[STORAGE_KEY];
      resolve(Array.isArray(raw) ? raw : []);
    });
  });
}

export async function saveNamedSessions(sessions: NamedSession[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: sessions }, () => resolve());
  });
}

export async function upsertNamedSession(session: NamedSession): Promise<void> {
  const sessions = await getNamedSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.push(session);
  }
  sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  await saveNamedSessions(sessions);
}

export async function deleteNamedSession(id: string): Promise<void> {
  const sessions = (await getNamedSessions()).filter((s) => s.id !== id);
  await saveNamedSessions(sessions);
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
