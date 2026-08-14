import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

const Backbutton = () => {
  const router = useRouter();

  const handleback = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/home");
    }
  };

  return (
    <TouchableOpacity onPress={handleback} style={styles.backBtn}>
      <Ionicons name="chevron-back" size={24} color="#fff" />
    </TouchableOpacity>
  );
};

export default Backbutton;

const styles = StyleSheet.create({
  backBtn: {
    backgroundColor: "#000",
    width: 35,
    height: 40,
    justifyContent: "center",
    marginBottom: 16,
    alignItems: "center",
  },
});
