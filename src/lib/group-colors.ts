import { GROUP_COLORS } from '@/types/tab';

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

const CHROME_GROUP_COLORS: Record<string, string> = {
  grey: '#5F6368',
  blue: '#1A73E8',
  red: '#D93025',
  yellow: '#F9AB00',
  green: '#188038',
  pink: '#D01884',
  purple: '#A142F4',
  cyan: '#007B83',
  orange: '#E8710A',
};

export function chromeGroupColorToHex(color?: string): string {
  if (!color) return CHROME_GROUP_COLORS.grey;
  return CHROME_GROUP_COLORS[color] ?? CHROME_GROUP_COLORS.grey;
}

/** Stable accent color for a group — uses custom color when set, otherwise hashes the id. */
export function getGroupBorderColor(groupId: string, customColor?: string): string {
  if (customColor) return customColor;
  if (groupId === 'auto_delete_group') return '#EF4444';
  return GROUP_COLORS[hashString(groupId) % GROUP_COLORS.length];
}
