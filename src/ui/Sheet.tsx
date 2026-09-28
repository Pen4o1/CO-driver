import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, space } from './theme';

type Props = {
  children: ReactNode;
  footer?: ReactNode;
  maxHeight?: ViewStyle['maxHeight'];
  scrollEnabled?: boolean;
};

export function Sheet({
  children,
  footer,
  maxHeight = '46%',
  scrollEnabled = true,
}: Props) {
  return (
    <View style={[styles.sheet, { maxHeight }]}>
      <View style={styles.handle} />
      <ScrollView
        scrollEnabled={scrollEnabled}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        contentContainerStyle={styles.body}
      >
        {children}
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
    gap: space.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: space.sm,
  },
  body: { gap: space.sm, paddingTop: space.sm, paddingBottom: space.xs },
  footer: { gap: space.sm, paddingTop: space.xs },
});
