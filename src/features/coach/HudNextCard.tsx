import { StyleSheet, Text, View } from 'react-native';

import type { PaceNote } from '@/core/types';
import { formatLengthM, type UnitSystem } from '@/core/units';
import { DirectionArrow } from '@/ui/DirectionArrow';
import { GradeBadge } from '@/ui/GradeBadge';
import { colors, space, type } from '@/ui/theme';

type Props = {
  note: PaceNote | null;
  metresToCall: number | null;
  units?: UnitSystem;
};

export function HudNextCard({ note, metresToCall, units = 'metric' }: Props) {
  const remaining = metresToCall ?? 0;
  const bar = remaining <= 0 ? 0 : Math.min(1, remaining / 200);
  return (
    <View
      style={styles.card}
      accessibilityLabel={note?.spokenShort ?? 'No note'}
    >
      {note?.grade ? <GradeBadge grade={note.grade} size="lg" /> : null}
      <DirectionArrow direction={note?.direction} size="lg" />
      <View style={styles.copy}>
        <Text style={styles.big}>
          {note ? note.spokenShort.replace(/\.$/, '') : '—'}
        </Text>
        <Text style={styles.metres}>
          {metresToCall === null
            ? ''
            : formatLengthM(Math.max(0, remaining), units)}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${bar * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 20,
    padding: space.lg,
    gap: space.sm,
    minHeight: 180,
    alignItems: 'center',
  },
  copy: { alignItems: 'center', gap: 4 },
  big: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  metres: { color: colors.accent, fontSize: type.hud, fontWeight: '800' },
  track: {
    alignSelf: 'stretch',
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: { height: 10, backgroundColor: colors.accent },
});
