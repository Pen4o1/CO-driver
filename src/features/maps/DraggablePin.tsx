import {
  ViewAnnotation,
  type ViewAnnotationEvent,
} from '@maplibre/maplibre-react-native';
import { type NativeSyntheticEvent, StyleSheet, View } from 'react-native';

import type { LatLng } from '@/core/types';
import { colors } from '@/ui/theme';

import { fromLngLat, toLngLat } from './coords';

type PinKind = 'start' | 'end';

type Props = {
  id: string;
  kind: PinKind;
  coordinate: LatLng;
  draggable?: boolean;
  onChange: (next: LatLng) => void;
};

function coordinateFromEvent(
  event: NativeSyntheticEvent<ViewAnnotationEvent>,
): LatLng | null {
  const lngLat = event.nativeEvent.lngLat;
  if (!Array.isArray(lngLat) || lngLat.length < 2) {
    return null;
  }
  return fromLngLat([lngLat[0], lngLat[1]]);
}

export function DraggablePin({
  id,
  kind,
  coordinate,
  draggable = true,
  onChange,
}: Props) {
  const color = kind === 'start' ? colors.pinStart : colors.pinEnd;
  return (
    <ViewAnnotation
      id={id}
      lngLat={toLngLat(coordinate)}
      draggable={draggable}
      anchor="bottom"
      onDragEnd={(event) => {
        const next = coordinateFromEvent(event);
        if (next) {
          onChange(next);
        }
      }}
    >
      <View
        accessibilityLabel={kind === 'start' ? 'Start pin' : 'End pin'}
        style={[styles.pin, { backgroundColor: color }]}
      />
    </ViewAnnotation>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#fff',
    marginBottom: -4,
  },
});
