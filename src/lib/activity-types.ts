import { TabActivity } from '@/types/tab';

export type { TabActivity };

export interface ActivityData {
  [tabId: number]: TabActivity;
}
