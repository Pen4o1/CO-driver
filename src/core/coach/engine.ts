import { projectProgress } from '@/core/geo';
import { DEFAULT_NOTE_FILTER } from '@/core/pacenotes';
import type {
  GeoFix,
  NoteFilterOptions,
  PaceNote,
  RouteGeometry,
} from '@/core/types';

import {
  FINISH_WINDOW_M,
  OFF_ROUTE_CROSS_TRACK_M,
  OFF_ROUTE_TEXT,
  PROGRESS_AHEAD_MAX_M,
  PROGRESS_AHEAD_MIN_M,
  PROGRESS_BACK_M,
} from './constants';
import {
  effectiveSpeed,
  leadForFirstCorner,
  nextNotes,
  outputStatus,
  startAction,
  upcomingCalls,
} from './engineView';
import { rearmFired, withFired } from './fired';
import { nextOffRoute } from './offRoute';
import { scheduleCalls } from './scheduler';
import { nextMotion } from './stats';
import { DEFAULT_TIMING } from './timing';
import type {
  EngineConfig,
  EngineOutput,
  EngineState,
  TimingSettings,
} from './types';

export function createEngineState(config: EngineConfig): EngineState {
  return {
    ...config,
    status: 'driving',
    distanceAlongM: 0,
    previousDistanceAlongM: -1,
    crossTrackM: 0,
    speedMps: 0,
    headingDeg: 0,
    fired: {},
    offRouteStreak: 0,
    offRouteSinceMs: null,
    lastFix: null,
    callLog: [],
    paused: false,
    maxSpeedMps: 0,
    movingMs: 0,
  };
}

export function pauseEngine(state: EngineState, paused: boolean): EngineState {
  return { ...state, paused };
}

export function replaceRoute(
  state: EngineState,
  geometry: RouteGeometry,
  notes: PaceNote[],
  filter: NoteFilterOptions = state.filter,
): EngineState {
  return {
    ...state,
    geometry,
    notes,
    filter,
    status: 'driving',
    fired: {},
    offRouteStreak: 0,
    offRouteSinceMs: null,
    callLog: state.callLog,
    distanceAlongM: 0,
    previousDistanceAlongM: 0,
    crossTrackM: 0,
  };
}

/** Time-travel: land at `distanceAlongM` without crossing triggers. */
export function seekEngine(
  state: EngineState,
  distanceAlongM: number,
): EngineState {
  const distance = Math.max(
    0,
    Math.min(state.geometry.lengthM, distanceAlongM),
  );
  return {
    ...state,
    distanceAlongM: distance,
    previousDistanceAlongM: distance,
    fired: rearmFired(state.fired, state.notes, distance),
    status:
      distance >= state.geometry.lengthM - FINISH_WINDOW_M
        ? 'finished'
        : 'driving',
    paused: true,
    offRouteStreak: 0,
    offRouteSinceMs: null,
  };
}

export function updateEngine(
  state: EngineState,
  fix: GeoFix,
  nowMs: number,
): { state: EngineState; output: EngineOutput } {
  if (state.paused) {
    return {
      state: { ...state, lastFix: fix },
      output: {
        positionAlongRoute: state.distanceAlongM,
        crossTrackM: state.crossTrackM,
        nextNotes: nextNotes(state.notes, state.distanceAlongM),
        actions: [],
        status: 'paused',
        debug: {
          speedMps: state.speedMps,
          leadM: 0,
          upcoming: upcomingCalls(
            state.notes,
            state.distanceAlongM,
            state.speedMps,
            state.timing,
            state.fired,
          ),
          lastCall: state.callLog[state.callLog.length - 1] ?? null,
          callLog: state.callLog,
          offRouteStreak: state.offRouteStreak,
        },
      },
    };
  }

  const dtS =
    state.lastFix === null
      ? 0
      : Math.max(0, (nowMs - state.lastFix.timestampMs) / 1000);
  const stepM = Math.max(0, fix.speedMps) * dtS;
  const projection = projectProgress({
    point: { lat: fix.lat, lng: fix.lng },
    coords: state.geometry.coords,
    hintM: state.lastFix === null ? null : state.distanceAlongM,
    expectedM: state.lastFix === null ? null : state.distanceAlongM + stepM,
    backM: PROGRESS_BACK_M,
    aheadM: Math.min(
      PROGRESS_AHEAD_MAX_M,
      Math.max(PROGRESS_AHEAD_MIN_M, stepM + 160),
    ),
  });
  const distanceAlongM = projection.distanceAlongM;
  const previousDistanceAlongM =
    state.lastFix === null ? distanceAlongM : state.distanceAlongM;
  const speedMps = effectiveSpeed(
    { ...state, distanceAlongM, previousDistanceAlongM },
    fix,
    nowMs,
  );
  let nextFired = rearmFired(state.fired, state.notes, distanceAlongM);
  const off = nextOffRoute({
    crossTrackM: projection.crossTrackM,
    fix,
    nowMs,
    streak: state.offRouteStreak,
    sinceMs: state.offRouteSinceMs,
  });

  let status = state.status;
  if (off.tripped) {
    status = 'off-route';
  } else if (status === 'off-route' && off.streak === 0) {
    status = 'driving';
  }

  const actions =
    state.lastFix === null
      ? startAction(state.notes.find((n) => n.type === 'start'))
      : [];
  let callLog = state.callLog;

  if (status === 'off-route' && state.status !== 'off-route') {
    actions.push({
      kind: 'speak',
      noteId: 'offroute',
      text: OFF_ROUTE_TEXT,
      priority: 'urgent',
    });
  } else if (status === 'driving') {
    const scheduled = scheduleCalls({
      notes: state.notes,
      previousDistanceM: previousDistanceAlongM,
      distanceAlongM,
      speedMps,
      nowMs,
      fired: nextFired,
      timing: state.timing,
      filter: state.filter,
    });
    for (const item of scheduled) {
      actions.push(item.action);
      callLog = [...callLog, item.log];
      for (const record of item.records) {
        nextFired = withFired(nextFired, record);
      }
    }
  }

  const onRoad = projection.crossTrackM <= OFF_ROUTE_CROSS_TRACK_M;
  if (
    onRoad &&
    status !== 'off-route' &&
    distanceAlongM >= state.geometry.lengthM - FINISH_WINDOW_M
  ) {
    status = 'finished';
  }

  const motion = nextMotion(state, fix, nowMs);
  const next: EngineState = {
    ...state,
    status,
    distanceAlongM,
    previousDistanceAlongM,
    crossTrackM: projection.crossTrackM,
    speedMps,
    headingDeg: fix.headingDeg,
    fired: nextFired,
    offRouteStreak: off.streak,
    offRouteSinceMs: off.sinceMs,
    lastFix: fix,
    callLog,
    maxSpeedMps: motion.maxSpeedMps,
    movingMs: motion.movingMs,
  };

  return {
    state: next,
    output: {
      positionAlongRoute: distanceAlongM,
      crossTrackM: projection.crossTrackM,
      nextNotes: nextNotes(state.notes, distanceAlongM),
      actions,
      status: outputStatus(next),
      debug: {
        speedMps,
        leadM: leadForFirstCorner(state.notes, speedMps, state.timing),
        upcoming: upcomingCalls(
          state.notes,
          distanceAlongM,
          speedMps,
          state.timing,
          nextFired,
        ),
        lastCall: callLog[callLog.length - 1] ?? null,
        callLog,
        offRouteStreak: off.streak,
      },
    },
  };
}

export function engineFrom(
  geometry: RouteGeometry,
  notes: PaceNote[],
  filter: NoteFilterOptions = DEFAULT_NOTE_FILTER,
  timing: TimingSettings = DEFAULT_TIMING,
): EngineState {
  return createEngineState({ geometry, notes, filter, timing });
}
