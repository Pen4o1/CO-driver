import { buildRouteGeometry } from '@/core/geo';
import type { RouteCandidate, RouteGeometry } from '@/core/types';

type GeometryJson = {
  coords: RouteGeometry['coords'];
  cumulative: number[];
  lengthM: number;
  bbox: RouteGeometry['bbox'];
  elevationM: number[] | null;
};

export function geometryToJson(geometry: RouteGeometry): GeometryJson {
  return {
    coords: geometry.coords,
    cumulative: Array.from(geometry.cumulative),
    lengthM: geometry.lengthM,
    bbox: geometry.bbox,
    elevationM: geometry.elevationM ? Array.from(geometry.elevationM) : null,
  };
}

export function geometryFromJson(raw: GeometryJson): RouteGeometry {
  const elevationM =
    raw.elevationM === null ? null : Float64Array.from(raw.elevationM);
  return buildRouteGeometry(raw.coords, elevationM);
}

export function candidateToJson(candidate: RouteCandidate): string {
  return JSON.stringify({
    ...candidate,
    geometry: geometryToJson(candidate.geometry),
  });
}

export function candidateFromJson(text: string): RouteCandidate {
  const raw = JSON.parse(text) as Omit<RouteCandidate, 'geometry'> & {
    geometry: GeometryJson;
  };
  return { ...raw, geometry: geometryFromJson(raw.geometry) };
}
