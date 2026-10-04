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
import type { SpeedSegment } from '@/core/coach';
import { boundingBox } from '@/core/geo';
import { gradeHeatSegments } from '@/core/scoring';
import type { LatLng, RouteGeometry } from '@/core/types';

import { fromLngLat, toLngLat } from './coords';
import { DraggablePin } from './DraggablePin';
import { GradeHeatLine } from './GradeHeatLine';
import { RouteLine } from './RouteLine';
import { SpeedHeatLine, SpeedMarkers, type SpeedMapMarker } from './SpeedTrace';

export type SpeedTraceOverlay = {
  segments: SpeedSegment[];
  markers: SpeedMapMarker[];
};

type Props = {
  start: LatLng | null;
  end: LatLng | null;
  geometry: RouteGeometry | null;
  heat?: boolean;
  /** Driven GPS trace, coloured by speed, for a completed drive. */
  speedTrace?: SpeedTraceOverlay | null;
  interactivePins?: boolean;
  /** Height of a bottom overlay. Keeps the route and map credits above it. */
  bottomInset?: number;
  onStartChange?: (next: LatLng) => void;
  onEndChange?: (next: LatLng) => void;
  onMapPress?: (point: LatLng) => void;
};

export function RouteMap({
  start,
  end,
  geometry,
  heat = false,
  speedTrace = null,
  interactivePins = true,
  bottomInset,
  onStartChange,
  onEndChange,
  onMapPress,
}: Props) {
  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);
  const showSpeed = (speedTrace?.segments.length ?? 0) > 0;
  const segments = useMemo(
    () => (heat && !showSpeed && geometry ? gradeHeatSegments(geometry) : []),
    [heat, showSpeed, geometry],
  );

  useEffect(() => {
    const traceCoords =
      speedTrace?.segments.flatMap((segment) => segment.coords) ?? [];
    const bbox =
      traceCoords.length >= 2 ? boundingBox(traceCoords) : geometry?.bbox;
    if (!bbox) return;
    const bottom = bottomInset == null ? 300 : bottomInset + 16;
    const top = showSpeed ? 72 : 88;
    cameraRef.current?.fitBounds(bbox, {
      padding: { top, right: 40, bottom, left: 40 },
      duration: 600,
      easing: 'ease',
    });
  }, [geometry, speedTrace, showSpeed, bottomInset]);

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
      attributionPosition={
        bottomInset == null
          ? { bottom: 8, right: 8 }
          : { bottom: bottomInset + 8, right: 8 }
      }
      logoPosition={
        bottomInset == null ? undefined : { bottom: bottomInset + 8, left: 8 }
      }
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
      {showSpeed && speedTrace ? (
        <SpeedHeatLine segments={speedTrace.segments} />
      ) : segments.length > 0 ? (
        <GradeHeatLine segments={segments} />
      ) : geometry ? (
        <RouteLine coords={geometry.coords} />
      ) : null}
      {speedTrace && speedTrace.markers.length > 0 ? (
        <SpeedMarkers markers={speedTrace.markers} />
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
