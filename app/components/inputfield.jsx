import { Ionicons } from "@expo/vector-icons"; // if using Expo
import { useState } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const Inputfield = ({
  label,
  placeholder,
  value,
  onChangeText,
  secure = false,
  keyboardType = "default",
}) => {
  const [hidePassword, setHidePassword] = useState(secure);

  return (
    <View style={styles.inputGroup}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.inputwrapper}>
        <TextInput
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={hidePassword}
          keyboardType={keyboardType}
          style={styles.input}
          placeholderTextColor="#999"
        />
        {secure && (
          <TouchableOpacity
            onPress={() => setHidePassword(!hidePassword)}
            style={styles.icon}
          >
            <Ionicons
              name={hidePassword ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="#777"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: "#555",
    marginBottom: 6,
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#000",
    backgroundColor: "#fff",
  },
  icon: {
    position: "absolute",
    right: 18,
    // textAlign: "center",
    top: 15,
  },
});

export default Inputfield;
