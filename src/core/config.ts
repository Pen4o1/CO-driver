/** Provider-neutral constants. Network I/O lives in `src/features`, not here. */

export const OPENFREEMAP_STYLE_URL =
  'https://tiles.openfreemap.org/styles/liberty';

export const TERRARIUM_TILE_URL =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

export const TERRARIUM_ENCODING = 'terrarium' as const;

export const ORS_DIRECTIONS_URL =
  'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

export const VALHALLA_DEFAULT_URL = 'https://valhalla1.openstreetmap.de';

export const OSRM_NEAREST_URL =
  'https://router.project-osrm.org/nearest/v1/driving';

export const PHOTON_SEARCH_URL = 'https://photon.komoot.io/api';

export const APP_USER_AGENT =
  'ApexRallyCoDriver/1.0 (personal-dev; fair-use; no-bulk)';

export const DEFAULT_MAP_CENTER = { lat: 42.6977, lng: 23.3219 };

export const PHOTON_DEBOUNCE_MS = 400;

export const ELEVATION_SMOOTH_WINDOW_M = 100;
