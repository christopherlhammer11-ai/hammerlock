import React from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';
import { palette } from '@mobile/theme/colors';

const sampleConversations = [
  {
    persona: 'Product Strategist',
    messages: [
      { role: 'user', text: 'What are the latest trends in fintech?' },
      { role: 'bot', text: 'The latest trends include personalized banking, AI-driven insights, and enhanced security features.' },
    ],
  },
  {
    persona: 'Marketing Guru',
    messages: [
      { role: 'user', text: 'How can I improve my brand visibility?' },
      { role: 'bot', text: 'Focus on social media engagement, influencer partnerships, and content marketing strategies.' },
    ],
  },
];

const DemoModeScreen = ({ navigation }) => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Demo Mode</Text>
      {sampleConversations.map((conversation, index) => (
        <View key={index} style={styles.conversationContainer}>
          <Text style={styles.persona}>{conversation.persona}</Text>
          {conversation.messages.map((msg, msgIndex) => (
            <Text key={msgIndex} style={msg.role === 'user' ? styles.userMessage : styles.botMessage}>
              {msg.text}
            </Text>
          ))}
        </View>
      ))}
      <Button title="Back to Home" onPress={() => navigation.navigate('Unlock')} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: palette.background,
  },
  title: {
    fontSize: 24,
    color: palette.textPrimary,
    marginBottom: 20,
  },
  conversationContainer: {
    marginBottom: 20,
    padding: 10,
    borderRadius: 8,
    backgroundColor: palette.surface,
  },
  persona: {
    fontSize: 20,
    fontWeight: 'bold',
    color: palette.textPrimary,
    marginBottom: 5,
  },
  userMessage: {
    color: palette.primary,
    marginBottom: 5,
  },
  botMessage: {
    color: palette.textSecondary,
    marginBottom: 5,
  },
});

export default DemoModeScreen;