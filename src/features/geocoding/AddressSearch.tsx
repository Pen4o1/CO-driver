import { useEffect, useRef, useState, type Ref } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PHOTON_DEBOUNCE_MS } from '@/core/config';
import type { LatLng } from '@/core/types';
import { fetchImpl } from '@/features/http/fetchImpl';
import { sqliteGeocodeCache } from '@/features/storage';
import { colors, space, type } from '@/ui/theme';
import { TextField } from '@/ui/TextField';

import { searchPhoton } from './photon';
import { photonLanguage } from './photonHits';
import type { PhotonHit } from './photonSchema';
import { useDebouncedValue } from './useDebouncedValue';

const SEARCH_TIMEOUT_MS = 8000;

type Props = {
  onPick: (hit: PhotonHit) => void;
  onClear?: () => void;
  onFocus?: () => void;
  placeholder?: string;
  bias: LatLng;
  /**
   * Committed stop text. Applied when `pinKey` changes, so each stop keeps
   * its own draft while you edit the other one.
   */
  value?: string;
  /** Identity of the pin. A new key replaces whatever was typed in this field. */
  pinKey?: string;
  /** Search and suggestions stay on the stop that is being edited. */
  active?: boolean;
  accessibilityLabel?: string;
  clearLabel?: string;
  inputRef?: Ref<TextInput>;
  bare?: boolean;
  maxHits?: number;
};

export function AddressSearch({
  onPick,
  onClear,
  onFocus,
  placeholder = 'Search an address',
  bias,
  value = '',
  pinKey,
  active = true,
  accessibilityLabel = 'Search address',
  clearLabel = 'Clear search',
  inputRef,
  bare = false,
  maxHits = 6,
}: Props) {
  const [query, setQuery] = useState(value);
  const [pickedQuery, setPickedQuery] = useState<string | null>(
    value.length > 0 ? value : null,
  );
  const [hits, setHits] = useState<PhotonHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const pinKeyRef = useRef(pinKey);
  const debounced = useDebouncedValue(query, PHOTON_DEBOUNCE_MS);
  const picked = pickedQuery !== null && query === pickedQuery;

  useEffect(() => {
    if (pinKey === undefined || pinKeyRef.current === pinKey) return;
    pinKeyRef.current = pinKey;
    setQuery(value);
    setPickedQuery(value.length > 0 ? value : null);
    setHits([]);
    setError(null);
    setSearching(false);
  }, [pinKey, value]);

  useEffect(() => {
    if (
      !active ||
      picked ||
      query !== debounced ||
      debounced.trim().length < 3
    ) {
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, SEARCH_TIMEOUT_MS);
    void (async () => {
      setSearching(true);
      setError(null);
      const result = await searchPhoton(
        debounced,
        { fetchImpl, cache: sqliteGeocodeCache() },
        {
          bias,
          lang: photonLanguage(),
          signal: controller.signal,
        },
      );
      clearTimeout(timer);
      if (cancelled) return;
      setSearching(false);
      if (!result.ok) {
        setHits([]);
        setError(result.error.message);
        return;
      }
      if (timedOut && result.value.length === 0) {
        setHits([]);
        setError('Search timed out. Try again.');
        return;
      }
      setHits(result.value);
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [active, bias, debounced, picked, query]);

  const pending =
    active &&
    !picked &&
    query.trim().length >= 3 &&
    (searching || query !== debounced);
  const showEmpty =
    active &&
    !pending &&
    !picked &&
    !error &&
    query === debounced &&
    debounced.trim().length >= 3 &&
    hits.length === 0;
  const shown = hits.slice(0, maxHits);
  const showClear = query.length > 0 || (pinKey?.length ?? 0) > 0;

  const clear = () => {
    setPickedQuery(null);
    setQuery('');
    setHits([]);
    setError(null);
    setSearching(false);
    onClear?.();
  };

  return (
    <View>
      <View style={styles.fieldRow}>
        <View style={styles.field}>
          <TextField
            ref={inputRef}
            bare={bare}
            accessibilityLabel={accessibilityLabel}
            placeholder={placeholder}
            value={query}
            onFocus={onFocus}
            onChangeText={(text) => {
              setPickedQuery(null);
              setQuery(text);
              setHits([]);
              setError(null);
              setSearching(text.trim().length >= 3);
            }}
            autoCorrect={false}
            autoCapitalize="none"
            autoComplete="off"
            returnKeyType="search"
            selectTextOnFocus
          />
        </View>
        {showClear ? (
          <Pressable
            accessibilityLabel={clearLabel}
            accessibilityRole="button"
            onPress={clear}
            hitSlop={6}
            style={styles.clear}
          >
            <Text style={styles.clearText}>×</Text>
          </Pressable>
        ) : null}
      </View>
      {active && error ? <Text style={styles.error}>{error}</Text> : null}
      {pending ? <Text style={styles.status}>Searching…</Text> : null}
      {showEmpty ? (
        <Text style={styles.status}>
          No matches. Try the street name and the city.
        </Text>
      ) : null}
      {active && !pending && shown.length > 0 ? (
        <ScrollView
          style={styles.hitsScroll}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          <View style={styles.hits}>
            {shown.map((hit) => (
              <Pressable
                key={`${hit.lat.toFixed(5)}-${hit.lng.toFixed(5)}-${hit.label}-${hit.subtitle}`}
                accessibilityLabel={hit.label}
                accessibilityRole="button"
                onPress={() => {
                  onPick(hit);
                  setQuery(hit.label);
                  setPickedQuery(hit.label);
                  setHits([]);
                  setSearching(false);
                  setError(null);
                }}
                style={({ pressed }) => [
                  styles.hit,
                  pressed && styles.hitPressed,
                ]}
              >
                <View style={styles.hitCopy}>
                  <Text numberOfLines={1} style={styles.hitTitle}>
                    {hit.title}
                  </Text>
                  {hit.subtitle ? (
                    <Text numberOfLines={1} style={styles.hitSubtitle}>
                      {hit.subtitle}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.kind}>{hit.kind}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  field: { flex: 1 },
  clear: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  clearText: {
    color: colors.muted,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '500',
  },
  error: { color: colors.danger, marginTop: space.xs, fontSize: type.caption },
  status: { color: colors.muted, marginTop: space.xs, fontSize: type.caption },
  hitsScroll: { maxHeight: 220, marginTop: space.xs },
  hits: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  hit: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  hitPressed: { opacity: 0.7 },
  hitCopy: { flex: 1, gap: 2 },
  hitTitle: { color: colors.text, fontSize: type.body, fontWeight: '600' },
  hitSubtitle: { color: colors.muted, fontSize: type.caption },
  kind: { color: colors.muted, fontSize: type.caption, fontWeight: '700' },
});
