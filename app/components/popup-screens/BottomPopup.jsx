import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { calculateFareApi, createRideApi } from "../../../src/api/ride.api";
import { getLocationName } from "../../../src/services/location-service";

const { height } = Dimensions.get("window");

export default function BottomPopup({ visible, onClose, from, to }) {
  const slide = useRef(new Animated.Value(height)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  const [vehicleType, setVehicleType] = useState("");
  const [bikeName, setBikeName] = useState("");
  const [chassisNo, setChassisNo] = useState("");
  const [fare, setFare] = useState("");
  const [distance, setDistance] = useState(null);
  const [pickupAddress, setPickupAddress] = useState("Pickup");
  const [dropAddress, setDropAddress] = useState("Destination");
  const [calculating, setCalculating] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slide, {
        toValue: visible ? 0 : height,
        useNativeDriver: true,
        tension: 70,
        friction: 12,
      }),
      Animated.timing(backdrop, {
        toValue: visible ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, slide, backdrop]);

  useEffect(() => {
    if (!visible) return;

    setVehicleType("");
    setBikeName("");
    setChassisNo("");
    setFare("");
    setDistance(null);
    setError("");

    (async () => {
      try {
        if (from) {
          setPickupAddress(
            (await getLocationName(from.lat, from.lng)) || "Pickup"
          );
        }
        if (to) {
          setDropAddress(
            (await getLocationName(to.lat, to.lng)) || "Destination"
          );
        }
      } catch {}
    })();
  }, [visible, from, to]);

  const calculate = async () => {
    if (!from || !to) {
      setError("Pickup and destination are required.");
      return;
    }

    try {
      setCalculating(true);
      setError("");

      const response = await calculateFareApi({
        startLatitude: from.lat,
        startLongitude: from.lng,
        destinationLatitude: to.lat,
        destinationLongitude: to.lng,
      });

      const value = response?.data?.fare;
      const km = response?.data?.distance;

      if (Number.isFinite(value) && value > 0) {
        setFare(String(value));
      } else {
        // The reference says the current fare endpoint is a placeholder.
        // Do not invent a fare. The admin can enter the real fare below.
        setError(
          "The backend fare endpoint did not return a numeric fare. Enter the approved fare manually."
        );
      }

      if (Number.isFinite(km) && km > 0) {
        setDistance(km);
      }
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Fare service is unavailable. Enter the approved fare manually."
      );
    } finally {
      setCalculating(false);
    }
  };

  const confirm = async () => {
    if (!from || !to) return setError("Pickup and destination are required.");
    if (!vehicleType) return setError("Select Bike or Scooty.");
    if (!bikeName.trim()) return setError("Enter the vehicle name.");
    if (!chassisNo.trim()) return setError("Enter the chassis number.");

    const numericFare = Number(fare);
    if (!Number.isFinite(numericFare) || numericFare <= 0) {
      return setError("Enter a valid approved fare.");
    }

    try {
      setBooking(true);
      setError("");

      await createRideApi({
        pickUpLatitude: from.lat,
        pickUpLongitude: from.lng,
        dropLatitude: to.lat,
        dropLongitude: to.lng,
        fare: numericFare,
        chassisNo: chassisNo.trim(),
        vehicleName: bikeName.trim(),
      });

      onClose();
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.response?.data ||
          e?.message ||
          "Unable to create ride."
      );
    } finally {
      setBooking(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1}>
          <Animated.View style={[styles.backdrop, { opacity: backdrop }]} />
        </TouchableOpacity>

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slide }] }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Create Delivery</Text>

          <View style={styles.route}>
            <Text style={styles.label}>PICKUP</Text>
            <Text style={styles.value} numberOfLines={2}>{pickupAddress}</Text>
            <View style={styles.line} />
            <Text style={styles.label}>DESTINATION</Text>
            <Text style={styles.value} numberOfLines={2}>{dropAddress}</Text>
          </View>

          <Text style={styles.section}>Vehicle type</Text>
          <View style={styles.row}>
            {["Bike", "Scooty"].map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.choice, vehicleType === type && styles.selected]}
                onPress={() => setVehicleType(type)}
              >
                <Text style={styles.choiceText}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Field
            label="Vehicle name"
            value={bikeName}
            onChangeText={setBikeName}
            placeholder="e.g. Honda Activa 6G"
          />
          <Field
            label="Chassis number"
            value={chassisNo}
            onChangeText={setChassisNo}
            placeholder="Enter chassis number"
            autoCapitalize="characters"
          />

          <View style={styles.fareHeader}>
            <Text style={styles.section}>Fare</Text>
            <TouchableOpacity onPress={calculate} disabled={calculating}>
              {calculating ? (
                <ActivityIndicator color="#5C9200" />
              ) : (
                <Text style={styles.calculate}>Calculate</Text>
              )}
            </TouchableOpacity>
          </View>

          <TextInput
            value={fare}
            onChangeText={setFare}
            placeholder="Enter approved fare"
            keyboardType="decimal-pad"
            style={styles.input}
          />

          {distance != null && (
            <Text style={styles.distance}>Backend distance: {distance} km</Text>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.confirm, booking && styles.disabled]}
            onPress={confirm}
            disabled={booking || calculating}
          >
            {booking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmText}>Send Ride Request</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { flex: 1, backgroundColor: "#000" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 28,
    maxHeight: "90%",
  },
  handle: { width: 45, height: 5, borderRadius: 5, backgroundColor: "#ddd", alignSelf: "center", marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "900", color: "#111" },
  route: { backgroundColor: "#F7F8F6", borderRadius: 17, padding: 14, marginTop: 14 },
  label: { fontSize: 9, fontWeight: "900", letterSpacing: 1, color: "#888" },
  value: { fontSize: 14, fontWeight: "800", color: "#222", marginTop: 4 },
  line: { height: 1, backgroundColor: "#E5E5E5", marginVertical: 10 },
  section: { fontSize: 13, fontWeight: "900", color: "#111", marginTop: 13, marginBottom: 7 },
  row: { flexDirection: "row", gap: 10 },
  choice: { flex: 1, padding: 13, borderRadius: 14, backgroundColor: "#F2F2F2", alignItems: "center" },
  selected: { backgroundColor: "#BBFF5B" },
  choiceText: { fontWeight: "900", color: "#111" },
  input: { backgroundColor: "#F7F7F7", borderRadius: 13, paddingHorizontal: 14, height: 48, color: "#111" },
  fareHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  calculate: { color: "#5C9200", fontWeight: "900" },
  distance: { color: "#777", fontSize: 11, marginTop: 5 },
  error: { color: "#C62828", fontSize: 12, marginTop: 8 },
  confirm: { height: 55, borderRadius: 16, backgroundColor: "#111", alignItems: "center", justifyContent: "center", marginTop: 15 },
  disabled: { opacity: 0.6 },
  confirmText: { color: "#fff", fontSize: 15, fontWeight: "900" },
});
