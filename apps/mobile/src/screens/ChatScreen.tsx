import { useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";

const initialMessages = [
  { id: "1", role: "system", content: "Vault unlocked. Brave search and local credits synced." },
  { id: "2", role: "user", content: "Summarize today’s compliance headlines." },
  { id: "3", role: "ai", content: "1) EU AI Act fines guidance…\n2) FTC draft privacy rule…" }
];

export default function ChatScreen() {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");

  const styles = useMemo(() => createStyles(), []);

  const sendMessage = () => {
    if (!draft.trim()) return;
    const now = Date.now().toString();
    setMessages((prev) => [...prev, { id: now, role: "user", content: draft.trim() }]);
    setDraft("");
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>VaultAI Mobile</Text>
        <Text style={styles.subtitle}>Encrypted • Brave Search • Credits 498/500</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.aiBubble]}>
            <Text style={styles.meta}>{item.role === "user" ? "You" : "VaultAI"}</Text>
            <Text style={styles.message}>{item.content}</Text>
          </View>
        )}
      />

      <View style={styles.composer}>
        <TextInput
          placeholder="Ask anything…"
          placeholderTextColor="#7c7c7c"
          value={draft}
          onChangeText={setDraft}
          style={styles.input}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = () =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: "#050505", paddingHorizontal: 16, paddingBottom: 24 },
    header: { paddingTop: 12, paddingBottom: 8 },
    title: { color: "white", fontSize: 22, fontWeight: "600" },
    subtitle: { color: "#9ca3af", fontSize: 13, marginTop: 2 },
    listContent: { paddingVertical: 12, gap: 12 },
    bubble: { borderRadius: 16, padding: 14 },
    userBubble: { backgroundColor: "#0f172a", alignSelf: "flex-end" },
    aiBubble: { backgroundColor: "#111827", alignSelf: "flex-start" },
    meta: { color: "#9ca3af", fontSize: 11, marginBottom: 4 },
    message: { color: "#f9fafb", fontSize: 15, lineHeight: 20 },
    composer: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
    input: {
      flex: 1,
      backgroundColor: "#111827",
      color: "white",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999
    },
    sendButton: {
      backgroundColor: "#22c55e",
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 999
    },
    sendButtonText: { color: "#041007", fontWeight: "600" }
  });
