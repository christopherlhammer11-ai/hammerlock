import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert } from 'react-native';
import { palette } from '@mobile/theme/colors';
import { useVaultSession } from '@mobile/providers/VaultSessionProvider';

export default function SettingsScreen() {
  const { apiKey: savedApiKey, model: savedModel, setApiKey: saveApiKey, setModel: saveModel } = useVaultSession();
  const [apiKey, setApiKey] = useState(savedApiKey || '');
  const [model, setModel] = useState(savedModel || 'llama3.1');

  const handleSave = () => {
    saveApiKey(apiKey);
    saveModel(model);
    Alert.alert('Settings Saved', 'Your API key and model preferences have been saved.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.label}>AI Provider</Text>
      <Text style={styles.hint}>
        Use Ollama for free local AI, or add an API key for cloud models.
      </Text>

      <Text style={styles.label}>Model</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. llama3.1, gpt-4o, claude-3.5-sonnet"
        placeholderTextColor={palette.textMuted}
        value={model}
        onChangeText={setModel}
      />

      <Text style={styles.label}>API Key (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="sk-... or leave blank for Ollama"
        placeholderTextColor={palette.textMuted}
        value={apiKey}
        onChangeText={setApiKey}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.hint}>
        Your API key is stored locally on this device and never sent to HammerLock servers.
      </Text>

      <View style={styles.buttonWrap}>
        <Button title="Save Settings" onPress={handleSave} color={palette.primary} />
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Supported Providers</Text>
        <Text style={styles.infoText}>
          OpenAI · Anthropic · Google Gemini · Groq · Mistral · DeepSeek · Ollama (local)
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>About HammerLock AI</Text>
        <Text style={styles.infoText}>Version 0.1.0 · Built on OpenClaw</Text>
        <Text style={styles.infoText}>info@hammerlockai.com</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.textPrimary,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.textSecondary,
    marginBottom: 6,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: {
    fontSize: 13,
    color: palette.textMuted,
    marginBottom: 8,
    lineHeight: 18,
  },
  input: {
    height: 44,
    borderColor: palette.border,
    borderWidth: 1,
    marginBottom: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: palette.surface,
    color: palette.textPrimary,
    fontSize: 15,
  },
  buttonWrap: {
    marginTop: 24,
    marginBottom: 32,
  },
  infoCard: {
    padding: 16,
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.textPrimary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: palette.textMuted,
    lineHeight: 18,
  },
});
