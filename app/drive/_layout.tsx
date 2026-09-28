import { Stack } from 'expo-router';

export default function DriveLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" options={{ title: 'Drive' }} />
    </Stack>
  );
}
