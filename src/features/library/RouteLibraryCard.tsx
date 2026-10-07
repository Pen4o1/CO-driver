import { Pressable, StyleSheet, Text, View } from 'react-native';

import { canMutateLibrary } from '@/core/safety';
import { formatDistanceKm, type UnitSystem } from '@/core/units';
import type { RouteSummary } from '@/features/storage';
import { useSession } from '@/state/session';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { colors, space, type } from '@/ui/theme';

type Props = {
  route: RouteSummary;
  units: UnitSystem;
  onOpen: () => void;
  onFavourite: () => void;
  onDelete: () => void;
};

export function RouteLibraryCard({
  route,
  units,
  onOpen,
  onFavourite,
  onDelete,
}: Props) {
  const status = useSession((s) => s.status);
  const locked = !canMutateLibrary(status);
  const last = route.lastDrivenAt
    ? new Date(route.lastDrivenAt).toISOString().slice(0, 10)
    : 'never driven';

  return (
    <Card>
      <Pressable
        accessibilityLabel={`${route.name}, ${formatDistanceKm(route.lengthM, units)}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={styles.row}
      >
        <View style={styles.body}>
          <Text style={styles.name}>{route.name}</Text>
          <Text style={styles.meta}>
            {formatDistanceKm(route.lengthM, units)} · {route.profileId} · score{' '}
            {Math.round(route.score)}
          </Text>
          <Text style={styles.meta}>Last driven {last}</Text>
          <Pressable
            accessibilityLabel={`Delete ${route.name}`}
            accessibilityRole="button"
            disabled={locked}
            hitSlop={8}
            onPress={onDelete}
          >
            <Text style={[styles.delete, locked && styles.locked]}>Delete</Text>
          </Pressable>
        </View>
        <Button
          label={route.favourite ? '★' : '☆'}
          variant="ghost"
          accessibilityLabel={
            route.favourite ? 'Remove favourite' : 'Add favourite'
          }
          disabled={locked}
          onPress={onFavourite}
        />
      </Pressable>
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
