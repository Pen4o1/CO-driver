/**
 * Geometry primitives for routes.
 *
 * Assumptions:
 * 1. Sphere of radius 6_371_000 m. No ellipsoid, no altitude in haversine.
 * 2. Lat/lng interpolation is linear in degrees (SPEC: short-hop routes).
 * 3. Bearings are clockwise from north. bearingDeltaDeg > 0 means right.
 * 4. projectOnPolyline uses a local ENU plane around the polyline start.
 * 5. Fréchet is discrete on the given vertices (metres via haversine).
 * 6. Elevation ascent/descent is summed on a ~100 m along-track moving average.
 * 7. Coordinates in this layer are always {lat,lng}. Never [lng,lat].
 */
export { haversineM, EARTH_RADIUS_M } from './haversine';
export { bearingDeg, bearingDeltaDeg } from './bearing';
export { cumulativeDistancesM, polylineLengthM } from './cumulative';
export { pointAtDistance, resamplePolyline } from './interpolate';
export { projectOnPolyline } from './project';
export type { PolylineProjection } from './project';
export { smoothBearings } from './smoothBearings';
export { frechetDistanceM } from './frechet';
export { deriveAscentDescent, smoothElevationM } from './elevation';
export type { AscentDescent } from './elevation';
export { boundingBox, buildRouteGeometry } from './buildGeometry';
export { bufferBbox } from './bufferBbox';
export type { BBox } from './bufferBbox';
export {
  latToTileY,
  lngToTileX,
  tileCountForBbox,
  tileCountForZooms,
} from './webMercator';
export { destinationPoint } from './destination';
export { overlapShare } from './overlap';
export { decodePolyline } from './polyline6';
export { clamp } from './clamp';
