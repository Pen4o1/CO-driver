import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, space, type } from './theme';

type Id = string | number;

type Option<T extends Id> = {
  id: T;
  label: string;
  accessibilityLabel?: string;
};

type Props<T extends Id> = {
  value: T;
  options: readonly Option<T>[];
  onChange: (id: T) => void;
  accessibilityLabel: string;
  /** Tabs announce as a tab bar. Choices announce as a radio group. */
  role?: 'tab' | 'radio';
  /** Draw the outer rectangle. Turn off when a settings group already frames it. */
  bare?: boolean;
};

export function Segmented<T extends Id>({
  value,
  options,
  onChange,
  accessibilityLabel,
  role = 'radio',
  bare = false,
}: Props<T>) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={role === 'tab' ? 'tablist' : 'radiogroup'}
      style={[styles.track, !bare && styles.framed]}
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={String(option.id)}
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityRole={role === 'tab' ? 'tab' : 'radio'}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.id)}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentOn,
              pressed && styles.pressed,
            ]}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={[styles.label, selected && styles.labelOn]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 4,
  },
  framed: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  segment: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: space.xs,
  },
  segmentOn: { backgroundColor: colors.accentMuted },
  pressed: { opacity: 0.75 },
  label: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: type.caption,
  },
  labelOn: { color: colors.accent },
});
