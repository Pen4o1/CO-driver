# QA matrix

Run `npm run smoke` before a device pass. Then walk this table on a physical phone (MapLibre does not run in Expo Go).

| Area | Case | Pass if |
|---|---|---|
| Device sizes | iPhone SE / 15 / Pro Max; a small Android | HUD type ≥ 28pt, buttons ≥ 44pt, no clipped MUTE/STOP |
| iOS | Dev client + preview build | Route, recce, drive, sim all launch |
| Android | Dev client + preview build | Same, plus foreground-service notification with Stop |
| Offline | Airplane mode after recce + map pack | Route, notes, clips play; map shows the corridor; no crash |
| Backgrounded | Lock screen mid-drive | Calls continue; ringer off still plays (`playsInSilentModeIOS`) |
| Low battery | < 20% | Recce shows red battery; drive still runs |
| Incoming call | Call during a spoken note | Playback stops; engine re-syncs on resume, does not dump missed notes |
| Ringer off | iOS silent switch | Calls still play |
| Bluetooth car audio | Car stereo | Ducking (default) or pause, per Settings |
| First launch | Fresh install | Bulgaria/EU disclaimer blocks the app until acknowledged |
| Driving lock | Status = driving | Rename / delete / duplicate / settings-destructive actions disabled |
| Sim Drive | 4x + off-route +60 m | Calls fire in order; overlay shows off-route after 3 credible fixes |
| Units | km/m vs mi/yd | Home, details, HUD all switch |
| Filter sandbox | Settings → PACENOTE SANDBOX | Hearing the first notes changes with min grade / verbosity |

## Smoke

```sh
npm run smoke
```

That is typecheck + lint + unit tests. It does not replace the device rows above.

## Known non-goals this pass

- Route photo picker (no extra native dependency). Text notes are supported.
- Terrarium DEM is not inside the OpenFreeMap style pack; it caches via the ambient tile cache after an online view.
