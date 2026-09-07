import { useSyncExternalStore } from 'react';
import { subscribeApiLoading, getApiLoadingSnapshot } from '../apiClient';

// True whenever one or more backend '/api/...' calls are currently in
// flight (see apiClient.ts). Powers the app-wide GlobalLoader overlay.
export function useApiLoading(): boolean {
  return useSyncExternalStore(subscribeApiLoading, getApiLoadingSnapshot);
}
