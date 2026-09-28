import { useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CallSettingsPanel } from '@/features/settings/CallSettingsPanel';
import { ProfileSettingsPanel } from '@/features/settings/ProfileSettingsPanel';
import { UnitSettingsPanel } from '@/features/settings/UnitSettingsPanel';
import { VoiceSettingsPanel } from '@/features/voice/VoiceSettingsPanel';
import { useSettings } from '@/state/settings';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { GradeLegend } from '@/ui/GradeBadge';
import { colors, space, type } from '@/ui/theme';

type SectionId = 'drive' | 'voice' | 'calls' | 'setup';

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'drive', label: 'Drive' },
  { id: 'voice', label: 'Voice' },
  { id: 'calls', label: 'Calls' },
  { id: 'setup', label: 'Setup' },
];

const LEAD: Record<SectionId, string> = {
  drive: 'Default style, units, and the screen while you drive.',
  voice: 'Who speaks, and how loud.',
  calls: 'Which notes get called, and how early.',
  setup: 'Routing provider and developer tools.',
};

export default function SettingsScreen() {
  const router = useRouter();
  const [section, setSection] = useState<SectionId>('drive');
  const providerId = useSettings((s) => s.providerId);
  const patch = useSettings((s) => s.patch);

  return (
    <View style={styles.screen}>
      <SectionBar value={section} onChange={setSection} />
      <Text style={styles.lead}>{LEAD[section]}</Text>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {section === 'drive' ? (
          <Card style={styles.stack}>
            <ProfileSettingsPanel />
            <UnitSettingsPanel />
          </Card>
        ) : null}
        {section === 'voice' ? (
          <Card style={styles.stack}>
            <VoiceSettingsPanel />
          </Card>
        ) : null}
        {section === 'calls' ? (
          <>
            <CallSettingsPanel />
            <Text style={styles.body}>Grade shapes</Text>
            <GradeLegend />
          </>
        ) : null}
        {section === 'setup' ? (
          <>
            <Card style={styles.stack}>
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
                Mock is offline and needs no key. Otherwise Apex asks both
                Valhalla and OpenRouteService, then ranks what comes back. ORS
                needs EXPO_PUBLIC_ORS_API_KEY. Valhalla is keyless.
              </Text>
            </Card>
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
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function SectionBar({
  value,
  onChange,
}: {
  value: SectionId;
  onChange: (id: SectionId) => void;
}) {
  return (
    <View style={styles.bar}>
      {SECTIONS.map((section) => {
        const selected = value === section.id;
        return (
          <Pressable
            key={section.id}
            accessibilityLabel={section.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(section.id)}
            style={[styles.segment, selected && styles.segmentOn]}
          >
            <Text
              style={[styles.segmentText, selected && styles.segmentTextOn]}
            >
              {section.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    gap: space.sm,
  },
  lead: { color: colors.muted, fontSize: type.caption },
  content: { gap: space.md, paddingBottom: space.lg },
  stack: { gap: space.md },
  body: { color: colors.text, fontWeight: '700' },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  hint: { color: colors.muted, fontSize: type.caption },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentOn: { backgroundColor: colors.accentMuted },
  segmentText: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: type.caption,
  },
  segmentTextOn: { color: colors.accent },
});
