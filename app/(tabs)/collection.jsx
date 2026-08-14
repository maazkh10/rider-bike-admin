import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { getAdminRidesApi } from "../../src/api/ride.api";

export default function Collection() {
  const [rides, setRides] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const response = await getAdminRidesApi();
    setRides(Array.isArray(response?.data) ? response.data : []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          setLoading(true);
          const response = await getAdminRidesApi();
          if (mounted) setRides(Array.isArray(response?.data) ? response.data : []);
        } catch {
          if (mounted) setRides([]);
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

  const filtered = rides.filter((ride) => {
    const q = search.toLowerCase();
    return (
      String(ride.vehicleName || "").toLowerCase().includes(q) ||
      String(ride.chassisNo || "").toLowerCase().includes(q) ||
      String(ride.rideId || "").includes(q)
    );
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6FAF00" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Ride Collection</Text>
      <Text style={styles.subtitle}>Vehicles recorded in RIDE_DETAILS</Text>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search vehicle, chassis or ride ID"
        style={styles.search}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.rideId)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.top}>
              <Text style={styles.model}>{item.vehicleName || "Bike"}</Text>
              <Text style={styles.status}>{item.rideStatus}</Text>
            </View>
            <Row label="Ride" value={`#${item.rideId}`} />
            <Row label="Chassis" value={item.chassisNo} />
            <Row label="Rider" value={item.riderId ?? "Unassigned"} />
            <Row label="Fare" value={`₹${Number(item.fare || 0).toFixed(2)}`} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No records</Text>
            <Text style={styles.subtitle}>No ride records match your search.</Text>
          </View>
        }
      />
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F2F4F7", padding: 16, paddingTop: 45 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "900", color: "#111" },
  subtitle: { color: "#777", marginTop: 4 },
  search: { backgroundColor: "#fff", borderRadius: 13, padding: 13, marginTop: 15, marginBottom: 12 },
  list: { paddingBottom: 30 },
  card: { backgroundColor: "#fff", borderRadius: 17, padding: 16, marginBottom: 11 },
  top: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  model: { fontSize: 17, fontWeight: "900", color: "#111", flex: 1 },
  status: { fontSize: 10, fontWeight: "900", color: "#5C9200" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  label: { color: "#777", fontSize: 12 },
  value: { color: "#111", fontSize: 12, fontWeight: "800", maxWidth: "65%", textAlign: "right" },
  empty: { backgroundColor: "#fff", padding: 25, borderRadius: 18, alignItems: "center", marginTop: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "900", color: "#111" },
});
