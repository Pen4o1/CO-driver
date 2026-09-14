import {
  APP_USER_AGENT,
  ORS_DIRECTIONS_URL,
  VALHALLA_DEFAULT_URL,
} from '@/core/config';
import { fetchImpl } from '@/features/http/fetchImpl';
import { sqliteGridCache, sqliteRouteCache } from '@/features/storage';

import { createProviderRegistry } from './providers/registry';
import { createOsrmSnapper } from './snap/osrmSnapper';

let registry: ReturnType<typeof createProviderRegistry> | null = null;

export function getProviderRegistry() {
  if (!registry) {
    registry = createProviderRegistry(
      {
        fetchImpl,
        getApiKey: () => process.env.EXPO_PUBLIC_ORS_API_KEY,
        cache: sqliteRouteCache(),
        onRawResponse: (raw) => {
          const text = JSON.stringify(raw);
          console.log('[ORS]', ORS_DIRECTIONS_URL);
          console.log('[ORS raw]', text.slice(0, 2000));
        },
      },
      {
        fetchImpl,
        getBaseUrl: () =>
          process.env.EXPO_PUBLIC_VALHALLA_URL ?? VALHALLA_DEFAULT_URL,
        cache: sqliteRouteCache(),
        onRawResponse: (raw) => {
          console.log('[Valhalla] response received');
          const text = JSON.stringify(raw);
          console.log('[Valhalla raw]', text.slice(0, 2000));
        },
      },
    );
  }
  return registry;
}

export function getRoutingProvider(id: string) {
  return getProviderRegistry().get(id);
}

export function getRoadSnapper() {
  return createOsrmSnapper({
    fetchImpl,
    cache: sqliteGridCache(),
  });
}

export { APP_USER_AGENT };
export { createMockProvider } from './providers/mock/mockProvider';
export { createOrsProvider } from './providers/ors/orsProvider';
export { createValhallaProvider } from './providers/valhalla/valhallaProvider';
export { generateCandidates } from './generateCandidates';
