import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useRouter } from "expo-router";

import FromToInput from "../components/FromToInput";
import { getAdminProfileApi, getActiveRideApi, getAdminRidesApi } from "../../src/api/ride.api";
import { getLocationName } from "../../src/services/location-service";

export default function Home() {
  const router = useRouter();
  const mapRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [rides, setRides] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [current, setCurrent] = useState(null);
  const [addresses, setAddresses] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [profileResponse, ridesResponse, activeResponse] = await Promise.all([
      getAdminProfileApi(),
      getAdminRidesApi(),
      getActiveRideApi(),
    ]);

    setProfile(profileResponse?.data || null);
    setRides(Array.isArray(ridesResponse?.data) ? ridesResponse.data : []);
    setActiveRide(activeResponse?.data?.activeRide || null);

    const active = activeResponse?.data?.activeRide;
    if (active) {
      const [pickup, drop] = await Promise.all([
        getLocationName(active.pickupLatitude, active.pickupLongitude),
        getLocationName(active.dropLatitude, active.dropLongitude),
      ]);
      setAddresses({ pickup, drop });
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let subscription;

    (async () => {
      try {
        setLoading(true);
        await load();

        const permission =
          await Location.requestForegroundPermissionsAsync();
        if (permission.status === "granted") {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (mounted) {
            setCurrent({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          }

          subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 20000,
              distanceInterval: 50,
            },
            ({ coords }) => {
              if (mounted) {
                setCurrent({
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                });
              }
            }
          );
        }
      } catch (error) {
        if (__DEV__) console.log("Admin home:", error?.response?.data || error?.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, [load]);

  const refresh = async () => {
    try {
      setRefreshing(true);
      await load();
    } catch {}
    finally { setRefreshing(false); }
  };

  const pickup = activeRide
    ? {
        latitude: Number(activeRide.pickupLatitude),
        longitude: Number(activeRide.pickupLongitude),
      }
    : null;

  const drop = activeRide
    ? {
        latitude: Number(activeRide.dropLatitude),
        longitude: Number(activeRide.dropLongitude),
      }
    : null;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6FAF00" />
        <Text style={styles.muted}>Loading admin data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.greeting}>
          Hello, {profile?.firstName || profile?.userName || "Admin"}
        </Text>
        <Text style={styles.subtitle}>Create and monitor bike deliveries.</Text>

        <View style={styles.bookingCard}>
          <Text style={styles.sectionTitle}>New delivery</Text>
          <FromToInput setForm={setFrom} setTo={setTo} />
        </View>

        <View style={styles.mapCard}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={
              current
                ? { ...current, latitudeDelta: 0.04, longitudeDelta: 0.04 }
                : undefined
            }
            showsUserLocation
          >
            {current && <Marker coordinate={current} title="Admin location" />}
            {pickup && <Marker coordinate={pickup} title="Pickup" pinColor="#6FAF00" />}
            {drop && <Marker coordinate={drop} title="Destination" pinColor="#111" />}
            {pickup && drop && (
              <Polyline coordinates={[pickup, drop]} strokeWidth={4} strokeColor="#6FAF00" />
            )}
          </MapView>
        </View>

        {activeRide ? (
          <TouchableOpacity
            style={styles.active}
            onPress={() =>
              router.push({
                pathname: "/ride-monitor",
                params: { rideId: String(activeRide.rideId) },
              })
            }
          >
            <Text style={styles.activeLabel}>ACTIVE RIDE</Text>
            <Text style={styles.activeTitle}>
              {activeRide.vehicleName || "Bike delivery"}
            </Text>
            <Text style={styles.activeSub}>
              #{activeRide.rideId} • {activeRide.rideStatus}
            </Text>
            <Text style={styles.activeRoute}>
              {addresses.pickup || "Pickup"} → {addresses.drop || "Destination"}
            </Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.stats}>
          <Stat label="All rides" value={rides.length} />
          <Stat
            label="Completed"
            value={rides.filter((r) => r.rideStatus === "COMPLETED").length}
          />
          <Stat
            label="Revenue"
            value={`₹${rides.reduce((sum, r) => sum + Number(r.fare || 0), 0).toFixed(0)}`}
          />
        </View>

        <Text style={styles.sectionTitle}>Recent rides</Text>

        {rides.slice(0, 8).map((ride) => (
          <TouchableOpacity
            key={String(ride.rideId)}
            style={styles.ride}
            onPress={() =>
              router.push({
                pathname: "/ride-monitor",
                params: { rideId: String(ride.rideId) },
              })
            }
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rideTitle}>
                {ride.vehicleName || "Bike"}
              </Text>
              <Text style={styles.rideSub}>
                #{ride.rideId} • {ride.rideStatus}
              </Text>
            </View>
            <Text style={styles.fare}>₹{Number(ride.fare || 0).toFixed(0)}</Text>
          </TouchableOpacity>
        ))}

        {!rides.length && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No rides yet</Text>
            <Text style={styles.muted}>
              Create a delivery above and the backend will create the ride and rider requests.
            </Text>
          </View>
        )}
      </ScrollView>
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
  root: { flex: 1, backgroundColor: "#F4F6F8" },
  content: { padding: 16, paddingBottom: 50 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { color: "#777", marginTop: 6, textAlign: "center" },
  greeting: { fontSize: 27, fontWeight: "900", color: "#111" },
  subtitle: { color: "#777", marginTop: 4, marginBottom: 14 },
  bookingCard: { backgroundColor: "#fff", borderRadius: 20, padding: 17 },
  sectionTitle: { fontSize: 19, fontWeight: "900", color: "#111", marginBottom: 10, marginTop: 18 },
  mapCard: { height: 330, borderRadius: 20, overflow: "hidden", marginTop: 14 },
  map: { flex: 1 },
  active: { backgroundColor: "#111", borderRadius: 20, padding: 18, marginTop: 14 },
  activeLabel: { color: "#A8D85B", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  activeTitle: { color: "#fff", fontSize: 20, fontWeight: "900", marginTop: 6 },
  activeSub: { color: "#bbb", marginTop: 4 },
  activeRoute: { color: "#ddd", marginTop: 9, fontSize: 12 },
  stats: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 20, marginTop: 14, paddingVertical: 18 },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "900", color: "#111" },
  statLabel: { color: "#777", fontSize: 10, marginTop: 4 },
  ride: { backgroundColor: "#fff", borderRadius: 16, padding: 15, marginBottom: 9, flexDirection: "row", alignItems: "center" },
  rideTitle: { fontSize: 14, fontWeight: "900", color: "#111" },
  rideSub: { color: "#777", fontSize: 11, marginTop: 4 },
  fare: { fontWeight: "900", color: "#111" },
  empty: { backgroundColor: "#fff", padding: 22, borderRadius: 20, alignItems: "center" },
});
