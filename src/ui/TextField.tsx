import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { colors, space, type } from './theme';

export function TextField(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      style={styles.input}
      {...props}
    />
  );
}

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
});
