import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const Button = ({ content, onPress }) => {
  return (
    <View>
      <TouchableOpacity onPress={onPress} style={styles.loginBtn}>
        <Text style={styles.loginText}>{content}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  loginBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  loginText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default Button;
