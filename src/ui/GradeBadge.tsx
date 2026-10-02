import { StyleSheet, Text, View } from 'react-native';

import type { TurnGrade } from '@/core/types';
import { colors, gradeColor, type } from './theme';

type Props = {
  grade: TurnGrade;
  size?: 'lg' | 'md';
};

/** Digit + colour + shape. Colour is never the only signal. */
const RADIUS: Record<TurnGrade, number> = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 22,
  6: 32,
};

const GRADE_NAME: Record<TurnGrade, string> = {
  1: 'hairpin',
  2: 'very tight',
  3: 'tight',
  4: 'medium',
  5: 'fast',
  6: 'flat',
};

export function GradeBadge({ grade, size = 'lg' }: Props) {
  const dim = size === 'lg' ? 64 : 40;
  const font = size === 'lg' ? type.hud : type.body;
  return (
    <View
      accessibilityLabel={`Grade ${grade} ${GRADE_NAME[grade]}`}
      style={[
        styles.badge,
        {
          width: dim,
          height: dim,
          backgroundColor: gradeColor[grade],
          borderRadius: RADIUS[grade],
        },
      ]}
    >
      <Text style={[styles.digit, { fontSize: font }]}>{grade}</Text>
    </View>
  );
}

/** Non-interactive legend chip used in settings. */
export function GradeLegend() {
  const grades: TurnGrade[] = [1, 2, 3, 4, 5, 6];
  return (
    <View
      style={styles.legend}
      accessibilityLabel="Grade colour and shape legend"
    >
      {grades.map((g) => (
        <GradeBadge key={g} grade={g} size="md" />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    color: colors.bg,
    fontWeight: '800',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
});
