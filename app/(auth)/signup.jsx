import { useNavigation } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Inputfield from "../components/inputfield";
import Mainbutton from "../components/mainbutton";

import { signupApi } from "../../src/api/auth.api";

const Signup = () => {

  const navigation = useNavigation();

  // ================================
  // FORM STATE
  // ================================

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [number, setNumber] = useState("");
  const [userName, setUserName] = useState("");

  const [loading, setLoading] = useState(false);


  // ================================
  // REGISTER
  // ================================

  const handleSubmit = async () => {

    // -----------------------------
    // Validation
    // -----------------------------

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !userName.trim() ||
      !number.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert(
        "Missing Fields",
        "Please fill in all fields."
      );

      return;
    }


    if (password !== confirmPassword) {

      Alert.alert(
        "Password Error",
        "Passwords do not match."
      );

      return;
    }


    try {

      setLoading(true);


      // -----------------------------
      // Backend payload
      // -----------------------------

      const payload = {

        firstName:
          firstName.trim(),

        lastName:
          lastName.trim(),

        userName:
          userName.trim(),

        mobileNumber:
          number.trim(),

        mobileOtp:
          "",

        email:
          email.trim().toLowerCase(),

        password:
          password,

        role:
          "ADMIN",
      };


      console.log(
        "=========================================="
      );

      console.log(
        "🚀 ADMIN REGISTRATION"
      );

      console.log(
        "📦 PAYLOAD:"
      );

      console.log(
        JSON.stringify(
          payload,
          null,
          2
        )
      );

      console.log(
        "=========================================="
      );


      // -----------------------------
      // Call backend
      // -----------------------------

      const response =
        await signupApi(payload);


      console.log(
        "=========================================="
      );

      console.log(
        "✅ ADMIN REGISTER RESPONSE"
      );

      console.log(
        JSON.stringify(
          response.data,
          null,
          2
        )
      );

      console.log(
        "=========================================="
      );


      // -----------------------------
      // Registration successful
      // -----------------------------

      Alert.alert(
        "Registration Successful",
        response?.data?.message ||
          "Please confirm your email address.",
        [
          {
            text: "Continue",

            onPress: () => {

              navigation.navigate(
                "Otpscreen",
                {
                  email:
                    email.trim().toLowerCase(),

                  username:
                    userName.trim(),

                  firstName:
                    firstName.trim(),

                  lastName:
                    lastName.trim(),

                  mobileNumber:
                    number.trim(),

                  role:
                    "ADMIN",
                }
              );

            },
          },
        ]
      );


    } catch (error) {

      console.log(
        "=========================================="
      );

      console.log(
        "❌ ADMIN REGISTRATION FAILED"
      );

      console.log(
        "STATUS:",
        error?.response?.status
      );

      console.log(
        "BACKEND:",
        JSON.stringify(
          error?.response?.data,
          null,
          2
        )
      );

      console.log(
        "MESSAGE:",
        error?.message
      );

      console.log(
        "=========================================="
      );


      Alert.alert(
        "Signup Failed",
        error?.response?.data?.message ||
          error?.message ||
          "Registration failed."
      );

    } finally {

      setLoading(false);

    }

  };


  // ================================
  // UI
  // ================================

  return (

    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
    >

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 40,
        }}
        keyboardShouldPersistTaps="handled"
      >

        <View style={styles.container}>

          <Text style={styles.title}>
            Signup
          </Text>

          <Text style={styles.subtitle}>
            Create your admin account
          </Text>


          {/* Phone */}

          <Inputfield
            label="Phone Number"
            placeholder="Phone number"
            value={number}
            onChangeText={setNumber}
            keyboardType="phone-pad"
          />


          {/* First Name */}

          <Inputfield
            label="First Name"
            placeholder="Enter first name"
            value={firstName}
            onChangeText={setFirstName}
          />


          {/* Last Name */}

          <Inputfield
            label="Last Name"
            placeholder="Enter last name"
            value={lastName}
            onChangeText={setLastName}
          />


          {/* Username */}

          <Inputfield
            label="Username"
            placeholder="Enter username"
            value={userName}
            onChangeText={setUserName}
            autoCapitalize="none"
          />


          {/* Email */}

          <Inputfield
            label="Email"
            placeholder="Enter email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />


          {/* Password */}

          <Inputfield
            label="Password"
            placeholder="Enter password"
            value={password}
            onChangeText={setPassword}
            secure
          />


          {/* Confirm Password */}

          <Inputfield
            label="Confirm Password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secure
          />


          {/* REGISTER */}

          <Mainbutton
            content={
              loading
                ? "Creating Account..."
                : "Sign up"
            }
            onPress={handleSubmit}
            disabled={loading}
          />


          <Text style={styles.orText}>
            or
          </Text>


          {/* LOGIN */}

          <View style={styles.signupRow}>

            <Text style={styles.signupText}>
              Already have an account?
            </Text>

            <TouchableOpacity
              onPress={() =>
                navigation.navigate("login")
              }
            >

              <Text style={styles.signupLink}>
                {" "}Login
              </Text>

            </TouchableOpacity>

          </View>

        </View>

      </ScrollView>

    </KeyboardAvoidingView>
  );
};


export default Signup;


// ================================
// STYLES
// ================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    marginBottom: 10,
    marginTop: 20,
  },

  subtitle: {
    fontSize: 14,
    color: "#777",
    marginBottom: 16,
  },

  orText: {
    textAlign: "center",
    color: "#777",
    marginVertical: 16,
  },

  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
  },

  signupText: {
    color: "#777",
    fontSize: 14,
  },

  signupLink: {
    color: "#000",
    fontSize: 14,
    fontWeight: "600",
  },

});