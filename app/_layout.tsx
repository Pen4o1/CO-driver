import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="route" options={{ headerShown: false }} />
      <Stack.Screen name="drive" options={{ headerShown: false }} />
      <Stack.Screen name="dev" options={{ title: 'Dev' }} />
    </Stack>
  );
}
