import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/ui/Button';
import { colors, space, type } from '@/ui/theme';

export default function RecceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recce</Text>
      <Text style={styles.body}>
        Voice clips are recorded on the Prepare screen. The full pre-drive
        checklist ships in Phase 5.
      </Text>
      <Button
        label="Prepare voice"
        onPress={() => router.push(`/route/${id}/prepare`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: space.lg,
    gap: space.md,
    justifyContent: 'center',
  },
  title: {
    fontSize: type.title,
    fontWeight: '700',
    color: colors.text,
  },
  body: { color: colors.muted, fontSize: type.body },
});
