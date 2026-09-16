import { OPENFREEMAP_STYLE_URL } from '@/core/config';
import type { BBox } from '@/core/geo/bufferBbox';
import {
  OFFLINE_MAX_ZOOM,
  OFFLINE_MIN_ZOOM,
  estimateOfflinePack,
  formatBytes,
  isRoutePack,
  packMetadata,
  type OfflineEstimate,
} from '@/core/offline';
import type {
  OfflinePack,
  OfflinePackStatus,
} from '@maplibre/maplibre-react-native';

export type PackProgress = {
  percentage: number;
  completedResourceCount: number;
  requiredResourceCount: number;
  completedResourceSize: number;
  state: OfflinePackStatus['state'];
};

export type OfflineHost = {
  createPack: (
    options: {
      mapStyle: string;
      bounds: BBox;
      minZoom: number;
      maxZoom: number;
      metadata: Record<string, unknown>;
    },
    onProgress: (status: PackProgress) => void,
    onError: (message: string) => void,
  ) => Promise<{ id: string }>;
  getPacks: () => Promise<{ id: string; metadata: Record<string, unknown> }[]>;
  deletePack: (id: string) => Promise<void>;
};

function fromNative(status: OfflinePackStatus): PackProgress {
  return {
    percentage: status.percentage,
    completedResourceCount: status.completedResourceCount,
    requiredResourceCount: status.requiredResourceCount,
    completedResourceSize: status.completedResourceSize,
    state: status.state,
  };
}

const mapLibreHost: OfflineHost = {
  async createPack(options, onProgress, onError) {
    const { OfflineManager } = await import('@maplibre/maplibre-react-native');
    const pack = await OfflineManager.createPack(
      options,
      (_p: OfflinePack, status) => onProgress(fromNative(status)),
      (_p: OfflinePack, error) => onError(error.message),
    );
    return { id: pack.id };
  },
  async getPacks() {
    const { OfflineManager } = await import('@maplibre/maplibre-react-native');
    const packs = await OfflineManager.getPacks();
    return packs.map((p) => ({ id: p.id, metadata: p.metadata }));
  },
  async deletePack(id) {
    const { OfflineManager } = await import('@maplibre/maplibre-react-native');
    await OfflineManager.deletePack(id);
  },
};

let host: OfflineHost = mapLibreHost;

export function setOfflineHostForTests(next: OfflineHost): void {
  host = next;
}

export function resetOfflineHost(): void {
  host = mapLibreHost;
}

export function estimateRoutePack(bbox: BBox): OfflineEstimate {
  return estimateOfflinePack(bbox);
}

export { formatBytes };

export async function findRoutePack(
  routeId: string,
): Promise<{ id: string } | null> {
  const packs = await host.getPacks();
  const found = packs.find((p) => isRoutePack(p.metadata, routeId));
  return found ? { id: found.id } : null;
}

export async function downloadRoutePack(
  routeId: string,
  bbox: BBox,
  onProgress: (status: PackProgress) => void,
  onError: (message: string) => void,
): Promise<{ id: string }> {
  const existing = await findRoutePack(routeId);
  if (existing) {
    await host.deletePack(existing.id);
  }
  const estimate = estimateOfflinePack(bbox);
  return host.createPack(
    {
      mapStyle: OPENFREEMAP_STYLE_URL,
      bounds: estimate.bounds,
      minZoom: OFFLINE_MIN_ZOOM,
      maxZoom: OFFLINE_MAX_ZOOM,
      metadata: packMetadata(routeId),
    },
    onProgress,
    onError,
  );
}

export async function deleteRoutePack(routeId: string): Promise<void> {
  const existing = await findRoutePack(routeId);
  if (existing) {
    await host.deletePack(existing.id);
  }
}
