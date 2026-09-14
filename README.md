# Apex

Rally co-driver for normal roads. Build a route, pick how twisty it should be, and hear pace notes in real time.

This is Phase 4: pre-rendered co-driver voice. Notes are synthesised once during Recce, cached on disk, and only played at drive time. Default voice is on-device `expo-speech`. Optional natural voice is a local Piper/Kokoro server behind an OpenAI-compatible HTTP URL — no paid TTS.

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
| `TTS_PROVIDER` / `EXPO_PUBLIC_TTS_PROVIDER` | No (defaults to `device`) | `device` = on-device `expo-speech` (robotic, works anywhere). `http` = OpenAI-compatible local Piper/Kokoro. Never a paid TTS vendor. |
| `EXPO_PUBLIC_TTS_BASE_URL` | Only for `http` | Local TTS server, e.g. `http://192.168.1.10:5000/v1`. Recce caches MP3s under the app document directory. |
| `EXPO_PUBLIC_TTS_MODEL` | No | Model name the HTTP server expects (`tts-1` is a common OpenAI-compatible default). |
| `EXPO_PUBLIC_TTS_VOICE_ID` | No | Voice id for the HTTP server. Device TTS lists system voices in Settings. |
| `EXPO_PUBLIC_TTS_API_KEY` | No | Optional. Leave empty for local Piper. |

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
