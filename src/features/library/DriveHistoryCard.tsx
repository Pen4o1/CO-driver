import { Pressable, StyleSheet, Text, View } from 'react-native';

import { canMutateLibrary } from '@/core/safety';
import type { LatLng } from '@/core/types';
import {
  formatDrivenDistance,
  formatDuration,
  formatSpeed,
  type UnitSystem,
} from '@/core/units';
import { RouteSparkline } from '@/features/routing/builder/RouteSparkline';
import type { DriveHistoryRow } from '@/features/storage';
import { useSession } from '@/state/session';
import { Card } from '@/ui/Card';
import { colors, space, type } from '@/ui/theme';

type Props = {
  drive: DriveHistoryRow;
  units: UnitSystem;
  onOpen: () => void;
  onDelete: () => void;
};

function coordsFromGeometryJson(raw: string | null): LatLng[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { coords?: LatLng[] };
    return parsed.coords ?? [];
  } catch {
    return [];
  }
}

export function DriveHistoryCard({ drive, units, onOpen, onDelete }: Props) {
  const locked = !canMutateLibrary(useSession((s) => s.status));
  const coords = coordsFromGeometryJson(drive.geometryJson);
  const when = new Date(drive.startedAt).toISOString().slice(0, 16);
  const avg = drive.stats?.avgSpeedMps ?? 0;
  const max = drive.stats?.maxSpeedMps ?? 0;
  const routeLengthM =
    drive.stats?.routeLengthM && drive.stats.routeLengthM > 0
      ? drive.stats.routeLengthM
      : drive.routeLengthM;
  const parts = [
    when.replace('T', ' '),
    formatDrivenDistance(drive.distanceM, routeLengthM, units),
    drive.durationS > 0 ? formatDuration(drive.durationS) : null,
    avg > 0 ? `${formatSpeed(avg, units)} avg` : null,
    max > 0 ? `${formatSpeed(max, units)} max` : null,
  ].filter((part): part is string => Boolean(part));
  return (
    <Pressable accessibilityRole="button" onPress={onOpen}>
      <Card style={styles.card}>
        <RouteSparkline coords={coords} width={96} height={36} />
        <View style={styles.body}>
          <Text style={styles.name}>{drive.routeName}</Text>
          <Text style={styles.meta}>{parts.join(' · ')}</Text>
          <Pressable
            accessibilityLabel={`Delete drive of ${drive.routeName}`}
            accessibilityRole="button"
            disabled={locked}
            hitSlop={8}
            onPress={onDelete}
          >
            <Text style={[styles.delete, locked && styles.locked]}>Delete</Text>
          </Pressable>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  body: { flex: 1, gap: 2 },
  name: { color: colors.text, fontWeight: '700', fontSize: type.body },
  meta: { color: colors.muted, fontSize: type.caption },
  delete: {
    color: colors.danger,
    fontSize: type.caption,
    fontWeight: '700',
    paddingVertical: space.xs,
  },
  locked: { opacity: 0.45 },
});
