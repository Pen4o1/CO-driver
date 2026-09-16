import { useRouter, type Href } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CallSettingsPanel } from '@/features/settings/CallSettingsPanel';
import { ProfileSettingsPanel } from '@/features/settings/ProfileSettingsPanel';
import { UnitSettingsPanel } from '@/features/settings/UnitSettingsPanel';
import { VoiceSettingsPanel } from '@/features/voice/VoiceSettingsPanel';
import { useSettings } from '@/state/settings';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { GradeLegend } from '@/ui/GradeBadge';
import { colors, space, type } from '@/ui/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const providerId = useSettings((s) => s.providerId);
  const patch = useSettings((s) => s.patch);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <ProfileSettingsPanel />
      <UnitSettingsPanel />
      <Text style={styles.body}>Routing provider</Text>
      <View style={styles.row}>
        <Chip
          label="OpenRouteService"
          selected={providerId === 'ors'}
          onPress={() => patch({ providerId: 'ors' })}
        />
        <Chip
          label="Valhalla"
          selected={providerId === 'valhalla'}
          onPress={() => patch({ providerId: 'valhalla' })}
        />
        <Chip
          label="Mock"
          selected={providerId === 'mock'}
          onPress={() => patch({ providerId: 'mock' })}
        />
      </View>
      <Text style={styles.hint}>
        Mock draws a straight line and needs no key. ORS needs
        EXPO_PUBLIC_ORS_API_KEY (free, no card). Valhalla is keyless.
      </Text>
      <VoiceSettingsPanel />
      <CallSettingsPanel />
      <Text style={styles.body}>Grade shapes (colourblind-safe)</Text>
      <GradeLegend />
      <Button
        label="PACENOTE SANDBOX"
        onPress={() => router.push('/dev/sandbox' as Href)}
      />
      <Button
        label="Dev · pace notes"
        variant="secondary"
        onPress={() => router.push('/dev/notes')}
      />
      <Button
        label="Dev · Sim Drive"
        variant="secondary"
        onPress={() => router.push('/dev/sim')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.bg,
    padding: space.lg,
    gap: space.md,
    paddingBottom: 48,
  },
  title: { fontSize: type.title, fontWeight: '700', color: colors.text },
  body: { color: colors.muted },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  hint: { color: colors.muted, fontSize: type.caption },
});
