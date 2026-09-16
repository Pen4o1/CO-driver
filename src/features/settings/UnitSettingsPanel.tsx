import { StyleSheet, Text, View } from 'react-native';

import type { UnitSystem } from '@/core/units';
import { useSettings } from '@/state/settings';
import { Chip } from '@/ui/Chip';
import { colors, space, type } from '@/ui/theme';

export function UnitSettingsPanel() {
  const unitSystem = useSettings((s) => s.unitSystem);
  const keepScreenOn = useSettings((s) => s.keepScreenOn);
  const patch = useSettings((s) => s.patch);

  const pick = (unitSystemNext: UnitSystem) => {
    patch({ unitSystem: unitSystemNext });
  };

  return (
    <View style={styles.block}>
      <Text style={styles.body}>Units</Text>
      <View style={styles.row}>
        <Chip
          label="km / m"
          selected={unitSystem === 'metric'}
          onPress={() => pick('metric')}
        />
        <Chip
          label="mi / yards"
          selected={unitSystem === 'imperial'}
          onPress={() => pick('imperial')}
        />
      </View>
      <Text style={styles.body}>Display</Text>
      <View style={styles.row}>
        <Chip
          label="Keep screen on"
          selected={keepScreenOn}
          onPress={() => patch({ keepScreenOn: !keepScreenOn })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.sm },
  body: { color: colors.muted, fontSize: type.body, fontWeight: '600' },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
});
