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
  layout?: 'stack' | 'row';
};

export function HudNextCard({
  note,
  metresToCall,
  units = 'metric',
  layout = 'stack',
}: Props) {
  const remaining = metresToCall ?? 0;
  const bar = remaining <= 0 ? 0 : Math.min(1, remaining / 200);
  const spoken = note ? note.spokenShort.replace(/\.$/, '') : '—';
  const distance =
    metresToCall === null ? '' : formatLengthM(Math.max(0, remaining), units);

  return (
    <View
      style={styles.card}
      accessibilityLabel={
        distance ? `${spoken}. ${distance}` : (note?.spokenShort ?? 'No note')
      }
    >
      <View style={[styles.main, layout === 'row' && styles.mainRow]}>
        <View style={styles.glyphs}>
          {note?.grade ? <GradeBadge grade={note.grade} size="lg" /> : null}
          <DirectionArrow direction={note?.direction} size="lg" />
        </View>
        <View style={[styles.copy, layout === 'row' && styles.copyRow]}>
          <Text
            style={[styles.big, layout === 'row' && styles.bigRow]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {spoken}
          </Text>
          <Text style={styles.metres}>{distance}</Text>
        </View>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${bar * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 20,
    padding: space.lg,
    gap: space.sm,
    justifyContent: 'space-between',
    minHeight: 160,
  },
  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  mainRow: { flexDirection: 'row', alignItems: 'center' },
  glyphs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  copy: { alignItems: 'center', gap: 4 },
  copyRow: { flex: 1, alignItems: 'flex-start' },
  big: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
  },
  bigRow: { textAlign: 'left' },
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
