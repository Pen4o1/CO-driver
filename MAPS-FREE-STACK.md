# MAPS-FREE-STACK.md — dropping Mapbox for a €0, no-credit-card stack

**Short answer: yes, and you lose nothing that matters for this app.** The original plan only used
Mapbox because it's the default answer. For a co-driver that deliberately seeks out twisty roads,
the open stack has primitives Mapbox *doesn't have at all*.

---

## 1. Why the free stack is arguably better here

| What the app needs | Mapbox | Free stack |
|---|---|---|
| "Prefer twisty roads" | **Doesn't exist.** Phase 2 had to invent candidate-generation + geometric scoring to fake it | **Native.** Valhalla `use_highways: 0` / `use_trails: 1` directly penalises motorways and favours minor roads |
| "Avoid motorways / tolls / ferries" | Supported | Supported (ORS `avoid_features`, OSRM `exclude`, Valhalla factors) |
| Elevation for crest/jump notes | Mapbox Terrain-RGB (paid) | **Free, no key**: AWS Terrarium tiles + Valhalla `/height` + ORS `elevation: true` returns `ascent`/`descent` per route |
| Loop-route generator | Build it yourself | **ORS has `round_trip`** with `length` + `seed` built in — replaces a whole chunk of Phase 2 |
| Map matching (for voice-recce) | Paid | Valhalla `/trace_route` — free |
| Map tiles | Paid after free tier | **OpenFreeMap: no key, no registration, no limits** |
| Card on file | Required | **Not required anywhere** |

Plus a practical win: **no token plumbing at all.** No `.env`, no secret download token, no
prebuild-with-token step. One less class of build failure.

**What you give up (be honest with yourself):** OSM road data is less curated than Mapbox's,
and the public demo servers are *fair-use* — fine for development and your own driving, not for
a public launch. §6 covers the self-host path for when that matters.

---

## 2. The stack

| Layer | Choice | Key/card? | Notes |
|---|---|---|---|
| **Map renderer** | `@maplibre/maplibre-react-native` | **None** | MIT, maintained fork of Mapbox GL SDK v9. API is near-identical to `@rnmapbox/maps` |
| **Map tiles** | OpenFreeMap `https://tiles.openfreemap.org/styles/liberty` | **None** | Also `/positron` (light) and `/bright`. Becomes your dark map style later |
| **Terrain / DEM** | AWS `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png` (encoding: `terrarium`) | **None** | Enables `queryTerrainElevation` for crest notes + 3D terrain |
| **Routing — primary** | **OpenRouteService** `api.openrouteservice.org` | Free key, no card | 2,500 req/day, 40,000/month. `avoid_features`, `alternative_routes`, `round_trip`, `elevation`, `extra_info` |
| **Routing — secondary** | **Valhalla** (FOSSGIS) `valhalla1.openstreetmap.de` | **None** | `use_highways`/`use_trails`, `/height`, `/trace_route` map-matching |
| **Routing — dev/fallback** | **OSRM demo** `router.project-osrm.org` | **None** | Fast, no elevation. Good for tests |
| **Geocoding** | **Photon** `photon.komoot.io` (or Nominatim) | **None** | Set a real `User-Agent`; Nominatim is 1 req/s max |
| **Voice (default)** | `expo-speech` | **None** | On-device, robotic, always works |
| **Voice (natural)** | **Piper** or **Kokoro** — local TTS | **None** | Both Apache/MIT, run on your laptop. Batch-render the clips. See §5 |

Nothing in this list asks for a credit card. That's the whole point.

---

## 3. The three API calls, side by side

**Route (ORS)** — this is your Phase 1/2 provider:
```
POST https://api.openrouteservice.org/v2/directions/driving-car/geojson
Authorization: <your free ORS key>
{
  "coordinates": [[23.3219,42.6977],[23.3000,42.6400]],
  "preference": "recommended",          //  or "fastest" | "shortest"
  "avoid_features": ["highways","tollways","ferries","fords"],
  "alternative_routes": { "target_count": 3, "weight_factor": 1.6, "share_factor": 0.6 },
  "round_trip": { "length": 60000, "points": 4, "seed": 42 },   // loop mode only
  "elevation": true,                    //  -> summary.ascent / summary.descent
  "extra_info": ["waytype","surface","steepness","tollways"],
  "units": "m", "language": "en", "instructions": true
}
```
Returns GeoJSON `features[0].geometry` + `properties.summary {distance, duration, ascent, descent}`
+ `properties.segments[].steps[]` (maneuvers) + `properties.extras.<name>.values` (the per-segment
road attributes you need for scoring).

**Valhalla twisty route** — when you want direct control over "how twisty":
```
POST https://valhalla1.openstreetmap.de/route
{
  "locations": [{"lat":42.6977,"lon":23.3219},{"lat":42.6400,"lon":23.3000}],
  "costing": "motorcycle",
  "costing_options": { "motorcycle": { "use_highways": 0.05, "use_trails": 0.8 } },
  "alternates": 2,
  "shape_format": "geojson",
  "directions_options": { "units": "kilometers", "language": "en-US" }
}
```
`use_highways: 0` = avoid motorways, `use_trails: 1` = prefer minor roads. **This single pair of
parameters replaces most of the candidate-generation hack in Phase 2.** Note `costing: "motorcycle"`
is the one with `use_trails`; `auto` has `use_highways`/`use_tolls`/`use_ferry`. For a sports-car
route, motorcycle costing with `use_highways: 0` is exactly the behaviour you want.

**Valhalla elevation profile** (crest / downhill / jump notes):
```
POST https://valhalla1.openstreetmap.de/height
{ "shape": [ {"lat":..,"lon":..}, ... ], "range": true, "height_precision": 1, "interval": 30 }
```
Feed it your route's decoded polyline, get elevation every 30 m. Then `d²h/ds²` gives crests.

> ⚠️ **Verify before you build on them.** Valhalla's parameter names shift between versions and
> the FOSSGIS instance runs a specific build. Have Cursor check `valhalla.github.io/valhalla/api/`
> and `openrouteservice.org/dev/` for the current shapes — this is exactly the situation `AGENTS.md`
> rule 5 exists for. Don't let it guess.

---

## 4. Fair-use rules for public servers (don't be the reason they get shut down)

- **FOSSGIS Valhalla / OSRM demo / Nominatim / Photon** are volunteer-funded community servers.
  They're for development and light personal use. **They are not for a shipped app with users.**
- Always send a descriptive `User-Agent` identifying your app, and cache aggressively.
- Nominatim: **max 1 request/second**, no bulk geocoding. Cache every address you resolve.
- Cache routing results in SQLite keyed by request hash (already in the spec) — this turns your
  dev loop from dozens of requests per edit into near-zero.
- Don't loop candidate generation on the demo servers during development. Test the generator
  against **committed fixture responses** instead, exactly as the spec already requires.
- Abort with exponential backoff on 429/503. The public servers will rate-limit you.

---

## 5. Voice without a card

`expo-speech` is free but robotic. Since the whole architecture pre-renders notes during the
"Recce" step, you have a better option than a paid API:

- **Piper TTS** — MIT, small ONNX models, runs on a laptop or a Raspberry Pi, genuinely decent
  voice quality. Batch a whole route's clips in seconds.
- **Kokoro-82M** — Apache 2.0, ~82M params, quality that competes with paid cloud voices, runs
  fine on CPU.

Render the clips offline on your machine, drop them in as the "voice pack", and the Phase 4
architecture doesn't change at all — `TtsProvider` already abstracts this. You could even ship
a preset voice pack with the app and let the user pick between the free local voice and
`expo-speech`.

---

## 6. When you outgrow free

| Stage | Move | Cost |
|---|---|---|
| Development, your own drives | Public servers | €0 |
| Real users, small | ORS Starter | €20/mo (20k/day) |
| Real users, want no limits | Self-host Valhalla + OpenFreeMap in Docker on a €5 VPS | ~€5/mo |
| Commercial, needs traffic data | Then consider Mapbox/Google | pay |

**Self-hosting is the real answer at scale**, and it's not hard: Valhalla ships an official Docker
image, and OpenFreeMap's entire production setup is open-source and self-hostable. A single small
VPS covers a country-sized graph easily. Ironically this is cheaper *and* faster than the paid
tiers — you just own the ops.

---

## 7. REVISED Phase 1 prompt (paste this instead of the original Phase 1)

```
Implement Phase 1, REVISED per MAPS-FREE-STACK.md. We are NOT using Mapbox. No Mapbox account,
no tokens, no .env secrets. Scope is locked to: app shell, theming, domain types, and the
RoutingProvider interface with an OpenRouteService implementation.

1. MAP RENDERER
   npx expo install @maplibre/maplibre-react-native
   Add "@maplibre/maplibre-react-native" to the plugins array in app.json.
   Call MapLibreGL.setAccessToken(null) once at startup — there is no token in this project.
   Default style URL (put it in src/core/config.ts, not inline):
     https://tiles.openfreemap.org/styles/liberty
   This requires a dev client; Expo Go will not work. Document that in MAP_SETUP.md.

2. DOMAIN (/src/core/types.ts) — implement SPEC.md §Data model, with these changes:
   - Rename `mapboxProfile` -> `providerProfile: string` and `mapboxParams` -> `providerParams`
     (an opaque object owned by the provider implementation).
   - Add to RouteCandidate: `ascentM: number | null`, `descentM: number | null`.
   Everything stays provider-neutral. No Mapbox types anywhere.

3. ROUTING INTERFACE (/src/core/routing/types.ts) — unchanged from SPEC.md:
   RoutingProvider { route(req): Promise<RouteCandidate[]>; match(locs): Promise<RouteGeometry> }
   Add providers/ors/orsProvider.ts as the FIRST implementation:
   POST https://api.openrouteservice.org/v2/directions/driving-car/geojson
   Auth header from EXPO_PUBLIC_ORS_API_KEY (free key, no card).
   Map ORS response -> RouteCandidate: geometry from features[0].geometry (GeoJSON is
   [lng,lat] — convert to {lat,lng} at the boundary, ONLY here), steps from
   properties.segments[].steps, ascent/descent from properties.summary,
   and per-segment road attributes from properties.extras when extra_info is requested.
   Validate the whole response with zod before it enters the app.
   Handle: 401 (bad key), 403, 429 (back off, respect retry-after), 404/no-route, offline.

4. PROVIDER FALLBACK: add a simple `src/features/routing/providers/registry.ts` that selects a
   provider by id from settings, so Phase 2 can add Valhalla as a second implementation without
   touching feature code. Prove the abstraction works by adding a trivial mock provider used in tests.

5. GEOMETRY (/src/core/geo/) — implement exactly as originally specified in Phase 1
   (haversine, cumulativeDistances, pointAtDistance, projectOnPolyline, bearing, bearingDelta,
   resamplePolyline, smoothBearings, frechetDistance). Unchanged — this layer never knew about
   Mapbox anyway.

6. SHELL (/app/): same as the original Phase 1 — tabs, dark-first UI kit, route/new.tsx with
   draggable start/end pins, "use my location", and address search.
   Address search: Photon (https://photon.komoot.io/api?q=...) with a debounce of 400 ms and a
   descriptive User-Agent. Cache results in SQLite. Do not call Nominatim without a 1 req/s guard.

7. TERRAIN: add the AWS raster-dem source to the style so elevation is available later:
     https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png   encoding: "terrarium"
   Do NOT use Mapbox Terrain-RGB. Wire up MapLibreGL's queryTerrainElevation helper in a thin
   wrapper in src/features/maps/elevation.ts, with a test on a fixture tile.

8. MAP_SETUP.md: explain that MapLibre needs a dev client, list every free service we depend on
   and its fair-use limit, and note that the whole stack runs with no API keys except the free ORS one.

Deliverable: I can drop two pins and see a route drawn, with the raw ORS response logged.
Typecheck/lint/tests green. All routing tests run against committed fixture JSON — no network in tests.
```

**Also add to `.env.example`:** `EXPO_PUBLIC_ORS_API_KEY=` (free from openrouteservice.org,
no card) and `EXPO_PUBLIC_VALHALLA_URL=https://valhalla1.openstreetmap.de`. Remove both Mapbox vars.

---

## 8. Phase 2 prompt deltas (paste *with* the original Phase 2)

Keep the whole original Phase 2, but **replace its candidate-generation section** with this:

```
PHASE 2 REVISION — the twisty-route problem is now mostly solved for us. Do NOT build the
waypoint-injection heuristics from the original brief unless the simple approach demonstrably
fails. Instead, in this order:

1. VALHALLA AS THE PRIMARY TWISTY PROVIDER. Implement providers/valhalla/valhallaProvider.ts:
   POST https://valhalla1.openstreetmap.de/route
   costing "motorcycle", costing_options.motorcycle.use_highways (0..1) and .use_trails (0..1).
   Map our RouteProfile -> these two numbers:
     TWIST_SEEKER: use_highways 0.00, use_trails 0.90
     BALANCED:     use_highways 0.30, use_trails 0.45
     CRUISE:       use_highways 0.95, use_trails 0.00
     GENTLE:       use_highways 0.60, use_trails 0.20
     CUSTOM:       derive both from the curviness slider (0..10).
   Request "alternates": 2 for alternatives in one call.

2. ORS FOR STRUCTURED ALTERNATIVES + LOOPS:
   - alternative_routes { target_count: 3, weight_factor: 1.6, share_factor: 0.6 }
   - avoid_features per profile (highways/tollways/ferries/fords)
   - LOOP MODE uses ORS round_trip { length, points: 4, seed } — DELETE the bearing-walk hack
     from the original Phase 2 brief. It's a built-in feature now.
   - elevation: true and extra_info: ["waytype","surface","steepness"] -> map waytype to
     lowSpeedRoadShare and motorwayShare, and use ascent/descent for elevationVariationM.
     This REPLACES the "parse maxspeed" approach, which OSM exposes inconsistently.

3. KEEP the curviness SCORER and the ranking exactly as specified in SPEC.md §Scoring — it's now
   scoring genuinely different roads instead of trying to manufacture them, which is a much better
   signal. Keep the candidate dedupe (Frechet).

4. KEEP the candidate carousel UI and the grade-coloured heat overlay exactly as specified.

5. Provider selection: both Valhalla and ORS behind RoutingProvider. Try Valhalla first for
   TWIST_SEEKER/CUSTOM, ORS first for CRUISE/BALANCED (its data quality is better for a plain
   fast route). Fall back to the other on failure. Log which provider served each candidate.

6. If, and only if, Valhalla + ORS alternates fail to produce visibly distinct twisty vs cruise
   options for a test route, THEN implement the waypoint-injection strategy from the original
   brief as a last resort. Report back before doing it.

Test with the Sofia -> Vitosha or Sofia -> Transfagarasan fixture and confirm twisty and cruise
produce routes that a human would call "obviously different roads", not just different scores.
```

---

## 9. What changes elsewhere

- **Phase 3 (pace-note engine): unchanged.** It's pure geometry over a polyline. It never knew
  Mapbox existed. This is the payoff of keeping `src/core` pure.
- **Phase 4 (voice):** swap the cloud TTS default for `expo-speech` + an optional local
  Piper/Kokoro voice pack (§5). Everything else holds.
- **Phase 5 (co-driver engine):** unchanged, except map-matching (voice-recce) uses Valhalla
  `/trace_route` instead of Mapbox Map Matching.
- **Phase 6 (offline):** MapLibre's offline API is a fork of Mapbox's, so `offlineManager.createPack`
  works the same. Tiles come from OpenFreeMap and are freely cacheable.
- **SPEC.md §11** has been updated with the provider options. `elevationVariationM` is now
  `ascentM`/`descentM` from the router, and `lowSpeedRoadShare` comes from ORS `waytype`/`steepness`.

---

## 10. One thing to do before anything else (a 20-minute spike)

Before writing the app, hit both APIs from your laptop with curl, for one real Bulgarian route,
and eyeball the results:

```bash
# free ORS key from openrouteservice.org first (no card required)
curl -X POST 'https://api.openrouteservice.org/v2/directions/driving-car/geojson' \
  -H 'Authorization: YOUR_FREE_KEY' -H 'Content-Type: application/json' \
  -d '{"coordinates":[[23.3219,42.6977],[23.4000,42.6000]],
       "avoid_features":["highways"],
       "alternative_routes":{"target_count":3,"weight_factor":1.6,"share_factor":0.6},
       "elevation":true,"extra_info":["waytype","steepness"]}' | head -c 2000

# Valhalla, no key needed
curl -X POST 'https://valhalla1.openstreetmap.de/route' -H 'Content-Type: application/json' \
  -d '{"locations":[{"lat":42.6977,"lon":23.3219},{"lat":42.6000,"lon":23.4000}],
       "costing":"motorcycle",
       "costing_options":{"motorcycle":{"use_highways":0.0,"use_trails":0.9}},
       "alternates":2}' | head -c 2000

# OSRM, no key needed
curl 'https://router.project-osrm.org/route/v1/driving/23.3219,42.6977;23.4000,42.6000?alternatives=true&geometries=geojson'
```

**Confirm two things:** (1) `alternative_routes` and `alternates` actually return *geometrically
different* routes for your test corridor, and (2) the `steepness`/`waytype` extras contain real
values and not all-zeros for Bulgarian roads. If either fails, you know *now* instead of in Phase 3,
and the waypoint strategy is the answer.

Save each response as fixture JSON in `src/core/__fixtures__/` — those become your tests.
