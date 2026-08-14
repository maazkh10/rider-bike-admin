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

export default function ManagementInventory() {
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
      String(ride.chassisNo || "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#5C9200" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Delivery Inventory</Text>
      <Text style={styles.subtitle}>
        This view is backed by RIDE_DETAILS; the reference does not define a separate inventory table/API.
      </Text>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search chassis or vehicle"
        style={styles.search}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.rideId)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.model}>{item.vehicleName || "Bike"}</Text>
              <Text style={styles.status}>{item.rideStatus}</Text>
            </View>
            <Row label="Chassis" value={item.chassisNo} />
            <Row label="Ride ID" value={`#${item.rideId}`} />
            <Row label="Rider" value={item.riderId ?? "Unassigned"} />
            <Row label="Fare" value={`₹${Number(item.fare || 0).toFixed(2)}`} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No DB records</Text>
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
  root: { flex: 1, backgroundColor: "#fff", paddingTop: 55, paddingHorizontal: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 29, fontWeight: "900", color: "#111" },
  subtitle: { color: "#777", fontSize: 11, marginTop: 5, lineHeight: 17 },
  search: { height: 52, backgroundColor: "#F7F7F7", borderRadius: 14, paddingHorizontal: 14, marginVertical: 18 },
  card: { backgroundColor: "#fff", borderRadius: 18, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: "#F0F0F0", elevation: 2 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  model: { fontSize: 17, fontWeight: "900", color: "#111", flex: 1 },
  status: { fontSize: 10, fontWeight: "900", color: "#5C9200" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  label: { color: "#888", fontSize: 12 },
  value: { color: "#111", fontSize: 12, fontWeight: "800" },
  empty: { padding: 25, alignItems: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "900" },
});
