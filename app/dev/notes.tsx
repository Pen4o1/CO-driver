import { StyleSheet, Text, View } from 'react-native';

export default function DevNotesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pace notes</Text>
      <Text>Dev note list + filter panel (Phase 3).</Text>
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
