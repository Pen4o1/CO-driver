import { StyleSheet, Text, View } from 'react-native';

import { BUILTIN_PROFILES } from '@/core/routing';
import type { RouteStyle } from '@/core/types';
import { useSettings } from '@/state/settings';
import { Chip } from '@/ui/Chip';
import { colors, space, type } from '@/ui/theme';

export function ProfileSettingsPanel() {
  const defaultProfileId = useSettings((s) => s.defaultProfileId);
  const patch = useSettings((s) => s.patch);

  return (
    <View style={styles.block}>
      <Text style={styles.body}>Default style</Text>
      <View style={styles.row}>
        {BUILTIN_PROFILES.map((profile) => (
          <Chip
            key={profile.id}
            label={profile.label}
            selected={defaultProfileId === profile.id}
            onPress={() =>
              patch({ defaultProfileId: profile.id as RouteStyle })
            }
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.sm },
  body: { color: colors.muted, fontSize: type.body, fontWeight: '600' },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
});
