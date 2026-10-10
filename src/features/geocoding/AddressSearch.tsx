import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
  placeholder?: string;
  bias: LatLng;
};

export function AddressSearch({
  onPick,
  placeholder = 'Search an address',
  bias,
}: Props) {
  const [query, setQuery] = useState('');
  const [pickedQuery, setPickedQuery] = useState<string | null>(null);
  const [hits, setHits] = useState<PhotonHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const debounced = useDebouncedValue(query, PHOTON_DEBOUNCE_MS);
  const picked = pickedQuery !== null && query === pickedQuery;

  useEffect(() => {
    if (picked || query !== debounced || debounced.trim().length < 3) return;
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
  }, [bias, debounced, picked, query]);

  const pending =
    !picked && query.trim().length >= 3 && (searching || query !== debounced);
  const showEmpty =
    !pending &&
    !picked &&
    !error &&
    query === debounced &&
    debounced.trim().length >= 3 &&
    hits.length === 0;

  return (
    <View>
      <View style={styles.fieldRow}>
        <View style={styles.field}>
          <TextField
            accessibilityLabel="Search address"
            placeholder={placeholder}
            value={query}
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
          />
        </View>
        {query.length > 0 ? (
          <Pressable
            accessibilityLabel="Clear search"
            accessibilityRole="button"
            onPress={() => {
              setPickedQuery(null);
              setQuery('');
              setHits([]);
              setError(null);
              setSearching(false);
            }}
            style={styles.clear}
          >
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {pending ? <Text style={styles.status}>Searching…</Text> : null}
      {showEmpty ? (
        <Text style={styles.status}>
          No matches. Try the street name and the city.
        </Text>
      ) : null}
      {!pending && hits.length > 0 ? (
        <View style={styles.hits}>
          {hits.map((hit) => (
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  field: { flex: 1 },
  clear: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.xs,
  },
  clearText: {
    color: colors.accent,
    fontSize: type.caption,
    fontWeight: '700',
  },
  error: { color: colors.danger, marginTop: space.xs, fontSize: type.caption },
  status: { color: colors.muted, marginTop: space.xs, fontSize: type.caption },
  hits: {
    marginTop: space.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
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
