import { APP_USER_AGENT, ORS_DIRECTIONS_URL } from '@/core/config';
import { fetchImpl } from '@/features/http/fetchImpl';
import { sqliteRouteCache } from '@/features/storage';

import { createProviderRegistry } from './providers/registry';

let registry: ReturnType<typeof createProviderRegistry> | null = null;

export function getProviderRegistry() {
  if (!registry) {
    registry = createProviderRegistry({
      fetchImpl,
      getApiKey: () => process.env.EXPO_PUBLIC_ORS_API_KEY,
      cache: sqliteRouteCache(),
      onRawResponse: (raw) => {
        const text = JSON.stringify(raw);
        console.log('[ORS]', ORS_DIRECTIONS_URL);
        console.log('[ORS raw]', text.slice(0, 4000));
        if (typeof raw === 'object' && raw !== null && 'features' in raw) {
          const features = (raw as { features: unknown[] }).features;
          console.log('[ORS] feature count', features.length);
        }
      },
    });
  }
  return registry;
}

export function getRoutingProvider(id: string) {
  return getProviderRegistry().get(id);
}

export { APP_USER_AGENT };
export { createMockProvider } from './providers/mock/mockProvider';
export { createOrsProvider } from './providers/ors/orsProvider';
