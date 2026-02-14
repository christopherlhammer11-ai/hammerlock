import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { palette } from '@mobile/theme/colors';

interface ComposerProps {
  onSend: (value: string) => void;
}

const QUICK_COMMANDS = ['Summarize my day', 'Draft a note', 'Explain this'];

export function Composer({ onSend }: ComposerProps) {
  const [value, setValue] = useState('');

  const sendDisabled = value.trim().length === 0;

  const chips = useMemo(
    () =>
      QUICK_COMMANDS.map((chip) => (
        <TouchableOpacity key={chip} style={styles.chip} onPress={() => setValue((prev) => `${prev}${chip}`)}>
          <Text style={styles.chipText}>{chip}</Text>
        </TouchableOpacity>
      )),
    []
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.chipRow}>{chips}</View>
      <View style={styles.row}>
        <TouchableOpacity style={styles.attachmentButton}>
          <Text style={{ color: palette.textPrimary, fontSize: 18 }}>＋</Text>
        </TouchableOpacity>
        <TextInput
          multiline
          placeholder="Send a message or use /commands"
          placeholderTextColor={palette.textMuted}
          style={styles.input}
          value={value}
          onChangeText={setValue}
        />
        <TouchableOpacity
          style={[styles.sendButton, sendDisabled && { opacity: 0.35 }]}
          disabled={sendDisabled}
          onPress={() => {
            onSend(value.trim());
            setValue('');
          }}
        >
          <Text style={styles.sendText}>{sendDisabled ? '🎤' : '➤'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    backgroundColor: palette.background,
    borderTopWidth: 1,
    borderColor: palette.border,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  attachmentButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    color: palette.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: {
    color: '#050506',
    fontSize: 18,
    fontWeight: '700',
  },
});
