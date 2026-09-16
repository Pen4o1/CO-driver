# Store submission metadata

Apex is a rally co-driver for public roads. It is a driving aid, not a navigator.

## App Store / Play listing

**Name:** Apex

**Subtitle:** Rally co-driver for twisty roads

**Description:**
Apex builds a route, scores how twisty it is, and reads rally-style pace notes out loud from GPS: “in 150, left four, tightens, into right six.” Calls are timed from the road geometry. Interaction is locked while moving — mute and long-press stop only.

This is a driving aid. The driver must remain in control of the vehicle at all times. Apex is not a substitute for attention to the road.

**Category:** Navigation / Sports

## Screenshots (capture on a real device)

1. Home library — saved routes with distance and curviness badge
2. Route builder — start/end pins on the dark map
3. Style picker — Twist / Balanced / Cruise / Gentle
4. Candidate carousel — score, sparkline, vs-fastest
5. Route details — grade-coloured heat overlay + offline pack
6. Recce checklist — GPS, clips, battery, legal text
7. Driving HUD — next note, grade digit, countdown (landscape-friendly)
8. Settings — voice, lead time, filter, pacenote sandbox
9. Sim Drive — debug overlay with call log

## Permission justifications

### Background location (iOS + Android)

**Store answer (copy this):**

Apex uses background location for continuous voice guidance while driving, including when the screen is locked or off. Guidance is audio-only; the driver never needs to look at or tap the phone to hear the next call.

Info.plist / Android strings already match this wording.

### Location when in use

Used to place the start pin and to time spoken pace notes while the drive is in the foreground.

### Foreground service (Android)

Keeps GPS and audio alive with a persistent notification (“Apex is calling your route”) and a Stop action.

## Privacy notes

- No analytics SDK.
- No account.
- Routes, notes, clips, and map packs stay on device.
- The only optional network key is a free OpenRouteService key (no card). Voice can be on-device `expo-speech`.

## Age rating

4+ / everyone. No user-generated public content. Driving disclaimer is shown on first launch.
