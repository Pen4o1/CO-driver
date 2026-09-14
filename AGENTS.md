# AGENTS.md — working agreement for AI coding agents in this repo

Read `SPEC.md` first. It is the source of truth for behaviour, data shapes, and algorithms.
This file is the source of truth for *how you work*.

## Golden rules

1. **One phase at a time.** Build only what the current prompt asks for. If you see something else that should be fixed, list it under "Suggestions" in your reply — do not fix it.
2. **`src/core` is pure.** No `react`, `react-native`, `expo-*`, `fetch`, or native imports in `src/core/**`. It must be runnable and testable in plain Node.
3. **Explain before you code.** For any task involving math (geometry, corner detection, scoring, timing), describe your approach and list your assumptions in 5–10 lines *before* writing the file. Then implement.
4. **Tests are part of the deliverable**, not a follow-up. If you write corner detection, you write the tests for corner detection in the same response.
5. **Never invent an API.** If you're unsure a MapLibre / Valhalla / ORS / Expo method exists or its exact signature, say "I need to verify this" and either check the docs or propose a wrapper that isolates the uncertainty in one file. Public-server APIs (Valhalla's FOSSGIS instance especially) shift between builds — verify parameter names against `valhalla.github.io/valhalla/api/` and `openrouteservice.org/dev/` before relying on them.
5b. **No paid services, ever.** No Mapbox, no Google Maps, no paid TTS. The stack is defined in `SPEC.md` §Providers and `MAPS-FREE-STACK.md`. If a task appears to need a paid API, stop and propose a free alternative instead of adding a key or a dependency.
6. **No new dependencies without one sentence of justification** and my approval.
7. **Small files.** 250 lines max. Split by feature. No god components.
8. **Strict TypeScript.** No `any`, no non-null assertions in feature code, no `@ts-ignore`. Use `unknown` + zod at boundaries.
9. **Determinism.** Never use `Math.random()`, `Date.now()`, or implicit locale formatting inside `src/core`. Inject `now` and `rng` as parameters so tests are reproducible.
10. **Report at the end of every response:** files changed, commands I should run, what you're unsure about, what you deliberately left out.

## Conventions

- Naming: `camelCase` for values, `PascalCase` for types/components, `SCREAMING_SNAKE` for module constants. Files: `camelCase.ts` for logic, `PascalCase.tsx` for components.
- Units in names. Always. `distanceM`, `durationS`, `speedMps`, `bearingDeg`, `radiusM`, `spacingM`. A bare `distance` is a bug.
- Coordinates are `{ lat, lng }`. Every provider API (ORS/Valhalla/GeoJSON) wants `[lng, lat]` — convert at the boundary only, in `features/routing/providers` and `features/maps`. Never leak a `[lng,lat]` tuple into `src/core`.
- Every expo/network call is wrapped in a try/catch that converts to a typed `Result<T, AppError>`. Never let a raw exception reach a screen.
- Errors the user can act on get a toast; everything else is logged and swallowed.
- Accessibility: every interactive element gets `accessibilityLabel`. Minimum 44pt hit target. Anything on the driving HUD must be readable at a glance: ≥ 28pt type, high contrast.

## Safety rules (non-negotiable)

- Never require the driver to tap anything to receive a call.
- Destructive or config-changing actions must be unreachable while `status === 'driving'`.
- The driving HUD must never present a modal, a permission prompt, or a navigation transition.
- Audio must play with the iOS silent switch on (`playsInSilentModeIOS: true`).
- Any code that changes location permissions gets flagged in your summary so I can re-test on a real device.

## Performance budget

- GPS update handling must complete in < 5 ms on a mid-range device (it runs at 2 Hz). Measurable with the Sim Drive overlay.
- Corner detection for a 200 km route must complete in < 400 ms off the main thread (use `InteractionManager` or a worker if needed; measure it).
- Voice playback must start within 150 ms of the trigger (it's a local file — if it isn't, the clip isn't preloaded and that's a bug).
- No jank in the HUD: the countdown re-renders at 10 Hz max, the map at 1 Hz.

## Testing conventions

- Unit tests live next to the code: `detectCorners.test.ts`.
- Fixtures live in `src/core/__fixtures__/` as committed JSON (recorded ORS/Valhalla responses, route GeoJSON). **Never make a network call in a test.**
- Synthetic geometry helpers (`makeArc(radiusM, sweepDeg)`, `makeChicane()`) live in `src/core/pacenotes/__fixtures__/builders.ts` and are reused across tests.
- Snapshot tests are allowed for `spokenFull` strings — they're the product's voice and changing them should be a deliberate, reviewed act. When a snapshot changes, explain *why* in the commit message.

## When you're stuck

Say so. A short honest "I can't verify this API — here are two options and their trade-offs" is far more useful than confident wrong code. I would rather answer one question than debug 200 lines of invented API methods.
