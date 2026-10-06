import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { useMemo } from 'react';

import type { GradeSegment } from '@/core/scoring';
import { gradeColor } from '@/ui/theme';

import { toLngLat } from './coords';

type Props = {
  segments: GradeSegment[];
};

export function GradeHeatLine({ segments }: Props) {
  const data = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: segments.map((segment, index) => ({
        type: 'Feature' as const,
        id: index,
        properties: { grade: segment.grade },
        geometry: {
          type: 'LineString' as const,
          coordinates: segment.coords.map(toLngLat),
        },
      })),
    }),
    [segments],
  );
  if (segments.length === 0) {
    return null;
  }
  return (
    <GeoJSONSource id="grade-heat" data={data}>
      <Layer
        id="grade-heat-line"
        type="line"
        paint={{
          'line-color': [
            'match',
            ['get', 'grade'],
            1,
            gradeColor[1],
            2,
            gradeColor[2],
            3,
            gradeColor[3],
            4,
            gradeColor[4],
            5,
            gradeColor[5],
            6,
            gradeColor[6],
            gradeColor[6],
          ],
          'line-width': 5,
          'line-opacity': 0.95,
        }}
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
      />
    </GeoJSONSource>
  );
}
