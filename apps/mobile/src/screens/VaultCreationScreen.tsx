import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { palette } from '@mobile/theme/colors';

const VaultCreationScreen = ({ navigation }) => {
  const [vaultName, setVaultName] = useState('');
  const [error, setError] = useState('');

  const handleCreateVault = () => {
    if (!vaultName) {
      setError('Vault name is required.');
      return;
    }
    // Save vault logic here
    navigation.navigate('PasswordSetup');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Your Vault</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter vault name"
        value={vaultName}
        onChangeText={setVaultName}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Create Vault" onPress={handleCreateVault} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: palette.background,
  },
  title: {
    fontSize: 24,
    color: palette.textPrimary,
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    color: palette.textPrimary,
  },
  error: {
    color: palette.danger,
    marginBottom: 10,
  },
});

export default VaultCreationScreen;