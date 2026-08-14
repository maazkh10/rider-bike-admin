import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getAuthToken } from "../../../src/api/auth.api";

import {
  getActiveRideApi,
  getAdminProfileApi,
} from "../../../src/api/ride.api.js";

const { height, width } = Dimensions.get("window");

const getRideId = (ride) =>
  ride?.rideId ?? ride?.id ?? null;

export default function RiderLoading() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const rideId = Array.isArray(params?.rideId)
    ? params.rideId[0]
    : params?.rideId;

  const slideUp = useRef(new Animated.Value(height)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.6)).current;

  const redirected = useRef(false);
  const checking = useRef(false);

  const [dots, setDots] = useState(".");
  const [error, setError] = useState("");

  const openAssignedRide = async (activeRide, data) => {
    if (redirected.current) return;

    const returnedRideId = getRideId(activeRide);

    if (
      rideId &&
      returnedRideId &&
      String(rideId) !== String(returnedRideId)
    ) {
      console.log(
        "⚠️ ACTIVE RIDE DOES NOT MATCH REQUESTED RIDE:",
        rideId,
        returnedRideId
      );
      return;
    }

    const status = String(
      activeRide?.rideStatus ||
        activeRide?.status ||
        ""
    ).toUpperCase();

    if (!["ACCEPTED", "STARTED"].includes(status)) {
      return;
    }

    redirected.current = true;

    const riderId =
      activeRide?.riderId ||
      activeRide?.rider?.riderId ||
      activeRide?.rider?.id ||
      "";

    const otp =
      data?.rideOtp ||
      activeRide?.rideOtp ||
      activeRide?.otp ||
      "";

    const adminProfile = await getAdminProfileApi();

    const adminId =
      adminProfile?.data?.userId ||
      adminProfile?.data?.id ||
      "";

    await AsyncStorage.setItem(
      "activeRide",
      JSON.stringify(activeRide)
    );

    if (otp) {
      await AsyncStorage.setItem(
        "rideOtp",
        String(otp)
      );
    }

    router.replace({
      pathname: "/components/popup-screens/Riderprofile",
      params: {
        rideId: String(returnedRideId || rideId),
        riderId: riderId ? String(riderId) : "",
        otp: otp ? String(otp) : "",
        adminId: adminId ? String(adminId) : "",
        vehicleName: activeRide?.vehicleName || "",
        fare:
          activeRide?.fare != null
            ? String(activeRide.fare)
            : "",
        chassisNo: activeRide?.chassisNo || "",
        pickupLatitude:
          activeRide?.pickupLatitude != null
            ? String(activeRide.pickupLatitude)
            : "",
        pickupLongitude:
          activeRide?.pickupLongitude != null
            ? String(activeRide.pickupLongitude)
            : "",
        dropLatitude:
          activeRide?.dropLatitude != null
            ? String(activeRide.dropLatitude)
            : "",
        dropLongitude:
          activeRide?.dropLongitude != null
            ? String(activeRide.dropLongitude)
            : "",
        rideStatus: status,
      },
    });
  };

  const checkActiveRide = async () => {
    if (checking.current || redirected.current) return;

    checking.current = true;

    try {
      const token = await getAuthToken();

      if (!token) {
        setError("Admin session expired.");
        return;
      }

      console.log("==========================================");
      console.log("🔎 CHECKING RIDE STATUS");
      console.log("🚗 REQUESTED RIDE ID:", rideId);
      console.log("==========================================");

      const response = await getActiveRideApi(token);

      console.log(
        "📦 ADMIN ACTIVE RIDE:",
        JSON.stringify(response?.data, null, 2)
      );

      const activeRide = response?.data?.activeRide;

      if (!activeRide) {
        return;
      }

      await openAssignedRide(
        activeRide,
        response?.data
      );
    } catch (error) {
      console.log(
        "❌ ACTIVE RIDE CHECK:",
        error?.response?.data || error?.message
      );

      if (error?.response?.status === 401) {
        await AsyncStorage.multiRemove([
          "token",
          "userId",
          "activeRide",
          "rideOtp",
        ]);
        router.replace("/(auth)/login");
      }
    } finally {
      checking.current = false;
    }
  };

  useEffect(() => {
    if (!rideId) {
      setError("Ride ID was not found.");
      return;
    }

    checkActiveRide();

    const interval = setInterval(
      checkActiveRide,
      2000
    );

    return () => clearInterval(interval);
  }, [rideId]);

  useEffect(() => {
    Animated.spring(slideUp, {
      toValue: 0,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.timing(progress, {
        toValue: width - 100,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: -4,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.6,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const dotInterval = setInterval(() => {
      setDots((prev) =>
        prev.length >= 5 ? "." : `${prev}.`
      );
    }, 500);

    return () => clearInterval(dotInterval);
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideUp }],
        },
      ]}
    >
      <View style={styles.handle} />

      <View style={styles.iconCircle}>
        <Text style={styles.icon}>🏍️</Text>
      </View>

      <Text style={styles.title}>
        Your rider is{"\n"}getting assigned
      </Text>

      <Animated.View
        style={[
          styles.barWrapper,
          { opacity: glow },
        ]}
      >
        <View style={styles.bar}>
          <Animated.Text
            style={[
              styles.bike,
              {
                transform: [
                  { translateX: progress },
                  { translateY: bounce },
                ],
              },
            ]}
          >
            🏍️
          </Animated.Text>
        </View>
      </Animated.View>

      <Text style={styles.sub}>
        Finding nearest delivery partner{dots}
      </Text>

      <View style={styles.statusBox}>
        <ActivityIndicator
          size="small"
          color="#BBFF5B"
        />
        <Text style={styles.statusText}>
          Waiting for rider acceptance
        </Text>
      </View>

      {!!error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: "70%",
    backgroundColor: "#000",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    justifyContent: "center",
  },
  handle: {
    width: 50,
    height: 5,
    backgroundColor: "#666",
    borderRadius: 10,
    alignSelf: "center",
    marginBottom: 30,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#1A1A1A",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 25,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 25,
    color: "#fff",
  },
  barWrapper: {
    backgroundColor: "#1a1a1a",
    padding: 12,
    borderRadius: 20,
  },
  bar: {
    height: 18,
    backgroundColor: "#BBFF5B",
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "center",
  },
  bike: {
    position: "absolute",
    fontSize: 24,
  },
  sub: {
    textAlign: "center",
    marginTop: 20,
    color: "#BBFF5B",
    fontSize: 17,
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,
    gap: 10,
  },
  statusText: {
    color: "#888",
    fontSize: 13,
  },
  errorText: {
    color: "#FF5252",
    textAlign: "center",
    marginTop: 20,
    fontSize: 13,
  },
});
