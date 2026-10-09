import { Pressable, StyleSheet, Text, View } from 'react-native';

import { canMutateLibrary } from '@/core/safety';
import {
  formatDistanceKm,
  formatDuration,
  type UnitSystem,
} from '@/core/units';
import type { RouteSummary } from '@/features/storage';
import { useSession } from '@/state/session';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { colors, space, type } from '@/ui/theme';

import { SelectMark } from './SelectMark';

type Props = {
  route: RouteSummary;
  units: UnitSystem;
  onOpen: () => void;
  onEdit: () => void;
  onFavourite: () => void;
  selecting?: boolean;
  selected?: boolean;
  onToggle?: () => void;
};

export function RouteLibraryCard({
  route,
  units,
  onOpen,
  onEdit,
  onFavourite,
  selecting = false,
  selected = false,
  onToggle,
}: Props) {
  const status = useSession((s) => s.status);
  const locked = !canMutateLibrary(status);
  const last = route.lastDrivenAt
    ? new Date(route.lastDrivenAt).toISOString().slice(0, 10)
    : 'never driven';
  const distance = formatDistanceKm(route.lengthM, units);
  const estimate =
    route.durationS > 0 ? `est. ${formatDuration(route.durationS)}` : null;
  const meta = [
    distance,
    estimate,
    route.profileId,
    `score ${Math.round(route.score)}`,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' · ');
  const details = (
    <>
      <Text style={styles.name}>{route.name}</Text>
      <Text style={styles.meta}>{meta}</Text>
      <Text style={styles.meta}>Last driven {last}</Text>
    </>
  );

  if (selecting) {
    return (
      <Card>
        <Pressable
          accessibilityLabel={`${route.name}, ${meta}`}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selected }}
          onPress={onToggle}
          style={styles.row}
        >
          <SelectMark selected={selected} />
          <View style={styles.body}>{details}</View>
        </Pressable>
      </Card>
    );
  }

  return (
    <Card>
      <View style={styles.row}>
        <Pressable
          accessibilityLabel={`${route.name}, ${meta}`}
          accessibilityRole="button"
          onPress={onOpen}
          style={styles.body}
        >
          {details}
        </Pressable>
        <View style={styles.side}>
          <Button
            label="Edit"
            variant="ghost"
            accessibilityLabel={`Edit ${route.name}`}
            onPress={onEdit}
          />
          <Button
            label={route.favourite ? '★' : '☆'}
            variant="ghost"
            accessibilityLabel={
              route.favourite ? 'Remove favourite' : 'Add favourite'
            }
            disabled={locked}
            onPress={onFavourite}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
  },
  body: { flex: 1, gap: 2 },
  side: { justifyContent: 'center' },
  name: { color: colors.text, fontWeight: '700', fontSize: type.body },
  meta: { color: colors.muted, fontSize: type.caption },
});
