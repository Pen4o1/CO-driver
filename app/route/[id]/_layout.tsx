import { Stack } from 'expo-router';

import { colors } from '@/ui/theme';

export default function RouteIdLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Route' }} />
      <Stack.Screen name="recce" options={{ title: 'Recce' }} />
      <Stack.Screen name="prepare" options={{ title: 'Prepare voice' }} />
    </Stack>
  );
}
