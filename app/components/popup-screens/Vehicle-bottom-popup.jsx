import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";

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

import {
  calculateFareApi,
  createRideApi,
  getNearbyRidersApi,
} from "../../../src/api/ride.api";

import { getLocationName } from "../../../src/services/location-service";

const { height } =
  Dimensions.get("window");

const VehiclePopup = ({
  visible,
  onClose,
  from,
  to,
}) => {

  const router = useRouter();

  const slideAnim =
    useRef(
      new Animated.Value(height)
    ).current;

  const backdropOpacity =
    useRef(
      new Animated.Value(0)
    ).current;

  const priceAnim =
    useRef(
      new Animated.Value(0)
    ).current;

  const [
    selectedVehicle,
    setSelectedVehicle,
  ] = useState(null);

  const [
    bikeName,
    setBikeName,
  ] = useState("");

  const [
    chassisNo,
    setChassisNo,
  ] = useState("");

  const [
    fare,
    setFare,
  ] = useState(null);

  const [
    distance,
    setDistance,
  ] = useState(null);

  const [
    loadingFare,
    setLoadingFare,
  ] = useState(false);

  const [
    bookingLoading,
    setBookingLoading,
  ] = useState(false);

  const [
    fareError,
    setFareError,
  ] = useState("");

  const [
    pickupAddress,
    setPickupAddress,
  ] = useState(
    "Pickup location"
  );

  const [
    destinationAddress,
    setDestinationAddress,
  ] = useState(
    "Destination"
  );

  // ==========================================
  // POPUP ANIMATION
  // ==========================================

  useEffect(() => {

    if (visible) {

      Animated.parallel([
        Animated.spring(
          slideAnim,
          {
            toValue: 0,
            useNativeDriver: true,
            tension: 70,
            friction: 12,
          }
        ),

        Animated.timing(
          backdropOpacity,
          {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }
        ),
      ]).start();

    } else {

      Animated.parallel([
        Animated.timing(
          slideAnim,
          {
            toValue: height,
            duration: 250,
            useNativeDriver: true,
          }
        ),

        Animated.timing(
          backdropOpacity,
          {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }
        ),
      ]).start();
    }

  }, [
    visible,
    slideAnim,
    backdropOpacity,
  ]);

  // ==========================================
  // RESET
  // ==========================================

  useEffect(() => {

    if (!visible) {

      setSelectedVehicle(null);
      setBikeName("");
      setChassisNo("");
      setFare(null);
      setDistance(null);
      setFareError("");
      setBookingLoading(false);
      setLoadingFare(false);

      priceAnim.setValue(0);
    }

  }, [
    visible,
    priceAnim,
  ]);

  // ==========================================
  // RESOLVE LOCATIONS
  // ==========================================

  useEffect(() => {

    const resolveLocations =
      async () => {

        if (
          from?.lat !== undefined &&
          from?.lng !== undefined
        ) {

          try {

            const address =
              await getLocationName(
                from.lat,
                from.lng
              );

            setPickupAddress(
              address ||
              "Pickup location"
            );

          } catch {

            setPickupAddress(
              "Pickup location"
            );
          }

        } else {

          setPickupAddress(
            "Pickup location"
          );
        }

        if (
          to?.lat !== undefined &&
          to?.lng !== undefined
        ) {

          try {

            const address =
              await getLocationName(
                to.lat,
                to.lng
              );

            setDestinationAddress(
              address ||
              "Destination"
            );

          } catch {

            setDestinationAddress(
              "Destination"
            );
          }

        } else {

          setDestinationAddress(
            "Destination"
          );
        }
      };

    resolveLocations();

  }, [
    from,
    to,
  ]);

  // ==========================================
  // CALCULATE FARE
  // ==========================================

  const calculateFare =
    async () => {

      if (!from || !to) {

        setFareError(
          "Please select both locations."
        );

        return;
      }

      try {

        setLoadingFare(true);
        setFareError("");
        setFare(null);
        setDistance(null);

        const payload = {

          startLatitude:
            Number(from.lat),

          startLongitude:
            Number(from.lng),

          destinationLatitude:
            Number(to.lat),

          destinationLongitude:
            Number(to.lng),
        };

        console.log("");
        console.log(
          "=========================================="
        );

        console.log(
          "💰 CALCULATING FARE"
        );

        console.log(
          "FROM:",
          payload.startLatitude,
          payload.startLongitude
        );

        console.log(
          "TO:",
          payload.destinationLatitude,
          payload.destinationLongitude
        );

        console.log(
          "=========================================="
        );

        const response =
          await calculateFareApi(
            payload
          );

        const result =
          response?.data;

        console.log(
          "💰 FARE RESPONSE:",
          JSON.stringify(
            result,
            null,
            2
          )
        );

        let returnedFare = null;
        let returnedDistance = null;

        // NUMBER
        if (
          typeof result ===
          "number"
        ) {

          returnedFare =
            result;
        }

        // STRING
        else if (
          typeof result ===
          "string"
        ) {

          const fareMatch =
            result.match(
              /Total Fare:\s*₹\s*([0-9.]+)/i
            );

          const distanceMatch =
            result.match(
              /Distance:\s*([0-9.]+)\s*km?/i
            );

          if (fareMatch) {

            returnedFare =
              Number(
                fareMatch[1]
              );
          }

          if (distanceMatch) {

            returnedDistance =
              Number(
                distanceMatch[1]
              );
          }
        }

        // OBJECT
        else if (
          result &&
          typeof result ===
          "object"
        ) {

          returnedFare =
            result?.fare ??
            result?.price ??
            result?.amount ??
            result?.estimatedFare ??
            null;

          returnedDistance =
            result?.distance ??
            result?.distanceKm ??
            result?.distanceInKm ??
            null;
        }

        // Never invent a production fare on the client.
        // The supplied backend currently documents its fare endpoint as a placeholder.
        if (returnedFare === null || Number.isNaN(Number(returnedFare))) {
          throw new Error("The backend did not return a valid fare. Configure production pricing before booking.");
        }

        setFare(Number(returnedFare));

        setDistance(
          returnedDistance !== null
            ? Number(returnedDistance)
            : null
        );

        Animated.spring(
          priceAnim,
          {
            toValue: 1,
            useNativeDriver: true,
            tension: 80,
            friction: 8,
          }
        ).start();

      } catch (error) {

        console.log(
          "❌ FARE ERROR:",
          error?.response?.data ||
          error?.message
        );

        setFare(null);
        setDistance(null);

        setFareError(
          error?.response?.data?.message ||
          "Unable to calculate fare."
        );

      } finally {

        setLoadingFare(false);
      }
    };

  // ==========================================
  // SELECT VEHICLE
  // ==========================================

  const selectVehicle =
    async (vehicle) => {

      setSelectedVehicle(
        vehicle
      );

      setFare(null);
      setDistance(null);
      setFareError("");

      setBikeName("");
      setChassisNo("");

      Animated.spring(
        priceAnim,
        {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }
      ).start();

      await calculateFare();
    };

  // ==========================================
  // EXTRACT RIDE ID
  // ==========================================

  const extractRideId =
    (responseData) => {

      console.log(
        "🔎 EXTRACTING RIDE ID:",
        responseData
      );

      if (
        responseData &&
        typeof responseData ===
        "object"
      ) {

        return (
          responseData?.rideId ||
          responseData?.id ||
          responseData?.ride?.id ||
          responseData?.data?.rideId ||
          responseData?.data?.id ||
          null
        );
      }

      if (
        typeof responseData ===
        "string"
      ) {

        const idMatch =
          responseData.match(
            /id\s*=\s*(\d+)/i
          );

        if (idMatch) {
          return idMatch[1];
        }

        const rideMatch =
          responseData.match(
            /rideId\s*[:=]\s*(\d+)/i
          );

        if (rideMatch) {
          return rideMatch[1];
        }
      }

      return null;
    };

  // ==========================================
  // CONFIRM RIDE
  // ==========================================

  const handleConfirmRide =
    async () => {

      // --------------------------------------
      // VALIDATION
      // --------------------------------------

      if (!selectedVehicle) {
        setFareError(
          "Please select a vehicle."
        );
        return;
      }

      if (!bikeName.trim()) {
        setFareError(
          "Please enter the bike name."
        );
        return;
      }

      if (!chassisNo.trim()) {
        setFareError(
          "Please enter the chassis number."
        );
        return;
      }

      if (
        fare === null ||
        Number.isNaN(Number(fare))
      ) {
        setFareError(
          "Please wait for the fare to be calculated."
        );
        return;
      }

      if (!from || !to) {
        setFareError(
          "Pickup and destination are required."
        );
        return;
      }

      try {

        setBookingLoading(true);
        setFareError("");

        const token =
          await AsyncStorage.getItem(
            "token"
          );

        if (!token) {
          setFareError(
            "Admin session expired. Please login again."
          );
          return;
        }

        // ======================================
        // STEP 1 — FIND AVAILABLE RIDERS
        // ======================================
        //
        // This is only a pre-flight check.
        // The backend performs the real matching again
        // inside POST /ride/request.
        // ======================================

        const nearbyResponse =
          await getNearbyRidersApi(
            Number(from.lat),
            Number(from.lng),
            token
          );

        const nearbyRiders =
          Array.isArray(
            nearbyResponse?.data
          )
            ? nearbyResponse.data
            : [];

        console.log(
          "👥 AVAILABLE RIDERS:",
          nearbyRiders
        );

        if (nearbyRiders.length === 0) {
          setFareError(
            "No verified rider is available within 10 km of the pickup location."
          );
          return;
        }

        // ======================================
        // STEP 2 — CREATE RIDE REQUEST
        // ======================================
        //
        // Do NOT choose riderId here.
        // The server creates a SENT request for every
        // eligible rider. The first rider to accept wins.
        // ======================================

        const ridePayload = {

          pickUpLatitude:
            Number(from.lat),

          pickUpLongitude:
            Number(from.lng),

          dropLatitude:
            Number(to.lat),

          dropLongitude:
            Number(to.lng),

          fare:
            Number(fare),

          chassisNo:
            chassisNo.trim(),

          vehicleName:
            bikeName.trim() ||
            selectedVehicle,
        };

        console.log("");
        console.log(
          "=========================================="
        );
        console.log(
          "🚀 CREATING DELIVERY REQUEST"
        );
        console.log(
          "📦 PAYLOAD:",
          JSON.stringify(
            ridePayload,
            null,
            2
          )
        );
        console.log(
          "=========================================="
        );

        const response =
          await createRideApi(
            ridePayload,
            token
          );

        console.log(
          "✅ RIDE REQUEST RESPONSE:",
          JSON.stringify(
            response?.data,
            null,
            2
          )
        );

        // ======================================
        // STEP 3 — EXTRACT CREATED RIDE ID
        // ======================================

        const rideId =
          extractRideId(
            response?.data
          );

        console.log(
          "🚗 CREATED RIDE ID:",
          rideId
        );

        if (!rideId) {
          setFareError(
            "Ride was created, but the server did not return a ride ID."
          );
          return;
        }

        // ======================================
        // STEP 4 — SHOW WAITING SCREEN
        // ======================================

        onClose();

        router.push({
          pathname:
            "/ride-monitor",

          params: {
            rideId:
              String(rideId),
          },
        });

      } catch (error) {

        console.log("");
        console.log(
          "=========================================="
        );
        console.log(
          "❌ DELIVERY CREATION FAILED"
        );
        console.log(
          "STATUS:",
          error?.response?.status
        );
        console.log(
          "DATA:",
          JSON.stringify(
            error?.response?.data,
            null,
            2
          )
        );
        console.log(
          "MESSAGE:",
          error?.message
        );
        console.log(
          "=========================================="
        );

        setFareError(
          error?.response?.data?.message ||
          error?.message ||
          "Unable to create delivery."
        );

      } finally {
        setBookingLoading(false);
      }
    };

  // ==========================================
  // UI
  // ==========================================

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >

      <View style={styles.root}>

        <TouchableOpacity
          activeOpacity={1}
          style={
            StyleSheet.absoluteFill
          }
          onPress={onClose}
        >

          <Animated.View
            pointerEvents="none"
            style={[
              styles.backdrop,
              {
                opacity:
                  backdropOpacity,
              },
            ]}
          />

        </TouchableOpacity>

        <Animated.View
          style={[
            styles.container,
            {
              transform: [
                {
                  translateY:
                    slideAnim,
                },
              ],
            },
          ]}
        >

          <View
            style={
              styles.handle
            }
          />

          <Text
            style={
              styles.title
            }
          >
            Create Delivery
          </Text>

          {/* LOCATION */}

          <View
            style={
              styles.locationBox
            }
          >

            <View
              style={
                styles.locationRow
              }
            >

              <View
                style={[
                  styles.locationDot,
                  styles.fromDot,
                ]}
              />

              <View
                style={
                  styles.locationContent
                }
              >

                <Text
                  style={
                    styles.locationLabel
                  }
                >
                  PICKUP
                </Text>

                <Text
                  style={
                    styles.locationValue
                  }
                  numberOfLines={1}
                >
                  {pickupAddress}
                </Text>

              </View>

            </View>

            <View
              style={
                styles.locationLine
              }
            />

            <View
              style={
                styles.locationRow
              }
            >

              <View
                style={[
                  styles.locationDot,
                  styles.toDot,
                ]}
              />

              <View
                style={
                  styles.locationContent
                }
              >

                <Text
                  style={
                    styles.locationLabel
                  }
                >
                  DESTINATION
                </Text>

                <Text
                  style={
                    styles.locationValue
                  }
                  numberOfLines={1}
                >
                  {destinationAddress}
                </Text>

              </View>

            </View>

          </View>

          {/* VEHICLE */}

          <Text
            style={
              styles.sectionTitle
            }
          >
            Choose Vehicle
          </Text>

          <View
            style={
              styles.vehicleRow
            }
          >

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.vehicleCard,
                selectedVehicle ===
                  "Scooty" &&
                  styles.selected,
              ]}
              onPress={() =>
                selectVehicle(
                  "Scooty"
                )
              }
            >

              <Text
                style={
                  styles.vehicleIcon
                }
              >
                🛵
              </Text>

              <Text
                style={
                  styles.vehicleName
                }
              >
                Scooty
              </Text>

            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.vehicleCard,
                selectedVehicle ===
                  "Bike" &&
                  styles.selected,
              ]}
              onPress={() =>
                selectVehicle(
                  "Bike"
                )
              }
            >

              <Text
                style={
                  styles.vehicleIcon
                }
              >
                🏍️
              </Text>

              <Text
                style={
                  styles.vehicleName
                }
              >
                Bike
              </Text>

            </TouchableOpacity>

          </View>

          {/* BIKE NAME */}

          {selectedVehicle && (

            <View
              style={
                styles.inputContainer
              }
            >

              <Text
                style={
                  styles.inputLabel
                }
              >
                Bike Name
              </Text>

              <TextInput
                value={
                  bikeName
                }
                onChangeText={(
                  text
                ) => {

                  setBikeName(
                    text
                  );

                  if (fareError) {
                    setFareError("");
                  }
                }}
                placeholder="Enter bike name"
                placeholderTextColor="#777"
                style={
                  styles.input
                }
                autoCapitalize="words"
              />

            </View>

          )}

          {/* CHASSIS */}

          {selectedVehicle && (

            <View
              style={
                styles.inputContainer
              }
            >

              <Text
                style={
                  styles.inputLabel
                }
              >
                Chassis Number
              </Text>

              <TextInput
                value={
                  chassisNo
                }
                onChangeText={(
                  text
                ) => {

                  setChassisNo(
                    text
                  );

                  if (fareError) {
                    setFareError("");
                  }
                }}
                placeholder="Enter chassis number"
                placeholderTextColor="#777"
                style={
                  styles.input
                }
                autoCapitalize="characters"
              />

            </View>

          )}

          {/* PRICE */}

          {selectedVehicle && (

            <Animated.View
              style={[
                styles.priceBox,
                {
                  opacity:
                    priceAnim,

                  transform: [
                    {
                      translateY:
                        priceAnim.interpolate(
                          {
                            inputRange:
                              [0, 1],

                            outputRange:
                              [20, 0],
                          }
                        ),
                    },
                  ],
                },
              ]}
            >

              <View>

                <Text
                  style={
                    styles.priceTitle
                  }
                >
                  Estimated Fare
                </Text>

                {loadingFare ? (

                  <ActivityIndicator
                    color="#00c853"
                    size="large"
                    style={{
                      marginTop: 10,
                    }}
                  />

                ) : (

                  <Text
                    style={
                      styles.price
                    }
                  >
                    ₹{" "}
                    {fare !== null
                      ? fare
                      : "--"}
                  </Text>
                )}

              </View>

              {distance !== null && (

                <View
                  style={
                    styles.distanceBox
                  }
                >

                  <Text
                    style={
                      styles.distanceText
                    }
                  >
                    {distance} km
                  </Text>

                </View>

              )}

            </Animated.View>

          )}

          {/* ERROR */}

          {!!fareError && (

            <Text
              style={
                styles.errorText
              }
            >
              {fareError}
            </Text>

          )}

          {/* CONFIRM */}

          {selectedVehicle && (

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={
                loadingFare ||
                bookingLoading
              }
              onPress={
                handleConfirmRide
              }
              style={[
                styles.confirmButton,
                (loadingFare ||
                  bookingLoading) &&
                  styles.disabledButton,
              ]}
            >

              {bookingLoading ? (

                <ActivityIndicator
                  color="#fff"
                />

              ) : (

                <Text
                  style={
                    styles.confirmText
                  }
                >
                  Confirm Ride
                </Text>

              )}

            </TouchableOpacity>

          )}

        </Animated.View>

      </View>

    </Modal>
  );
};

export default VehiclePopup;

// ==========================================
// STYLES
// ==========================================

const styles =
  StyleSheet.create({

    root: {
      flex: 1,
      justifyContent:
        "flex-end",
    },

    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor:
        "rgba(0,0,0,0.65)",
    },

    container: {
      height:
        height * 0.72,

      backgroundColor:
        "#1E1E1E",

      borderTopLeftRadius:
        30,

      borderTopRightRadius:
        30,

      paddingHorizontal:
        22,

      paddingTop:
        14,

      paddingBottom:
        30,
    },

    handle: {
      width: 70,
      height: 6,

      backgroundColor:
        "#444",

      borderRadius: 10,

      alignSelf:
        "center",

      marginBottom: 18,
    },

    title: {
      color: "#fff",
      fontSize: 23,
      fontWeight: "700",
      marginBottom: 16,
    },

    locationBox: {
      backgroundColor:
        "#292929",

      borderRadius: 16,

      padding: 14,

      marginBottom: 18,
    },

    locationRow: {
      flexDirection:
        "row",

      alignItems:
        "center",
    },

    locationDot: {
      width: 12,
      height: 12,

      borderRadius: 6,

      marginRight: 12,
    },

    fromDot: {
      backgroundColor:
        "#00c853",
    },

    toDot: {
      backgroundColor:
        "#ff5252",
    },

    locationContent: {
      flex: 1,
    },

    locationLabel: {
      color: "#888",
      fontSize: 10,
      fontWeight: "700",
      marginBottom: 3,
    },

    locationValue: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "500",
    },

    locationLine: {
      width: 1,
      height: 15,

      backgroundColor:
        "#555",

      marginLeft: 5,
      marginVertical: 3,
    },

    sectionTitle: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 10,
    },

    vehicleRow: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",
    },

    vehicleCard: {
      backgroundColor:
        "#2C2C2C",

      width: "48%",

      paddingVertical: 13,

      borderRadius: 18,

      alignItems:
        "center",

      borderWidth: 2,

      borderColor:
        "transparent",
    },

    selected: {
      borderColor:
        "#00c853",

      backgroundColor:
        "#26352C",
    },

    vehicleIcon: {
      fontSize: 27,
    },

    vehicleName: {
      color: "#fff",
      marginTop: 5,
      fontWeight: "600",
    },

    inputContainer: {
      marginTop: 12,
    },

    inputLabel: {
      color: "#aaa",
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 7,
    },

    input: {
      height: 46,

      backgroundColor:
        "#2C2C2C",

      borderRadius: 12,

      paddingHorizontal:
        14,

      color: "#fff",

      fontSize: 14,

      borderWidth: 1,

      borderColor:
        "#444",
    },

    priceBox: {
      marginTop: 15,

      backgroundColor:
        "#2C2C2C",

      padding: 15,

      borderRadius: 18,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    priceTitle: {
      color: "#aaa",
      fontSize: 12,
    },

    price: {
      color: "#00c853",
      fontSize: 28,
      fontWeight: "bold",
      marginTop: 3,
    },

    distanceBox: {
      backgroundColor:
        "#353535",

      paddingHorizontal:
        12,

      paddingVertical:
        8,

      borderRadius: 10,
    },

    distanceText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "600",
    },

    errorText: {
      color: "#ff5252",
      fontSize: 12,
      marginTop: 10,
      textAlign: "center",
    },

    confirmButton: {
      backgroundColor:
        "#00c853",

      padding: 16,

      borderRadius: 16,

      alignItems:
        "center",

      marginTop: 12,
    },

    disabledButton: {
      opacity: 0.5,
    },

    confirmText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 16,
    },

  });