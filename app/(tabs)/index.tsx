import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/ui/Button';
import { colors, space, type } from '@/ui/theme';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Apex</Text>
      <Text style={styles.body}>
        Drop two pins, draw a route, then later hear the road.
      </Text>
      <Link href="/route/new" asChild>
        <Button label="New route" />
      </Link>
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
});
