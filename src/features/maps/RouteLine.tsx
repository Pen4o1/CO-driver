import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { useMemo } from 'react';

import type { LatLng } from '@/core/types';
import { colors } from '@/ui/theme';

import { routeToGeoJSON } from './coords';

type Props = {
  coords: LatLng[];
};

export function RouteLine({ coords }: Props) {
  const data = useMemo(() => routeToGeoJSON(coords), [coords]);
  if (coords.length < 2) {
    return null;
  }
  return (
    <GeoJSONSource id="preview-route" data={data}>
      <Layer
        id="preview-route-line"
        type="line"
        paint={{
          'line-color': colors.route,
          'line-width': 5,
          'line-opacity': 0.92,
        }}
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
      />
    </GeoJSONSource>
  );
}
