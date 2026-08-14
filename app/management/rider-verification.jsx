import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";

import {
  getRiderVerificationApi,
  saveRiderVerificationApi,
  setRiderVerifiedApi,
} from "../../src/api/ride.api";

export default function RiderVerification() {
  const params = useLocalSearchParams();
  const [riderId, setRiderId] = useState(String(params?.riderId || ""));
  const [form, setForm] = useState({
    aadhaarCardNumber: "",
    panCardNumber: "",
    drivingLicenseNumber: "",
    bankAccountNumber: "",
    bankIfscCode: "",
    bankAccountName: "",
  });
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!riderId) return;
    try {
      setLoading(true);
      const response = await getRiderVerificationApi(Number(riderId));
      const data = response?.data || {};
      setForm({
        aadhaarCardNumber: data.aadhaarCardNumber || "",
        panCardNumber: data.panCardNumber || "",
        drivingLicenseNumber: data.drivingLicenseNumber || "",
        bankAccountNumber: data.bankAccountNumber || "",
        bankIfscCode: data.bankIfscCode || "",
        bankAccountName: data.bankAccountName || "",
      });
      setVerified(Boolean(data.verified));
    } catch (error) {
      Alert.alert(
        "Unable to load verification",
        error?.response?.data?.message || error?.message || "Check the rider ID."
      );
    } finally {
      setLoading(false);
    }
  }, [riderId]);

  const save = async () => {
    if (!/^\d+$/.test(riderId)) {
      Alert.alert("Invalid rider ID", "Enter the RIDER_DETAILS.id.");
      return;
    }

    for (const [key, value] of Object.entries(form)) {
      if (!String(value).trim()) {
        Alert.alert("Missing field", `Please enter ${key}.`);
        return;
      }
    }

    try {
      setLoading(true);
      const response = await saveRiderVerificationApi(Number(riderId), form);
      setVerified(Boolean(response?.data?.verified));
      Alert.alert(
        "Saved",
        "Verification details were saved. The backend resets verified=false when details are saved."
      );
    } catch (error) {
      Alert.alert(
        "Save failed",
        error?.response?.data?.message || error?.response?.data || error?.message || "Unable to save."
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleVerified = async () => {
    if (!/^\d+$/.test(riderId)) {
      Alert.alert("Invalid rider ID", "Enter the RIDER_DETAILS.id.");
      return;
    }

    try {
      setLoading(true);
      const response = await setRiderVerifiedApi(Number(riderId), !verified);
      setVerified(Boolean(response?.data?.verified));
    } catch (error) {
      Alert.alert(
        "Verification update failed",
        error?.response?.data?.message || error?.message || "Unable to update verification."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Rider Verification</Text>
      <Text style={styles.subtitle}>
        This screen uses the admin verification endpoints from the reference.
        Never expose these fields in logs or screenshots.
      </Text>

      <Field label="Rider ID" value={riderId} onChangeText={setRiderId} keyboardType="number-pad" />
      <TouchableOpacity style={styles.load} onPress={load} disabled={loading}>
        <Text style={styles.loadText}>Load existing details</Text>
      </TouchableOpacity>

      <Field label="Aadhaar" value={form.aadhaarCardNumber} onChangeText={(v) => setForm({ ...form, aadhaarCardNumber: v })} />
      <Field label="PAN" value={form.panCardNumber} onChangeText={(v) => setForm({ ...form, panCardNumber: v.toUpperCase() })} />
      <Field label="Driving licence" value={form.drivingLicenseNumber} onChangeText={(v) => setForm({ ...form, drivingLicenseNumber: v.toUpperCase() })} />
      <Field label="Bank account" value={form.bankAccountNumber} onChangeText={(v) => setForm({ ...form, bankAccountNumber: v })} keyboardType="number-pad" />
      <Field label="IFSC" value={form.bankIfscCode} onChangeText={(v) => setForm({ ...form, bankIfscCode: v.toUpperCase() })} />
      <Field label="Account name" value={form.bankAccountName} onChangeText={(v) => setForm({ ...form, bankAccountName: v })} />

      <TouchableOpacity style={styles.save} onPress={save} disabled={loading}>
        {loading ? <ActivityIndicator color="#111" /> : <Text style={styles.saveText}>Save Verification Details</Text>}
      </TouchableOpacity>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>CURRENT STATUS</Text>
        <Text style={styles.statusValue}>{verified ? "VERIFIED" : "NOT VERIFIED"}</Text>
        <TouchableOpacity style={styles.verifyButton} onPress={toggleVerified} disabled={loading}>
          <Text style={styles.verifyText}>
            {verified ? "Set Not Verified" : "Approve Rider"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} style={styles.input} secureTextEntry={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 55, backgroundColor: "#F4F6F8", paddingBottom: 50 },
  title: { fontSize: 28, fontWeight: "900", color: "#111" },
  subtitle: { color: "#777", lineHeight: 18, marginTop: 6, marginBottom: 18 },
  field: { marginBottom: 11 },
  label: { fontSize: 10, fontWeight: "900", color: "#777", letterSpacing: 0.8, marginBottom: 5 },
  input: { height: 50, backgroundColor: "#fff", borderRadius: 13, paddingHorizontal: 13, color: "#111" },
  load: { backgroundColor: "#E8F4D7", borderRadius: 14, padding: 14, alignItems: "center", marginBottom: 16 },
  loadText: { color: "#315400", fontWeight: "900" },
  save: { backgroundColor: "#BBFF5B", height: 55, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 5 },
  saveText: { color: "#111", fontWeight: "900" },
  statusCard: { backgroundColor: "#111", borderRadius: 20, padding: 18, marginTop: 16 },
  statusLabel: { color: "#aaa", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  statusValue: { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 5 },
  verifyButton: { backgroundColor: "#fff", borderRadius: 14, padding: 14, alignItems: "center", marginTop: 14 },
  verifyText: { color: "#111", fontWeight: "900" },
});
