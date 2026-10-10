import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { LatLng } from '@/core/types';
import { AddressSearch } from '@/features/geocoding/AddressSearch';
import {
  noteSearchFix,
  useSearchBias,
} from '@/features/geocoding/useSearchBias';
import { getCurrentLatLng } from '@/features/maps/currentLocation';
import { useRouteDraft, type PinTarget } from '@/state/routeDraft';
import { Chip } from '@/ui/Chip';
import { Segmented } from '@/ui/Segmented';
import { colors, space, type } from '@/ui/theme';

function pinValue(label: string | null, point: LatLng | null): string {
  if (!point) return '';
  if (label) return label;
  return `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
}

function pinKey(label: string | null, point: LatLng | null): string {
  if (!point) return '';
  return `${point.lat.toFixed(5)}:${point.lng.toFixed(5)}:${label ?? ''}`;
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
  const clearStart = useRouteDraft((s) => s.clearStart);
  const clearEnd = useRouteDraft((s) => s.clearEnd);
  const swapPins = useRouteDraft((s) => s.swapPins);
  const setActivePin = useRouteDraft((s) => s.setActivePin);
  const setMode = useRouteDraft((s) => s.setMode);
  const setLoopDistanceKm = useRouteDraft((s) => s.setLoopDistanceKm);
  const setErrorMessage = useRouteDraft((s) => s.setErrorMessage);
  const [locating, setLocating] = useState(false);
  const [biasRevision, setBiasRevision] = useState(0);
  const located = useSearchBias(null, biasRevision);
  const startRef = useRef<TextInput>(null);
  const endRef = useRef<TextInput>(null);
  const editing: PinTarget = mode === 'loop' ? 'start' : activePin;
  const finishBias = mode === 'ab' && start ? start : located;
  const canSwap = Boolean(start || end);

  useEffect(() => {
    if (editing !== 'start') startRef.current?.blur();
    if (editing !== 'end') endRef.current?.blur();
  }, [editing]);

  const locateHere = async () => {
    setLocating(true);
    const result = await getCurrentLatLng();
    setLocating(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }
    noteSearchFix(result.value);
    setBiasRevision((value) => value + 1);
    setStart(result.value, 'Current location');
    if (mode === 'ab' && !end) {
      setActivePin('end');
      startRef.current?.blur();
      endRef.current?.focus();
    }
  };

  const hint =
    mode === 'loop'
      ? 'Favours mountain and country roads around the start.'
      : !start
        ? 'Search a start, or tap the map.'
        : !end
          ? 'Now search the finish.'
          : 'Tap a stop to change it. Map taps land on the highlighted one.';

  return (
    <View style={styles.panel}>
      <Segmented
        accessibilityLabel="Route type"
        value={mode}
        onChange={(next) => {
          setMode(next);
          if (next === 'loop') setActivePin('start');
        }}
        options={[
          { id: 'ab', label: 'Point to point' },
          { id: 'loop', label: 'Loop' },
        ]}
      />
      <View style={styles.card}>
        <View style={[styles.stop, editing === 'start' && styles.stopOn]}>
          <Pressable
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            onPress={() => startRef.current?.focus()}
            style={styles.rail}
          >
            <View
              style={[
                styles.halo,
                editing === 'start' && { borderColor: colors.pinStart },
              ]}
            >
              <View
                style={[styles.dot, { backgroundColor: colors.pinStart }]}
              />
            </View>
          </Pressable>
          <View style={styles.stopBody}>
            <Pressable
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              onPress={() => startRef.current?.focus()}
            >
              <Text
                style={[styles.kicker, editing === 'start' && styles.kickerOn]}
              >
                Start
              </Text>
            </Pressable>
            <AddressSearch
              bare
              inputRef={startRef}
              bias={located}
              active={editing === 'start'}
              value={pinValue(startLabel, start)}
              pinKey={pinKey(startLabel, start)}
              placeholder="Search the start"
              accessibilityLabel={
                editing === 'start' ? 'Start, selected' : 'Start'
              }
              clearLabel="Clear start"
              onFocus={() => setActivePin('start')}
              onClear={clearStart}
              onPick={(hit) => {
                setStart({ lat: hit.lat, lng: hit.lng }, hit.label);
                if (mode === 'ab' && !end) {
                  setActivePin('end');
                  startRef.current?.blur();
                  endRef.current?.focus();
                }
              }}
            />
          </View>
        </View>
        {mode === 'ab' ? (
          <>
            <View style={styles.bridge}>
              <View style={styles.bridgeLine} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Swap start and finish"
                accessibilityState={{ disabled: !canSwap }}
                disabled={!canSwap}
                onPress={swapPins}
                style={[styles.swap, !canSwap && styles.swapOff]}
              >
                <Text style={styles.swapText}>Swap</Text>
              </Pressable>
            </View>
            <View style={[styles.stop, editing === 'end' && styles.stopOn]}>
              <Pressable
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                onPress={() => endRef.current?.focus()}
                style={styles.rail}
              >
                <View
                  style={[
                    styles.halo,
                    editing === 'end' && { borderColor: colors.pinEnd },
                  ]}
                >
                  <View
                    style={[styles.dot, { backgroundColor: colors.pinEnd }]}
                  />
                </View>
              </Pressable>
              <View style={styles.stopBody}>
                <Pressable
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                  onPress={() => endRef.current?.focus()}
                >
                  <Text
                    style={[
                      styles.kicker,
                      editing === 'end' && styles.kickerOn,
                    ]}
                  >
                    Finish
                  </Text>
                </Pressable>
                <AddressSearch
                  bare
                  inputRef={endRef}
                  bias={finishBias}
                  active={editing === 'end'}
                  value={pinValue(endLabel, end)}
                  pinKey={pinKey(endLabel, end)}
                  placeholder="Search the finish"
                  accessibilityLabel={
                    editing === 'end' ? 'Finish, selected' : 'Finish'
                  }
                  clearLabel="Clear finish"
                  onFocus={() => setActivePin('end')}
                  onClear={clearEnd}
                  onPick={(hit) => {
                    setEnd({ lat: hit.lat, lng: hit.lng }, hit.label);
                  }}
                />
              </View>
            </View>
          </>
        ) : null}
      </View>
      {mode === 'loop' ? (
        <View style={styles.distances}>
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Use current location"
        disabled={locating}
        onPress={() => {
          void locateHere();
        }}
        style={styles.locate}
      >
        <Text style={styles.locateText}>
          {locating ? 'Locating…' : 'Use current location'}
        </Text>
      </Pressable>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: space.sm },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  stop: {
    flexDirection: 'row',
    gap: space.xs,
    paddingRight: space.sm,
    paddingVertical: space.sm,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  stopOn: {
    borderLeftColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  rail: { width: 36, alignItems: 'center' },
  halo: {
    width: 22,
    height: 22,
    marginTop: 2,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  stopBody: { flex: 1, minWidth: 0, gap: 2 },
  kicker: {
    color: colors.muted,
    fontSize: type.caption,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  kickerOn: { color: colors.accent },
  bridge: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: 36 + space.xs,
    paddingRight: space.sm,
  },
  bridgeLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  swap: {
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapOff: { opacity: 0.4 },
  swapText: { color: colors.text, fontSize: type.caption, fontWeight: '700' },
  distances: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  locate: {
    minHeight: 44,
    justifyContent: 'center',
  },
  locateText: { color: colors.accent, fontSize: type.body, fontWeight: '700' },
  hint: { color: colors.muted, fontSize: type.caption },
});
