import { useNavigation } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../components/button";
import Inputfield from "../components/inputfield";

const ForgotpasswordMail = () => {
  const [showpasswordfield, setShowpasswordfield] = useState(false);
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.text_heading}>
          {!showpasswordfield
            ? "Please Enter Your Registered Username and Email"
            : "Please Enter Your New Password"}
        </Text>

        <View style={styles.inputone}>
          {!showpasswordfield ? (
            <>
              <Inputfield placeholder="UserName" />
              <Inputfield placeholder="Email" />
              <Button
                onPress={() => setShowpasswordfield(true)}
                content="Enter"
              />
            </>
          ) : (
            <>
              <Inputfield placeholder="New Password" />
              <Inputfield placeholder="Confirm Password" />
              <Button
                onPress={() => navigation.navigate("login")}
                content="Reset Password"
              />
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },

  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  text_heading: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
    color: "#000",
  },

  inputone: {
    width: "100%",
    gap: 16, // spacing between inputs (RN 0.71+)
  },
});

export default ForgotpasswordMail;
