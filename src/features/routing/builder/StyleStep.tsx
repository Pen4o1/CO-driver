import { StyleSheet, Text, View } from 'react-native';

import { BUILTIN_PROFILES } from '@/core/routing';
import { useRouteDraft } from '@/state/routeDraft';
import { Chip } from '@/ui/Chip';
import { Slider } from '@/ui/Slider';
import { colors, space, type } from '@/ui/theme';

export function StyleStep() {
  const profileId = useRouteDraft((s) => s.profileId);
  const custom = useRouteDraft((s) => s.custom);
  const setProfileId = useRouteDraft((s) => s.setProfileId);
  const setCustom = useRouteDraft((s) => s.setCustom);
  const description =
    BUILTIN_PROFILES.find((p) => p.id === profileId)?.description ??
    'Tune the sliders.';

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Driving style</Text>
      <View style={styles.row}>
        {BUILTIN_PROFILES.map((profile) => (
          <Chip
            key={profile.id}
            label={profile.label}
            selected={profileId === profile.id}
            onPress={() => setProfileId(profile.id)}
          />
        ))}
        <Chip
          label="Custom"
          selected={profileId === 'custom'}
          onPress={() => setProfileId('custom')}
        />
      </View>
      <Text style={styles.hint}>{description}</Text>
      {profileId === 'custom' ? (
        <View style={styles.sliders}>
          <Slider
            label="Curviness"
            value={custom.curviness}
            min={0}
            max={10}
            onChange={(curviness) => setCustom({ ...custom, curviness })}
          />
          <Slider
            label="Max sharpness (min grade)"
            value={custom.maxSharpness}
            min={1}
            max={6}
            onChange={(maxSharpness) =>
              setCustom({
                ...custom,
                maxSharpness: maxSharpness as 1 | 2 | 3 | 4 | 5 | 6,
              })
            }
          />
          <Slider
            label="Max detour ×"
            value={Math.round(custom.maxDetourRatio * 100)}
            min={110}
            max={180}
            step={5}
            onChange={(pct) =>
              setCustom({ ...custom, maxDetourRatio: pct / 100 })
            }
          />
          <View style={styles.row}>
            <Chip
              label="Avoid motorway"
              selected={custom.avoidMotorway}
              onPress={() =>
                setCustom({ ...custom, avoidMotorway: !custom.avoidMotorway })
              }
            />
            <Chip
              label="Avoid toll"
              selected={custom.avoidToll}
              onPress={() =>
                setCustom({ ...custom, avoidToll: !custom.avoidToll })
              }
            />
            <Chip
              label="Avoid ferry"
              selected={custom.avoidFerry}
              onPress={() =>
                setCustom({ ...custom, avoidFerry: !custom.avoidFerry })
              }
            />
            <Chip
              label="Avoid unpaved"
              selected={custom.avoidUnpaved}
              onPress={() =>
                setCustom({ ...custom, avoidUnpaved: !custom.avoidUnpaved })
              }
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: space.sm },
  heading: { color: colors.text, fontWeight: '700', fontSize: type.body },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  hint: { color: colors.muted, fontSize: type.caption },
  sliders: { gap: space.sm },
});
