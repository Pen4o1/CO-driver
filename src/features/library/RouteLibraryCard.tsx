import { Pressable, StyleSheet, Text, View } from 'react-native';

import { canMutateLibrary } from '@/core/safety';
import { formatDistanceKm, type UnitSystem } from '@/core/units';
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
  onFavourite: () => void;
  selecting?: boolean;
  selected?: boolean;
  onToggle?: () => void;
};

export function RouteLibraryCard({
  route,
  units,
  onOpen,
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

  return (
    <Card>
      <Pressable
        accessibilityLabel={`${route.name}, ${distance}`}
        accessibilityRole={selecting ? 'checkbox' : 'button'}
        accessibilityState={selecting ? { checked: selected } : undefined}
        onPress={selecting ? onToggle : onOpen}
        style={styles.row}
      >
        {selecting ? <SelectMark selected={selected} /> : null}
        <View style={styles.body}>
          <Text style={styles.name}>{route.name}</Text>
          <Text style={styles.meta}>
            {distance} · {route.profileId} · score {Math.round(route.score)}
          </Text>
          <Text style={styles.meta}>Last driven {last}</Text>
        </View>
        {selecting ? null : (
          <Button
            label={route.favourite ? '★' : '☆'}
            variant="ghost"
            accessibilityLabel={
              route.favourite ? 'Remove favourite' : 'Add favourite'
            }
            disabled={locked}
            onPress={onFavourite}
          />
        )}
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
});
