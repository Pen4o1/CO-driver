import { projectOnPolyline } from '@/core/geo/project';
import type { RouteStep } from '@/core/types';

import { makeArc } from '../__fixtures__/builders';
import { DEFAULT_NOTE_FILTER } from '../filterNotes';
import { derivePaceNotesDetailed } from '../pipeline';

function stepAt(
  geometry: ReturnType<typeof makeArc>,
  atM: number,
  instruction: string,
  type: string,
  modifier?: string,
): RouteStep {
  const loc = projectOnPolyline(
    geometry.coords[Math.floor(geometry.coords.length / 2)],
    geometry.coords,
  );
  void atM;
  return {
    distanceM: 40,
    durationS: 4,
    maneuver: {
      type,
      modifier,
      instruction,
      location: loc.point,
    },
  };
}

describe('mergeJunctions', () => {
  it('attaches a roundabout on a corner as junctionInstruction', () => {
    const geometry = makeArc({ radiusM: 35, sweepDeg: 180 });
    const cornerAt = geometry.lengthM / 2;
    const steps: RouteStep[] = [
      stepAt(
        geometry,
        cornerAt,
        'Enter the roundabout and take the 2nd exit',
        'roundabout',
        'left',
      ),
    ];
    const { notes } = derivePaceNotesDetailed(geometry, steps, {
      ...DEFAULT_NOTE_FILTER,
      includeStraights: false,
      verbosity: 'full',
    });
    const corner = notes.find((n) => n.type === 'corner');
    expect(corner?.junctionInstruction?.toLowerCase()).toContain('roundabout');
    expect(corner?.spokenFull.toLowerCase()).toContain('roundabout');
  });

  it('emits a standalone junction when far from every corner', () => {
    const geometry = makeArc({ radiusM: 35, sweepDeg: 180, leadM: 250 });
    const steps: RouteStep[] = [
      {
        distanceM: 20,
        durationS: 2,
        maneuver: {
          type: 'roundabout',
          instruction: 'take the 2nd exit',
          location: geometry.coords[0],
        },
      },
    ];
    const { notes } = derivePaceNotesDetailed(geometry, steps, {
      ...DEFAULT_NOTE_FILTER,
      includeStraights: false,
    });
    expect(notes.some((n) => n.type === 'junction')).toBe(true);
  });
});
