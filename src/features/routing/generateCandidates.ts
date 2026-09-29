import { appError, isAppError } from '@/core/errors';
import {
  profileById,
  type CustomProfileInput,
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

import {
  abJobs,
  loopJobs,
  loopViaJobs,
  mockJobs,
  waypointJobs,
  type Job,
} from './candidateJobs';
import { pickCountryLoops, preferCountryLoops } from './countryLoops';
import { collectJobs } from './pool';
import type { RoadSnapper } from './snap/osrmSnapper';

const CONCURRENCY = 3;
const TIMEOUT_MS = 20_000;

export type RouteMode = 'ab' | 'loop';

export type GenerateInput = {
  start: LatLng;
  end: LatLng | null;
  mode: RouteMode;
  loopDistanceKm?: 30 | 60 | 100;
  profileId: RouteStyle;
  custom?: CustomProfileInput;
  preferId?: string;
};

export type GenerateDeps = {
  ors: RoutingProvider;
  valhalla: RoutingProvider;
  snap: RoadSnapper;
  mock?: RoutingProvider;
  timeoutMs?: number;
  concurrency?: number;
  now?: () => number;
};

function logServed(candidates: RouteCandidate[], label: string) {
  for (const candidate of candidates) {
    console.log(
      `[candidates] ${label} served by ${candidate.providerId} id=${candidate.id} ${Math.round(candidate.geometry.lengthM / 1000)}km`,
    );
  }
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

function firstRoutingError(errors: unknown[]) {
  for (const item of errors) {
    if (isAppError(item)) {
      return item;
    }
  }
  return appError('no-route', 'No distinct routes came back.');
}

async function runAndCollect(
  jobs: Job[],
  concurrency: number,
  timeoutMs: number,
  now?: () => number,
): Promise<{ collected: RouteCandidate[]; errors: unknown[] }> {
  const { values, errors } = await collectJobs(
    jobs,
    { concurrency, timeoutMs, now },
    async (job) => {
      const result = await job.provider.route(job.request);
      logServed(result, job.label);
      return result;
    },
  );
  return { collected: values.flat(), errors };
}

function uniquify(candidates: RouteCandidate[], profileId: RouteStyle) {
  return candidates.map((candidate, index) => ({
    ...candidate,
    id: `${candidate.providerId}-${candidate.id}-${index}`,
    profileId,
  }));
}

export async function generateCandidates(
  input: GenerateInput,
  deps: GenerateDeps,
): Promise<RouteCandidate[]> {
  const profile = profileById(input.profileId, input.custom);
  const timeoutMs = deps.timeoutMs ?? TIMEOUT_MS;
  const concurrency = deps.concurrency ?? CONCURRENCY;
  const lengthM = (input.loopDistanceKm ?? 60) * 1000;

  let jobs: Job[] = [];
  if (input.preferId === 'mock') {
    if (!deps.mock) {
      throw appError('no-route', 'Mock provider is not wired.');
    }
    jobs = mockJobs(
      input.start,
      input.end,
      profile,
      lengthM,
      input.mode,
      deps.mock,
    );
  } else if (input.mode === 'loop') {
    jobs = [
      ...loopJobs(input.start, profile, lengthM, deps.ors),
      ...loopViaJobs(input.start, profile, lengthM, deps.valhalla),
    ];
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

  if (jobs.length === 0) {
    throw appError('no-route', 'Need an end pin.');
  }

  const { collected, errors } = await runAndCollect(
    jobs,
    concurrency,
    timeoutMs,
    deps.now,
  );

  const paved = dropUnpaved(uniquify(collected, profile.id), profile);
  const filtered = input.mode === 'loop' ? preferCountryLoops(paved) : paved;
  if (filtered.length === 0) {
    throw firstRoutingError(errors);
  }
  const deduped = dedupeCandidates(filtered);
  const scored = scoreCandidates(deduped, profile);
  if (input.mode === 'loop') {
    return pickCountryLoops(scored);
  }
  return pickCandidates(scored, profile);
}
