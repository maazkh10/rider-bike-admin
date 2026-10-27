import { useState } from "react";
import { Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import api from "../api/client";
import { clearAuthToken } from "../services/authToken";

export default function PasswordResetScreen() {
  const router = useRouter();
  const [step, setStep] = useState("email"), [email, setEmail] = useState("");
  const [otp, setOtp] = useState(""), [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState(""), [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const requestCode = async () => {
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return Alert.alert("Check email", "Enter your registered email address.");
    setBusy(true);
    try { await api.post("/auth/sendotp", { email: address }); setEmail(address); setOtp(""); setResetToken(""); setStep("otp"); }
    catch (error) { Alert.alert("Unable to send code", error?.response?.data?.message || "Please try again later."); }
    finally { setBusy(false); }
  };
  const submit = async () => {
    if (step === "email") return requestCode();
    if (step === "otp" && !/^\d{6}$/.test(otp)) return Alert.alert("Check code", "Enter the six-digit email code.");
    if (step === "password" && (password.length < 8 || password.length > 72 || password !== confirmation))
      return Alert.alert("Check password", "Use 8–72 characters and make sure both passwords match.");
    setBusy(true);
    try {
      if (step === "otp") {
        const response = await api.post("/auth/verifyotp", { email, otp });
        if (!response.data.resetToken) throw Error("No reset session returned.");
        setResetToken(response.data.resetToken); setStep("password");
      } else {
        await api.post("/auth/resetpassword", { email, resetToken, password });
        await clearAuthToken(); setResetToken(""); setPassword(""); setConfirmation("");
        Alert.alert("Password changed", "Sign in using your new password.", [{ text: "Sign in", onPress: () => router.replace("/(auth)/login") }]);
      }
    } catch (error) { Alert.alert("Unable to reset password", error?.response?.data?.message || error.message || "Please try again."); }
    finally { setBusy(false); }
  };
  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <TouchableOpacity disabled={busy} onPress={() => router.canGoBack() ? router.back() : router.replace("/(auth)/login")}><Text style={styles.back}>← Back to sign in</Text></TouchableOpacity>
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.hint}>{step === "email" ? "Enter the email address linked to your account." : step === "otp" ? "If an active account exists, a six-digit code will arrive by email. It expires in 15 minutes." : "Choose a new password. Your other sessions will be signed out."}</Text>
      {step === "email" && <TextInput accessibilityLabel="Email address" style={styles.input} value={email} onChangeText={setEmail} placeholder="Email address" keyboardType="email-address" autoCapitalize="none" editable={!busy} />}
      {step === "otp" && <><Text style={styles.hint}>{email}</Text><TextInput accessibilityLabel="Reset code" style={styles.input} value={otp} onChangeText={value => setOtp(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" placeholder="Six-digit code" maxLength={6} editable={!busy} /></>}
      {step === "password" && <><TextInput accessibilityLabel="New password" style={styles.input} value={password} onChangeText={setPassword} placeholder="New password" secureTextEntry autoCapitalize="none" editable={!busy} /><TextInput accessibilityLabel="Confirm new password" style={styles.input} value={confirmation} onChangeText={setConfirmation} placeholder="Confirm new password" secureTextEntry autoCapitalize="none" editable={!busy} /></>}
      <TouchableOpacity accessibilityRole="button" style={[styles.button, busy && { opacity: .5 }]} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{step === "email" ? "Send reset code" : step === "otp" ? "Verify code" : "Save new password"}</Text>}
      </TouchableOpacity>
      {step === "otp" && <TouchableOpacity disabled={busy} onPress={requestCode}><Text style={styles.back}>Resend code</Text></TouchableOpacity>}
      {step !== "email" && <TouchableOpacity disabled={busy} onPress={() => { setStep("email"); setResetToken(""); setOtp(""); }}><Text style={styles.back}>Use a different email</Text></TouchableOpacity>}
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: "#fff" }, form: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 16 }, title: { fontSize: 28, fontWeight: "700", color: "#111" }, hint: { color: "#555", lineHeight: 22 }, input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 12, padding: 16, color: "#111" }, button: { backgroundColor: "#315400", padding: 16, borderRadius: 12, alignItems: "center" }, buttonText: { color: "white", fontWeight: "700" }, back: { color: "#315400", paddingVertical: 8 } });
