import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useNavigation,
  useRouter,
} from "expo-router";
import { useState } from "react";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { loginApi } from "../../src/api/auth.api";
import api from "../../src/api/client";

import { setAuthToken } from "../../src/services/authToken";

import Mainbutton from "../components/mainbutton";

const Login = () => {
  const navigation =
    useNavigation();

  const router =
    useRouter();

  const [userName, setUserName] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  // ==========================================
  // LOGIN
  // ==========================================

  const handleLogin = async () => {
    // ==========================================
    // VALIDATION
    // ==========================================

    if (!userName.trim()) {
      Alert.alert(
        "Error",
        "Please enter your username."
      );

      return;
    }

    if (!password.trim()) {
      Alert.alert(
        "Error",
        "Please enter your password."
      );

      return;
    }

    try {
      setLoading(true);

      // ==========================================
      // CLEAR OLD AUTH DATA
      // ==========================================

      console.log(
        "🧹 CLEARING OLD AUTH DATA..."
      );

      await AsyncStorage.removeItem(
        "token"
      );

      await AsyncStorage.removeItem(
        "userId"
      );

      // ==========================================
      // LOGIN PAYLOAD
      // ==========================================

      const payload = {
        username:
          userName.trim(),

        password:
          password,
      };

      console.log("==================================");
      console.log(
        "🔐 ADMIN LOGIN REQUEST"
      );
      console.log(
        "PAYLOAD:",
        JSON.stringify(
          {
            username:
              payload.username,

            password:
              "******",
          },
          null,
          2
        )
      );
      console.log("==================================");

      // ==========================================
      // CALL LOGIN
      // ==========================================

      const response =
        await loginApi(payload);

      const data =
        response?.data;

      console.log("==================================");
      console.log(
        "✅ LOGIN RESPONSE"
      );
      console.log("==================================");

      // ==========================================
      // FIND JWT
      // ==========================================

      const token =
        data?.token ||
        data?.accessToken ||
        data?.jwt;

      if (!token) {
        console.log(
          "❌ JWT NOT FOUND"
        );

        Alert.alert(
          "Login Failed",
          "The server did not return a login token."
        );

        return;
      }

      console.log(
        "✅ JWT RECEIVED"
      );

      // ==========================================
      // SAVE JWT
      // ==========================================

      await setAuthToken(token);


      console.log(
        "✅ TOKEN SAVED"
      );

      // ==========================================
      // GET REAL ADMIN PROFILE
      // ==========================================

      console.log("==================================");
      console.log(
        "👤 GETTING ADMIN PROFILE"
      );
      console.log("==================================");

      let profile = null;

      try {
        const profileResponse =
          await api.get(
            "/api/profile/me",
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        profile =
          profileResponse?.data;

        console.log(
          "🔥 ADMIN PROFILE:"
        );

        console.log(
          JSON.stringify(
            profile,
            null,
            2
          )
        );
      } catch (profileError) {
        console.log("==================================");
        console.log(
          "❌ PROFILE FETCH FAILED"
        );

        console.log(
          "STATUS:",
          profileError?.response
            ?.status
        );

        console.log(
          "DATA:",
          profileError?.response
            ?.data
        );

        console.log(
          "MESSAGE:",
          profileError?.message
        );

        console.log("==================================");

        // Login succeeded, but profile
        // could not be fetched.
        // We don't pretend that it succeeded.

        Alert.alert(
          "Login Problem",
          "Login succeeded, but your admin profile could not be loaded. Please try again."
        );

        return;
      }

      // ==========================================
      // VERIFY ADMIN ROLE
      // ==========================================

      if (
        profile?.role &&
        profile.role !== "ADMIN"
      ) {
        console.log(
          "❌ USER IS NOT ADMIN:",
          profile.role
        );

        await AsyncStorage.removeItem(
          "token"
        );

        await AsyncStorage.removeItem(
          "userId"
        );

        Alert.alert(
          "Access Denied",
          "This account does not have admin access."
        );

        return;
      }

      // ==========================================
      // SAVE REAL DATABASE USER ID
      // ==========================================

      if (
        profile?.userId !==
        undefined &&
        profile?.userId !== null
      ) {
        await AsyncStorage.setItem(
          "userId",
          String(
            profile.userId
          )
        );

        console.log(
          "✅ REAL ADMIN USER ID SAVED:",
          profile.userId
        );
      }

      // ==========================================
      // SAVE USERNAME
      // ==========================================

      await AsyncStorage.setItem(
        "username",
        String(
          profile?.userName ||
            userName.trim()
        )
      );

      // ==========================================
      // SAVE ROLE
      // ==========================================

      if (profile?.role) {
        await AsyncStorage.setItem(
          "role",
          String(
            profile.role
          )
        );
      }

      // ==========================================
      // SUCCESS
      // ==========================================

      console.log("==================================");
      console.log(
        "🎉 ADMIN LOGIN COMPLETED"
      );
      console.log(
        "USER ID:",
        profile?.userId
      );
      console.log(
        "USERNAME:",
        profile?.userName
      );
      console.log(
        "ROLE:",
        profile?.role
      );
      console.log("==================================");

      Alert.alert(
        "Login Successful",
        "Welcome back!",
        [
          {
            text: "Continue",

            onPress: () => {
              router.replace(
                "/(tabs)/home"
              );
            },
          },
        ]
      );

    } catch (error) {
      console.log("==================================");
      console.log(
        "❌ ADMIN LOGIN ERROR"
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

      console.log("==================================");

      let message =
        "Unable to login.";

      if (
        error?.response?.status ===
        403
      ) {
        message =
          "The server rejected the login request (403 Forbidden). Please verify the login endpoint and admin credentials.";
      } else if (
        error?.response?.status ===
        401
      ) {
        message =
          "Invalid username or password.";
      } else if (
        error?.response?.data?.message
      ) {
        message =
          error.response.data.message;
      } else if (
        error?.message
      ) {
        message =
          error.message;
      }

      Alert.alert(
        "Login Failed",
        message
      );

    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <SafeAreaView
      style={styles.safe}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
      >
        <View>

          <Text
            style={styles.title}
          >
            Welcome Back
          </Text>

          <Text
            style={styles.subtitle}
          >
            Login to your admin account
          </Text>

          {/* USERNAME */}

          <Text
            style={styles.label}
          >
            USERNAME
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter username"
            placeholderTextColor="#999"
            value={userName}
            onChangeText={
              setUserName
            }
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          {/* PASSWORD */}

          <Text
            style={styles.label}
          >
            PASSWORD
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={
              setPassword
            }
            secureTextEntry
            editable={!loading}
          />

          {/* FORGOT PASSWORD */}

          <TouchableOpacity
            style={styles.forgot}
            disabled={loading}
            onPress={() =>
              router.push("/(auth)/ForgotpasswordMail")
            }
          >
            <Text
              style={styles.forgotText}
            >
              Forgot Password?
            </Text>
          </TouchableOpacity>

          {/* LOGIN */}

          <Mainbutton
            content={
              loading
                ? "Signing in..."
                : "Login"
            }
            onPress={
              handleLogin
            }
            disabled={
              loading
            }
          />

          {loading && (
            <ActivityIndicator
              style={{
                marginTop: 15,
              }}
            />
          )}

          {/* SIGN UP */}

          <View
            style={
              styles.signupRow
            }
          >
            <Text
              style={
                styles.signupText
              }
            >
              Don't have an account?
            </Text>

            <TouchableOpacity
              disabled={loading}
              onPress={() =>
                navigation.navigate(
                  "signup"
                )
              }
            >
              <Text
                style={
                  styles.signupLink
                }
              >
                {" "}
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Login;

// ==========================================
// STYLES
// ==========================================

const styles =
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: "#fff",
    },

    container: {
      flex: 1,
      padding: 25,
      justifyContent:
        "center",
    },

    title: {
      fontSize: 30,
      fontWeight: "800",
      color: "#111",
      marginBottom: 8,
    },

    subtitle: {
      fontSize: 15,
      color: "#777",
      marginBottom: 35,
    },

    label: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1,
      marginBottom: 8,
      color: "#333",
    },

    input: {
      height: 52,
      borderWidth: 1,
      borderColor:
        "#E5E5EA",
      borderRadius: 10,
      paddingHorizontal: 16,
      fontSize: 15,
      backgroundColor:
        "#FAFAFA",
      marginBottom: 22,
    },

    forgot: {
      alignSelf:
        "flex-end",
      marginBottom: 25,
    },

    forgotText: {
      color: "#000",
      fontWeight: "600",
    },

    signupRow: {
      flexDirection:
        "row",
      justifyContent:
        "center",
      marginTop: 25,
    },

    signupText: {
      color: "#777",
    },

    signupLink: {
      color: "#000",
      fontWeight: "700",
    },
  });
