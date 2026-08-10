import { useSyncExternalStore } from 'react';

function subscribeNoop(_onStoreChange: () => void) {
  return () => {};
}

export function useIsClient() {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}
