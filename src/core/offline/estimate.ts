import { bufferBbox, type BBox } from '@/core/geo/bufferBbox';
import { tileCountForZooms } from '@/core/geo/webMercator';

import {
  BYTES_PER_DEM_TILE,
  BYTES_PER_VECTOR_TILE,
  DEM_MAX_ZOOM,
  DEM_MIN_ZOOM,
  OFFLINE_BUFFER_M,
  OFFLINE_MAX_ZOOM,
  OFFLINE_MIN_ZOOM,
} from './constants';

export type OfflineEstimate = {
  bounds: BBox;
  vectorTiles: number;
  demTiles: number;
  bytes: number;
};

/**
 * Size a MapLibre offline pack for a route corridor.
 *
 * The pack downloads the OpenFreeMap vector style (MAPS-FREE-STACK §9).
 * Terrarium DEM is a runtime RasterDEMSource, so it is estimated separately
 * and cached by the ambient tile cache when the map has been viewed online.
 */
export function estimateOfflinePack(
  bbox: BBox,
  bufferM: number = OFFLINE_BUFFER_M,
): OfflineEstimate {
  const bounds = bufferBbox(bbox, bufferM);
  const vectorTiles = tileCountForZooms(
    bounds,
    OFFLINE_MIN_ZOOM,
    OFFLINE_MAX_ZOOM,
  );
  const demTiles = tileCountForZooms(bounds, DEM_MIN_ZOOM, DEM_MAX_ZOOM);
  return {
    bounds,
    vectorTiles,
    demTiles,
    bytes: vectorTiles * BYTES_PER_VECTOR_TILE + demTiles * BYTES_PER_DEM_TILE,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
