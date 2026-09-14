import { StyleSheet, Text, View } from 'react-native';

export default function NewRouteScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>New route</Text>
      <Text>Pins → style → candidates (Phase 1+).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
});
