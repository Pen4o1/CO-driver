import {
  Camera,
  Map,
  RasterDEMSource,
  type CameraRef,
  type MapRef,
  type PressEvent,
} from '@maplibre/maplibre-react-native';
import { useEffect, useMemo, useRef } from 'react';
import { type NativeSyntheticEvent, StyleSheet } from 'react-native';

import {
  DEFAULT_MAP_CENTER,
  OPENFREEMAP_STYLE_URL,
  TERRARIUM_TILE_URL,
} from '@/core/config';
import { gradeHeatSegments } from '@/core/scoring';
import type { LatLng, RouteGeometry } from '@/core/types';

import { fromLngLat, toLngLat } from './coords';
import { DraggablePin } from './DraggablePin';
import { GradeHeatLine } from './GradeHeatLine';
import { RouteLine } from './RouteLine';

type Props = {
  start: LatLng | null;
  end: LatLng | null;
  geometry: RouteGeometry | null;
  heat?: boolean;
  interactivePins?: boolean;
  onStartChange?: (next: LatLng) => void;
  onEndChange?: (next: LatLng) => void;
  onMapPress?: (point: LatLng) => void;
};

export function RouteMap({
  start,
  end,
  geometry,
  heat = false,
  interactivePins = true,
  onStartChange,
  onEndChange,
  onMapPress,
}: Props) {
  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);
  const segments = useMemo(
    () => (heat && geometry ? gradeHeatSegments(geometry) : []),
    [heat, geometry],
  );

  useEffect(() => {
    if (!geometry) {
      return;
    }
    cameraRef.current?.fitBounds(geometry.bbox, {
      padding: { top: 88, right: 40, bottom: 300, left: 40 },
      duration: 600,
      easing: 'ease',
    });
  }, [geometry]);

  const handlePress = (event: NativeSyntheticEvent<PressEvent>) => {
    if (!onMapPress) {
      return;
    }
    onMapPress(fromLngLat(event.nativeEvent.lngLat));
  };

  return (
    <Map
      ref={mapRef}
      mapStyle={OPENFREEMAP_STYLE_URL}
      style={styles.map}
      compass
      compassPosition={{ top: 48, right: 8 }}
      attributionPosition={{ bottom: 8, right: 8 }}
      onPress={handlePress}
    >
      <Camera
        ref={cameraRef}
        initialViewState={{
          center: toLngLat(start ?? DEFAULT_MAP_CENTER),
          zoom: 12,
        }}
      />
      <RasterDEMSource
        id="aws-terrarium"
        tiles={[TERRARIUM_TILE_URL]}
        tileSize={256}
        maxzoom={15}
        encoding="terrarium"
      />
      {segments.length > 0 ? (
        <GradeHeatLine segments={segments} />
      ) : geometry ? (
        <RouteLine coords={geometry.coords} />
      ) : null}
      {start ? (
        <DraggablePin
          id="start-pin"
          kind="start"
          coordinate={start}
          draggable={interactivePins}
          onChange={onStartChange ?? (() => undefined)}
        />
      ) : null}
      {end ? (
        <DraggablePin
          id="end-pin"
          kind="end"
          coordinate={end}
          draggable={interactivePins}
          onChange={onEndChange ?? (() => undefined)}
        />
      ) : null}
    </Map>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
