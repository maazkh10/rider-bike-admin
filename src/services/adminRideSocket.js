import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuthToken } from "./authToken";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://rider-booking-app.onrender.com";

let stompClient = null;
let locationSubscription = null;
let rideEventSubscription = null;

export const connectAdminRideSocket = async ({
  rideId,
  adminId,
  onLocation,
  onRideEvent,
}) => {
  const token = await getAuthToken();
  if (!token) throw new Error("Admin authentication token is missing.");

  await disconnectAdminRideSocket();

  stompClient = new Client({
    webSocketFactory: () => new SockJS(`${BASE_URL}/ws`),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: (message) => {
      if (__DEV__) console.log("ADMIN STOMP:", message);
    },
    onConnect: () => {
      if (adminId) {
        rideEventSubscription = stompClient.subscribe(
          `/topic/user/${adminId}`,
          (message) => {
            try {
              onRideEvent?.(JSON.parse(message.body || "{}"));
            } catch (error) {
              if (__DEV__) console.log("Ride event parse error", error?.message);
            }
          }
        );
      }

      if (rideId) {
        subscribeAdminRideLocation(rideId, onLocation);
      }
    },
    onStompError: (frame) => {
      if (__DEV__) console.log("ADMIN STOMP ERROR", frame?.headers?.message);
    },
    onWebSocketError: (error) => {
      if (__DEV__) console.log("ADMIN SOCKET ERROR", error?.message || error);
    },
  });

  stompClient.activate();
};

export const subscribeAdminRideLocation = (rideId, onLocation) => {
  if (!stompClient?.connected || !rideId) return null;

  locationSubscription?.unsubscribe?.();
  locationSubscription = stompClient.subscribe(
    `/user/queue/ride/${rideId}/location`,
    (message) => {
      try {
        const data = JSON.parse(message.body || "{}");
        if (data?.type === "RIDER_LOCATION_UPDATED" || data?.latitude != null) {
          onLocation?.(data);
        }
      } catch (error) {
        if (__DEV__) console.log("Location parse error", error?.message);
      }
    }
  );

  return locationSubscription;
};

export const disconnectAdminRideSocket = async () => {
  locationSubscription?.unsubscribe?.();
  locationSubscription = null;
  rideEventSubscription?.unsubscribe?.();
  rideEventSubscription = null;

  if (stompClient) {
    try {
      await stompClient.deactivate();
    } catch (error) {
      if (__DEV__) console.log("Socket disconnect error", error?.message);
    }
    stompClient = null;
  }
};
