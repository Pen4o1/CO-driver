import { StyleSheet, Text, View } from 'react-native';

export default function SimDriveScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sim Drive</Text>
      <Text>Synthetic GPS through the co-driver engine (Phase 5).</Text>
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
