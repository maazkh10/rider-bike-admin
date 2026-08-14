import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";

import {
  getActiveRideApi,
  getAdminProfileApi,
} from "../../../src/api/ride.api.js";
import {
  connectAdminRideSocket,
  disconnectAdminRideSocket,
} from "../../../src/services/adminRideSocket";

const normalizeEventType = (event) =>
  String(
    event?.type ||
      event?.eventType ||
      event?.event ||
      ""
  ).toUpperCase();

export default function RiderProfile() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const rideId = String(params?.rideId || "");
  const initialRiderId = String(params?.riderId || "");

  const [activeRide, setActiveRide] = useState(null);
  const [rideOtp, setRideOtp] = useState(
    String(params?.otp || "")
  );
  const [rideStatus, setRideStatus] = useState(
    String(params?.rideStatus || "ACCEPTED").toUpperCase()
  );

  const [riderName, setRiderName] = useState(
    String(
      params?.riderName ||
        params?.name ||
        ""
    )
  );
  const [riderMobile, setRiderMobile] = useState(
    String(
      params?.riderMobile ||
        params?.mobileNumber ||
        ""
    )
  );

  const [riderLocation, setRiderLocation] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pickupAddress, setPickupAddress] =
    useState("Pickup location");
  const [dropAddress, setDropAddress] =
    useState("Destination");
  const [socketConnected, setSocketConnected] =
    useState(false);

  const riderId =
    activeRide?.riderId ||
    activeRide?.rider?.riderId ||
    initialRiderId;

  const pickup = useMemo(() => {
    const lat =
      activeRide?.pickupLatitude ??
      params?.pickupLatitude;

    const lon =
      activeRide?.pickupLongitude ??
      params?.pickupLongitude;

    if (lat == null || lon == null || lat === "" || lon === "") {
      return null;
    }

    return {
      latitude: Number(lat),
      longitude: Number(lon),
    };
  }, [
    activeRide?.pickupLatitude,
    activeRide?.pickupLongitude,
    params?.pickupLatitude,
    params?.pickupLongitude,
  ]);

  const destination = useMemo(() => {
    const lat =
      activeRide?.dropLatitude ??
      params?.dropLatitude;

    const lon =
      activeRide?.dropLongitude ??
      params?.dropLongitude;

    if (lat == null || lon == null || lat === "" || lon === "") {
      return null;
    }

    return {
      latitude: Number(lat),
      longitude: Number(lon),
    };
  }, [
    activeRide?.dropLatitude,
    activeRide?.dropLongitude,
    params?.dropLatitude,
    params?.dropLongitude,
  ]);

  const mapRegion =
    riderLocation ||
    pickup ||
    destination || {
      latitude: 19.076,
      longitude: 72.8777,
    };

  const loadActiveRide = async () => {
    try {
      const response =
        await getActiveRideApi();

      const ride =
        response?.data?.activeRide;

      if (!ride) {
        return null;
      }

      if (
        rideId &&
        ride?.rideId &&
        String(ride.rideId) !== String(rideId)
      ) {
        return null;
      }

      setActiveRide(ride);

      const status =
        String(
          ride?.rideStatus ||
            ride?.status ||
            ""
        ).toUpperCase();

      if (status) {
        setRideStatus(status);
      }

      const otp =
        response?.data?.rideOtp ||
        ride?.rideOtp ||
        "";

      if (otp) {
        setRideOtp(String(otp));
      }

      // The current API returns riderId in the ride.
      // If the lifecycle event also contains profile fields,
      // use them when available.
      const name =
        ride?.riderName ||
        ride?.rider?.name ||
        ride?.rider?.firstName ||
        "";

      const mobile =
        ride?.riderMobile ||
        ride?.rider?.mobileNumber ||
        "";

      if (name) setRiderName(String(name));
      if (mobile) setRiderMobile(String(mobile));

      return ride;
    } catch (error) {
      console.log(
        "❌ ADMIN ACTIVE RIDE:",
        error?.response?.data ||
          error?.message
      );
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const profileResponse =
          await getAdminProfileApi();

        const adminId =
          profileResponse?.data?.userId ||
          params?.adminId;

        const ride = await loadActiveRide();

        // Reverse geocode pickup/drop for display.
        const reverse = async (
          latitude,
          longitude,
          fallback
        ) => {
          if (
            latitude == null ||
            longitude == null
          ) {
            return fallback;
          }

          try {
            const result =
              await Location.reverseGeocodeAsync({
                latitude: Number(latitude),
                longitude: Number(longitude),
              });

            if (!result?.length) return fallback;

            const location = result[0];

            const parts = [
              location.name,
              location.street,
              location.district,
              location.city,
              location.region,
            ].filter(Boolean);

            return [
              ...new Set(parts),
            ].join(", ") || fallback;
          } catch {
            return fallback;
          }
        };

        if (ride) {
          const pickupName =
            await reverse(
              ride.pickupLatitude,
              ride.pickupLongitude,
              "Pickup location"
            );

          const dropName =
            await reverse(
              ride.dropLatitude,
              ride.dropLongitude,
              "Destination"
            );

          if (mounted) {
            setPickupAddress(pickupName);
            setDropAddress(dropName);
          }
        }

        await connectAdminRideSocket({
          rideId,
          adminId,
          onLocation: (location) => {
            if (!mounted) return;

            const next = {
              latitude: Number(location.latitude),
              longitude: Number(location.longitude),
            };

            setRiderLocation(next);
            setLastUpdated(new Date());

            console.log(
              "📍 LIVE RIDER LOCATION:",
              next
            );
          },
          onRideEvent: (event) => {
            if (!mounted) return;

            const type =
              normalizeEventType(event);

            console.log(
              "📨 ADMIN RIDE EVENT:",
              type,
              event
            );

            if (
              event?.riderName ||
              event?.rider?.name
            ) {
              setRiderName(
                event?.riderName ||
                  event?.rider?.name
              );
            }

            if (
              event?.riderMobile ||
              event?.rider?.mobileNumber
            ) {
              setRiderMobile(
                event?.riderMobile ||
                  event?.rider?.mobileNumber
              );
            }

            if (type === "RIDE_STARTED") {
              setRideStatus("STARTED");
            }

            if (type === "RIDE_COMPLETED") {
              setRideStatus("COMPLETED");
              setRiderLocation(null);
            }

            if (type === "RIDER_CANCELLED") {
              setRideStatus("CANCELLED");
            }
          },
        });

        if (mounted) {
          setSocketConnected(true);
        }
      } catch (error) {
        console.log(
          "❌ RIDER PROFILE INIT:",
          error?.message
        );
      }
    };

    initialize();

    // Poll active ride only for lifecycle/OTP state.
    // GPS itself comes through the private WebSocket.
    const interval = setInterval(
      async () => {
        if (!mounted) return;

        const ride = await loadActiveRide();

        if (!ride) {
          return;
        }

        const status =
          String(
            ride?.rideStatus ||
              ride?.status ||
              ""
          ).toUpperCase();

        if (status === "COMPLETED") {
          setRideStatus("COMPLETED");
        }
      },
      5000
    );

    return () => {
      mounted = false;
      clearInterval(interval);
      disconnectAdminRideSocket();
    };
  }, [rideId]);

  const openGoogleMaps = async () => {
    if (!pickup) return;

    const origin = riderLocation
      ? `&origin=${riderLocation.latitude},${riderLocation.longitude}`
      : "";

    const url =
      `https://www.google.com/maps/dir/?api=1` +
      origin +
      `&destination=${pickup.latitude},${pickup.longitude}` +
      `&travelmode=driving`;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        "Navigation error",
        "Google Maps could not be opened."
      );
    }
  };

  const riderStatusText =
    rideStatus === "ACCEPTED"
      ? "Rider is coming to pickup"
      : rideStatus === "STARTED"
        ? "Ride is in progress"
        : rideStatus === "COMPLETED"
          ? "Ride completed"
          : rideStatus;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.badge}>
            {rideStatus}
          </Text>

          <Text style={styles.title}>
            {rideStatus === "STARTED"
              ? "Ride in progress"
              : rideStatus === "COMPLETED"
                ? "Ride completed"
                : "Your rider is approaching"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="close"
            size={22}
            color="#111"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.mapCard}>
        <MapView
          style={styles.map}
          region={{
            latitude: mapRegion.latitude,
            longitude: mapRegion.longitude,
            latitudeDelta: 0.035,
            longitudeDelta: 0.035,
          }}
          showsUserLocation={false}
        >
          {pickup && (
            <Marker
              coordinate={pickup}
              title="Pickup / Admin"
              description={pickupAddress}
              pinColor="#6FAF00"
            />
          )}

          {destination && (
            <Marker
              coordinate={destination}
              title="Destination"
              description={dropAddress}
              pinColor="#EF4444"
            />
          )}

          {riderLocation && (
            <Marker
              coordinate={riderLocation}
              title={riderName || `Rider #${riderId || "—"}`}
              description={
                socketConnected
                  ? "Live rider location"
                  : "Waiting for live location"
              }
            >
              <View style={styles.riderMarker}>
                <Text style={styles.riderMarkerText}>
                  🏍️
                </Text>
              </View>
            </Marker>
          )}

          {riderLocation && pickup && (
            <Polyline
              coordinates={[
                riderLocation,
                pickup,
              ]}
              strokeWidth={5}
              strokeColor="#6FAF00"
            />
          )}
        </MapView>

        <View style={styles.livePill}>
          <View
            style={[
              styles.liveDot,
              !socketConnected && styles.offlineDot,
            ]}
          />
          <Text style={styles.liveText}>
            {socketConnected
              ? "LIVE LOCATION"
              : "CONNECTING..."}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.riderRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              🚴
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.smallLabel}>
              ASSIGNED RIDER
            </Text>

            <Text style={styles.riderName}>
              {riderName ||
                `Rider #${riderId || "—"}`}
            </Text>

            <Text style={styles.riderMeta}>
              {riderMobile ||
                `Rider ID: ${riderId || "—"}`}
            </Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <Info
            label="RIDE"
            value={`#${rideId}`}
          />
          <Info
            label="VEHICLE"
            value={
              activeRide?.vehicleName ||
              params?.vehicleName ||
              "Bike"
            }
          />
          <Info
            label="FARE"
            value={`₹${
              activeRide?.fare ??
              params?.fare ??
              0
            }`}
          />
        </View>

        <View style={styles.routeBox}>
          <Text style={styles.routeLabel}>
            PICKUP
          </Text>
          <Text style={styles.routeText}>
            {pickupAddress}
          </Text>

          <Text
            style={[
              styles.routeLabel,
              { marginTop: 12 },
            ]}
          >
            DESTINATION
          </Text>
          <Text style={styles.routeText}>
            {dropAddress}
          </Text>
        </View>

        {rideStatus === "ACCEPTED" ? (
          <View style={styles.otpBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.otpLabel}>
                START RIDE OTP
              </Text>
              <Text style={styles.otpHelp}>
                Tell this 4-digit code to the rider
                when they reach the pickup point.
              </Text>
            </View>

            <Text style={styles.otp}>
              {rideOtp || "----"}
            </Text>
          </View>
        ) : null}

        {rideStatus === "STARTED" ? (
          <View style={styles.startedBox}>
            <View style={styles.greenDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.startedTitle}>
                Rider verified the OTP
              </Text>
              <Text style={styles.startedSub}>
                Live tracking remains active until the ride is completed.
              </Text>
            </View>
          </View>
        ) : null}

        {lastUpdated ? (
          <Text style={styles.updated}>
            Last location update:{" "}
            {lastUpdated.toLocaleTimeString()}
          </Text>
        ) : (
          <Text style={styles.updated}>
            Waiting for rider GPS update...
          </Text>
        )}

        {rideStatus === "ACCEPTED" &&
          pickup && (
            <TouchableOpacity
              style={styles.navigateButton}
              onPress={openGoogleMaps}
            >
              <Ionicons
                name="navigate"
                size={20}
                color="#111"
              />
              <Text style={styles.navigateText}>
                View route to pickup
              </Text>
            </TouchableOpacity>
          )}
      </View>
    </SafeAreaView>
  );
}

function Info({ label, value }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>
      <Text style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    color: "#5C9200",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  title: {
    marginTop: 5,
    fontSize: 25,
    fontWeight: "900",
    color: "#111",
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F4F4F4",
    justifyContent: "center",
    alignItems: "center",
  },
  mapCard: {
    height: 300,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#EEE",
  },
  map: {
    flex: 1,
  },
  livePill: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    marginRight: 7,
  },
  offlineDot: {
    backgroundColor: "#F59E0B",
  },
  liveText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#111",
  },
  riderMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EAFAD5",
    borderWidth: 2,
    borderColor: "#6FAF00",
    justifyContent: "center",
    alignItems: "center",
  },
  riderMarkerText: {
    fontSize: 22,
  },
  card: {
    flex: 1,
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  riderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#F4F4F4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 27,
  },
  smallLabel: {
    fontSize: 9,
    color: "#999",
    fontWeight: "900",
    letterSpacing: 1,
  },
  riderName: {
    marginTop: 3,
    fontSize: 19,
    fontWeight: "900",
    color: "#111",
  },
  riderMeta: {
    marginTop: 3,
    color: "#777",
    fontSize: 12,
  },
  infoGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  info: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    borderRadius: 14,
    padding: 11,
  },
  infoLabel: {
    fontSize: 9,
    color: "#999",
    fontWeight: "900",
    letterSpacing: 1,
  },
  infoValue: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
    color: "#111",
  },
  routeBox: {
    marginTop: 10,
    backgroundColor: "#F8F8F8",
    borderRadius: 15,
    padding: 13,
  },
  routeLabel: {
    fontSize: 9,
    color: "#999",
    fontWeight: "900",
    letterSpacing: 1,
  },
  routeText: {
    marginTop: 4,
    color: "#222",
    fontSize: 13,
    fontWeight: "700",
  },
  otpBox: {
    marginTop: 10,
    backgroundColor: "#F0FFE4",
    borderRadius: 17,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  otpLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#1D1D1D",
    letterSpacing: 1,
  },
  otpHelp: {
    marginTop: 4,
    color: "#777",
    fontSize: 11,
    lineHeight: 16,
  },
  otp: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 3,
    color: "#111",
    marginLeft: 10,
  },
  startedBox: {
    marginTop: 10,
    backgroundColor: "#EAFAD5",
    borderRadius: 17,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
    marginRight: 10,
  },
  startedTitle: {
    fontWeight: "900",
    color: "#111",
  },
  startedSub: {
    marginTop: 3,
    color: "#666",
    fontSize: 11,
  },
  updated: {
    marginTop: 9,
    textAlign: "center",
    color: "#999",
    fontSize: 10,
  },
  navigateButton: {
    marginTop: 10,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#EAFAD5",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  navigateText: {
    fontWeight: "800",
    color: "#111",
  },
});
