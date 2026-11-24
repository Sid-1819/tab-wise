import { getNamedSessions } from '@/lib/session-storage';
import { MIGRATION_FLAG, planMigration } from '@/lib/session-migration';
import { addMissingWorkspaces, getWorkspaces } from '@/lib/workspace-storage';

/**
 * Runs once per profile. The original `namedSessions` data is deliberately left in
 * place as a backup for a release or two; nothing is deleted here.
 */
export async function migrateSessionsToWorkspaces(): Promise<number> {
  const flag = await chrome.storage.local.get([MIGRATION_FLAG]);
  if (flag[MIGRATION_FLAG]) return 0;
  const [sessions, existing] = await Promise.all([getNamedSessions(), getWorkspaces()]);
  const toAdd = planMigration(sessions, existing);
  if (toAdd.length > 0) await addMissingWorkspaces(toAdd);
  await chrome.storage.local.set({ [MIGRATION_FLAG]: Date.now() });
  return toAdd.length;
}
