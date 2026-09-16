export const OFFLINE_BUFFER_M = 2000;
export const OFFLINE_MIN_ZOOM = 8;
export const OFFLINE_MAX_ZOOM = 16;
/** OpenFreeMap vector tiles are typically 10–30 KiB. Conservative mean. */
export const BYTES_PER_VECTOR_TILE = 18 * 1024;
/** Terrarium PNG tiles if we also cache DEM (not in the style pack). */
export const BYTES_PER_DEM_TILE = 24 * 1024;
export const DEM_MAX_ZOOM = 12;
export const DEM_MIN_ZOOM = 8;
