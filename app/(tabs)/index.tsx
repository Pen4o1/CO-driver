import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { listRoutes } from '@/features/storage';
import { Button } from '@/ui/Button';
import { colors, space, type } from '@/ui/theme';

export default function HomeScreen() {
  const router = useRouter();
  const [routes, setRoutes] = useState<
    { id: string; name: string; lengthM: number }[]
  >([]);

  useFocusEffect(
    useCallback(() => {
      listRoutes()
        .then(setRoutes)
        .catch(() => setRoutes([]));
    }, []),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Apex</Text>
      <Text style={styles.body}>
        Pick a style, generate candidates, save the road you want.
      </Text>
      <Button
        label="New route"
        style={styles.cta}
        onPress={() => router.push('/route/new')}
      />
      {routes.map((route) => (
        <Button
          key={route.id}
          variant="secondary"
          style={styles.cta}
          label={`${route.name} · ${(route.lengthM / 1000).toFixed(1)} km`}
          onPress={() => router.push(`/route/${route.id}`)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
    gap: space.md,
  },
  title: { fontSize: type.title, fontWeight: '700', color: colors.text },
  body: { color: colors.muted, textAlign: 'center' },
  cta: { alignSelf: 'stretch' },
});
