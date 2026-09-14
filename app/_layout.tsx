import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { initMapLibre } from '@/features/maps';
import { configureCoDriverAudio } from '@/features/voice';
import { colors } from '@/ui/theme';

export default function RootLayout() {
  useEffect(() => {
    initMapLibre();
    void configureCoDriverAudio({ duck: true, background: true });
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="route" options={{ headerShown: false }} />
        <Stack.Screen name="drive" options={{ headerShown: false }} />
        <Stack.Screen name="dev" options={{ title: 'Dev' }} />
      </Stack>
    </>
  );
}
