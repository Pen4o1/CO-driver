import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useSettings } from '@/state/settings';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { colors, space, type } from '@/ui/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const providerId = useSettings((s) => s.providerId);
  const setProviderId = useSettings((s) => s.setProviderId);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.body}>Routing provider</Text>
      <View style={styles.row}>
        <Chip
          label="OpenRouteService"
          selected={providerId === 'ors'}
          onPress={() => setProviderId('ors')}
        />
        <Chip
          label="Mock"
          selected={providerId === 'mock'}
          onPress={() => setProviderId('mock')}
        />
      </View>
      <Text style={styles.hint}>
        Mock draws a straight line and needs no key. ORS needs
        EXPO_PUBLIC_ORS_API_KEY (free, no card).
      </Text>
      <Button
        label="Dev · pace notes"
        variant="secondary"
        onPress={() => router.push('/dev/notes')}
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
  },
  title: { fontSize: type.title, fontWeight: '700', color: colors.text },
  body: { color: colors.muted },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  hint: { color: colors.muted, fontSize: type.caption },
});
