import { useRouter, type ImperativeRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { colors, space, stackHeader } from './theme';

/** Pop when the stack has history. Otherwise return to the library. */
export function leave(router: ImperativeRouter) {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function HeaderBack() {
  const router = useRouter();
  if (!router.canGoBack()) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={() => router.back()}
      hitSlop={10}
      style={styles.hit}
    >
      <Text style={styles.chevron}>‹</Text>
    </Pressable>
  );
}

/** Nested stacks hide the default chevron on their first screen. Always supply one. */
export const stackScreenOptions = {
  ...stackHeader,
  headerLeft: () => <HeaderBack />,
};

type NavRowProps = {
  onBack?: () => void;
  backLabel?: string;
  backDisabled?: boolean;
  onForward?: () => void;
  forwardLabel?: string;
  forwardDisabled?: boolean;
};

export function NavRow({
  onBack,
  backLabel = 'Back',
  backDisabled,
  onForward,
  forwardLabel = 'Next',
  forwardDisabled,
}: NavRowProps) {
  if (!onBack && !onForward) return null;
  return (
    <View style={styles.row}>
      {onBack ? (
        <Button
          label={backLabel}
          variant="secondary"
          disabled={backDisabled}
          onPress={onBack}
          style={styles.btn}
        />
      ) : null}
      {onForward ? (
        <Button
          label={forwardLabel}
          disabled={forwardDisabled}
          onPress={onForward}
          style={styles.btn}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: space.xs,
  },
  chevron: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 36,
  },
  row: { flexDirection: 'row', gap: space.sm, width: '100%' },
  btn: { flex: 1 },
});
