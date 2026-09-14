import { StyleSheet, Text, View } from 'react-native';

import { colors, type } from './theme';

type Props = {
  direction?: 'left' | 'right' | 'straight';
  size?: 'lg' | 'md';
};

const GLYPH: Record<'left' | 'right' | 'straight', string> = {
  left: '←',
  right: '→',
  straight: '↑',
};

const LABEL: Record<'left' | 'right' | 'straight', string> = {
  left: 'Left',
  right: 'Right',
  straight: 'Straight',
};

export function DirectionArrow({ direction, size = 'lg' }: Props) {
  if (!direction) {
    return null;
  }
  const font = size === 'lg' ? 40 : type.body;
  return (
    <View accessibilityLabel={LABEL[direction]} style={styles.wrap}>
      <Text style={[styles.glyph, { fontSize: font }]}>{GLYPH[direction]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  glyph: { color: colors.text, fontWeight: '800' },
});
