import { useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, space, type } from './theme';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
};

export function Slider({ label, value, min, max, step = 1, onChange }: Props) {
  const [width, setWidth] = useState(0);
  const ratio = useMemo(() => {
    if (max === min) return 0;
    return (value - min) / (max - min);
  }, [value, min, max]);

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label} · {value}
      </Text>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="adjustable"
        onLayout={onLayout}
        onPress={(event) => {
          if (width <= 0) return;
          const t = Math.min(
            1,
            Math.max(0, event.nativeEvent.locationX / width),
          );
          const raw = min + t * (max - min);
          const snapped = Math.round(raw / step) * step;
          onChange(Math.min(max, Math.max(min, snapped)));
        }}
        style={styles.track}
      >
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
        <View style={[styles.thumb, { left: `${ratio * 100}%` }]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  label: { color: colors.text, fontSize: type.caption, fontWeight: '600' },
  track: {
    height: 44,
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
  },
  fill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    marginLeft: -11,
    borderRadius: 11,
    backgroundColor: colors.text,
  },
});
