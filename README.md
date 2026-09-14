# Apex

Rally co-driver for normal roads. Build a route, pick how twisty it should be, and hear pace notes in real time.

This is Phase 1: map shell, domain types, geometry, and OpenRouteService routing. See `MAP_SETUP.md` before you try to run the map.

## Stack

React Native + Expo (dev client, TypeScript) · Expo Router · MapLibre + OpenFreeMap + ORS + Photon. No Mapbox, no paid keys. See `SPEC.md` and `MAPS-FREE-STACK.md`.

## Setup

```sh
npm install
cp .env.example .env          # add EXPO_PUBLIC_ORS_API_KEY (free, no card)
npx expo prebuild --clean
npx expo run:ios              # MapLibre does not run in Expo Go
```

Fill in `.env` locally. `.env` is gitignored; never commit secrets.

## Environment variables

| Variable | Required | What it is |
|---|---|---|
| `EXPO_PUBLIC_ORS_API_KEY` | For live routing | Free OpenRouteService key. Sign up at [openrouteservice.org](https://openrouteservice.org) — no credit card. Metro inlines `EXPO_PUBLIC_*` into the client bundle. |
| `EXPO_PUBLIC_VALHALLA_URL` | No (has a default) | Valhalla routing base URL. Community default is `https://valhalla1.openstreetmap.de` (no key). Used from Phase 2. |
| `TTS_PROVIDER` | No (defaults to `device`) | Voice backend. `device` uses on-device `expo-speech`. Later: local Piper. Never a paid TTS vendor. |

There are **no Mapbox (or Google Maps) variables**. This project uses no paid services and no keys that require billing. See `SPEC.md` §11.

## Scripts

| Script | What it does |
|---|---|
| `npm run start` | Boot the Expo bundler (dev client) |
| `npm run ios` / `npm run android` | Open the iOS / Android client |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint + Prettier, including the `src/core` purity rule |
| `npm run test` | Jest (`jest-expo` preset) |
| `npm run test:watch` | Jest in watch mode |

`src/core/**` is pure TypeScript: lint fails on `react`, `react-native`, `expo-*`, or `fetch` imports there.
