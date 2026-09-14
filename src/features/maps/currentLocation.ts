import * as Location from 'expo-location';

import { appError } from '@/core/errors';
import { err, ok, type Result } from '@/core/result';
import type { AppError } from '@/core/errors';
import type { LatLng } from '@/core/types';

export async function getCurrentLatLng(): Promise<Result<LatLng, AppError>> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      return err(
        appError('forbidden', 'Location permission is required for this pin.'),
      );
    }
    const fix = await Location.getCurrentPositionAsync({});
    return ok({
      lat: fix.coords.latitude,
      lng: fix.coords.longitude,
    });
  } catch (caught) {
    return err(
      appError('unknown', 'Could not read current location.', {
        cause: caught,
      }),
    );
  }
}
