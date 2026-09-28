import { Stack } from 'expo-router';

export default function DriveIdLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Drive' }} />
      <Stack.Screen name="summary" options={{ title: 'Summary' }} />
    </Stack>
  );
}
