import { forwardRef } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { colors, space, type } from './theme';

type Props = TextInputProps & {
  /** Drop the chrome when the field sits inside another control. */
  bare?: boolean;
};

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { bare, style, ...props },
  ref,
) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.muted}
      style={[styles.input, bare && styles.bare, style]}
      {...props}
    />
  );
});

const styles = StyleSheet.create({
  input: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: space.md,
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
    fontSize: type.body,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bare: {
    minHeight: 32,
    borderWidth: 0,
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
  },
});
