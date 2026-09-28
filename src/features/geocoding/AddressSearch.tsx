import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PHOTON_DEBOUNCE_MS } from '@/core/config';
import { fetchImpl } from '@/features/http/fetchImpl';
import { sqliteGeocodeCache } from '@/features/storage';
import { colors, space, type } from '@/ui/theme';
import { TextField } from '@/ui/TextField';

import { searchPhoton } from './photon';
import type { PhotonHit } from './photonSchema';
import { useDebouncedValue } from './useDebouncedValue';

type Props = {
  onPick: (hit: PhotonHit) => void;
  placeholder?: string;
};

export function AddressSearch({
  onPick,
  placeholder = 'Search an address',
}: Props) {
  const [query, setQuery] = useState('');
  const [pickedQuery, setPickedQuery] = useState<string | null>(null);
  const [hits, setHits] = useState<PhotonHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const debounced = useDebouncedValue(query, PHOTON_DEBOUNCE_MS);

  useEffect(() => {
    if (pickedQuery !== null && debounced === pickedQuery) {
      return;
    }
    let cancelled = false;
    (async () => {
      const result = await searchPhoton(debounced, {
        fetchImpl,
        cache: sqliteGeocodeCache(),
      });
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setHits([]);
        setError(result.error.message);
        return;
      }
      setError(null);
      setHits(result.value);
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, pickedQuery]);

  return (
    <View>
      <TextField
        accessibilityLabel="Search address"
        placeholder={placeholder}
        value={query}
        onChangeText={(text) => {
          setPickedQuery(null);
          setQuery(text);
        }}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {hits.length > 0 ? (
        <View style={styles.hits}>
          {hits.map((hit) => (
            <Pressable
              key={`${hit.lat}-${hit.lng}-${hit.label}`}
              accessibilityLabel={hit.label}
              accessibilityRole="button"
              onPress={() => {
                onPick(hit);
                setQuery(hit.label);
                setPickedQuery(hit.label);
                setHits([]);
              }}
              style={styles.hit}
            >
              <Text numberOfLines={2} style={styles.hitText}>
                {hit.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, marginTop: space.xs, fontSize: type.caption },
  hits: {
    marginTop: space.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  hit: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  hitText: { color: colors.text, fontSize: type.caption },
});
