import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AddressSearch } from '@/features/geocoding/AddressSearch';
import { getCurrentLatLng } from '@/features/maps/currentLocation';
import { useRouteDraft } from '@/state/routeDraft';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { colors, space, type } from '@/ui/theme';

function formatPoint(
  label: string | null,
  point: { lat: number; lng: number } | null,
) {
  if (!point) return 'Not set';
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
    <Card style={styles.panel}>
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
        onPick={(hit) => {
          if (activePin === 'start' || mode === 'loop') {
            setStart({ lat: hit.lat, lng: hit.lng }, hit.label);
            setActivePin('end');
          } else {
            setEnd({ lat: hit.lat, lng: hit.lng }, hit.label);
          }
        }}
      />
      <View style={styles.row}>
        <Chip
          label={`Start · ${formatPoint(startLabel, start)}`}
          selected={activePin === 'start'}
          onPress={() => setActivePin('start')}
        />
        {mode === 'ab' ? (
          <Chip
            label={`End · ${formatPoint(endLabel, end)}`}
            selected={activePin === 'end'}
            onPress={() => setActivePin('end')}
          />
        ) : null}
      </View>
      {mode === 'loop' ? (
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
      ) : null}
      <Button
        label="Use my location"
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
      <Text style={styles.hint}>
        Tap the map to drop the active pin. Drag a pin to move it.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  panel: { gap: space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  hint: { color: colors.muted, fontSize: type.caption },
});
