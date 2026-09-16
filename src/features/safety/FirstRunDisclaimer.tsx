import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SAFETY_DISCLAIMER_BG_EU } from '@/core/safety';
import { acceptDisclaimer } from '@/features/storage';
import { Button } from '@/ui/Button';
import { colors, space, type } from '@/ui/theme';

type Props = {
  onAccepted: () => void;
};

export function FirstRunDisclaimer({ onAccepted }: Props) {
  return (
    <View style={styles.screen} accessibilityViewIsModal>
      <Text style={styles.kicker}>Before you drive</Text>
      <Text style={styles.title}>Safety</Text>
      <Text style={styles.body}>{SAFETY_DISCLAIMER_BG_EU}</Text>
      <Pressable accessibilityRole="text" style={styles.box}>
        <Text style={styles.body}>
          Apex is a co-driver voice. It does not replace looking at the road,
          posted limits, or your own judgement.
        </Text>
      </Pressable>
      <Button
        label="I understand — continue"
        onPress={() => {
          void acceptDisclaimer().then(onAccepted);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: space.lg,
    justifyContent: 'center',
    gap: space.md,
  },
  kicker: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: type.caption,
  },
  title: { color: colors.text, fontSize: type.title, fontWeight: '800' },
  body: { color: colors.text, fontSize: type.body, lineHeight: 22 },
  box: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
