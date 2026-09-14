# MAP_SETUP.md — MapLibre dev client and the free stack

Apex does **not** use Mapbox, Google Maps, or any paid tile/routing product. There is no Mapbox token in this repo.

## Dev client (required)

`@maplibre/maplibre-react-native` is native code. It **does not run in Expo Go**.

```sh
cp .env.example .env          # add your free ORS key
npx expo prebuild --clean
npx expo run:ios              # or: npx expo run:android
```

After the first native build, `npx expo start --dev-client` is enough until you add another native module.

Web is not supported for the map. The New route screen says so.

## `setAccessToken(null)`

The Phase 1 prompt asked for `MapLibreGL.setAccessToken(null)`. **MapLibre React Native v11 removed that API** (verified in `@maplibre/maplibre-react-native@11.3.10`). OpenFreeMap tiles need no token, so startup calls `initMapLibre()`, which is a documented no-op. Do not add a Mapbox token to "make it work".

## `queryTerrainElevation`

MapLibre GL JS has `map.queryTerrainElevation`. The React Native `MapRef` in v11.3.10 does **not** expose it. `src/features/maps/elevation.ts` isolates that:

- AWS Terrarium decode is implemented and unit-tested on a fixture tile
- `queryMapTerrainElevation` calls `queryTerrainElevation` if a future MapRef grows it

The AWS raster-dem source is already on the map (`encoding: "terrarium"`).

## Services we depend on

| Service | URL | Key | Fair use |
|---|---|---|---|
| Map tiles | OpenFreeMap `https://tiles.openfreemap.org/styles/liberty` | none | Public tiles; cache via the native SDK later (Phase 6) |
| Terrain DEM | AWS Terrarium `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png` | none | Public S3; don't scrape, just render |
| Routing | OpenRouteService `https://api.openrouteservice.org/v2/directions/driving-car/geojson` | **free key, no card** (`EXPO_PUBLIC_ORS_API_KEY`) | 2,500 req/day, 40,000/month. Cache in SQLite. Back off on 429. |
| Twisty routing (Phase 2) | Valhalla FOSSGIS `https://valhalla1.openstreetmap.de` | none | Volunteer server. Dev + personal only. Always send `User-Agent`. |
| Geocoding | Photon `https://photon.komoot.io/api` | none | Volunteer server. 400 ms debounce. SQLite cache. Descriptive `User-Agent`. |
| Nominatim | `nominatim.openstreetmap.org` | none | **Do not call it** without a 1 req/s guard. Photon is the geocoder. |
| OSRM demo | `router.project-osrm.org` | none | Tests / fallback later. Not hit in Phase 1. |

The only API key in the whole stack is the **free OpenRouteService key**. Everything else is keyless. No credit card anywhere.

## User-Agent

All outbound requests send:

`ApexRallyCoDriver/1.0 (personal-dev; fair-use; no-bulk)`

## Manual check (Phase 1)

1. Build the dev client (commands above).
2. Home → **New route**.
3. **Use my location** (or search Sofia) for start.
4. Tap the map ~20 km away for end, or search another place.
5. A route line should draw. Metro logs `[ORS raw] …` for the first request. The second identical request is served from SQLite and is instant.
