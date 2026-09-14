import type { RoutingProvider, RoutingProviderId } from '@/core/routing';

import { createMockProvider } from './mock/mockProvider';
import { createOrsProvider, type OrsProviderDeps } from './ors/orsProvider';
import {
  createValhallaProvider,
  type ValhallaProviderDeps,
} from './valhalla/valhallaProvider';

export type ProviderRegistry = {
  get(id: string): RoutingProvider;
  ids(): string[];
};

export function createProviderRegistry(
  orsDeps: OrsProviderDeps,
  valhallaDeps?: ValhallaProviderDeps,
): ProviderRegistry {
  const ors = createOrsProvider(orsDeps);
  const valhalla = createValhallaProvider(
    valhallaDeps ?? {
      fetchImpl: orsDeps.fetchImpl,
      cache: orsDeps.cache,
      sleep: orsDeps.sleep,
      now: orsDeps.now,
      onRawResponse: orsDeps.onRawResponse,
    },
  );
  const mock = createMockProvider();
  const byId: Record<string, RoutingProvider> = {
    ors,
    valhalla,
    mock,
  };

  return {
    get(id: string) {
      return byId[id] ?? ors;
    },
    ids() {
      return Object.keys(byId);
    },
  };
}

export function isRoutingProviderId(id: string): id is RoutingProviderId {
  return id === 'ors' || id === 'mock' || id === 'valhalla' || id === 'osrm';
}
