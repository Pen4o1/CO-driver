import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CallSettingsPanel } from '@/features/settings/CallSettingsPanel';
import { ProfileSettingsPanel } from '@/features/settings/ProfileSettingsPanel';
import { SetupSettingsPanel } from '@/features/settings/SetupSettingsPanel';
import { UnitSettingsPanel } from '@/features/settings/UnitSettingsPanel';
import { VoiceSettingsPanel } from '@/features/voice/VoiceSettingsPanel';
import { Segmented } from '@/ui/Segmented';
import { colors, space } from '@/ui/theme';

type SectionId = 'drive' | 'voice' | 'calls' | 'setup';

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'drive', label: 'Drive' },
  { id: 'voice', label: 'Voice' },
  { id: 'calls', label: 'Calls' },
  { id: 'setup', label: 'Setup' },
];

export default function SettingsScreen() {
  const [section, setSection] = useState<SectionId>('drive');

  return (
    <View style={styles.screen}>
      <Segmented
        role="tab"
        accessibilityLabel="Settings sections"
        value={section}
        options={SECTIONS}
        onChange={setSection}
      />
      <ScrollView
        key={section}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {section === 'drive' ? (
          <>
            <ProfileSettingsPanel />
            <UnitSettingsPanel />
          </>
        ) : null}
        {section === 'voice' ? <VoiceSettingsPanel /> : null}
        {section === 'calls' ? <CallSettingsPanel /> : null}
        {section === 'setup' ? <SetupSettingsPanel /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    gap: space.md,
  },
  scroll: { flex: 1 },
  content: { gap: space.lg, paddingBottom: space.lg },
});
