import { StyleSheet, Text, View } from 'react-native';

import type { DriveStats } from '@/core/coach';
import type { RouteGeometry } from '@/core/types';
import { RouteMap } from '@/features/maps/RouteMap';
import { colors, space, type } from '@/ui/theme';

type Props = {
  geometry: RouteGeometry | null;
  stats: DriveStats;
};

export function DriveSummaryCard({ geometry, stats }: Props) {
  const km = (stats.distanceM / 1000).toFixed(1);
  const mins = Math.round(stats.durationS / 60);
  const avg = Math.round(stats.avgSpeedMps * 3.6);
  return (
    <View style={styles.wrap}>
      {geometry ? (
        <View style={styles.map}>
          <RouteMap
            start={geometry.coords[0] ?? null}
            end={geometry.coords[geometry.coords.length - 1] ?? null}
            geometry={geometry}
            heat
            interactivePins={false}
          />
        </View>
      ) : null}
      <Text style={styles.title}>
        {km} km · {mins} min · {avg} km/h
      </Text>
      <Text style={styles.body}>Hairpins hit {stats.hairpinsHit}</Text>
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
  map: { height: 220, borderRadius: 16, overflow: 'hidden' },
  title: { color: colors.text, fontSize: type.title, fontWeight: '800' },
  body: { color: colors.muted, fontSize: type.body },
});
