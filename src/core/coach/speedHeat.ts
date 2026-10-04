import { haversineM } from '@/core/geo/haversine';
import type { GeoFix, LatLng } from '@/core/types';

/** Slow to fast. Colours live with the map layer and must stay this long. */
export const SPEED_BAND_COUNT = 6;

const MAX_TRUSTED_SPEED_MPS = 120;
/** A gap this long is a pause in the trace, not a line across the map. */
const MAX_GAP_MS = 15_000;
const MAX_JUMP_M = 200;
/** Collapse GPS samples closer than this so the line stays light. */
const MIN_STEP_M = 12;
const BRAKE_WINDOW_MS = 5_000;
/** About 22 km/h shed inside the brake window. */
const MIN_BRAKE_DROP_MPS = 6;
const PEAK_MIN_MPS = 1;
const MARKER_SEPARATION_M = 45;

export type SpeedSegment = {
  coords: LatLng[];
  /** 0 is the slowest band on this drive, `SPEED_BAND_COUNT - 1` the fastest. */
  band: number;
};

export type SpeedHighlight =
  | { kind: 'peak'; at: LatLng; speedMps: number }
  | { kind: 'brake'; at: LatLng; speedMps: number; dropMps: number };

export type SpeedHeat = {
  segments: SpeedSegment[];
  highlights: SpeedHighlight[];
};

type Sample = {
  at: LatLng;
  t: number;
  speed: number;
};

/**
 * Colour a completed drive by speed, and mark where it peaked and where the
 * car shed the most speed. Bands are relative to this drive so a slow road
 * still shows its faster stretches.
 */
export function speedHeat(fixes: GeoFix[]): SpeedHeat {
  const samples = smoothSamples(fixes);
  return {
    segments: segmentsFrom(samples),
    highlights: highlightsFrom(samples),
  };
}

function trustedSpeed(speedMps: number): number | null {
  if (
    !Number.isFinite(speedMps) ||
    speedMps < 0 ||
    speedMps > MAX_TRUSTED_SPEED_MPS
  ) {
    return null;
  }
  return speedMps;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function smoothSamples(fixes: GeoFix[]): Sample[] {
  const ordered = fixes
    .filter(
      (fix) =>
        Number.isFinite(fix.lat) &&
        Number.isFinite(fix.lng) &&
        Number.isFinite(fix.timestampMs),
    )
    .sort((a, b) => a.timestampMs - b.timestampMs);
  const raw = ordered.map((fix) => trustedSpeed(fix.speedMps));
  const samples: Sample[] = [];
  for (let i = 0; i < ordered.length; i += 1) {
    const window: number[] = [];
    for (const value of [raw[i - 1], raw[i], raw[i + 1]]) {
      if (value != null) window.push(value);
    }
    if (window.length === 0) continue;
    samples.push({
      at: { lat: ordered[i].lat, lng: ordered[i].lng },
      t: ordered[i].timestampMs,
      speed: median(window),
    });
  }
  return samples;
}

function isGap(a: Sample, b: Sample): boolean {
  return b.t - a.t > MAX_GAP_MS || haversineM(a.at, b.at) > MAX_JUMP_M;
}

function thin(samples: Sample[]): Sample[] {
  if (samples.length === 0) return [];
  const out: Sample[] = [samples[0]];
  for (let i = 1; i < samples.length; i += 1) {
    const prev = out[out.length - 1];
    const sample = samples[i];
    const last = i === samples.length - 1;
    if (
      last ||
      isGap(prev, sample) ||
      haversineM(prev.at, sample.at) >= MIN_STEP_M
    ) {
      out.push(sample);
    }
  }
  return out;
}

function bandFor(speed: number, max: number): number {
  if (max <= 0) return 0;
  const t = Math.max(0, Math.min(1, speed / max));
  if (t >= 1) return SPEED_BAND_COUNT - 1;
  return Math.min(SPEED_BAND_COUNT - 1, Math.floor(t * SPEED_BAND_COUNT));
}

function segmentsFrom(samples: Sample[]): SpeedSegment[] {
  const thinned = thin(samples);
  if (thinned.length < 2) return [];
  const max = samples.reduce((peak, sample) => Math.max(peak, sample.speed), 0);
  const segments: SpeedSegment[] = [];
  let current: SpeedSegment | null = null;
  const flush = () => {
    if (current && current.coords.length >= 2) segments.push(current);
    current = null;
  };
  for (let i = 1; i < thinned.length; i += 1) {
    const prev = thinned[i - 1];
    const next = thinned[i];
    if (isGap(prev, next)) {
      flush();
      continue;
    }
    const band = bandFor((prev.speed + next.speed) / 2, max);
    if (current && current.band === band) {
      current.coords.push(next.at);
    } else {
      flush();
      current = { band, coords: [prev.at, next.at] };
    }
  }
  flush();
  return segments;
}

function highlightsFrom(samples: Sample[]): SpeedHighlight[] {
  if (samples.length === 0) return [];
  let peak = samples[0];
  for (const sample of samples) {
    if (sample.speed > peak.speed) peak = sample;
  }
  const highlights: SpeedHighlight[] = [];
  if (peak.speed >= PEAK_MIN_MPS) {
    highlights.push({ kind: 'peak', at: peak.at, speedMps: peak.speed });
  }
  const brake = hardestBrake(samples);
  if (brake && haversineM(brake.at, peak.at) >= MARKER_SEPARATION_M) {
    highlights.push(brake);
  }
  return highlights;
}

function hardestBrake(samples: Sample[]): SpeedHighlight | null {
  let best: { drop: number; at: LatLng; speed: number } | null = null;
  for (let i = 0; i < samples.length; i += 1) {
    const start = samples[i];
    let slowest = start;
    for (let j = i + 1; j < samples.length; j += 1) {
      const next = samples[j];
      if (next.t - start.t > BRAKE_WINDOW_MS) break;
      if (isGap(samples[j - 1], next)) break;
      if (next.speed < slowest.speed) slowest = next;
    }
    const drop = start.speed - slowest.speed;
    if (drop < MIN_BRAKE_DROP_MPS) continue;
    if (!best || drop > best.drop) {
      best = { drop, at: slowest.at, speed: slowest.speed };
    }
  }
  if (!best) return null;
  return {
    kind: 'brake',
    at: best.at,
    speedMps: best.speed,
    dropMps: best.drop,
  };
}
