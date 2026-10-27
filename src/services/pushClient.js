import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import { AppState, Platform } from "react-native";
import { getAuthToken } from "./authToken";

const APP = "admin";
const BASE = process.env.EXPO_PUBLIC_API_URL || "https://rider-booking-app.onrender.com";
const INSTALLATION = APP + ".push.installation";
let modulePromise, inFlight, paused = false, lastRegistration = "", lastAt = 0, onOpen, permissionRequested = false;
const opened = new Set();

export const getPushNotifications = async () => {
  if (Platform.OS === "web" || Constants.executionEnvironment === "storeClient") return null;
  if (!modulePromise) modulePromise = import("expo-notifications").catch(() => null);
  return modulePromise;
};
const installationId = async () => {
  let id = await AsyncStorage.getItem(INSTALLATION);
  if (!id) { id = Crypto.randomUUID(); await AsyncStorage.setItem(INSTALLATION, id); }
  return id;
};
const request = async (path, method, token, body) => {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(BASE + path, { method, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, signal: controller.signal });
    if (!response.ok) throw Error("Notification registration unavailable");
    return response;
  } finally { clearTimeout(timer); }
};
const handleResponse = async (response) => {
  const data = response?.notification?.request?.content?.data;
  const id = Number(data?.rideId);
  if (!Number.isSafeInteger(id) || id < 1) return;
  const key = String(data.eventId || response.notification.request.identifier);
  if (opened.has(key)) return;
  if (!(await getAuthToken())) { await AsyncStorage.setItem(APP + ".pendingNotification", JSON.stringify(data)); return; }
  const previous = JSON.parse(await AsyncStorage.getItem(APP + ".openedNotifications") || "[]");
  if (previous.includes(key)) return;
  await AsyncStorage.setItem(APP + ".openedNotifications", JSON.stringify([key, ...previous].slice(0, 100)));
  opened.add(key); if (opened.size > 100) opened.delete(opened.values().next().value);
  onOpen?.({ ...data, rideId: id });
};
const pending = async () => {
  const raw = await AsyncStorage.getItem(APP + ".pendingNotification");
  if (!raw || !(await getAuthToken())) return;
  await AsyncStorage.removeItem(APP + ".pendingNotification");
  try { const data = JSON.parse(raw); await handleResponse({ notification: { request: { identifier: data.eventId, content: { data } } } }); } catch {}
};
export const syncPushDevice = async () => {
  if (paused) return null;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const auth = await getAuthToken(), notifications = await getPushNotifications();
    if (!auth || !notifications || !Device.isDevice) return null;
    if (Platform.OS === "android") {
      for (const channel of ["ride-requests", "ride-status"]) await notifications.setNotificationChannelAsync(channel, { name: channel === "ride-requests" ? "Ride requests" : "Ride status", importance: notifications.AndroidImportance.HIGH, sound: "default" });
    }
    const permission = await notifications.getPermissionsAsync();
    let status = permission.status;
    if (status !== "granted" && !permissionRequested && permission.canAskAgain !== false) {
      permissionRequested = true;
      status = (await notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return null;
    const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    if (!projectId) return null;
    const token = (await notifications.getExpoPushTokenAsync({ projectId })).data;
    if (!token || paused || auth !== await getAuthToken()) return null;
    if (lastRegistration !== auth + ":" + token || Date.now() - lastAt > 21600000) {
      await request("/api/notifications/devices", "PUT", auth, { app: APP, installationId: await installationId(), token, platform: Platform.OS });
      lastRegistration = auth + ":" + token; lastAt = Date.now();
    }
    await pending();
    return token;
  })().catch(() => null).finally(() => { inFlight = null; });
  return inFlight;
};
export const resumeDeviceRegistration = () => { paused = false; lastRegistration = ""; void syncPushDevice(); };
export const unregisterPushDevice = async () => {
  paused = true;
  if (inFlight) await inFlight;
  const auth = await getAuthToken(), id = await AsyncStorage.getItem(INSTALLATION);
  lastRegistration = ""; lastAt = 0;
  if (auth && id) await request("/api/notifications/devices/" + APP + "/" + encodeURIComponent(id), "DELETE", auth).catch(() => {});
  await AsyncStorage.removeItem(APP + ".pendingNotification");
};
export const startPushLifecycle = async (open) => {
  onOpen = open;
  const notifications = await getPushNotifications();
  if (!notifications) return () => {};
  notifications.setNotificationHandler({ handleNotification: async (notification) => {
    const show = !notification.request.content.data?.remote || AppState.currentState !== "active";
    return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
  } });
  const response = notifications.addNotificationResponseReceivedListener(value => { void handleResponse(value); });
  const token = notifications.addPushTokenListener(() => { lastRegistration = ""; void syncPushDevice(); });
  const active = AppState.addEventListener("change", state => { if (state === "active") { void syncPushDevice(); void pending(); } });
  const timer = setInterval(() => { if (AppState.currentState === "active") void syncPushDevice(); }, 60000);
  await handleResponse(await notifications.getLastNotificationResponseAsync());
  void syncPushDevice(); void pending();
  return () => { response.remove(); token.remove(); active.remove(); clearInterval(timer); onOpen = null; };
};
