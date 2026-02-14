import { useMemo } from "react";
import { SafeAreaView, StatusBar, StyleSheet } from "react-native";
import { ExpoRoot } from "expo-router";

export default function App() {
  const styles = useMemo(() => StyleSheet.create({ container: { flex: 1, backgroundColor: "#050505" } }), []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ExpoRoot context={require.context("./src/screens", true, /[A-Z].*\.tsx$/)} />
    </SafeAreaView>
  );
}
