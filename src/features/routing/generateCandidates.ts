import { appError } from '@/core/errors';
import {
  planWaypointVariants,
  profileById,
  withEndpoints,
  type CustomProfileInput,
  type RouteRequest,
  type RoutingProvider,
} from '@/core/routing';
import {
  dedupeCandidates,
  pickCandidates,
  scoreCandidates,
} from '@/core/scoring';
import { UNPAVED_DROP_SHARE } from '@/core/scoring/constants';
import type {
  LatLng,
  RouteCandidate,
  RouteProfile,
  RouteStyle,
} from '@/core/types';

import { mapPool, withTimeout } from './pool';
import type { RoadSnapper } from './snap/osrmSnapper';

const CONCURRENCY = 3;
const TIMEOUT_MS = 20_000;
const MAX_COORDS = 25;

export type RouteMode = 'ab' | 'loop';

export type GenerateInput = {
  start: LatLng;
  end: LatLng | null;
  mode: RouteMode;
  loopDistanceKm?: 30 | 60 | 100;
  profileId: RouteStyle;
  custom?: CustomProfileInput;
};

export type GenerateDeps = {
  ors: RoutingProvider;
  valhalla: RoutingProvider;
  snap: RoadSnapper;
  timeoutMs?: number;
  concurrency?: number;
};

type Job = {
  label: string;
  provider: RoutingProvider;
  request: RouteRequest;
};

function primaryFirst(profileId: RouteStyle): 'valhalla' | 'ors' {
  if (profileId === 'cruise' || profileId === 'balanced') {
    return 'ors';
  }
  return 'valhalla';
}

function logServed(candidates: RouteCandidate[], label: string) {
  for (const candidate of candidates) {
    console.log(
      `[candidates] ${label} served by ${candidate.providerId} id=${candidate.id} ${Math.round(candidate.geometry.lengthM / 1000)}km`,
    );
  }
}

async function snapVariant(
  start: LatLng,
  end: LatLng,
  raw: LatLng[],
  snap: RoadSnapper,
): Promise<LatLng[]> {
  const snapped: LatLng[] = [];
  for (const point of raw) {
    const next = await snap.snap(point);
    if (next) {
      snapped.push(next);
    }
  }
  return withEndpoints(start, end, snapped, MAX_COORDS);
}

function dropUnpaved(
  candidates: RouteCandidate[],
  profile: RouteProfile,
): RouteCandidate[] {
  if (!profile.avoidUnpaved) {
    return candidates;
  }
  return candidates.filter((c) => {
    const share = c.roadShares.unpavedShare;
    return share === null || share < UNPAVED_DROP_SHARE;
  });
}

async function runJobs(
  jobs: Job[],
  concurrency: number,
): Promise<RouteCandidate[]> {
  const settled = await mapPool(jobs, concurrency, async (job) => {
    const result = await job.provider.route(job.request);
    logServed(result, job.label);
    return result;
  });
  const out: RouteCandidate[] = [];
  for (const item of settled) {
    if (item.status === 'fulfilled') {
      out.push(...item.value);
    } else {
      console.log('[candidates] job failed', item.reason);
    }
  }
  return out;
}

function abJobs(
  start: LatLng,
  end: LatLng,
  profile: RouteProfile,
  ors: RoutingProvider,
  valhalla: RoutingProvider,
): Job[] {
  const first = primaryFirst(profile.id);
  const base: RouteRequest = {
    waypoints: [start, end],
    profileId: profile.id,
    providerParams: profile.providerParams,
    alternatives: true,
  };
  const jobs: Job[] = [];
  if (first === 'valhalla') {
    jobs.push({ label: 'valhalla-primary', provider: valhalla, request: base });
    jobs.push({
      label: 'ors-fallback',
      provider: ors,
      request: { ...base, alternatives: true },
    });
  } else {
    jobs.push({ label: 'ors-primary', provider: ors, request: base });
    jobs.push({
      label: 'valhalla-fallback',
      provider: valhalla,
      request: { ...base, alternatives: true },
    });
  }
  return jobs;
}

function loopJobs(
  start: LatLng,
  profile: RouteProfile,
  lengthM: number,
  ors: RoutingProvider,
): Job[] {
  const seeds = [1, 2, 3];
  return seeds.map((seed) => ({
    label: `ors-loop-${seed}`,
    provider: ors,
    request: {
      waypoints: [start],
      profileId: profile.id,
      providerParams: profile.providerParams,
      alternatives: false,
      roundTrip: { lengthM, points: 4, seed },
    },
  }));
}

async function waypointJobs(
  start: LatLng,
  end: LatLng,
  profile: RouteProfile,
  ors: RoutingProvider,
  snap: RoadSnapper,
): Promise<Job[]> {
  const variants = planWaypointVariants(start, end, profile.waypointStrategy);
  const jobs: Job[] = [];
  for (const variant of variants) {
    const waypoints = await snapVariant(start, end, variant.rawPoints, snap);
    if (waypoints.length < 3) {
      continue;
    }
    jobs.push({
      label: `ors-via-${variant.id}`,
      provider: ors,
      request: {
        waypoints,
        profileId: profile.id,
        providerParams: profile.providerParams,
        alternatives: false,
      },
    });
  }
  return jobs;
}

export async function generateCandidates(
  input: GenerateInput,
  deps: GenerateDeps,
): Promise<RouteCandidate[]> {
  const profile = profileById(input.profileId, input.custom);
  const timeoutMs = deps.timeoutMs ?? TIMEOUT_MS;
  const concurrency = deps.concurrency ?? CONCURRENCY;

  let jobs: Job[] = [];
  if (input.mode === 'loop') {
    const lengthM = (input.loopDistanceKm ?? 60) * 1000;
    jobs = loopJobs(input.start, profile, lengthM, deps.ors);
  } else {
    if (!input.end) {
      throw appError('no-route', 'Need an end pin.');
    }
    jobs = abJobs(input.start, input.end, profile, deps.ors, deps.valhalla);
    const via = await waypointJobs(
      input.start,
      input.end,
      profile,
      deps.ors,
      deps.snap,
    );
    jobs = jobs.concat(via);
  }

  const collected = await withTimeout(
    runJobs(jobs, concurrency),
    timeoutMs,
    [] as RouteCandidate[],
  );
  const unique = new Map<string, RouteCandidate>();
  for (const candidate of collected) {
    unique.set(candidate.id, {
      ...candidate,
      id: `${candidate.providerId}-${candidate.id}-${unique.size}`,
      profileId: profile.id,
    });
  }
  const filtered = dropUnpaved([...unique.values()], profile);
  if (filtered.length === 0) {
    throw appError('no-route', 'No distinct routes came back.');
  }
  const deduped = dedupeCandidates(filtered);
  const scored = scoreCandidates(deduped, profile);
  return pickCandidates(scored, profile);
}
