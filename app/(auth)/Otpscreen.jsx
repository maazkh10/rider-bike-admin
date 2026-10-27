import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthToken } from "../../src/services/authToken";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { confirmTokenApi } from "../../src/api/auth.api";
import Mainbutton from "../components/mainbutton";

const Otpscreen = () => {

  // ==========================================
  // OTP STATE
  // ==========================================

  const [otp, setOtp] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

  const [loading, setLoading] =
    useState(false);


  // ==========================================
  // GET DATA FROM SIGNUP SCREEN
  // ==========================================

  const params = useLocalSearchParams();

  const email =
    params?.email?.toString() || "";

  const username =
    params?.username?.toString() || "";


  // ==========================================
  // NAVIGATION
  // ==========================================

  const router = useRouter();


  // ==========================================
  // OTP INPUT REFERENCES
  // ==========================================

  const inputRef = useRef([]);


  // ==========================================
  // HANDLE OTP CHANGE
  // ==========================================

  const handleChange = (
    text,
    index
  ) => {

    // Only allow numbers

    const cleanText =
      text.replace(/[^0-9]/g, "");

    const newOtp = [...otp];

    newOtp[index] =
      cleanText.slice(-1);

    setOtp(newOtp);


    // Move to next input

    if (
      cleanText &&
      index < 5
    ) {

      inputRef.current[
        index + 1
      ]?.focus();

    }


    // Move back when deleting

    if (
      !cleanText &&
      index > 0
    ) {

      inputRef.current[
        index - 1
      ]?.focus();

    }

  };


  // ==========================================
  // VERIFY OTP
  // ==========================================

  const handleSubmit = async () => {

    const otpCode =
      otp.join("");


    // ----------------------------------------
    // Validate OTP
    // ----------------------------------------

    if (otpCode.length !== 6) {

      Alert.alert(
        "Invalid OTP",
        "Please enter a valid 6-digit OTP."
      );

      return;

    }


    // ----------------------------------------
    // Validate email
    // ----------------------------------------

    if (!email) {

      Alert.alert(
        "Email Missing",
        "We could not find your registration email. Please register again."
      );

      console.log(
        "❌ OTP ERROR: Email missing from route params"
      );

      return;

    }


    try {

      setLoading(true);


      console.log(
        "=========================================="
      );

      console.log(
        "🚀 ADMIN EMAIL VERIFICATION START"
      );

      console.log(
        "📩 EMAIL:",
        email
      );


      console.log(
        "👤 USERNAME:",
        username
      );

      console.log(
        "=========================================="
      );


      // ----------------------------------------
      // Call backend
      // ----------------------------------------

      const response =
        await confirmTokenApi(
          email,
          otpCode
        );


      console.log(
        "=========================================="
      );

      console.log(
        "✅ OTP VERIFICATION RESPONSE"
      );


      console.log(
        "=========================================="
      );


      const result =
        response?.data;


      // ----------------------------------------
      // Get JWT
      // ----------------------------------------

      const jwtToken =
        result?.token;


      const userId =
        result?.userId;


      // ----------------------------------------
      // Save authentication
      // ----------------------------------------

      if (jwtToken) {
        await setAuthToken(jwtToken);
        console.log("✅ JWT TOKEN SAVED");
      } else {

        console.log(
          "⚠️ Backend did not return token"
        );

      }


      // ----------------------------------------
      // Save user ID
      // ----------------------------------------

      if (userId) {

        await AsyncStorage.setItem(
          "userId",
          String(userId)
        );

        console.log(
          "✅ USER ID SAVED:",
          userId
        );

      }


      // ----------------------------------------
      // Save username
      // ----------------------------------------

      if (username) {

        await AsyncStorage.setItem(
          "username",
          username
        );

      }


      // ----------------------------------------
      // Verify storage
      // ----------------------------------------

      const savedToken =
        await AsyncStorage.getItem(
          "token"
        );

      const savedUserId =
        await AsyncStorage.getItem(
          "userId"
        );


      console.log(
        "=========================================="
      );

      console.log(
        "💾 AUTH STORAGE"
      );

      console.log(
        "TOKEN:",
        savedToken
          ? savedToken.substring(0, 25) + "..."
          : "NOT FOUND"
      );

      console.log(
        "USER ID:",
        savedUserId
      );

      console.log(
        "=========================================="
      );


      // ----------------------------------------
      // Success
      // ----------------------------------------

      Alert.alert(
        "Success",
        "Your admin account has been verified successfully!",
        [
          {
            text: "Continue",

            onPress: () => {

              router.replace("/(tabs)/home");

            },
          },
        ]
      );

    } catch (error) {

      console.log(
        "=========================================="
      );

      console.log(
        "❌ ADMIN OTP VERIFICATION FAILED"
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
        "Verification Failed",
        error?.response?.data?.message ||
          "Invalid or expired OTP."
      );

    } finally {

      setLoading(false);

    }

  };


  // ==========================================
  // UI
  // ==========================================

  return (

    <View style={styles.container}>

      <View style={styles.card}>

        {/* Title */}

        <Text style={styles.title}>
          Verify OTP
        </Text>


        {/* Subtitle */}

        <Text style={styles.subtitle}>

          Enter the 6 digit OTP sent to your
          email

        </Text>


        {/* Show email */}

        {!!email && (

          <Text style={styles.emailText}>
            {email}
          </Text>

        )}


        {/* OTP Inputs */}

        <View style={styles.otpContainer}>

          {otp.map(
            (digit, index) => (

              <TextInput
                key={index}

                ref={(ref) => {
                  inputRef.current[
                    index
                  ] = ref;
                }}

                style={styles.input}

                keyboardType="number-pad"

                maxLength={1}

                value={digit}

                onChangeText={(text) =>
                  handleChange(
                    text,
                    index
                  )
                }

                textAlign="center"

                selectTextOnFocus
              />

            )
          )}

        </View>


        {/* Verify Button */}

        {loading ? (

          <ActivityIndicator
            size="large"
            color="#000"
          />

        ) : (

          <Mainbutton
            content="Verify OTP"
            onPress={handleSubmit}
          />

        )}


        {/* Resend */}

        <TouchableOpacity
          style={styles.resendButton}
        >

          <Text style={styles.resendText}>

            Didn't receive OTP?{" "}

            <Text
              style={styles.resendLink}
            >
              Resend
            </Text>

          </Text>

        </TouchableOpacity>

      </View>

    </View>

  );
};


export default Otpscreen;


// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 25,

    elevation: 4,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
    color: "#000",
  },

  subtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: 10,
    fontSize: 14,
  },

  emailText: {
    textAlign: "center",
    color: "#000",
    fontWeight: "600",
    marginBottom: 25,
  },

  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },

  input: {
    width: 45,
    height: 55,

    borderWidth: 1,
    borderColor: "#ddd",

    borderRadius: 8,

    textAlign: "center",

    fontSize: 22,
    fontWeight: "600",

    backgroundColor: "#fafafa",
    color: "#000",
  },

  resendButton: {
    marginTop: 20,
    alignItems: "center",
  },

  resendText: {
    textAlign: "center",
    color: "#777",
  },

  resendLink: {
    color: "#4A6CF7",
    fontWeight: "600",
  },

});
