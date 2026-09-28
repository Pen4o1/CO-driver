import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, space } from './theme';

type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
};

export function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[styles.text, selected && styles.textSelected]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  text: { color: colors.muted, fontWeight: '600' },
  textSelected: { color: colors.accent },
});
