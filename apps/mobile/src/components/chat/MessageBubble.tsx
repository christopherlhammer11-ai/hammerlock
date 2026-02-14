import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { ChatMessage } from '@mobile/types/chat';
import { palette } from '@mobile/theme/colors';
import { formatClockLabel } from '@mobile/utils/time';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.author === 'user';
  return (
    <View style={[styles.wrapper, isUser ? styles.userAlign : styles.vaultAlign]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.vaultBubble,
          message.status === 'error' && styles.errorBubble,
        ]}
      >
        <Text style={[styles.body, isUser ? styles.userText : styles.vaultText]}>{message.body}</Text>
        <Text style={[styles.meta, isUser ? styles.metaUser : styles.metaVault]}>
          {message.status === 'streaming' ? '…' : formatClockLabel(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginVertical: 6,
  },
  userAlign: {
    alignItems: 'flex-end',
  },
  vaultAlign: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '88%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: palette.primary,
    borderBottomRightRadius: 4,
  },
  vaultBubble: {
    backgroundColor: palette.surfaceAlt,
    borderBottomLeftRadius: 4,
  },
  errorBubble: {
    borderWidth: 1,
    borderColor: palette.danger,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#050506',
  },
  vaultText: {
    color: palette.textPrimary,
  },
  meta: {
    fontSize: 12,
    marginTop: 6,
  },
  metaUser: {
    color: '#05050699',
  },
  metaVault: {
    color: palette.textMuted,
  },
});
