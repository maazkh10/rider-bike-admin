import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForNotifications = async () => {
  if (!Device.isDevice) return null;
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return null;
  try {
    const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
    const response = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return response?.data || null;
  } catch (error) {
    if (__DEV__) console.log("Admin push token error", error?.message);
    return null;
  }
};

export const showAdminNotification = async (title, body, data = {}) => {
  try {
    await Notifications.scheduleNotificationAsync({ content: { title, body, data }, trigger: null });
  } catch (error) {
    if (__DEV__) console.log("Admin notification error", error?.message);
  }
};
