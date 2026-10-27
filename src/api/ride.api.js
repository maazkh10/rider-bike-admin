import { getAuthToken } from "../services/authToken";
import api from "./client";
import AsyncStorage from "@react-native-async-storage/async-storage";

const inFlightBookings = new Map();
export const createRideApi = (payload, ...args) => {
  const fingerprint = JSON.stringify(payload);
  if (inFlightBookings.has(fingerprint)) return inFlightBookings.get(fingerprint);
  const request = (async () => {
    const token = args[0] || await getAuthToken();
    const profile = await getAdminProfileApi(token);
    const storageKey = `pendingBooking:${profile.data.userId}`;
    const previous = JSON.parse(await AsyncStorage.getItem(storageKey) || "null");
    const key = previous?.fingerprint === fingerprint ? previous.key : `booking_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify({ fingerprint, key }));
    const response = await createRideRequest({ ...payload, idempotencyKey: key }, token);
    await AsyncStorage.removeItem(storageKey);
    return response;
  })();
  inFlightBookings.set(fingerprint, request);
  request.finally(() => inFlightBookings.delete(fingerprint)).catch(() => {});
  return request;
};

export const openRidePaymentApi = async (rideId) => {
  const response = await api.post(`/api/payments/rides/${Number(rideId)}/checkout-session`, {});
  const url = new URL(response.data.checkoutUrl);
  const base = new URL(api.defaults.baseURL);
  if (url.origin !== base.origin || url.pathname !== "/payment-checkout.html") throw new Error("Unexpected checkout address.");
  const browser = await import("expo-web-browser");
  return browser.openBrowserAsync(url.toString());
};

// ==========================================
// AUTH CONFIG
// ==========================================

export const getAuthConfig = async (token = null) => {

  const authToken =
    token ||
    await getAuthToken();

  if (!authToken) {
    throw new Error(
      "Admin authentication token not found."
    );
  }

  return {
    headers: {
      Authorization:
        `Bearer ${authToken}`,

      Accept:
        "application/json",

      "Content-Type":
        "application/json",
    },
  };
};

// ==========================================
// FIND NEARBY RIDERS
// ==========================================
//
// This is the admin-side availability check.
// The backend only considers VERIFIED + AVAILABLE
// riders with a fresh location inside 10 km.
//
// IMPORTANT:
// This does NOT assign a rider.
// POST /ride/request is still the authoritative
// dispatch operation and the backend creates the
// RIDE_REQUEST rows for eligible riders.
// ==========================================

export const getNearbyRidersApi = async (
  latitude,
  longitude,
  token = null
) => {
  try {
    const config =
      await getAuthConfig(token);

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (
      Number.isNaN(lat) ||
      Number.isNaN(lon)
    ) {
      throw new Error(
        "Invalid pickup coordinates."
      );
    }

    console.log("");
    console.log(
      "=========================================="
    );
    console.log(
      "🔎 FINDING NEARBY RIDERS"
    );
    console.log(
      "📍 PICKUP:",
      lat,
      lon
    );
    console.log(
      "=========================================="
    );

    const response =
      await api.get(
        "/rider/nearby",
        {
          ...config,
          params: {
            lat,
            lon,
          },
        }
      );

    console.log(
      "👥 NEARBY RIDERS RESPONSE:"
    );

    console.log(
      JSON.stringify(
        response?.data,
        null,
        2
      )
    );

    return response;

  } catch (error) {

    console.log(
      "❌ FIND NEARBY RIDERS ERROR:",
      error?.response?.data ||
      error?.message
    );

    throw error;
  }
};

// ==========================================
// CALCULATE FARE
// ==========================================
// The server quote uses integer paise and meters; screens display rupees and km.
export const calculateFareApi = async ({
  startLatitude,
  startLongitude,
  destinationLatitude,
  destinationLongitude,
}) => {
  const response = await api.get("/api/fare/calculate", {
    params: {
      sLat: Number(startLatitude),
      sLon: Number(startLongitude),
      dLat: Number(destinationLatitude),
      dLon: Number(destinationLongitude),
    },
  });

  const raw = response?.data;
  let fare = null;
  let distance = null;

  if (typeof raw === "number") {
    fare = raw;
  } else if (typeof raw === "string") {
    const fareMatch = raw.match(/(?:Total\\s*Fare|Fare)\\s*:\\s*₹?\\s*([0-9]+(?:\\.[0-9]+)?)/i);
    const distanceMatch = raw.match(/Distance\\s*:\\s*([0-9]+(?:\\.[0-9]+)?)/i);
    if (fareMatch) fare = Number(fareMatch[1]);
    if (distanceMatch) distance = Number(distanceMatch[1]);
  } else if (raw && typeof raw === "object") {
    const candidate = raw.amountPaise != null ? Number(raw.amountPaise) / 100 : raw.fare ?? raw.totalFare ?? raw.amount ?? raw.estimatedFare;
    fare = candidate == null ? null : Number(candidate);
    const distanceCandidate = raw.distanceMeters != null ? Number(raw.distanceMeters) / 1000 : raw.distance ?? raw.distanceKm ?? raw.distanceInKm;
    distance = distanceCandidate == null ? null : Number(distanceCandidate);
  }

  if (!Number.isFinite(fare) || fare <= 0) {
    throw new Error(
      "Fare service did not return a valid quote. Please calculate again before booking."
    );
  }

  if (!Number.isFinite(distance) || distance <= 0) distance = null;
  return { ...response, data: { raw, fare, distance } };
};

// ==========================================
// CREATE RIDE
// ==========================================
//
// IMPORTANT:
//
// DO NOT TRUST adminId FROM UI.
//
// We get the real logged-in admin
// from /api/profile/me.
//
// Your current admin profile returns:
//
// userId: 71
//
// Therefore:
//
// adminId = 71
//
// ==========================================

const createRideRequest = async (
  ridePayload,
  token
) => {

  try {

    console.log("");
    console.log("==========================================");
    console.log("🚚 CREATE RIDE REQUEST");
    console.log("==========================================");

    if (!token) {
      throw new Error(
        "Admin authentication token not found."
      );
    }

    // ======================================
    // GET REAL ADMIN PROFILE
    // ======================================

    console.log(
      "👤 GETTING LOGGED-IN ADMIN PROFILE..."
    );

    const profileResponse =
      await api.get(
        "/api/profile/me",
        {
          headers: {
            Authorization:
              `Bearer ${token}`,

            Accept:
              "application/json",
          },
        }
      );

    const adminProfile =
      profileResponse?.data;

    console.log("");
    console.log(
      "🔥 ADMIN PROFILE:"
    );

    console.log(
      JSON.stringify(
        adminProfile,
        null,
        2
      )
    );

    // ======================================
    // GET REAL USER ID
    // ======================================

    const realAdminId =
      adminProfile?.userId;

    console.log(
      "🔥 REAL ADMIN USER ID:",
      realAdminId
    );

    if (!realAdminId) {

      throw new Error(
        "Admin userId was not found from /api/profile/me."
      );
    }

    if (
      Number.isNaN(
        Number(realAdminId)
      )
    ) {

      throw new Error(
        "Admin userId is not numeric."
      );
    }

    // ======================================
    // FINAL PAYLOAD
    // ======================================

    const payload = {

      pickUpLatitude:
        Number(
          ridePayload?.pickUpLatitude
        ),

      pickUpLongitude:
        Number(
          ridePayload?.pickUpLongitude
        ),

      dropLatitude:
        Number(
          ridePayload?.dropLatitude
        ),

      dropLongitude:
        Number(
          ridePayload?.dropLongitude
        ),

      fare:
        Number(
          ridePayload?.fare
        ),

      chassisNo:
        String(
          ridePayload?.chassisNo || ""
        ).trim(),

      vehicleName:
        String(
          ridePayload?.vehicleName || ""
        ).trim(),

      // ⭐ REAL ADMIN ID
      adminId:
        Number(realAdminId),
    };

    console.log("");
    console.log(
      "=========================================="
    );

    console.log(
      "📦 FINAL RIDE REQUEST PAYLOAD"
    );

    console.log(
      JSON.stringify(
        payload,
        null,
        2
      )
    );

    console.log(
      "=========================================="
    );

    // ======================================
    // VALIDATION
    // ======================================

    if (
      Number.isNaN(
        payload.pickUpLatitude
      ) ||
      Number.isNaN(
        payload.pickUpLongitude
      ) ||
      Number.isNaN(
        payload.dropLatitude
      ) ||
      Number.isNaN(
        payload.dropLongitude
      )
    ) {

      throw new Error(
        "Invalid pickup/drop coordinates."
      );
    }

    if (
      Number.isNaN(
        payload.fare
      )
    ) {

      throw new Error(
        "Invalid fare."
      );
    }

    if (
      !payload.chassisNo
    ) {

      throw new Error(
        "Chassis number is required."
      );
    }

    if (
      !payload.vehicleName
    ) {

      throw new Error(
        "Vehicle name is required."
      );
    }

    // ======================================
    // CREATE RIDE
    // ======================================

    const response =
      await api.post(
        "/ride/request",
        payload,
        {
          headers: {
            "Idempotency-Key": ridePayload.idempotencyKey,
            Authorization:
              `Bearer ${token}`,

            Accept:
              "application/json",

            "Content-Type":
              "application/json",
          },
        }
      );

    console.log("");
    console.log(
      "=========================================="
    );

    console.log(
      "✅ RIDE CREATED"
    );

    console.log(
      "STATUS:",
      response?.status
    );

    console.log(
      "DATA:",
      JSON.stringify(
        response?.data,
        null,
        2
      )
    );

    console.log(
      "=========================================="
    );

    return response;

  } catch (error) {

    console.log("");
    console.log(
      "=========================================="
    );

    console.log(
      "❌ CREATE RIDE ERROR"
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

    throw error;
  }
};

// ==========================================
// GET ADMIN PROFILE
// ==========================================

export const getAdminProfileApi = async (token) => {
  const authToken =
    token || (await getAuthToken());

  if (!authToken) {
    throw new Error("Admin authentication token not found.");
  }

  return api.get(
    "/api/profile/me",
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );
};

// ==========================================
// GET ADMIN ACTIVE RIDE
//
// IMPORTANT:
// Do NOT send rideId.
// The backend resolves the booking admin from JWT.
// ==========================================

export const getActiveRideApi = async (token) => {
  const authToken =
    token || (await getAuthToken());

  if (!authToken) {
    throw new Error("Admin authentication token not found.");
  }

  console.log("==========================================");
  console.log("🔎 GET ADMIN ACTIVE RIDE");
  console.log("==========================================");

  return api.get(
    "/api/profile/me/active-ride",
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );
};


// ==========================================
// CURRENT ADMIN RIDES / INVOICES
// ==========================================

export const getAdminRidesApi = async (token = null) => {
  const config = await getAuthConfig(token);
  return api.get("/api/profile/me/rides", config);
};

export const getAdminInvoicesApi = async (token = null) => {
  const config = await getAuthConfig(token);
  return api.get("/api/profile/me/invoices", config);
};


// ==========================================
// RIDER VERIFICATION (ADMIN)
// ==========================================

export const saveRiderVerificationApi = async (riderId, data) => {
  const config = await getAuthConfig();
  return api.post(
    `/rider/${Number(riderId)}/verification-details`,
    {
      aadhaarCardNumber: String(data.aadhaarCardNumber || "").trim(),
      panCardNumber: String(data.panCardNumber || "").trim().toUpperCase(),
      drivingLicenseNumber: String(data.drivingLicenseNumber || "").trim().toUpperCase(),
      bankAccountNumber: String(data.bankAccountNumber || "").trim(),
      bankIfscCode: String(data.bankIfscCode || "").trim().toUpperCase(),
      bankAccountName: String(data.bankAccountName || "").trim(),
    },
    config
  );
};

export const getRiderVerificationApi = async (riderId) => {
  const config = await getAuthConfig();
  return api.get(
    `/rider/${Number(riderId)}/verification-details`,
    config
  );
};

export const setRiderVerifiedApi = async (riderId, verified) => {
  const config = await getAuthConfig();
  return api.patch(
    `/rider/${Number(riderId)}/verification`,
    null,
    {
      ...config,
      params: { verified: Boolean(verified) },
    }
  );
};
