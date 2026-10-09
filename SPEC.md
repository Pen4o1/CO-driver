# SPEC.md — Apex Rally Co-Driver

> Single source of truth for this repo. Attach this file to every Cursor chat.
> If the code and this spec disagree, **this spec wins** — or update the spec deliberately and note it in the commit message.

---

## 1. Product

**Apex** is a rally co-driver for normal roads. You build a route, choose how twisty you want it, and the app reads rally-style pace notes out loud in real time based on GPS.

- The **route** is real (routable roads, respect traffic laws).
- The **pace notes** are derived from the road geometry, not from a human recce.
- The **voice** is generated, not recorded.
- A **GPX track** can be imported from Home. Pace notes are derived from that line the same way as a built route. The line is not snapped to the road network.

**Target user:** motorcyclists and sports-car drivers who deliberately seek out good roads, and rally fans who want the experience outside a special stage.

**Not:** a turn-by-turn navigation app or a lap timer.

### Safety & legality (must be implemented, not optional)
- The app is a driving aid. It does not replace attention to the road.
- No interaction is possible while the session status is `driving`. Audio + one large mute/stop control only.
- First-run disclaimer acknowledges the driver is in full control of the vehicle at all times.
- Background location is justified to the stores as: *continuous voice guidance while driving*.

---

## 2. Architecture

```
app/                          expo-router screens
  (tabs)/index.tsx            Home: saved routes + recent drives
  (tabs)/settings.tsx
  route/new.tsx               Route builder (pins → style → candidates)
  route/[id]/index.tsx        Route details + candidate map preview
  route/[id]/recce.tsx        Pre-drive checklist
  route/[id]/prepare.tsx      Voice pre-render ("Recording pacenotes…")
  drive/[id].tsx              Driving HUD
  drive/[id]/summary.tsx      Post-drive summary
  dev/notes.tsx               Dev: note list + filter panel
  dev/sim.tsx                 Dev: Sim Drive with debug overlay

src/core/                     PURE TypeScript. No React, no Expo, no native, no network.
  types.ts                    Domain types + zod schemas
  geo/                        haversine, cumulativeDistances, projectOnPolyline,
                              bearing, bearingDelta, resamplePolyline,
                              smoothBearings, frechetDistance
  routing/                    RoutingProvider interface, RouteProfile definitions
  scoring/                    curviness metrics + candidate ranking
  pacenotes/                  resample → detectCorners → grade → mergeJunctions →
                              buildNotes → filterNotes → script
  tracks/                     GPX parse → RouteCandidate
  coach/                      timing.ts (lead distance), scheduler (pure state machine)

src/features/                 Wiring: anything that touches React/Expo/network/native
  routing/                    providers/<id>/, generateCandidates, cache, registry
  voice/                      TtsProvider, DeviceTtsProvider, CloudTtsProvider, CoDriverVoice
  coach/                      useCoDriver (location loop), backgroundTask
  maps/                       MapView wrappers, route layers, grade heatmap, offline packs
  storage/                    SQLite schema + repositories
  tracks/                     file picker + save imported GPX as a route

src/ui/                       Design system: Button, Card, Chip, GradeBadge,
                              DirectionArrow, Sheet, ProgressRing
src/state/                    Zustand stores (routeDraft, settings, session)
```

**Hard rules**
- `src/core/**` imports nothing from `src/features/**`, `react`, `react-native`, or `expo-*`. Enforce with an ESLint `no-restricted-imports` rule.
- No file over 250 lines. Split by feature.
- Every `async` boundary result is parsed with zod before use.
- Named exports only. No default exports except Expo Router screens.

---

## 3. Data model

```ts
export type LatLng = { lat: number; lng: number };

export type TurnGrade = 1 | 2 | 3 | 4 | 5 | 6;   // 1 = hairpin, 6 = flat out

export type RouteGeometry = {
  coords: LatLng[];                 // ALWAYS 2D {lat,lng}. Keeps geometry math unchanged.
  cumulative: Float64Array;         // metres from start, same length as coords
  lengthM: number;
  bbox: [number, number, number, number];
  elevationM: Float64Array | null;  // DEM height per coord, SAME INDEX as coords.
                                    // ORS `elevation: true` returns [lng,lat,z] — split z out
                                    // here so `cumulative[i]` indexes elevation too. Null if absent.
  };
// RULE: never store 3D coords. z lives only in elevationM, aligned by index.

export type RouteStyle = 'twist' | 'balanced' | 'cruise' | 'gentle' | 'custom';

export type RouteProfile = {
  id: RouteStyle;
  label: string;
  description: string;
  avoidMotorway: boolean;
  avoidToll: boolean;
  avoidFerry: boolean;
  avoidUnpaved: boolean;
  minGradeTolerance: TurnGrade;     // ignore corners non-severe than this when optimising
  maxDetourRatio: number;           // vs fastest route. default 1.35
  weights: ScoringWeights;
  providerProfile: string;          // opaque to core, owned by the provider impl
                                    //   e.g. valhalla: {use_highways, use_trails}
                                    //        ors: {preference, avoid_features}
  providerParams: Record<string, unknown>;
};

export type ScoringWeights = {
  curviness: number;        // deg of turn per km
  hairpinDensity: number;
  turnDensity: number;
  lowSpeedRoadShare: number;
  elevationVariation: number;
  motorwayPenalty: number;  // subtractive
  detourPenalty: number;    // subtractive
};

export type CurvinessBreakdown = {
  score: number;                    // 0..100
  lengthM: number;
  durationS: number;
  curvatureDegPerKm: number;
  hairpinCount: number;
  turnDensityPerKm: number;
  motorwayShare: number;
  lowSpeedRoadShare: number;
  elevationVariationM: number | null;
  tags: string[];                   // e.g. ['36 hairpins', 'mostly B-roads', 'no motorway']
};

export type RouteCandidate = {
  id: string;
  providerId: string;               // 'valhalla' | 'ors' | 'osrm' | 'mock'
  geometry: RouteGeometry;
  steps: RouteStep[];
  breakdown: CurvinessBreakdown;
  fastestDurationS: number;         // for the "+12 min" comparison
  profileId: RouteStyle;
  waypointsUsed: LatLng[];
  ascentM: number | null;           // DERIVED from elevationM, not from summary.ascent
  descentM: number | null;
};

export type RouteStep = {
  distanceM: number;
  durationS: number;
  roadName?: string;
  wayType?: number;                 // ORS extra_info.waytype 0..7 (1=state road, 3=street...)
  surface?: string;                 // ORS extra_info.surface
  steepnessPct?: number;            // ORS extra_info.steepness, signed, per segment
  maneuver: { type: string; modifier?: string; instruction: string; location: LatLng };
};

export type NoteType =
  | 'start' | 'finish' | 'corner' | 'straight' | 'junction'
  | 'crest' | 'jump' | 'care' | 'offroute' | 'info';

export type NoteModifier =
  | 'tightens' | 'opens' | 'long' | 'short' | 'dont-cut' | 'narrows'
  | 'blind' | 'bumpy' | 'over-crest' | 'downhill' | 'slippery';

export type NoteChain = 'into' | 'and' | 'then' | null;

export type PaceNote = {
  id: string;
  type: NoteType;
  direction?: 'left' | 'right' | 'straight';
  grade?: TurnGrade;
  modifiers: NoteModifier[];
  chain: NoteChain;
  atDistance: number;          // arc length of the APEX (metres) — call timing key
  entryDistance: number;
  exitDistance: number;
  distanceFromPrevious: number;
  radiusM?: number;
  totalAngleDeg?: number;
  arcLengthM?: number;
  severity: number;            // 0..1, for UI colour/priority
  roadName?: string;
  spokenFull: string;
  spokenShort: string;
  junctionInstruction?: string; // e.g. "roundabout, take the second exit"
  audioClipId?: string;
};

export type NoteFilterOptions = {
  minGradeToCall: TurnGrade;    // call only corners at least this tight; 1 = call everything
  includeJunctions: boolean;
  includeCrests: boolean;
  includeStraights: boolean;
  includeCareNotes: boolean;
  includeFinish: boolean;
  verbosity: 'full' | 'standard' | 'terse';
  chainRadius: number;          // metres; merge notes closer than this into one utterance
  confirmCalls: boolean;
};

export type LeadTimePreset = 'early' | 'normal' | 'late';

export type DriveSessionStatus = 'idle' | 'recce' | 'driving' | 'paused' | 'off-route' | 'finished';

export type GeoFix = {
  lat: number; lng: number;
  speedMps: number; headingDeg: number; accuracyM: number; timestampMs: number;
};

export type VoiceAction =
  | { kind: 'speak'; noteId: string; text: string; priority: 'urgent' | 'normal' | 'info'; clipId?: string }
  | { kind: 'stop' }
  | { kind: 'duck'; ms: number };
```

---

## 4. Corner detection algorithm (normative)

Input: `RouteGeometry`. Output: `Corner[]`.

1. **Resample** at `ds = 5 m` along arc length. Interpolate lat/lng linearly between vertices (routes are short-hop; linear is fine here).
2. **Smooth bearings** with a circular moving average. Window = 15 m each side, Hann weights. Recompute curvature `k[i] = bearingDelta(i-1,i+1) / (2*ds)`, signed (positive = right).
3. **Corner detection**, window `W = 40 m`:
   - `angleInWindow(i) = Σ signed Δθ` over `[i, i+W/ds]`.
   - **Open** a corner when `|angleInWindow| > 12°` and direction is consistent for 3 consecutive samples.
   - **Close** a corner when `|angleInWindow|` drops below 60% of the peak observed so far. Require a corner to span `>= 15 m` or discard it as noise.
   - Concatenate overlapping spans. Discard spans where direction consistency `< 0.75` (that's an S-curve, re-run detection inside it with a smaller window).
   - A same-direction bend the 40 m window misses is still a corner when its total angle is at least 12°.
4. **Per corner metrics:**
   - `totalAngleDeg` = signed sum of Δθ over the span.
   - `radiusM = arcLength / |totalAngleDeg * π/180|` (guard: if `|angle| < 1°`, drop).
   - `arcLengthM` = span length.
   - `apexIndex` = index of maximum |k| within the span.
5. **Chaining** between corner *n* and *n+1* with gap `g` (metres between exit of n and entry of n+1):
   - `g < 25` and opposite direction → `into`
   - `g < 25` and same direction → `and`
   - `25 ≤ g < 60` → `then`
   - `g ≥ 60` → no chain
6. **Tightens / opens:** split the span into entry 40% / exit 40%. If `radiusExit < 0.75 * radiusEntry` → `tightens`. If `radiusExit > 1.33 * radiusEntry` → `opens`.
7. **Long / short:** `arcLengthM > 120` → `long`; `arcLengthM < 25 && grade > 1` → `short`.
8. **Straights:** a run of `> 400 m` with net `|Δθ| < 8°` → one `straight` note placed at the midpoint of the run.

---

## 5. Grade table (normative)

| Grade | Meaning | Radius | Extra condition |
|---|---|---|---|
| 1 | Hairpin | ≤ 20 m | AND total angle ≥ 120° |
| 2 | Very tight | 20–40 m | |
| 3 | Tight / medium | 40–80 m | |
| 4 | Medium | 80–150 m | |
| 5 | Fast | 150–300 m | |
| 6 | Flat / kink | > 300 m | total angle ≥ 12°, else not a note |

**Severity** `0..1` for UI + priority: `severity = clamp01( (7 - grade) / 6 * 0.7 + min(|totalAngle|/180, 1) * 0.3 )`.

**Router cross-check:** the router's maneuver modifiers map to an implied grade — `sharp left/right` → 2, `left/right` → 3.5, `slight left/right` → 5. Geometry wins on disagreement; log it in `__DEV__`.

**Undershoot rule:** distances are always rounded **down** (nearest 10 m below 100 m, nearest 50 m above), so the call is never optimistic.

---

## 6. Note grammar (normative)

Number pronunciation: digits as digits in text (TTS reads `350` correctly); grade always as a word (`four`, not `4`) because "left 4" reads ambiguously.

```
STRAIGHT      "{d}, {straight|long straight}" | "{d}, straight, over crest"
CORNER        "{d}, {dir} {grade}{, modifiers}{, chain-partner}"
CHAINED       "{d}, {dir} {grade} {into|and|then} {dir} {grade}"
JUNCTION      "at the {instruction}" | "{d}, {instruction}"
CREST         "{d}, over crest" | "{d}, crest, {then corner}"
JUMP          "{d}, jump"
START         "start, {first note in 50..}"
FINISH        "finish, {distance} to go"
INFO/OFFROUTE "off route, recalculating"
```

Examples:
- `In 150, left four, tightens, don't cut, into right six.` (full)
- `150, left four.` (standard)
- `four left` (terse)
- `Hairpin left, take the second exit.` (junction + corner merged)

**Utterance grouping** (`notesToScript`): max ~12 words or ~3 notes per utterance. Notes closer than `chainRadius` merge into one utterance. Never two utterances within 1.5 s of each other.

**Filtering continuity:** after filtering, `distanceFromPrevious` is recomputed so the co-driver always states the true gap to the next *called* note.

---

## 7. Route scoring (normative)

Metrics (per candidate):

```
curvatureDegPerKm   = Σ |ΔΘ| over route (degrees) / (lengthM / 1000)
hairpinCount        = #{ corners with grade == 1 }
turnDensityPerKm    = #{ corners with grade <= 4 } / (lengthM / 1000)
motorwayShare       = metres where (waycategory & 1) / lengthM      // ORS bitmask: 1 = highway
lowSpeedRoadShare   = metres where wayType ∈ {3 street, 5 track} / lengthM
elevationVariationM = ascentM (derived from elevationM), null if no elevation data

// ORS extras are INDEX TRIPLES, not per-step values:
//   extras.waytype.values = [[startIdx, endIdx, value], ...]  -> indexes into geometry coords
//   Combine with `cumulative` to get metres per section.
//   extras.<name>.summary = [{value, distance, amount}] is a shortcut for simple share metrics.
// RESPONSE KEY GOTCHA: the request param is "waytype" but the response key has been seen as
//   "waytypes" (plural). Read both, prefer whichever exists. Assert it in a fixture test.

// ASCENT/DESCENT DERIVATION (summary.ascent is NOT populated by elevation: true — verified):
//   1. Take elevationM, smooth with a moving average over ~100 m of arc length
//      (raw DEM jitter makes a naive sum overestimate ascent by 3-5x).
//   2. ascentM  = Σ max(0, h[i+1] - h[i]);  descentM = Σ max(0, h[i] - h[i+1])
//   3. Store both raw and smoothed values in the breakdown during development so the
//      smoothing window can be calibrated against reality. Ship the smoothed one.
```

**Source of road attributes (provider-neutral).** Do not assume a `maxspeed` annotation exists —
OSM exposes it inconsistently. In preference order:
1. ORS `extra_info: ["waytype","waycategory","steepness","surface"]` → `properties.extras`
   index triples (see the format note above). **Verified working on Bulgarian roads** — real
   non-zero values, not empty. Use `waycategory & 1` for motorways; `waytype` 3/5 for low-speed.
2. Valhalla `/trace_attributes` with `filters.attributes: ["road_class","surface","edge.percent_grade"]`.
3. Overpass API (free, no key) for the route corridor — `highway=*`, `maxspeed`, `surface`.
   Cache aggressively; never call Overpass per candidate.
4. `null` — and redistribute the weight. **A metric that cannot be sourced must be `null`,
   not zero**, or every candidate looks like it scores badly.

**"Unpaved" is not filterable server-side.** ORS `avoid_features` for driving-* supports only
`highways`, `tollways`, `ferries`, `fords`. Detect unpaved client-side from the `surface` extra
and apply a soft penalty, or exclude the candidate.


Normalise each metric min–max **across the candidate set** (if a metric is constant across the set, its normalised value is 0.5). Then:

```
score01 =   w.curviness        * n(curvatureDegPerKm)
          + w.hairpinDensity   * n(hairpinCount / km)
          + w.turnDensity      * n(turnDensityPerKm)
          + w.lowSpeedRoadShare* n(lowSpeedRoadShare)
          + w.elevationVariation * n(elevationVariationM ?? 0.5)
          - w.motorwayPenalty  * n(motorwayShare)
          - w.detourPenalty    * n(durationS / fastestDurationS - 1)
score = clamp(score01, 0, 1) * 100
```

**Dedupe (normative — tightened after the live Sofia spike).** Two candidates are the same road if EITHER:
- `frechetDistance(A,B) < 0.15 * min(lengthA, lengthB)`, OR
- **overlap share > 0.85**: more than 85% of B's vertices lie within 50 m of some vertex of A
  (spatial hash on ~0.001° cells keeps this O(n)).

Keep the faster one. *Why both rules:* ORS `alternative_routes` returned 3 "alternatives" on the
Sofia→Zlatnite Mostove corridor whose overall paths differed by 1.7 km, but a pair of them were
only **28 m** apart under Fréchet — the same mountain road reached through different city streets.
Fréchet alone catches duplicates; the overlap rule catches the partial-share case (62% city /
100% mountain shared) that Fréchet misses at longer lengths. Without both, you will show the user
three route cards for one road.

Profile weights:

| Profile | curviness | hairpin | turnDensity | lowSpeed | elevation | motorway− | detour− |
|---|---|---|---|---|---|---|---|
| twist | 0.40 | 0.25 | 0.15 | 0.10 | 0.10 | 0.35 | 0.25 |
| balanced | 0.25 | 0.15 | 0.15 | 0.10 | 0.10 | 0.20 | 0.45 |
| cruise | 0.05 | 0.00 | 0.05 | 0.05 | 0.05 | 0.00 | 0.70 |
| gentle | 0.15 | 0.00 | 0.00 | 0.15 | 0.05 | 0.10 | 0.50 |

### Fixture expectations (assert in tests)

- Two candidates of equal length on winding vs straight roads → `curvatureDegPerKm` differs by ≥ 3×.
- A route that is 100% motorway → `motorwayShare == 1` and score ≤ 20 under the `twist` profile.
- `cruise` must never rank a `maxDetourRatio`-violating route above the fastest one.

---

## 8. Call timing (normative)

```
leadSeconds(note):
  grade 1–2 (tight, needs braking) → 5.0 s
  grade 3–4                        → 3.5 s
  grade 5–6 (fast, arrives quickly) → 2.5 s
  junction / crest / info          → 4.0 s

leadDistance(note, v) = clamp(v * leadSeconds(note) * presetScale, 60 m, 350 m)
  presetScale: early 1.25 · normal 1.0 · late 0.8
```

- **Primary call** at `warningAnchor - leadDistance`.
  For a corner, `warningAnchor` is `entryDistance` (where the road starts to turn).
  For every other note it is `atDistance`. The lead is time to begin braking,
  so a long corner is called before its entry rather than before its apex.
- **Confirm call** at `warningAnchor - 40 m`, terse form, skipped if the primary fired < 3 s ago or `confirmCalls === false`.
- **Coalescing:** if `nextNote.atDistance - note.atDistance <= chainRadius`, speak both in one utterance.
- **Never repeat:** a note fires once. It re-arms only if the car back-tracks more than 50 m behind its `atDistance`.
- **Off-route:** `crossTrackM > 35` for 3 consecutive fixes *and* speed > 2 m/s → pause, announce, re-route.
- **Look-ahead window:** evaluate all notes within `currentDistance + v * 8 s`.

Acceptance test: approaching a grade-2 corner at 100 km/h (27.8 m/s) with the `normal` preset, the primary call fires at exactly `139 m` before the corner entry.

---

## 9. Persistence (SQLite)

```sql
routes(id, name, created_at, profile_id, geometry_json, steps_json,
       breakdown_json, length_m, duration_s, bbox)
notes(id, route_id, payload_json, filter_json, created_at)
drives(id, route_id, started_at, ended_at, distance_m, duration_s, stats_json)
drive_fixes(id, drive_id, t_ms, lat, lng, speed_mps, heading_deg)
route_cache(request_hash PRIMARY KEY, response_json, created_at)
voice_cache(text_hash PRIMARY KEY, provider_id, voice_id, file_path, bytes, created_at)
grid_cache(cell_id PRIMARY KEY, snapped_json, created_at)   -- road snapping, avoids repeat API calls
```

`filter_json` on notes means changing the filter never requires a network re-route — only a re-derive (instant) and possibly a re-render of the clips.

`routes.voice_card_json` stores two call cards, `bike` and `car`, plus which one is active. Each card is `leadPreset`, `minGradeToCall`, `verbosity`, and `confirmCalls`. Null means Settings still supplies those four fields. Junctions, crests, straights, care notes, finish, and chain distance stay global. Prepare, the checklist, the note sheet, and the drive use the active card. Changing it re-filters; it does not re-route.

**Reverse.** One saved copy with the vertex order flipped, `elevationM` flipped with it, ascent and descent swapped, and router steps dropped. Pace notes are derived again from the line. No router.

---

## 10. Definition of done, globally

- `npm run typecheck && npm run lint && npm run test` all clean.
- `src/core` has ≥ 90% statement coverage and zero React/Expo imports (lint-enforced).
- The app runs a full simulated drive with airplane mode on, screen locked, ringer off.
- No file over 250 lines; no `any`; no TODO comments left in merged code.

---

## 11. Providers (no paid services, no credit card)

**This project uses no paid APIs and requires no card anywhere.** See `MAPS-FREE-STACK.md`
for the full rationale and the API payload shapes.

| Layer | Provider | Auth |
|---|---|---|
| Map render | `@maplibre/maplibre-react-native` (MIT, fork of Mapbox GL SDK v9) | none |
| Tiles | OpenFreeMap `https://tiles.openfreemap.org/styles/liberty` | none |
| Terrain DEM | AWS `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`, encoding `terrarium` | none |
| Routing (twisty) | Valhalla `https://valhalla1.openstreetmap.de/route` | none |
| Routing (alternatives, loops, elevation) | ORS `https://api.openrouteservice.org/v2/directions/driving-car/geojson` | free key, no card |
| Geocoding | Photon `https://photon.komoot.io/api` | none |
| Voice (default) | `expo-speech` (device) | none |
| Voice (natural) | local Piper / Kokoro, pre-rendered into a voice pack | none |

### Rules for this layer
- **`src/core` never names a provider.** `RoutingProvider` / `TtsProvider` interfaces only.
  Provider implementations live in `src/features/routing/providers/<id>/` and are selected by id
  from settings. Adding a third provider must touch zero feature code.
- **Every provider is unit-tested against committed fixture JSON.** No network in tests.
- **Fair use:** the community servers (FOSSGIS Valhalla, Photon, Nominatim) are volunteer-funded
  and for development + light personal use only. Always send a descriptive `User-Agent`,
  cache in SQLite, back off on 429/503, and never loop candidate generation against them —
  use fixtures. Nominatim is capped at 1 req/s.
- **Ship-ready path** (when you outgrow free, in order of preference): self-host Valhalla +
  OpenFreeMap in Docker on a ~€5/mo VPS → ORS Starter (€20/mo) → only then consider commercial.
- **Twisty routing primitive:** Valhalla `costing: "motorcycle"` with
  `costing_options.motorcycle.use_highways` (0..1, lower = avoid motorways) and `.use_trails`
  (0..1, higher = prefer minor roads). This is the primary lever for "more turns / fewer turns";
  the geometric curviness scorer then ranks what the router returns.
