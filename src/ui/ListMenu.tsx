import { type ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space, type } from './theme';
import { TextField } from './TextField';

export type ListMenuRow = {
  id: string;
  label: string;
  detail?: string;
};

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  query?: string;
  onQueryChange?: (value: string) => void;
  searchPlaceholder?: string;
  rows?: ListMenuRow[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  emptyLabel?: string;
  toolbar?: ReactNode;
  children?: ReactNode;
};

export function ListMenu({
  visible,
  title,
  onClose,
  query = '',
  onQueryChange,
  searchPlaceholder = 'Search',
  rows,
  selectedId,
  onSelect,
  emptyLabel = 'Nothing matches.',
  toolbar,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'ios' ? space.md : insets.top + space.sm;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.screen,
          {
            paddingTop: topPad,
            paddingBottom: Math.max(insets.bottom, space.md),
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.close}
          >
            <Text style={styles.closeText}>Done</Text>
          </Pressable>
        </View>
        {onQueryChange ? (
          <TextField
            value={query}
            onChangeText={onQueryChange}
            placeholder={searchPlaceholder}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        ) : null}
        {toolbar}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
        >
          {rows ? (
            rows.length === 0 ? (
              <Text style={styles.empty}>{emptyLabel}</Text>
            ) : (
              rows.map((row) => {
                const selected = selectedId === row.id;
                return (
                  <Pressable
                    key={row.id}
                    accessibilityLabel={
                      row.detail ? `${row.label}, ${row.detail}` : row.label
                    }
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => onSelect?.(row.id)}
                    style={({ pressed }) => [
                      styles.row,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.copy}>
                      <Text style={styles.label}>{row.label}</Text>
                      {row.detail ? (
                        <Text style={styles.detail}>{row.detail}</Text>
                      ) : null}
                    </View>
                    <Text style={[styles.mark, selected && styles.markOn]}>
                      {selected ? '✓' : ''}
                    </Text>
                  </Pressable>
                );
              })
            )
          ) : (
            children
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.lg,
    gap: space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: type.title,
    fontWeight: '700',
  },
  close: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  closeText: { color: colors.accent, fontSize: type.body, fontWeight: '700' },
  list: { gap: space.sm, paddingBottom: space.lg },
  empty: { color: colors.muted, fontSize: type.body },
  row: {
    minHeight: 48,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.75 },
  copy: { flex: 1, gap: 2 },
  label: { color: colors.text, fontSize: type.body, fontWeight: '600' },
  detail: { color: colors.muted, fontSize: type.caption },
  mark: {
    width: 18,
    textAlign: 'center',
    color: 'transparent',
    fontSize: type.body,
    fontWeight: '700',
  },
  markOn: { color: colors.accent },
});
