# Apex

Rally co-driver for normal roads. Build a route, pick how twisty it should be, and hear pace notes in real time.

This is Phase 0: repo skeleton only. No maps, routing, or pace-note engine yet.

## Stack

React Native + Expo (dev client, TypeScript) · Expo Router · MapLibre + Valhalla/ORS later (no Mapbox, no paid keys). See `SPEC.md` and `MAPS-FREE-STACK.md`.

## Setup

```sh
npm install
cp .env.example .env
npm run start
```

Fill in `.env` locally. `.env` is gitignored; never commit secrets.

## Environment variables

| Variable | Required | What it is |
|---|---|---|
| `EXPO_PUBLIC_ORS_API_KEY` | For routing from Phase 1 | Free OpenRouteService key. Sign up at [openrouteservice.org](https://openrouteservice.org) — no credit card. Metro inlines `EXPO_PUBLIC_*` into the client bundle. |
| `EXPO_PUBLIC_VALHALLA_URL` | No (has a default) | Valhalla routing base URL. Community default is `https://valhalla1.openstreetmap.de` (no key). Point this at your own instance if you self-host. |
| `TTS_PROVIDER` | No (defaults to `device`) | Voice backend. `device` uses on-device `expo-speech`. Later: local Piper. Never a paid TTS vendor. |

There are **no Mapbox (or Google Maps) variables**. This project uses no paid services and no keys that require billing. See `SPEC.md` §11.

## Scripts

| Script | What it does |
|---|---|
| `npm run start` | Boot the Expo bundler |
| `npm run ios` / `npm run android` | Open the iOS / Android client |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint + Prettier, including the `src/core` purity rule |
| `npm run test` | Jest (`jest-expo` preset) |
| `npm run test:watch` | Jest in watch mode |

`src/core/**` is pure TypeScript: lint fails on `react`, `react-native`, `expo-*`, or `fetch` imports there.

MapLibre (`@maplibre/maplibre-react-native`) is **not** installed yet. That lands in Phase 1 and needs a dev-client rebuild.
