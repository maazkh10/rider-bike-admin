import axios from "axios";
import { getAuthToken, clearAuthToken } from "../services/authToken";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://rider-booking-app.onrender.com";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

const publicRoutes = [
  "/login",
  "/register",
  "/sendJWT",
  "/register/confirmToken",
  "/register/verifyEmail",
  "/auth/sendotp",
  "/auth/verifyotp",
  "/auth/resetpassword",
  "/health",
];

api.interceptors.request.use(async (config) => {
  const url = config?.url || "";
  const isPublic = publicRoutes.some((route) => url.startsWith(route));

  if (!isPublic) {
    const token = await getAuthToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } else if (config.headers) {
    delete config.headers.Authorization;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      const url = error?.config?.url || "";
      if (!publicRoutes.some((route) => url.startsWith(route))) {
        await clearAuthToken();
      }
    }

    if (__DEV__) {
      console.log(
        "API ERROR",
        error?.response?.status,
        error?.config?.method,
        error?.config?.url,
        error?.response?.data
      );
    }

    return Promise.reject(error);
  }
);

export default api;
