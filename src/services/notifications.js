import { AppState } from "react-native";
import { claimRideNotification, getPushNotifications, syncPushDevice } from "./pushClient";
export const registerForNotifications = () => syncPushDevice();
export const showAdminNotification = async (title, body, data = {}) => {
  if (AppState.currentState !== "active") return;
  try {
    const notifications = await getPushNotifications();
    if (!notifications || !claimRideNotification(data)) return;
    const safeData = { type: data.type, rideId: data.rideId, eventId: data.eventId };
    await notifications.scheduleNotificationAsync({ content: { title, body, data: safeData }, trigger: null });
  } catch {}
};
