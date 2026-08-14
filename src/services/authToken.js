import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
const KEY = "admin.auth.token";
export const setAuthToken = async (token) => { if (!token) return; await SecureStore.setItemAsync(KEY, String(token)); await AsyncStorage.removeItem("token"); };
export const getAuthToken = async () => { const secure = await SecureStore.getItemAsync(KEY); if (secure) return secure; const legacy = await AsyncStorage.getItem("token"); if (legacy) { try { await SecureStore.setItemAsync(KEY, legacy); } catch {} await AsyncStorage.removeItem("token"); } return legacy; };
export const clearAuthToken = async () => { await SecureStore.deleteItemAsync(KEY); await AsyncStorage.removeItem("token"); };
