import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';

import type { LatLng } from '@/core/types';
import { colors } from '@/ui/theme';

import { routeToGeoJSON } from './coords';

type Props = {
  coords: LatLng[];
};

export function RouteLine({ coords }: Props) {
  if (coords.length < 2) {
    return null;
  }
  return (
    <GeoJSONSource id="preview-route" data={routeToGeoJSON(coords)}>
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
