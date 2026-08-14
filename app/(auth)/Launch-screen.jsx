import { useRouter } from "expo-router";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function LaunchScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.kicker}>RIDER BOOKING</Text>
        <Text style={styles.title}>Admin Console</Text>
        <Text style={styles.subtitle}>
          Create bike deliveries, watch rider status, and monitor live trips from the backend.
        </Text>

        <TouchableOpacity style={styles.button} onPress={() => router.replace("/(auth)/login")}>
          <Text style={styles.buttonText}>Continue to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  content: { flex: 1, justifyContent: "center", padding: 28 },
  kicker: { fontSize: 11, fontWeight: "900", letterSpacing: 2, color: "#5C9200" },
  title: { fontSize: 42, fontWeight: "900", color: "#111", marginTop: 10 },
  subtitle: { color: "#666", fontSize: 15, lineHeight: 23, marginTop: 12 },
  button: { height: 56, borderRadius: 17, backgroundColor: "#111", alignItems: "center", justifyContent: "center", marginTop: 30 },
  buttonText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});
