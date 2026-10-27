import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
const KEY = "admin.auth.token";
const push = () => import("./pushClient");
export const setAuthToken = async (token) => {
  if (!token) return;
  const previous = await getAuthToken();
  if (previous && previous !== String(token)) await push().then(client => client.unregisterPushDevice()).catch(() => {});
  await SecureStore.setItemAsync(KEY, String(token));
  await AsyncStorage.removeItem("token");
  void push().then(client => client.resumeDeviceRegistration()).catch(() => {});
};
export const getAuthToken = async () => {
  const secure = await SecureStore.getItemAsync(KEY);
  if (secure) return secure;
  const legacy = await AsyncStorage.getItem("token");
  if (legacy) {
    try { await SecureStore.setItemAsync(KEY, legacy); } catch {}
    await AsyncStorage.removeItem("token");
  }
  return legacy;
};
export const clearAuthToken = async () => {
  await push().then(client => client.unregisterPushDevice()).catch(() => {});
  await SecureStore.deleteItemAsync(KEY);
  await AsyncStorage.removeItem("token");
};
