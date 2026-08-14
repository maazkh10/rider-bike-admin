import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const Mainbutton = ({ content, onPress }) => {
  return (
    <View style={styles.cntainer}>
      <TouchableOpacity onPress={onPress} style={styles.button}>
        <Text style={styles.buttonText}>{content}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cntainer: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  button: {
    backgroundColor: "#BBFF5B",
    width: "80%",
    paddingVertical: 20,
    borderRadius: 25,
    alignItems: "center",
  },
  buttonText: {
    color: "#000",
    fontSize: 19,
    fontWeight: "600",
  },
});

export default Mainbutton;
