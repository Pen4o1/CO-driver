import { StyleSheet, View } from 'react-native';

import type { LatLng } from '@/core/types';
import { colors } from '@/ui/theme';

type Props = {
  coords: LatLng[];
  width?: number;
  height?: number;
};

export function RouteSparkline({ coords, width = 120, height = 40 }: Props) {
  if (coords.length < 2) {
    return <View style={{ width, height }} />;
  }
  let minLat = coords[0].lat;
  let maxLat = coords[0].lat;
  let minLng = coords[0].lng;
  let maxLng = coords[0].lng;
  for (const p of coords) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  const pad = 4;
  const spanLat = Math.max(maxLat - minLat, 1e-6);
  const spanLng = Math.max(maxLng - minLng, 1e-6);
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const points = coords.map((p) => ({
    x: pad + ((p.lng - minLng) / spanLng) * innerW,
    y: pad + (1 - (p.lat - minLat) / spanLat) * innerH,
  }));
  const stride = Math.max(1, Math.floor(points.length / 40));

  return (
    <View style={[styles.box, { width, height }]}>
      {points.slice(1).map((p, i) => {
        if (i % stride !== 0) {
          return null;
        }
        const a = points[i];
        const dx = p.x - a.x;
        const dy = p.y - a.y;
        const len = Math.hypot(dx, dy);
        if (len < 0.5) {
          return null;
        }
        const angle = Math.atan2(dy, dx);
        return (
          <View
            key={i}
            style={[
              styles.seg,
              {
                left: a.x,
                top: a.y,
                width: len,
                transform: [{ rotate: `${angle}rad` }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden' },
  seg: {
    position: 'absolute',
    height: 2,
    backgroundColor: colors.accent,
    transformOrigin: 'left center',
  },
});
