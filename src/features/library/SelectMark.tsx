import { StyleSheet, Text, View } from 'react-native';

import { colors, type } from '@/ui/theme';

export function SelectMark({ selected }: { selected: boolean }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.mark, selected && styles.on]}
    >
      <Text style={[styles.tick, selected && styles.tickOn]}>✓</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  on: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  tick: {
    color: 'transparent',
    fontSize: type.caption,
    fontWeight: '700',
    lineHeight: 16,
  },
  tickOn: { color: colors.bg },
});
