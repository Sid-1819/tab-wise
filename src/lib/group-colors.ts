import { GROUP_COLORS } from '@/types/tab';

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/** Stable accent color for a group — uses custom color when set, otherwise hashes the id. */
export function getGroupBorderColor(groupId: string, customColor?: string): string {
  if (customColor) return customColor;
  if (groupId === 'auto_delete_group') return '#EF4444';
  return GROUP_COLORS[hashString(groupId) % GROUP_COLORS.length];
}
