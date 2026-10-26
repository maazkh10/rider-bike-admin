import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { getAdminProfileApi, getAdminRidesApi, getAdminInvoicesApi } from "../../src/api/ride.api";
import { clearAuthToken } from "../../src/services/authToken";
import Backbutton from "../components/backbutton";

export default function Profile() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [rides, setRides] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [p, r, i] = await Promise.all([
      getAdminProfileApi(),
      getAdminRidesApi(),
      getAdminInvoicesApi(),
    ]);
    setProfile(p?.data || null);
    setRides(Array.isArray(r?.data) ? r.data : []);
    setInvoices(Array.isArray(i?.data) ? i.data : []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          setLoading(true);
          const [p, r, i] = await Promise.all([
            getAdminProfileApi(),
            getAdminRidesApi(),
            getAdminInvoicesApi(),
          ]);
          if (!mounted) return;
          setProfile(p?.data || null);
          setRides(Array.isArray(r?.data) ? r.data : []);
          setInvoices(Array.isArray(i?.data) ? i.data : []);
        } catch (error) {
          if (__DEV__) console.log("Admin profile:", error?.response?.data || error?.message);
        } finally {
          if (mounted) setLoading(false);
        }
      })();
      return () => { mounted = false; };
    }, [])
  );

  const refresh = async () => {
    try { setRefreshing(true); await load(); }
    finally { setRefreshing(false); }
  };

  const logout = async () => {
    await clearAuthToken();
    router.replace("/(auth)/login");
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#5C9200" />
      </View>
    );
  }

  const name =
    `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() ||
    profile?.userName ||
    "Admin";
  const revenue = rides.reduce((sum, ride) => sum + Number(ride.fare || 0), 0);

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      contentContainerStyle={styles.container}
    >
      <Backbutton />
      <Text style={styles.title}>Admin Profile</Text>

      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.slice(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>@{profile?.userName}</Text>
        <Text style={styles.meta}>{profile?.email}</Text>
      </View>

      <View style={styles.stats}>
        <Stat label="Rides" value={rides.length} />
        <Stat label="Invoices" value={invoices.length} />
        <Stat label="Revenue" value={`₹${revenue.toFixed(0)}`} />
      </View>

      <Section title="Account">
        <Row label="User ID" value={profile?.userId} />
        <Row label="Role" value={profile?.role} />
        <Row label="Mobile" value={profile?.mobileNumber} />
        <Row label="Enabled" value={profile?.enabled ? "Yes" : "No"} />
      </Section>

      <TouchableOpacity
        style={styles.link}
        onPress={() => router.push("/management/management_inventry")}
      >
        <Text style={styles.linkText}>Open delivery inventory</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.link, { backgroundColor: "#EAFAD5" }]}
        onPress={() => router.push("/management/rider-verification")}
      >
        <Text style={[styles.linkText, { color: "#315400" }]}>
          Verify a rider
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{String(value ?? "—")}</Text>
    </View>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 50, backgroundColor: "#F4F6F8", paddingBottom: 50 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 27, fontWeight: "900", color: "#111", marginBottom: 15 },
  profile: { backgroundColor: "#fff", borderRadius: 22, padding: 23, alignItems: "center" },
  avatar: { width: 82, height: 82, borderRadius: 41, backgroundColor: "#BBFF5B", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 24, fontWeight: "900" },
  name: { fontSize: 21, fontWeight: "900", marginTop: 12, color: "#111" },
  meta: { color: "#777", marginTop: 3, fontSize: 12 },
  stats: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 20, paddingVertical: 18, marginTop: 14 },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 19, fontWeight: "900", color: "#111" },
  statLabel: { color: "#777", fontSize: 10, marginTop: 4 },
  section: { backgroundColor: "#fff", borderRadius: 20, padding: 18, marginTop: 14 },
  sectionTitle: { fontSize: 17, fontWeight: "900", marginBottom: 5 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F1F1F1" },
  label: { color: "#777", fontSize: 12 },
  value: { color: "#111", fontWeight: "800", fontSize: 12 },
  link: { backgroundColor: "#111", borderRadius: 17, padding: 16, marginTop: 14, alignItems: "center" },
  linkText: { color: "#fff", fontWeight: "900" },
  logout: { backgroundColor: "#FEECEC", borderRadius: 17, padding: 16, marginTop: 10, alignItems: "center" },
  logoutText: { color: "#C62828", fontWeight: "900" },
});
