import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { colors, space, type } from './theme';

type GroupProps = {
  title?: string;
  footer?: string;
  /** Pad a single control inside the rectangle. Rows stay full-bleed. */
  inset?: 'tight' | 'regular';
  children: ReactNode;
};

export function SettingGroup({ title, footer, inset, children }: GroupProps) {
  const rows = Children.toArray(children);
  return (
    <View style={styles.group}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View
        style={[
          styles.card,
          inset === 'tight' && styles.insetTight,
          inset === 'regular' && styles.insetRegular,
        ]}
      >
        {inset
          ? children
          : rows.map((row, index) => (
              <View key={index}>
                {index > 0 ? <View style={styles.divider} /> : null}
                {row}
              </View>
            ))}
      </View>
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

type ChoiceProps = {
  label: string;
  detail?: string;
  selected?: boolean;
  onPress: () => void;
};

export function SettingChoice({
  label,
  detail,
  selected,
  onPress,
}: ChoiceProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.label}>
          {label}
        </Text>
        {detail ? (
          <Text numberOfLines={2} style={styles.detail}>
            {detail}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.mark, selected && styles.markOn]}>
        {selected ? '✓' : ''}
      </Text>
    </Pressable>
  );
}

type SwitchProps = {
  label: string;
  detail?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

export function SettingSwitch({
  label,
  detail,
  value,
  onValueChange,
}: SwitchProps) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.accentMuted }}
        thumbColor={value ? colors.accent : colors.text}
        ios_backgroundColor={colors.surfaceRaised}
      />
    </View>
  );
}

type LinkProps = {
  label: string;
  value?: string;
  onPress: () => void;
};

export function SettingLink({ label, value, onPress }: LinkProps) {
  return (
    <Pressable
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text numberOfLines={1} style={[styles.label, styles.copy]}>
        {label}
      </Text>
      {value ? (
        <Text numberOfLines={1} style={styles.linkValue}>
          {value}
        </Text>
      ) : null}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export function SettingAction({ label, onPress }: LinkProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

export function SettingText({ label }: { label: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.detail}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.xs },
  title: {
    color: colors.muted,
    fontSize: type.caption,
    fontWeight: '700',
    marginLeft: space.xs,
  },
  footer: {
    color: colors.muted,
    fontSize: type.caption,
    lineHeight: 18,
    marginHorizontal: space.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  insetTight: { padding: 4 },
  insetRegular: { padding: space.md, gap: space.sm },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: space.md,
  },
  row: {
    minHeight: 48,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  copy: { flex: 1, gap: 2 },
  label: { color: colors.text, fontSize: type.body, fontWeight: '600' },
  detail: { color: colors.muted, fontSize: type.caption, lineHeight: 18 },
  mark: {
    width: 18,
    textAlign: 'center',
    color: 'transparent',
    fontSize: type.body,
    fontWeight: '700',
  },
  markOn: { color: colors.accent },
  linkValue: {
    color: colors.muted,
    fontSize: type.body,
    maxWidth: '52%',
  },
  chevron: { color: colors.muted, fontSize: 22, lineHeight: 22 },
  action: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  actionLabel: { color: colors.accent, fontSize: type.body, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
