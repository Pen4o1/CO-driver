import { StyleSheet, Text, View } from 'react-native';

import type { TurnGrade } from '@/core/types';
import { colors, gradeColor, type } from './theme';

type Props = {
  grade: TurnGrade;
  size?: 'lg' | 'md';
};

/** Digit + colour + rounded-rect shape (not colour alone). */
export function GradeBadge({ grade, size = 'lg' }: Props) {
  const dim = size === 'lg' ? 64 : 40;
  const font = size === 'lg' ? type.hud : type.body;
  return (
    <View
      accessibilityLabel={`Grade ${grade}`}
      style={[
        styles.badge,
        {
          width: dim,
          height: dim,
          backgroundColor: gradeColor[grade],
        },
      ]}
    >
      <Text style={[styles.digit, { fontSize: font }]}>{grade}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    color: colors.bg,
    fontWeight: '800',
  },
});
