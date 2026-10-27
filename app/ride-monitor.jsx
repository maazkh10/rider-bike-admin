import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { getAuthToken } from "../src/api/auth.api";
import { getActiveRideApi, getAdminRidesApi, openRidePaymentApi } from "../src/api/ride.api";
import { connectAdminRideSocket, disconnectAdminRideSocket } from "../src/services/adminRideSocket";
import { getLocationName } from "../src/services/location-service";
import { showAdminNotification } from "../src/services/notifications";

const statusText = (status) => ({
  REQUESTED: "Finding rider",
  ACCEPTED: "Rider accepted",
  AWAITING_PAYMENT: "Payment required to start",
  STARTED: "Ride in progress",
  COMPLETED: "Completed",
  ADMIN_CANCELLED: "Cancelled",
}[status] || status || "Waiting");

export default function RideMonitor() {
  const router = useRouter();
  const { rideId: requestedRideId } = useLocalSearchParams();
  const mapRef = useRef(null);
  const mounted = useRef(true);
  const [ride, setRide] = useState(null);
  const [rideOtp, setRideOtp] = useState("");
  const [riderLocation, setRiderLocation] = useState(null);
  const [pickupAddress, setPickupAddress] = useState("Pickup location");
  const [dropAddress, setDropAddress] = useState("Destination");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const payForRide = async () => {
    try { setPaying(true); await openRidePaymentApi(ride.rideId); await loadActiveRide(); }
    catch (e) { Alert.alert("Unable to open payment", e?.response?.data?.message || e?.message || "Please retry."); }
    finally { setPaying(false); }
  };

  const loadActiveRide = useCallback(async () => {
    try {
      const response = await getActiveRideApi();
      const active = response?.data?.activeRide;
      const otp = response?.data?.rideOtp;

      if (!active) {
        if (requestedRideId) return;
        if (mounted.current) setRide(null);
        return;
      }

      if (requestedRideId && String(active.rideId) !== String(requestedRideId)) return;

      if (!mounted.current) return;
      setRide(active);
      if (otp != null) setRideOtp(String(otp));

      const [pickup, drop] = await Promise.all([
        getLocationName(active.pickupLatitude, active.pickupLongitude),
        getLocationName(active.dropLatitude, active.dropLongitude),
      ]);
      if (mounted.current) {
        setPickupAddress(pickup || "Pickup location");
        setDropAddress(drop || "Destination");
      }
    } catch (e) {
      if (mounted.current) setError(e?.response?.data?.message || e?.message || "Unable to load ride.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [requestedRideId]);

  useFocusEffect(useCallback(() => {
    mounted.current = true;
    loadActiveRide();
    return () => { mounted.current = false; };
  }, [loadActiveRide]));

  useEffect(() => {
    let timer;
    const start = async () => {
      await loadActiveRide();
      timer = setInterval(loadActiveRide, 8000);
    };
    start();
    return () => clearInterval(timer);
  }, [loadActiveRide]);

  useEffect(() => {
    let cancelled = false;
    const connect = async () => {
      if (!ride?.rideId || !ride?.adminId) return;
      await connectAdminRideSocket({
        rideId: ride.rideId,
        adminId: ride.adminId,
        onLocation: (location) => {
          if (cancelled) return;
          setRiderLocation({
            latitude: Number(location.latitude),
            longitude: Number(location.longitude),
          });
          setLastUpdated(new Date());
        },
        onRideEvent: async (event) => {
          const type = String(event?.type || event?.eventType || event?.event || "").toUpperCase();
          if (type === "RIDE_ACCEPTED") { await showAdminNotification("Rider accepted", "Your rider has accepted the delivery."); await loadActiveRide(); }
          else if (type === "PAYMENT_REQUIRED") { await loadActiveRide(); }
          else if (type === "RIDE_STARTED") { await showAdminNotification("Ride started", "Payment is confirmed and the rider is on trip."); await loadActiveRide(); }
          else if (type === "RIDE_COMPLETED") {
            await showAdminNotification("Ride completed", `Ride #${event?.rideId ?? ride?.rideId ?? requestedRideId} has been completed by the rider.`, { rideId: event?.rideId ?? ride?.rideId ?? requestedRideId, type });
            await loadActiveRide();
            // The completed ride may no longer be returned from /active-ride.
            // Reflect the authoritative event immediately, then hydrate the row from ride history.
            setRide((current) => current ? { ...current, rideStatus: "COMPLETED" } : current);
            try {
              const response = await getAdminRidesApi();
              const rows = Array.isArray(response?.data) ? response.data : [];
              const completedRide = rows.find((item) => String(item.rideId) === String(event?.rideId ?? ride?.rideId ?? requestedRideId));
              if (completedRide) setRide(completedRide);
            } catch (refreshError) {
              if (__DEV__) console.log("Completed ride refresh:", refreshError?.response?.data || refreshError?.message);
            }
          }
          else if (type === "RIDE_CANCELLED" || type === "RIDER_CANCELLED" || type === "RIDE_RIDER_CANCELLED") { await showAdminNotification("Rider cancelled", "The assigned rider cancelled this delivery."); await loadActiveRide(); }
        },
      });
    };
    connect();
    return () => {
      cancelled = true;
      disconnectAdminRideSocket();
    };
  }, [ride?.rideId, ride?.adminId, loadActiveRide]);

  useEffect(() => {
    const coords = [
      riderLocation,
      ride && { latitude: Number(ride.pickupLatitude), longitude: Number(ride.pickupLongitude) },
      ride && { latitude: Number(ride.dropLatitude), longitude: Number(ride.dropLongitude) },
    ].filter(Boolean);
    if (coords.length > 1) mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 100, right: 40, bottom: 320, left: 40 }, animated: true,
    });
  }, [riderLocation, ride]);

  const pickup = useMemo(() => ride ? { latitude: Number(ride.pickupLatitude), longitude: Number(ride.pickupLongitude) } : null, [ride]);
  const drop = useMemo(() => ride ? { latitude: Number(ride.dropLatitude), longitude: Number(ride.dropLongitude) } : null, [ride]);

  const openMaps = async () => {
    const destination = ride?.rideStatus === "STARTED" ? drop : pickup;
    if (!destination) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
    await Linking.openURL(url);
  };

  const cancelRide = async () => {
    Alert.alert("Cancel ride?", "This will cancel the booking for the rider.", [
      { text: "Keep ride", style: "cancel" },
      { text: "Cancel ride", style: "destructive", onPress: async () => {
        try {
          const token = await getAuthToken();
          const rideApi = await import("../src/api/client");
          await rideApi.default.post("/ride/cancel", null, { params: { rideId: Number(ride.rideId) }, headers: { Authorization: `Bearer ${token}` } });
          router.replace("/(tabs)/home");
        } catch (e) {
          Alert.alert("Unable to cancel", e?.response?.data?.message || e?.message || "Try again.");
        }
      }},
    ]);
  };

  if (loading && !ride) return <View style={styles.center}><Text style={styles.loading}>Loading ride...</Text></View>;
  if (!ride) return <View style={styles.center}><Text style={styles.title}>Waiting for rider</Text><Text style={styles.sub}>The ride may still be dispatching.</Text></View>;

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} initialRegion={{ latitude: pickup?.latitude || 19.076, longitude: pickup?.longitude || 72.8777, latitudeDelta: .05, longitudeDelta: .05 }}>
        {pickup && <Marker coordinate={pickup} title="Pickup" pinColor="#6FAF00" />}
        {drop && <Marker coordinate={drop} title="Destination" pinColor="#111" />}
        {riderLocation && <Marker coordinate={riderLocation} title="Rider" description="Live location" />}
        {riderLocation && pickup && ride.rideStatus !== "STARTED" && <Polyline coordinates={[riderLocation, pickup]} strokeWidth={5} strokeColor="#6FAF00" />}
        {riderLocation && drop && ride.rideStatus === "STARTED" && <Polyline coordinates={[riderLocation, drop]} strokeWidth={5} strokeColor="#6FAF00" />}
      </MapView>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.eyebrow}>RIDE #{ride.rideId}</Text>
            <Text style={styles.title}>{statusText(ride.rideStatus)}</Text>
          </View>
          <View style={styles.liveBadge}><View style={styles.dot} /><Text style={styles.liveText}>{riderLocation ? "LIVE" : "WAITING"}</Text></View>
        </View>

        <View style={styles.routeCard}>
          <Text style={styles.label}>PICKUP</Text><Text style={styles.address}>{pickupAddress}</Text>
          <View style={styles.separator} />
          <Text style={styles.label}>DESTINATION</Text><Text style={styles.address}>{dropAddress}</Text>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.info}><Text style={styles.infoLabel}>RIDER</Text><Text style={styles.infoValue}>{ride.riderId ? `#${ride.riderId}` : "Assigning"}</Text></View>
          <View style={styles.info}><Text style={styles.infoLabel}>BIKE</Text><Text style={styles.infoValue} numberOfLines={1}>{ride.vehicleName}</Text></View>
          <View style={styles.info}><Text style={styles.infoLabel}>FARE</Text><Text style={styles.infoValue}>₹{ride.fare}</Text></View>
        </View>

        {ride.rideStatus === "ACCEPTED" && rideOtp ? <View style={styles.otpCard}><Text style={styles.otpLabel}>START OTP — TELL THE RIDER WHEN THEY ARRIVE</Text><Text style={styles.otp}>{rideOtp}</Text></View> : null}
        {ride.rideStatus === "AWAITING_PAYMENT" ? <TouchableOpacity style={styles.navButton} onPress={payForRide} disabled={paying}><Text style={styles.navText}>{paying ? "Opening payment..." : "Pay securely to start ride"}</Text></TouchableOpacity> : null}
        {ride.rideStatus === "STARTED" ? <View style={styles.startedCard}><Ionicons name="navigate" size={20} color="#111" /><Text style={styles.startedText}>Rider is on the way to destination</Text></View> : null}
        {lastUpdated ? <Text style={styles.updated}>Location updated {lastUpdated.toLocaleTimeString()}</Text> : null}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.navButton} onPress={openMaps}><Ionicons name="map-outline" size={20} color="#111" /><Text style={styles.navText}>Open Maps</Text></TouchableOpacity>
          {ride.rideStatus === "REQUESTED" || ride.rideStatus === "ACCEPTED" ? <TouchableOpacity style={styles.cancelButton} onPress={cancelRide}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:"#F6F7F5"},map:{flex:1},center:{flex:1,alignItems:"center",justifyContent:"center",padding:24},loading:{color:"#666"},sheet:{backgroundColor:"#fff",borderTopLeftRadius:30,borderTopRightRadius:30,padding:20,paddingBottom:28},handle:{width:48,height:5,borderRadius:5,backgroundColor:"#DDD",alignSelf:"center",marginBottom:15},rowBetween:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},eyebrow:{fontSize:10,fontWeight:"900",letterSpacing:1.3,color:"#8A8A8A"},title:{fontSize:24,fontWeight:"900",color:"#111",marginTop:4},sub:{marginTop:8,color:"#777",textAlign:"center"},liveBadge:{flexDirection:"row",alignItems:"center",backgroundColor:"#EFFBD9",paddingHorizontal:10,paddingVertical:7,borderRadius:12},dot:{width:8,height:8,borderRadius:4,backgroundColor:"#6FAF00",marginRight:6},liveText:{fontSize:10,fontWeight:"900",color:"#476E00"},routeCard:{marginTop:16,padding:15,borderRadius:18,backgroundColor:"#F7F8F6"},label:{fontSize:9,fontWeight:"900",letterSpacing:1,color:"#8A8A8A"},address:{fontSize:14,fontWeight:"700",color:"#222",marginTop:4},separator:{height:1,backgroundColor:"#E8E8E8",marginVertical:12},infoRow:{flexDirection:"row",gap:8,marginTop:12},info:{flex:1,backgroundColor:"#F7F8F6",borderRadius:14,padding:11},infoLabel:{fontSize:8,fontWeight:"900",color:"#999",letterSpacing:.8},infoValue:{fontSize:13,fontWeight:"800",color:"#111",marginTop:4},otpCard:{marginTop:12,backgroundColor:"#111",borderRadius:18,padding:15,alignItems:"center"},otpLabel:{fontSize:9,fontWeight:"900",letterSpacing:1,color:"#A8D85B",textAlign:"center"},otp:{fontSize:38,fontWeight:"900",letterSpacing:8,color:"#fff",marginTop:4},startedCard:{marginTop:12,backgroundColor:"#EAFAD5",borderRadius:16,padding:13,flexDirection:"row",alignItems:"center",gap:8},startedText:{fontWeight:"800",color:"#111"},updated:{textAlign:"center",fontSize:10,color:"#999",marginTop:8},actions:{flexDirection:"row",gap:10,marginTop:14},navButton:{flex:1,height:52,borderRadius:16,backgroundColor:"#BBFF5B",alignItems:"center",justifyContent:"center",flexDirection:"row",gap:7},navText:{fontWeight:"900",color:"#111"},cancelButton:{height:52,paddingHorizontal:20,borderRadius:16,backgroundColor:"#FEECEC",alignItems:"center",justifyContent:"center"},cancelText:{fontWeight:"900",color:"#C62828"}}
);
