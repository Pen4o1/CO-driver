import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AddressSearch } from '@/features/geocoding/AddressSearch';
import { getCurrentLatLng } from '@/features/maps/currentLocation';
import { useRouteDraft } from '@/state/routeDraft';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { colors, space, type } from '@/ui/theme';

function formatPoint(
  label: string | null,
  point: { lat: number; lng: number } | null,
) {
  if (!point) return 'Tap the map or search';
  if (label) return label;
  return `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
}

export function PinsStep() {
  const start = useRouteDraft((s) => s.start);
  const end = useRouteDraft((s) => s.end);
  const startLabel = useRouteDraft((s) => s.startLabel);
  const endLabel = useRouteDraft((s) => s.endLabel);
  const activePin = useRouteDraft((s) => s.activePin);
  const mode = useRouteDraft((s) => s.mode);
  const loopDistanceKm = useRouteDraft((s) => s.loopDistanceKm);
  const setStart = useRouteDraft((s) => s.setStart);
  const setEnd = useRouteDraft((s) => s.setEnd);
  const setActivePin = useRouteDraft((s) => s.setActivePin);
  const setMode = useRouteDraft((s) => s.setMode);
  const setLoopDistanceKm = useRouteDraft((s) => s.setLoopDistanceKm);
  const setErrorMessage = useRouteDraft((s) => s.setErrorMessage);
  const [locating, setLocating] = useState(false);

  return (
    <View style={styles.panel}>
      <View style={styles.row}>
        <Chip
          label="A → B"
          selected={mode === 'ab'}
          onPress={() => setMode('ab')}
        />
        <Chip
          label="Loop"
          selected={mode === 'loop'}
          onPress={() => setMode('loop')}
        />
      </View>
      <AddressSearch
        placeholder={
          mode === 'loop'
            ? 'Search a start place'
            : activePin === 'end'
              ? 'Search the finish'
              : 'Search the start'
        }
        onPick={(hit) => {
          if (activePin === 'start' || mode === 'loop') {
            setStart({ lat: hit.lat, lng: hit.lng }, hit.label);
            setActivePin('end');
          } else {
            setEnd({ lat: hit.lat, lng: hit.lng }, hit.label);
          }
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Set start pin"
        onPress={() => setActivePin('start')}
        style={[styles.pin, activePin === 'start' && styles.pinActive]}
      >
        <Text style={styles.pinKind}>Start</Text>
        <Text numberOfLines={1} style={styles.pinValue}>
          {formatPoint(startLabel, start)}
        </Text>
      </Pressable>
      {mode === 'ab' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Set end pin"
          onPress={() => setActivePin('end')}
          style={[styles.pin, activePin === 'end' && styles.pinActive]}
        >
          <Text style={styles.pinKind}>Finish</Text>
          <Text numberOfLines={1} style={styles.pinValue}>
            {formatPoint(endLabel, end)}
          </Text>
        </Pressable>
      ) : (
        <>
          <View style={styles.row}>
            {([30, 60, 100] as const).map((km) => (
              <Chip
                key={km}
                label={`${km} km`}
                selected={loopDistanceKm === km}
                onPress={() => setLoopDistanceKm(km)}
              />
            ))}
          </View>
          <Text style={styles.hint}>
            Favours mountain and country roads around this pin.
          </Text>
        </>
      )}
      <Button
        label={locating ? 'Locating…' : 'Use my location'}
        variant="secondary"
        disabled={locating}
        onPress={async () => {
          setLocating(true);
          const result = await getCurrentLatLng();
          setLocating(false);
          if (!result.ok) {
            setErrorMessage(result.error.message);
            return;
          }
          setStart(result.value, 'Current location');
          setActivePin('end');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  hint: { color: colors.muted, fontSize: type.caption },
  pin: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: 2,
  },
  pinActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  pinKind: {
    color: colors.muted,
    fontSize: type.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pinValue: { color: colors.text, fontSize: type.body },
});
