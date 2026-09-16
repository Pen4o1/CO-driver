import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { initMapLibre } from '@/features/maps';
import { FirstRunDisclaimer } from '@/features/safety/FirstRunDisclaimer';
import {
  hydrateSettings,
  watchSettingsPersist,
} from '@/features/settings/persist';
import { disclaimerAccepted } from '@/features/storage';
import { configureCoDriverAudio } from '@/features/voice';
import '@/features/coach/backgroundTask';
import { colors } from '@/ui/theme';

export default function RootLayout() {
  const [booted, setBooted] = useState(false);
  const [legal, setLegal] = useState(true);

  useEffect(() => {
    initMapLibre();
    void configureCoDriverAudio({ duck: true, background: true });
    let unsub: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      await hydrateSettings();
      if (cancelled) return;
      unsub = watchSettingsPersist();
      const accepted = await disclaimerAccepted();
      if (cancelled) return;
      setLegal(accepted);
      setBooted(true);
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  if (!booted) {
    return null;
  }

  if (!legal) {
    return (
      <>
        <StatusBar style="light" />
        <FirstRunDisclaimer onAccepted={() => setLegal(true)} />
      </>
    );
  }

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
