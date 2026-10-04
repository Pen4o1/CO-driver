import {
  GeoJSONSource,
  Layer,
  ViewAnnotation,
} from '@maplibre/maplibre-react-native';
import { StyleSheet, Text, View } from 'react-native';

import type { SpeedSegment } from '@/core/coach';
import type { LatLng } from '@/core/types';
import { colors, space, type } from '@/ui/theme';

import { toLngLat } from './coords';

/** Slow → fast. Keep in step with `SPEED_BAND_COUNT`. */
export const SPEED_BAND_COLORS = [
  '#38BDF8',
  '#2DD4BF',
  '#A3E635',
  '#FACC15',
  '#FB923C',
  '#F43F5E',
] as const;

export type SpeedMapMarker = {
  id: string;
  at: LatLng;
  title: string;
  value: string;
  tone: 'peak' | 'brake';
};

type LineProps = {
  segments: SpeedSegment[];
};

export function SpeedHeatLine({ segments }: LineProps) {
  if (segments.length === 0) return null;
  const data = {
    type: 'FeatureCollection' as const,
    features: segments.map((segment, index) => ({
      type: 'Feature' as const,
      id: index,
      properties: { band: segment.band },
      geometry: {
        type: 'LineString' as const,
        coordinates: segment.coords.map(toLngLat),
      },
    })),
  };
  return (
    <GeoJSONSource id="speed-heat" data={data}>
      <Layer
        id="speed-heat-casing"
        type="line"
        paint={{
          'line-color': '#0B0D10',
          'line-width': 8,
          'line-opacity': 0.4,
        }}
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
      />
      <Layer
        id="speed-heat-line"
        type="line"
        paint={{
          'line-color': [
            'match',
            ['get', 'band'],
            0,
            SPEED_BAND_COLORS[0],
            1,
            SPEED_BAND_COLORS[1],
            2,
            SPEED_BAND_COLORS[2],
            3,
            SPEED_BAND_COLORS[3],
            4,
            SPEED_BAND_COLORS[4],
            5,
            SPEED_BAND_COLORS[5],
            SPEED_BAND_COLORS[5],
          ],
          'line-width': 5,
          'line-opacity': 0.96,
        }}
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
      />
    </GeoJSONSource>
  );
}

export function SpeedMarkers({ markers }: { markers: SpeedMapMarker[] }) {
  return markers.map((marker) => (
    <ViewAnnotation
      key={marker.id}
      id={marker.id}
      lngLat={toLngLat(marker.at)}
      anchor="bottom"
    >
      <View
        accessibilityLabel={`${marker.title} ${marker.value}`}
        style={[
          styles.chip,
          marker.tone === 'peak' ? styles.peak : styles.brake,
        ]}
      >
        <Text
          style={[styles.chipTitle, marker.tone === 'peak' && styles.onPeak]}
        >
          {marker.title}
        </Text>
        <Text
          style={[styles.chipValue, marker.tone === 'peak' && styles.onPeak]}
        >
          {marker.value}
        </Text>
      </View>
    </ViewAnnotation>
  ));
}

export function SpeedLegend() {
  return (
    <View pointerEvents="none" style={styles.legend}>
      <Text style={styles.legendTitle}>Speed on this drive</Text>
      <View style={styles.scale}>
        <Text style={styles.legendEnd}>Slow</Text>
        <View style={styles.swatches}>
          {SPEED_BAND_COLORS.map((color) => (
            <View
              key={color}
              style={[styles.swatch, { backgroundColor: color }]}
            />
          ))}
        </View>
        <Text style={styles.legendEnd}>Fast</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  peak: {
    backgroundColor: '#F43F5E',
    borderColor: '#FFFFFF',
  },
  brake: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  chipTitle: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  chipValue: {
    color: colors.text,
    fontSize: type.caption,
    fontWeight: '800',
  },
  onPeak: { color: '#FFFFFF' },
  legend: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(11, 13, 16, 0.86)',
    borderRadius: 12,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    gap: 4,
  },
  legendTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  scale: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendEnd: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  swatches: { flexDirection: 'row', gap: 2 },
  swatch: { width: 14, height: 8, borderRadius: 2 },
});
