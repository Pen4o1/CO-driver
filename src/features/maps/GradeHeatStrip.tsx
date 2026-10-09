import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { gradeHeatSegments } from '@/core/scoring';
import type { RouteGeometry } from '@/core/types';
import { gradeColor } from '@/ui/theme';

type Props = {
  geometry: RouteGeometry;
};

export function GradeHeatStrip({ geometry }: Props) {
  const segments = useMemo(() => gradeHeatSegments(geometry), [geometry]);
  if (segments.length === 0) return null;
  return (
    <View
      accessibilityLabel="Grade along the road. Redder means tighter."
      style={styles.track}
    >
      {segments.map((segment, index) => (
        <View
          key={index}
          style={{
            flexGrow: Math.max(1, segment.coords.length - 1),
            flexBasis: 0,
            backgroundColor: gradeColor[segment.grade],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
