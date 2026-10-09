import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, space, type } from '@/ui/theme';

export type RecceTone = 'good' | 'ok' | 'poor';

function toneColor(tone: RecceTone): string {
  if (tone === 'good') return colors.grade5;
  if (tone === 'ok') return colors.grade3;
  return colors.danger;
}

type Props = {
  label: string;
  value: string;
  detail: string;
  tone: RecceTone;
  onPress?: () => void;
};

export function RecceCheck({ label, value, detail, tone, onPress }: Props) {
  const color = toneColor(tone);
  const body = (
    <View
      accessibilityLabel={onPress ? undefined : `${label}. ${value}. ${detail}`}
      style={styles.check}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      <Text style={[styles.value, { color }]}>{value}</Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${value}. ${detail}`}
      onPress={onPress}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 64,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  copy: { flex: 1, gap: 2 },
  label: { color: colors.text, fontWeight: '700', fontSize: type.body },
  detail: { color: colors.muted, fontSize: type.caption },
  value: { fontSize: type.hud, fontWeight: '800' },
});
