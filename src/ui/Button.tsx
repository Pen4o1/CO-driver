import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type View,
} from 'react-native';
import { forwardRef } from 'react';

import { colors, space, type } from './theme';

type Props = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export const Button = forwardRef<View, Props>(function Button(
  { label, variant = 'primary', disabled, style, ...rest },
  ref,
) {
  return (
    <Pressable
      ref={ref}
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={[
          styles.text,
          variant === 'secondary' && styles.textSecondary,
          variant === 'ghost' && styles.textGhost,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.accent },
  secondary: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },
  text: {
    color: colors.bg,
    fontSize: type.body,
    fontWeight: '700',
  },
  textSecondary: { color: colors.text },
  textGhost: { color: colors.accent },
});
