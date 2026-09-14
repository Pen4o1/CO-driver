# 🏁 Rally Co-Driver App — Cursor Prompt Pack

**App concept:** a mobile co-driver that sits in the passenger seat and *talks you through the road* — "in 150, left four, tightens, into right six, then 200 straight over crest."

**Stack:** React Native + Expo (dev client) · TypeScript · **MapLibre + Valhalla/ORS (100% free, no credit card)** · `expo-location` · `expo-speech` / local Piper voice pack · SQLite
**Delivered as:** 6 sequential phases. One phase = one Cursor chat. Commit after each.

> 📄 **No Mapbox, no payment method.** The maps/routing stack is free and keyless wherever possible — see **`MAPS-FREE-STACK.md`**, which contains the revised Phase 1 prompt and the Phase 2 deltas. **Paste those instead of the originals for Phases 1 and 2.** Everything else below is unchanged.

---

## 0. How to use this pack (read me first)

**The workflow that actually works:**

1. Create the repo and drop in `SPEC.md` + `AGENTS.md` (both provided in the starter folder, and reproduced in Phase 0 below).
2. Open Cursor → **Agent mode** → attach `SPEC.md` and `AGENTS.md` to *every* chat.
3. Paste **one phase prompt per chat.** Never paste two phases into one chat — the model will half-build both.
4. After each phase: run the app, run the tests, then `git commit -m "phase N: ..."`. Commit before you move on, because if Cursor wrecks something in Phase 4 you can reset to Phase 3.
5. If a phase fails, do **not** start a new chat. Say: *"Re-read SPEC.md §Pace notes and fix only `src/features/pacenotes/`. Don't touch other files."*
6. Add this to the end of every prompt if scope creep starts: *"Scope is locked. Do not add features, packages, or files outside this phase."*

**Before you write a single line:**

| Thing | Where |
|---|---|
| **OpenRouteService free key** (no card, 2,500 req/day) | openrouteservice.org → sign up |

> 🔬 **The API spike is done.** `MAPS-FREE-STACK.md` **§11** records what the live APIs actually
> do — including three corrections to my first draft (`avoid_features` nesting, no `summary.ascent`,
> and `alternative_routes` not producing genuinely different roads). Read §11 before Phases 1 and 2.
| Node 20+, Expo CLI, `eas-cli`, Xcode / Android Studio | local machine |
| A dev client build (MapLibre is native code and **does not run in Expo Go**) | `npx expo prebuild && npx expo run:ios` / `run:android` |
| Car mount + a mate to watch the phone while you drive | 🚗 |
| Optional natural voice: **Piper** or **Kokoro** running locally — no account | `MAPS-FREE-STACK.md` §5 |

> ⚠️ **Safety:** this is an app that runs while driving. Build the legal disclaimer, the "locked while moving" UI, and audio-only interaction early. Never require a tap to hear the next call.

---

## 1. The context block (paste at the top of every phase prompt)

```
PROJECT CONTEXT
We are building "Apex" — a rally co-driver mobile app in React Native + Expo (TypeScript, dev client).

Product: the user creates a route (start → end), optionally choosing how twisty it should be.
When they hit START, the app derives rally-style pace notes from the route geometry and a
co-driver voice reads them out in real time based on GPS: "in 150, left four, tightens,
don't cut, into right six, then 200 straight over crest."

Non-negotiable engineering rules:
- TypeScript strict. No `any`. All route/note data validated with zod at the boundary.
- Domain logic (geometry, corner detection, note building, trigger scheduling) must be PURE
  functions in /src/core, with zero React, zero Expo, zero native imports. Unit-testable in Node.
- The co-driver engine must be testable without a car: every GPS update enters through one
  function, so a "Sim Drive" can feed synthetic positions through the exact same path.
- Expo Router for navigation. Zustand for UI state. SQLite (expo-sqlite) for persistence.
- Providers (routing, TTS) sit behind interfaces. We use MapLibre + Valhalla + ORS + Photon +
  expo-speech — all free, no credit card anywhere (SPEC.md §11). Never introduce Mapbox or
  Google Maps, and never add a key that requires billing.
- Every phase ends with: typecheck clean, lint clean, unit tests green, and a manual test recipe.

READ SPEC.md and AGENTS.md before writing code. Follow them exactly.
Do not invent APIs — if unsure about a MapLibre / Valhalla / ORS / Expo API, say so and check the current docs.
```

---

## 2. Phase 0 — Repo, spec, and agent rules `(5 min, no code)`

**Prompt:**

```
Task: finish setting up the repository skeleton for the project described in SPEC.md.

CONTEXT: The repo already exists and already contains SPEC.md, AGENTS.md,
MAPS-FREE-STACK.md and .cursor/rules/apex.mdc. Read SPEC.md and AGENTS.md before starting.
Do NOT delete or overwrite those files. Scope is locked to setup — no domain logic, no
geometry, no routing code in this phase.

1. SCAFFOLD — check the current state first and tell me what you found.
   - If package.json does NOT exist: scaffold Expo in this folder:
       npx create-expo-app@latest . --template blank-typescript
     If it refuses because the directory isn't empty, scaffold into a temp dir
     (../apex-scaffold) and move ONLY the generated files into this repo
     (package.json, app.json, tsconfig.json, babel.config.js, .gitignore, app/, assets/),
     then delete the temp dir.
   - If package.json DOES exist: report what's configured and add only what's missing.
   Then install and configure expo-router per the current Expo docs.

2. FOLDER STRUCTURE exactly as in SPEC.md §Architecture. Barrel index.ts files,
   .gitkeep in empty folders.

3. TOOLING
   - TypeScript strict + path aliases (@/core, @/features, @/ui, @/data).
   - ESLint + Prettier + jest-expo.
   - Scripts: typecheck, lint, test, test:watch, ios, android.
   - ENFORCE THE PURITY RULE AT LINT LEVEL: a no-restricted-imports rule that FAILS on any
     react, react-native, expo-* or fetch import inside src/core/**. This rule is
     load-bearing — the whole architecture depends on it.

4. .env.example with EXPO_PUBLIC_ORS_API_KEY, EXPO_PUBLIC_VALHALLA_URL, TTS_PROVIDER.
   Document each in README.md. Confirm .env is gitignored.
   NO Mapbox variables anywhere. We use no paid services (SPEC.md §11).

5. Do NOT install the map renderer (@maplibre/maplibre-react-native) yet — that's Phase 1
   and it needs a dev-client rebuild.

VERIFY BEFORE YOU REPORT:
   - `npm run typecheck && npm run lint && npm run test` all pass on an empty test suite.
   - PROVE the purity lint rule works: create a temp file that imports react inside src/core,
     run lint, show me that it FAILS, then delete the temp file.
   - `npx expo start` boots.

Report: files created, the exact commands you ran, and anything you couldn't verify.
```

---

## 3. Phase 1 — Foundations: map shell, routing domain, provider interface

> ⚠️ **The Phase 1 prompt now lives in `MAPS-FREE-STACK.md` §7** (MapLibre + ORS, no Mapbox, no tokens).

**Goal:** the app opens, shows a map, and you can pick a start & end. Nothing clever yet.

**Prompt:** → **use `MAPS-FREE-STACK.md` §7** (the revised, MapLibre + ORS version of this phase).
It also contains the §8 deltas for Phase 2. Don't paste the old Mapbox version.

**Manual test recipe (do this before Phase 2):**
`npx expo prebuild --clean && npx expo run:ios` → open Route/New → set start = current location,
end = a point ~20 km away → confirm the ORS route draws and is cached (second request is instant).

---

## 4. Phase 2 — "Twisty route" generation + profiles ⭐

This is the feature that makes the app different from Google Maps.

> ⚠️ **Paste the Phase 2 prompt below PLUS the deltas in `MAPS-FREE-STACK.md` §8.**
> **Waypoint injection is PRIMARY, not a fallback** — the live spike (§11) showed `alternative_routes`
> returning 3 "alternatives" that were really 2 roads, one pair 28 m apart.

**Prompt:**

```
Implement Phase 2: route generation with style profiles. Scope: the candidate
generator + the curviness scorer + the candidate picker UI. No pace notes yet.

THE CORE PROBLEM: Mapbox Directions has no "give me the twistiest road" option.
So we don't ask for one. We GENERATE CANDIDATES and SCORE their geometry ourselves.

A. PROFILES (/src/core/routing/profiles.ts) — RouteProfile is a data object, not logic:
   - TWIST_SEEKER  : maximise curvature, avoid motorways, avoid tolls,
                     minGradeTolerance 3, prefer unclassified/secondary roads
   - BALANCED      : score-weighted, motorways penalty 0.5, target ~60% of fastest time
   - CRUISE        : minimise turns, motorways allowed and rewarded, fastest time
   - GENTLE        : minimise SHARP corners (grade <= 3) while allowing gentle curves —
                     this is the "I want a nice drive, not a workout" profile
   - CUSTOM        : sliders — curviness 0..10, maxSharpness (min grade 1..6),
                     avoidMotorway/Toll/Ferry/Unpaved toggles, maxDetourRatio (default 1.35)
   Each profile exposes: providerProfile + providerParams (provider-owned, opaque to core),
   waypointStrategy, scoringWeights, and a human label + description for the UI.

B. CANDIDATE GENERATION (/src/features/routing/generateCandidates.ts):
   ⚠️ SUPERSEDED by MAPS-FREE-STACK.md §8 — try Valhalla `use_highways`/`use_trails` and
   ORS `alternative_routes` FIRST. Only fall back to the waypoint heuristics below if those
   demonstrably fail to produce distinct routes.
   Produce 4-8 distinct candidates for one A→B request:
   1. Baseline: fastest route.
   2. exclude=motorway (+ toll/ferry per profile).
   3. Waypoint-injected routes: take the straight line A→B, drop it into K segments
      (K = clamp(round(lengthKm/8), 2, 6)). For each segment, sample 2-3 candidate
      waypoints snapped to the road network inside a corridor of ±25% of the segment
      length, perpendicular to the segment, biased toward the side with denser road
      network (use Mapbox Tilequery or a coarse grid of Map Matching/Geocoding hits;
      cache snapped points in SQLite — NEVER re-snap the same grid cell twice).
      Build the polyline A → waypoints → B and request a route through it.
      Mapbox allows max 25 coordinates — enforce that.
   4. alternatives=true on request 2 (max 3 alternatives per response).
   Run requests with concurrency 3 and a global timeout. Partial failure is fine:
   score whatever came back. Batch/cache aggressively — every Directions request costs money.

C. DEDUPE: same road if frechetDistance < 0.15 * min(lenA,lenB) OR overlap share > 0.85
   (>85% of B's vertices within 50 m of A). Keep the faster. See SPEC.md §7.

D. CURVINESS SCORER (/src/core/scoring/curviness.ts) — implement exactly SPEC.md §Scoring:
   curvatureDegPerKm, hairpinCount, turnDensityPerKm, motorwayShare,
   lowSpeedRoadShare (from annotations maxspeed + step road class),
   elevationVariation (optional, only if DEM data is present — otherwise null and
   redistribute its weight). Every metric must be normalised across the candidate
   set (min-max) before weighting, so scores are interpretable 0..100.
   Return a full breakdown object, not just a number, so the UI can explain the score.

E. PICKING: rank by profile weights, apply the maxDetourRatio filter, drop candidates
   under 0.6 * best-score. Return top 3 + always keep the fastest as a fallback.

F. UI — /app/route/new.tsx becomes a 3-step builder:
   1. Pins  →  2. Style (profile chips + custom sliders)  →  3. Results
   Results = a swipeable carousel of candidate cards showing: distance, ETA,
   curviness score 0-100 with a small sparkline of the route shape, hairpin count,
   "vs fastest: +12 min", and 2-3 generated tags ("36 hairpins · mostly B-roads · no motorway").
   Selecting one draws it on the map with a grade-coloured heat overlay: colour the
   polyline by local corner grade (green = 5-6, amber = 4, red = 1-2) using
   per-segment stop colours. This preview is the single best way to sell the app.
   Button: "Save route" → SQLite. Button: "Preview co-driver calls" (Phase 3 wires it).

G. Add "Loop route" as a second mode: same start and end, user picks a target distance
   (30/60/100 km). Implement by picking a random bearing, walking out to target/2,
   and using that as a waypoint. Respect the profile.

DoD: For a fixed fixture route (commit a recorded provider response set), the scorer unit
tests produce the documented scores in SPEC.md §Scoring fixtures. I can generate a route
from Sofia centre to Vitosha and get 3 distinct ranked candidates, with a visibly
different twisty vs cruise option.
```

---

## 5. Phase 3 — The pace-note engine (the heart of the app) ⭐⭐

> **This phase is where 80% of the app's value lives.** It is pure math, no UI, no network. Everything is unit-testable. Do not let Cursor skip the tests here.

**Prompt:**

```
Implement Phase 3: the pace-note engine. This is PURE TypeScript in /src/core/pacenotes/.
No React, no Expo, no network, no native imports. Every function unit-tested.

Pipeline: geometry -> corners -> notes -> spoken text.

1. RESAMPLE (/src/core/pacenotes/resample.ts)
   Fit a smooth centreline: resample the route polyline at 5 m spacing along arc length.
   Smooth the bearing series with a circular moving average (window 15 m, Hann weights)
   to kill GPS/DEM jitter WITHOUT rounding off real hairpins. Then compute
   signed curvature per sample: k = dTheta/ds.

2. CORNER DETECTION (/src/core/pacenotes/detectCorners.ts)
   Per SPEC.md §Corner detection:
   - Work in a sliding window (default 40 m). A corner EXISTS where the cumulative
     |dTheta| over the window exceeds 12 deg, and the turn direction is consistent.
   - Merge samples into a corner SPAN (entryIndex..exitIndex) with hysteresis:
     start a corner when the window curvature exceeds the open threshold, close it
     when it falls below 60% of the peak — this prevents a single hairpin becoming 4 corners.
   - Per corner compute: apexIndex, totalAngleDeg (signed), radiusMetres =
     arcLength / |angleRad| (guard divide-by-zero), arcLength, entryBearing,
     directionConsistency (0..1, to reject S-curves detected as one corner).
   - CHAINING: if the gap between two corners is < 60 m, mark them as a chain with a
     connector: 'into' if the gap is < 25 m and the second corner turns the other way
     (left into right), 'and' if same direction, 'then' if 25-60 m.
   - TIGHTENS / OPENS: compare the radius of the first 40% of the corner vs the last 40%.
     If the exit radius is < 75% of the entry radius -> 'tightens'; > 133% -> 'opens'.
   - LONG / SHORT: arcLength > 120 m -> 'long'; < 25 m -> 'short' (but not for hairpins).
   - Also emit: STRAIGHT notes for any run > 400 m with < 8 deg of net turn, and
     START / FINISH notes.

3. GRADING (/src/core/pacenotes/grade.ts) — implement the table in SPEC.md §Grade table:
   1 = hairpin (r <= 20 m) ... 6 = flat out (r > 300 m). Blended with total angle so a
   20 m-radius 250 m-long constant-radius turn is not called a hairpin: hairpin requires
   radius <= 20 m AND totalAngle >= 120 deg. Include a per-corner `severity` 0..1 for the UI.
   Cross-check against the router's maneuver modifiers (`sharp left` -> 1-2, `left` -> 3-4,
   `slight left` -> 5-6) — when geometry and the router disagree by >1 grade, keep the
   GEOMETRY (it's what the car actually does) but log the disagreement in dev mode.

4. MERGING (/src/core/pacenotes/mergeJunctions.ts)
   Overlay router maneuvers (roundabouts, junctions, merges, forks, "take second exit").
   A router maneuver within a detected corner becomes a modifier on that corner
   ('roundabout, take 2nd exit' instead of a raw grade). A maneuver over 100 m from
   any corner becomes its own JUNCTION note. Never emit two notes within 30 m of
   each other — the tighter/more severe one wins.

5. NOTE BUILDER (/src/core/pacenotes/buildNotes.ts)
   Produce an ordered array of notes with `atDistance` (arc length of the APEX, not the
   entry — this matters for call timing) and `distanceFromPrevious`. Then generate the
   TEXT in both a full and a short form using the grammar in SPEC.md §Note grammar:

     full:  "In 150, left four, tightens, don't cut, into right six."
     short: "150, left four."
     minimal (grade >= 5 only): "six left"

   Rules: numbers < 20 spoken as words ("three fifty" is wrong — use "350"), distances
   rounded to the nearest 10 m under 100 m and 50 m above, always round DOWN so the
   call is never optimistic. Chain notes into ONE utterance when possible ("into").
   Export a `notesToScript(notes, options)` that groups consecutive notes into
   utterances of at most ~12 words, because TTS sounds robotic past that.

6. FILTERING (/src/core/pacenotes/filterNotes.ts)
   Implement NoteFilterOptions EXACTLY as specified, because this is a headline feature:
     minGradeToCall (1..6): only call corners at least this severe — 6 = hairpins only,
                            3 = everything except flat kinks, 1 = call everything
     includeJunctions, includeCrests, includeStraits, includeCareNotes, includeFinish
     verbosity: 'full' | 'standard' | 'terse'
     chainRadius: how greedily to merge notes into single utterances (0-200 m)
   Filtering must NOT break distance continuity: recompute distanceFromPrevious after
   filtering so the co-driver always says the true gap to the next call.

7. TESTS (/src/core/pacenotes/__tests__/) — this is mandatory, not optional:
   - Synthetic arcs: perfect circles of r = 15/35/70/130/220/400 m -> assert grade 1..6.
   - A 15 m radius arc sweeping only 45 deg -> asserted NOT a hairpin.
   - Chicane (left-right-left) -> asserted 3 corners with 'into' chaining.
   - A real recorded route fixture (commit the GeoJSON) -> snapshot the full note list.
   - Filtering: grade-3 threshold on the fixture removes exactly the documented notes.
   - Property test: for any route, total corner angles + straight angles ~ 360 deg * turns
     (sanity check that detection isn't inventing corners).
   Target: >= 90% coverage on /src/core/pacenotes.

DoD: A dev screen /app/dev/notes.tsx shows the note list for any saved route as a
scrollable list (rally-card style: big grade badge, direction arrow, distance), with a
filter panel. I can change the filter and watch the list update live. All tests green.

IMPORTANT: Explain the algorithm to me in your reply before you write the code, and
list every assumption you make. Then implement.
```

---

## 6. Phase 4 — Voice: pre-rendered, natural, works offline

> **Key architectural decision, and it's the one most developers get wrong:** don't synthesise speech live in the car. Notes are known *before* the drive. So render the entire rally to audio during a "recce" prep step, cache it on disk, and at drive time you just play clips. Zero latency, no dead zones, unlimited voice quality.

**Prompt:**

```
Implement Phase 4: the voice layer.

ARCHITECTURE (do not deviate):
   Notes (known ahead) -> text -> TTS synthesis ONCE during "Recce" -> audio files
   cached on disk -> at drive time we only PLAY CLIPS. No live synthesis on the hot path.

1. INTERFACE (/src/features/voice/TtsProvider.ts):
   interface TtsProvider {
     id: string
     name: string
     listVoices(): Promise<Voice[]>
     synthesize(text: string, voiceId: string, opts): Promise<LocalFile>
     isAvailable(): Promise<boolean>
     requiresNetwork: boolean
   }
   Implementations:
   - DeviceTtsProvider (expo-speech): always-available fallback. In this mode we cannot
     pre-render to files, so it speaks live (accept the latency) and is marked as such
     in the UI: "Robotic, but works anywhere with no setup."
   - CloudTtsProvider (start with OpenAI-compatible or ElevenLabs — put the base URL,
     model, and voice id in .env; do not hardcode a vendor into feature code).
     Cache key = sha256(text + providerId + voiceId). Store file in
     FileSystem.documentDirectory + 'voice/' and the mapping in SQLite.
     Add a `speakLikeCoDriver(text)`: prepend nothing, but normalise for TTS —
     digits to spoken words for grades ("left four" stays "left four", "350" -> "three fifty"
     ONLY if the voice handles digits badly — test and pick per provider).

2. RECCE PRE-RENDER (/app/route/[id]/prepare.tsx):
   After the user taps "Prepare route", build notes, dedupe texts, then synthesise with
   concurrency 4 and a progress bar ("Recording pacenotes… 42/118"). Resumable: if the
   user closes the app, cached clips are reused on the next run. Support PRE-RENDERING
   THE TOP-3 CHAIN VARIANTS if chainRadius is adjustable, so changing the filter in the
   car still has audio. Show total size (a 120-note route ≈ 4-8 MB — that's fine).
   Allow "Prepare later" — the app degrades to DeviceTtsProvider rather than failing.

3. PLAYER (/src/features/voice/CoDriverVoice.ts):
   - expo-av / expo-audio, one Audio.Sound per clip, a small round-robin pool (3) to avoid
     allocation jank.
   - setAudioModeAsync({ playsInSilentModeIOS: true,  // CRITICAL: works with the ringer off
     staysActiveInBackground: true, shouldDuckAndroid: true,
     interruptionModeAndroid: DUCK_OTHERS, interruptionModeIOS: MIX_WITH_OTHERS })
     Ducking music/podcasts instead of pausing them is what makes it feel like a real co-driver.
   - Priority queue: HAIRPIN/URGENT calls interrupt a playing clip; INFO calls are dropped
     if something is already speaking. Never queue more than 2 utterances.
   - Preload the next 2 clips as the car moves (the scheduler tells it what's coming).

4. Settings UI: voice picker (play a sample for each), test phrase button, ducking toggle,
   "announce over music vs pause music", volume, and a clear label of whether the current
   voice is offline-capable.

5. Handle interruptions: phone call, Siri/Assistant, route change. On resume, the engine
   (Phase 5) re-syncs rather than replaying missed notes.

DoD: With a cloud voice, preparing a 100-note route completes in < 60 s and I can fly
through the route with airplane mode on and every call still plays instantly.
```

---

## 7. Phase 5 — The live co-driver engine + Sim Drive

> **The other 20% of the app's value, and the part most likely to be buggy.** The Sim Drive requirement is not a nice-to-have — it's how you make this debuggable without burning a tank of petrol every iteration.

**Prompt:**

```
Implement Phase 5: the real-time co-driver engine and the Sim Drive harness.

1. SINGLE ENTRY POINT (/src/features/coach/engine.ts) — pure state machine, no Expo imports
   except types. EVERY position update, real or simulated, goes through:
     engine.update(fix: GeoFix, nowMs: number): EngineOutput
   GeoFix = { lat, lng, speedMps, headingDeg, accuracyM, timestampMs }
   EngineOutput = { positionAlongRoute, crossTrackM, nextNotes: PaceNote[], actions: VoiceAction[],
                    status: 'on-route'|'off-route'|'paused'|'finished', debug }
   Keep the state in one immutable object so a whole drive is replayable from a log.

2. CALL TIMING (/src/core/coach/timing.ts) — implement SPEC.md §Call timing:
     leadDistance(note, v) = clamp(v * leadSeconds(note), minLead, maxLead)
     leadSeconds: grade 1-2 -> 5.0 s (tight corners need braking time),
                  grade 3-4 -> 3.5 s, grade 5-6 -> 2.5 s (fast corners come fast)
     minLead 60 m, maxLead 350 m. All three constants live in a settings object so I can
     tune them in the Sim Drive and read the result.
   - PRIMARY call at atDistance - leadDistance.
   - CONFIRM call at ~40 m (a terse repeat: "four left") unless the corner was already
     called within 3 s. Toggleable.
   - COALESCE: if the next note starts within chainRadius of this one, speak them as ONE
     utterance ("150 left four into right six") instead of two overlapping clips.
   - RECALL is never called twice. Hysteresis: a note is marked fired and never re-fires
     unless the car reverses > 50 m behind it.
   - NEVER speak two things at once; a call mid-playback is either skipped or queued by
     priority (see Phase 4 player).

3. LOOP (/src/features/coach/useCoDriver.ts):
   expo-location with accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5,
   timeInterval: 500, activityType: 'automotiveNavigation'. Background updates via
   expo-task-manager + startLocationUpdatesAsync so calls keep coming with the screen off.
   Android: FOREGROUND_SERVICE_LOCATION + a persistent notification ("Apex is calling your
   route") and a Stop action. iOS: "always" permission with the correct Info.plist strings
   in app.json. Screen stays awake via expo-keep-awake.
   Path projection: use projectOnPolyline; if crossTrackM > 35 m for > 5 s -> status
   'off-route': pause calls, announce "off route, recalculating", re-request a route to the
   destination (or to the next 3 waypoints), rebuild notes if the remaining path changed
   materially, resume. Handle the false-positive case: tunnels/GPS glitches must not trigger
   a reroute — require 3 consecutive bad fixes AND a speed sanity check.

4. SIM DRIVE (/app/dev/sim.tsx) — the most important dev tool in this project:
   - Pick a saved route, pick a speed multiplier (1x / 2x / 4x / 8x), tap Play.
   - Interpolate synthetic fixes along the polyline at 1 Hz (scaled), inject ±5 m of noise and
     realistic heading lag, and push them through engine.update() — the SAME path as real GPS.
   - Show a live debug overlay: distance along route, current speed, next 3 notes with
     countdown timers, and a log of every spoken call with the exact metre value it fired at.
   - Also support REPLAY of a recorded real drive (log every GeoFix to SQLite during real
     drives, then replay it) — this is how you debug "it called the hairpin too late".
   - Also a Time-Travel scrub bar: drag to any point in the route and hear the calls as
     they would fire there.

5. DRIVING HUD (/app/drive/[id].tsx):
   - Big, glanceable, high-contrast, landscape-friendly. Top: the NEXT note as a huge
     card — a direction arrow glyph, the grade digit, and a countdown that counts down in
     metres and flips to a shrinking bar under 200 m. Under it, the next 3 notes as small rows.
   - Speed readout, distance remaining, and a "twistiness so far" bar.
   - Interaction is audio-first and locked: one huge MUTE button, one huge STOP button
     (long-press to end). No menus while moving. Everything else is on the pre-drive screen.
   - Never let the screen sleep, never show a system dialog mid-drive, and keep the
     status bar light-on-dark.

6. PRE-DRIVE ("RECCE") SCREEN /app/route/[id]/recce.tsx: a pre-flight checklist —
   GPS fix quality (green/amber/red), number of prepared voice clips vs notes, battery level,
   keep-awake, do-not-disturb hint, and a legal/safety acknowledgment shown once per install.
   Then a single big START.

7. POST-DRIVE SUMMARY: distance, time, moving time, corners by grade, hairpins hit, avg
   speed, and the route drawn coloured by grade. Save the drive session to SQLite.

DoD: I can run a Sim Drive at 4x with the phone on my desk, hear every call fire in order
with correct distances, and see off-route detection work when I drag the simulated fix
sideways by 60 m. Tests cover timing: for a 100 km/h approach to a grade-2 corner, the
primary call fires at exactly the documented lead distance.
```

---

## 8. Phase 6 — Polish, offline, and ship

**Prompt:**

```
Implement Phase 6: offline capability, settings, and release readiness.

1. OFFLINE: offline map packs for a saved route corridor using the MapLibre offline manager
   (region = bounding box of the route buffered by 2 km, up to zoom 16, plus the
   Terrain-RGB tiles if we use elevation). Download from the route details screen with a
   progress UI + size estimate. Route cache, notes, and voice clips are already local;
   make everything degrade gracefully with zero network — verify with airplane mode.

2. SETTINGS (complete): default profile, unit system (km/mi, m/yards), voice + sample,
   ducking behaviour, call filter (minGradeToCall, junctions, chains, verbosity),
   lead-time preset (early / normal / late — which scales the timing constants),
   confirm-calls toggle, keep-screen-on, and a "PACENOTE SANDBOX" where the user hears
   the effect of every filter immediately on a demo route.

3. HOME + LIBRARY: saved routes list (name, distance, curviness badge, last driven),
   drive history with a map thumbnail, favourites, and delete/duplicate.
   Allow renaming a route and adding a photo/note.

4. ACCESSIBILITY + SAFETY: WCAG AA contrast, minimum 44pt targets, Dynamic Type support,
   screen-reader labels, colourblind-safe grade colours (don't rely on red/green alone —
   use shape + digit + colour), and a hard rule that no destructive action is reachable
   while status === 'driving'. Add a first-run safety disclaimer with the regional
   legal text (Bulgaria/EU: driver must remain in control of the vehicle, no interaction
   while driving) and a "this is a driving aid, not a substitute for attention" line.

5. RELEASE: app icons + splash, EAS build profiles (development / preview / production),
   versioning, and a release checklist in README. Prepare store submission metadata:
   description, screenshots list, and — importantly — the permission justification text
   for background location, because both App Store review and Google Play require a
   convincing reason. Include the reason: "continuous voice guidance while driving".

6. QA: a documented test matrix (device sizes, iOS/Android, offline, backgrounded,
   low battery mode, incoming call during a call, ringer off, Bluetooth car audio) and
   fix whatever fails. Add a smoke test script.

DoD: I can install a production build on my phone, drive a saved route with the screen
locked and the ringer off, and hear every call. No crashes, no network needed, and the
background-location justification is ready for store review.
```

---

## 9. Stretch backlog (do NOT let Cursor build these unprompted)

Feed these one at a time, later, as their own phases:

- **Elevation: crests & jumps** — sample the free AWS terrarium DEM along the route (or Valhalla `/height`), (or use the device barometer during a recce drive) to emit `over crest`, `jump`, `downhill` notes. Adds a lot of realism, adds a lot of complexity. Do it after everything else works.
- **Voice recce mode** — record your own voice reading the notes while driving the road once (Valhalla `/trace_route` map-matching cleans it up), then play *your* voice back. This is how real rally teams do it, and it's a genuinely killer feature for this niche.
- **Live traffic adaptation** — re-time the ETA, not the notes.
- **Multi-rider** — share a route by link/code; group drive.
- **CarPlay / Android Auto** — a huge undertaking; consider a simplified audio-only companion first.
- **Grade tuning by vehicle** — a bike profile calls corners differently from a car.

---

## 10. Prompt hygiene: what to do when Cursor drifts

| Symptom | Say this |
|---|---|
| Puts geometry math in a React component | "That logic belongs in /src/core as a pure function. Move it, add tests, then wire the component to it." |
| Mixes live TTS into the driving loop | "Re-read Phase 4's architecture. Drive-time code only PLAYS cached clips. No synthesis." |
| Invents a MapLibre/Valhalla/ORS API | "Verify that method exists in the current docs before using it. If you can't verify it, propose an alternative." |
| Builds all 6 phases at once | "Scope is Phase N only. Revert changes to files outside this phase." |
| Tests pass but the app doesn't work | "Write the Sim Drive path for this first, then fix it using the debug overlay output." |
| Adds a random dependency | "Justify this dependency in one sentence or remove it. No state managers we didn't agree on." |
| Everything is a 500-line file | "Split by feature per SPEC.md §Architecture. No file over 250 lines." |

**Two things worth repeating:**
1. **The note engine is pure math. Keep it pure.** If it's pure, it's testable, and if it's testable you can fix a wrong call without driving the road again.
2. **Sim Drive is not optional.** It's the difference between an app that works on paper and one that works at 80 km/h in a hairpin.
