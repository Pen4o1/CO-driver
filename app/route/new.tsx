import { Platform, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { AddressSearch } from '@/features/geocoding/AddressSearch';
import { getCurrentLatLng } from '@/features/maps/currentLocation';
import { RouteMap } from '@/features/maps/RouteMap';
import { usePreviewRoute } from '@/features/routing/usePreviewRoute';
import { useRouteDraft } from '@/state/routeDraft';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { colors, space, type } from '@/ui/theme';

function formatPoint(
  label: string | null,
  point: { lat: number; lng: number } | null,
) {
  if (!point) {
    return 'Not set';
  }
  if (label) {
    return label;
  }
  return `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
}

export default function NewRouteScreen() {
  usePreviewRoute();
  const start = useRouteDraft((s) => s.start);
  const end = useRouteDraft((s) => s.end);
  const startLabel = useRouteDraft((s) => s.startLabel);
  const endLabel = useRouteDraft((s) => s.endLabel);
  const activePin = useRouteDraft((s) => s.activePin);
  const candidate = useRouteDraft((s) => s.candidate);
  const errorMessage = useRouteDraft((s) => s.errorMessage);
  const isRouting = useRouteDraft((s) => s.isRouting);
  const setStart = useRouteDraft((s) => s.setStart);
  const setEnd = useRouteDraft((s) => s.setEnd);
  const setActivePin = useRouteDraft((s) => s.setActivePin);
  const placeOnMap = useRouteDraft((s) => s.placeOnMap);
  const setErrorMessage = useRouteDraft((s) => s.setErrorMessage);
  const [locating, setLocating] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>
          MapLibre needs the iOS or Android dev client. Expo Go and web are not
          supported. See MAP_SETUP.md.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <RouteMap
        start={start}
        end={end}
        geometry={candidate?.geometry ?? null}
        onStartChange={(point) => setStart(point)}
        onEndChange={(point) => setEnd(point)}
        onMapPress={placeOnMap}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <Card style={styles.panel}>
          <AddressSearch
            onPick={(hit) => {
              if (activePin === 'start') {
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
            <Chip
              label={`End · ${formatPoint(endLabel, end)}`}
              selected={activePin === 'end'}
              onPress={() => setActivePin('end')}
            />
          </View>
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
          <Text style={styles.hint}>
            Tap the map to drop the active pin. Drag a pin to move it.
          </Text>
          {isRouting ? (
            <Text style={styles.meta}>Requesting route…</Text>
          ) : null}
          {candidate ? (
            <Text style={styles.meta}>
              {(candidate.geometry.lengthM / 1000).toFixed(1)} km ·{' '}
              {Math.round(candidate.breakdown.durationS / 60)} min
              {candidate.ascentM !== null
                ? ` · +${Math.round(candidate.ascentM)} m`
                : ''}
            </Text>
          ) : null}
          {errorMessage ? (
            <Text style={styles.error}>{errorMessage}</Text>
          ) : null}
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  overlay: {
    position: 'absolute',
    left: space.sm,
    right: space.sm,
    top: space.sm,
  },
  panel: { gap: space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  hint: { color: colors.muted, fontSize: type.caption },
  meta: { color: colors.text, fontWeight: '600' },
  error: { color: colors.danger },
  fallback: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  fallbackText: { color: colors.text, textAlign: 'center' },
});
