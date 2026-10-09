import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/ui/navigation';

export default function RouteIdLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Route' }} />
      <Stack.Screen
        name="edit"
        options={{
          title: 'Edit route',
          presentation: 'transparentModal',
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen name="recce" options={{ title: 'Checklist' }} />
      <Stack.Screen name="prepare" options={{ title: 'Prepare voice' }} />
    </Stack>
  );
}
