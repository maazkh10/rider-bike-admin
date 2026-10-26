import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

export default function Backbutton({ fallback = "/(tabs)/home" }) {
  const router = useRouter();
  const handleBack = () => router.canGoBack() ? router.back() : router.replace(fallback);
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" activeOpacity={0.8} onPress={handleBack} style={styles.backBtn}>
      <Ionicons name="chevron-back" size={24} color="#111" />
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  backBtn: { backgroundColor: "#BBFF5B", width: 42, height: 42, borderRadius: 14, justifyContent: "center", marginBottom: 14, alignItems: "center" },
});
