import { deriveAscentDescent } from '@/core/geo';
import { DEFAULT_NOTE_FILTER, derivePaceNotes } from '@/core/pacenotes';
import { makeArc } from '@/core/pacenotes/__fixtures__/builders';
import type { PaceNote, RouteCandidate, RouteStep } from '@/core/types';

import {
  reverseCandidate,
  reversedCandidateId,
  reversedRouteName,
} from './reverseCandidate';

function mainCorner(notes: PaceNote[]): PaceNote {
  const corners = notes.filter((note) => note.type === 'corner');
  expect(corners.length).toBeGreaterThanOrEqual(1);
  return corners.reduce((best, note) =>
    Math.abs(note.totalAngleDeg ?? 0) > Math.abs(best.totalAngleDeg ?? 0)
      ? note
      : best,
  );
}

function candidateFromArc(
  direction: 'left' | 'right',
  elevation: boolean,
): RouteCandidate {
  const geometry = makeArc({
    radiusM: 18,
    sweepDeg: 160,
    direction,
    leadM: 80,
  });
  const elevationM = elevation
    ? Float64Array.from(geometry.coords, (_, i) => i * 4)
    : null;
  const coords = geometry.coords;
  const step: RouteStep = {
    distanceM: 40,
    durationS: 4,
    roadName: 'Outbound',
    maneuver: {
      type: 'turn',
      modifier: 'left',
      instruction: 'Turn left onto Outbound',
      location: coords[Math.floor(coords.length / 2)],
    },
  };
  return {
    id: 'out',
    providerId: 'gpx',
    geometry: { ...geometry, elevationM },
    steps: [step],
    breakdown: {
      score: 70,
      lengthM: geometry.lengthM,
      durationS: 400,
      curvatureDegPerKm: 80,
      hairpinCount: 1,
      turnDensityPerKm: 2,
      motorwayShare: 0,
      lowSpeedRoadShare: 1,
      elevationVariationM: 120,
      tags: ['1 hairpin'],
    },
    fastestDurationS: 400,
    profileId: 'twist',
    waypointsUsed: [coords[0], coords[coords.length - 1]],
    ascentM: 120,
    descentM: 30,
    roadShares: {
      motorwayShare: 0,
      lowSpeedRoadShare: 1,
      streetShare: 0,
      unpavedShare: 0,
    },
  };
}

describe('reverseCandidate', () => {
  it('names the drive home, and names the reverse of that as the way out', () => {
    expect(reversedRouteName('Vitosha')).toBe('Vitosha reversed');
    expect(reversedRouteName('Vitosha reversed')).toBe('Vitosha');
    expect(reversedCandidateId('out')).toBe('rev_out');
    expect(reversedCandidateId('rev_out')).toBe('out');
  });

  it('flips the line, swaps the climb, and drops outbound turns', () => {
    const outbound = candidateFromArc('right', true);
    const home = reverseCandidate(outbound);
    const coords = outbound.geometry.coords;
    expect(home.geometry.coords[0]).toEqual(coords[coords.length - 1]);
    expect(home.geometry.coords[home.geometry.coords.length - 1]).toEqual(
      coords[0],
    );
    expect(home.geometry.lengthM).toBeCloseTo(outbound.geometry.lengthM, 3);
    expect(home.steps).toEqual([]);
    expect(home.waypointsUsed[0]).toEqual(coords[coords.length - 1]);
    expect(home.breakdown.hairpinCount).toBe(1);
    expect(home.breakdown.score).toBe(70);
    expect(home.providerId).toBe('gpx');

    const before = deriveAscentDescent(
      outbound.geometry.elevationM,
      outbound.geometry.cumulative,
    );
    const after = deriveAscentDescent(
      home.geometry.elevationM,
      home.geometry.cumulative,
    );
    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    expect(after?.ascentM).toBeCloseTo(before?.descentM ?? -1, 3);
    expect(after?.descentM).toBeCloseTo(before?.ascentM ?? -1, 3);
    expect(home.ascentM).toBeCloseTo(after?.ascentM ?? -1, 3);
    expect(home.breakdown.elevationVariationM).toBe(home.ascentM);
    expect(home.geometry.elevationM?.[0]).toBe(
      outbound.geometry.elevationM?.[outbound.geometry.elevationM.length - 1],
    );
  });

  it('swaps stored ascent when the line has no elevation', () => {
    const home = reverseCandidate(candidateFromArc('right', false));
    expect(home.geometry.elevationM).toBeNull();
    expect(home.ascentM).toBe(30);
    expect(home.descentM).toBe(120);
  });

  it('re-derives the opposite direction from the flipped line', () => {
    const filter = { ...DEFAULT_NOTE_FILTER, includeStraights: false };
    const outbound = candidateFromArc('right', false);
    const outNotes = derivePaceNotes(outbound.geometry, outbound.steps, filter);
    const home = reverseCandidate(outbound);
    const homeNotes = derivePaceNotes(home.geometry, home.steps, filter);
    expect(mainCorner(outNotes).direction).toBe('right');
    expect(mainCorner(homeNotes).direction).toBe('left');
    expect(mainCorner(homeNotes).grade).toBe(mainCorner(outNotes).grade);
    const spoken = homeNotes.map((note) => note.spokenFull).join(' ');
    expect(spoken).not.toContain('Outbound');
  });
});
