import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, space } from '@/ui/theme';

type Props = {
  muted: boolean;
  onMute: () => void;
  onStop: () => void;
};

/** Audio-first locked controls. Stop is long-press so a bump cannot end the drive. */
export function DriveLockControls({ muted, onMute, onStop }: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel={muted ? 'Unmute' : 'Mute'}
        accessibilityRole="button"
        onPress={onMute}
        style={[styles.btn, muted ? styles.muted : styles.mute]}
      >
        <Text style={styles.label}>{muted ? 'UNMUTE' : 'MUTE'}</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Stop drive. Long press to end."
        accessibilityRole="button"
        onLongPress={onStop}
        delayLongPress={600}
        style={[styles.btn, styles.stop]}
      >
        <Text style={styles.label}>STOP</Text>
        <Text style={styles.hint}>hold</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md },
  btn: {
    flex: 1,
    minHeight: 88,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mute: { backgroundColor: colors.surfaceRaised },
  muted: { backgroundColor: colors.accentMuted },
  stop: { backgroundColor: colors.danger },
  label: { color: colors.text, fontSize: 28, fontWeight: '800' },
  hint: { color: colors.text, opacity: 0.8, fontWeight: '600' },
});
