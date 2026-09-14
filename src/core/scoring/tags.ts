import type { CurvinessBreakdown } from '@/core/types';

export function buildTags(breakdown: CurvinessBreakdown): string[] {
  const tags: string[] = [];
  if (breakdown.hairpinCount > 0) {
    tags.push(
      `${breakdown.hairpinCount} hairpin${breakdown.hairpinCount === 1 ? '' : 's'}`,
    );
  }
  if ((breakdown.lowSpeedRoadShare ?? 0) >= 0.35) {
    tags.push('mostly B-roads');
  }
  if (breakdown.motorwayShare === 0) {
    tags.push('no motorway');
  } else if ((breakdown.motorwayShare ?? 0) >= 0.5) {
    tags.push('mostly motorway');
  }
  if ((breakdown.elevationVariationM ?? 0) >= 400) {
    tags.push(`+${Math.round(breakdown.elevationVariationM ?? 0)} m climb`);
  }
  return tags.slice(0, 3);
}
