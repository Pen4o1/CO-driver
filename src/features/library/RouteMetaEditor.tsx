import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { canMutateLibrary } from '@/core/safety';
import { useSession } from '@/state/session';
import { Button } from '@/ui/Button';
import { TextField } from '@/ui/TextField';
import { colors, space, type } from '@/ui/theme';

type Props = {
  name: string;
  note: string;
  onRename: (name: string) => void;
  onNote: (note: string) => void;
  onDuplicate: () => void;
  onReverse: () => void;
  onChangeRoad: () => void;
  onDelete: () => void;
};

export function RouteMetaEditor({
  name,
  note,
  onRename,
  onNote,
  onDuplicate,
  onReverse,
  onChangeRoad,
  onDelete,
}: Props) {
  const locked = !canMutateLibrary(useSession((s) => s.status));
  const [draftName, setDraftName] = useState(name);
  const [draftNote, setDraftNote] = useState(note);

  return (
    <View style={styles.block}>
      <Text style={styles.label}>Name</Text>
      <TextField
        value={draftName}
        editable={!locked}
        accessibilityLabel="Route name"
        onChangeText={setDraftName}
      />
      <Button
        label="Save name"
        variant="secondary"
        disabled={locked}
        onPress={() => onRename(draftName.trim() || name)}
      />
      <Text style={styles.label}>Note</Text>
      <TextField
        value={draftNote}
        editable={!locked}
        accessibilityLabel="Route note"
        placeholder="Parking, fuel, roadworks…"
        onChangeText={setDraftNote}
        multiline
      />
      <Button
        label="Save note"
        variant="secondary"
        disabled={locked}
        onPress={() => onNote(draftNote)}
      />
      <Button
        label="Edit the road"
        variant="secondary"
        disabled={locked}
        onPress={onChangeRoad}
      />
      <Button
        label="Duplicate"
        variant="secondary"
        disabled={locked}
        onPress={onDuplicate}
      />
      <Button
        label="Reverse"
        variant="secondary"
        disabled={locked}
        accessibilityLabel="Reverse the road"
        onPress={onReverse}
      />
      <Button
        label="Delete route"
        variant="ghost"
        disabled={locked}
        onPress={onDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.sm },
  label: { color: colors.muted, fontSize: type.caption, fontWeight: '700' },
});
