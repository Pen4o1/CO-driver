import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  speedHeat,
  stoppedTimeS,
  type DriveStats,
  type SpeedHighlight,
} from '@/core/coach';
import type { GeoFix, RouteGeometry } from '@/core/types';
import {
  formatDrivenDistance,
  formatDuration,
  formatSpeed,
  type UnitSystem,
} from '@/core/units';
import { RouteMap, type SpeedTraceOverlay } from '@/features/maps/RouteMap';
import { SpeedLegend, type SpeedMapMarker } from '@/features/maps/SpeedTrace';
import { colors, space, type } from '@/ui/theme';

type Props = {
  geometry: RouteGeometry | null;
  stats: DriveStats;
  units: UnitSystem;
  fixes?: GeoFix[];
};

function speedLabel(speedMps: number | undefined, units: UnitSystem): string {
  if (speedMps == null || !Number.isFinite(speedMps) || speedMps <= 0) {
    return '—';
  }
  return formatSpeed(speedMps, units);
}

function markerFor(
  highlight: SpeedHighlight,
  units: UnitSystem,
): SpeedMapMarker {
  if (highlight.kind === 'peak') {
    return {
      id: 'speed-peak',
      at: highlight.at,
      title: 'Peak',
      value: formatSpeed(highlight.speedMps, units),
      tone: 'peak',
    };
  }
  return {
    id: 'speed-brake',
    at: highlight.at,
    title: 'Brake',
    value: `−${formatSpeed(highlight.dropMps, units)}`,
    tone: 'brake',
  };
}

export function DriveSummaryCard({
  geometry,
  stats,
  units,
  fixes = [],
}: Props) {
  const trace = useMemo(() => speedHeat(fixes), [fixes]);
  const speedTrace = useMemo<SpeedTraceOverlay | null>(() => {
    if (trace.segments.length === 0 && trace.highlights.length === 0) {
      return null;
    }
    return {
      segments: trace.segments,
      markers: trace.highlights.map((highlight) => markerFor(highlight, units)),
    };
  }, [trace, units]);
  const movingAvg =
    stats.movingTimeS > 0 ? stats.distanceM / stats.movingTimeS : 0;
  const routeLengthM =
    stats.routeLengthM && stats.routeLengthM > 0
      ? stats.routeLengthM
      : geometry?.lengthM;
  const cells: { label: string; value: string }[] = [
    {
      label: 'Distance',
      value: formatDrivenDistance(stats.distanceM, routeLengthM, units),
    },
    { label: 'Time', value: formatDuration(stats.durationS) },
    { label: 'Avg speed', value: speedLabel(stats.avgSpeedMps, units) },
    { label: 'Max speed', value: speedLabel(stats.maxSpeedMps, units) },
    { label: 'Moving', value: formatDuration(stats.movingTimeS) },
    {
      label: 'Stopped',
      value: formatDuration(stoppedTimeS(stats.durationS, stats.movingTimeS)),
    },
    { label: 'Moving avg', value: speedLabel(movingAvg, units) },
  ];
  return (
    <View style={styles.wrap}>
      {geometry || speedTrace ? (
        <View style={styles.map}>
          <RouteMap
            start={geometry?.coords[0] ?? null}
            end={
              geometry
                ? (geometry.coords[geometry.coords.length - 1] ?? null)
                : null
            }
            geometry={geometry}
            heat
            speedTrace={speedTrace}
            interactivePins={false}
            bottomInset={0}
          />
          {trace.segments.length > 0 ? <SpeedLegend /> : null}
        </View>
      ) : null}
      <View style={styles.grid}>
        {cells.map((cell) => (
          <View key={cell.label} style={styles.cell}>
            <Text style={styles.cellLabel}>{cell.label}</Text>
            <Text style={styles.cellValue}>{cell.value}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.body}>Hairpins {stats.hairpinsHit}</Text>
      <Text style={styles.body}>
        Grades{' '}
        {([1, 2, 3, 4, 5, 6] as const)
          .map((g) => `${g}:${stats.cornersByGrade[g]}`)
          .join('  ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  map: { height: 320, borderRadius: 16, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cell: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: 2,
  },
  cellLabel: {
    color: colors.muted,
    fontSize: type.caption,
    fontWeight: '700',
  },
  cellValue: { color: colors.text, fontSize: type.body, fontWeight: '800' },
  body: { color: colors.muted, fontSize: type.body },
});
