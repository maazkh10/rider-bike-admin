import { AppState } from "react-native";
import { getPushNotifications, syncPushDevice } from "./pushClient";
export const registerForNotifications = () => syncPushDevice();
export const showAdminNotification = async (title, body, data = {}) => {
  if (AppState.currentState !== "active") return;
  try {
    const notifications = await getPushNotifications();
    await notifications?.scheduleNotificationAsync({ content: { title, body, data }, trigger: null });
  } catch {}
};
