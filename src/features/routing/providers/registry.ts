import type { RoutingProvider, RoutingProviderId } from '@/core/routing';

import { createMockProvider } from './mock/mockProvider';
import { createOrsProvider, type OrsProviderDeps } from './ors/orsProvider';

export type ProviderRegistry = {
  get(id: string): RoutingProvider;
  ids(): string[];
};

export function createProviderRegistry(
  orsDeps: OrsProviderDeps,
): ProviderRegistry {
  const ors = createOrsProvider(orsDeps);
  const mock = createMockProvider();
  const byId: Record<string, RoutingProvider> = {
    ors,
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
