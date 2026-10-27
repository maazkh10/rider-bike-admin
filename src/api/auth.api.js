import api from "./client";
export { getAuthToken } from "../services/authToken";

// ==========================================
// REGISTER
// ==========================================

export const signupApi = async (data) => {
  try {
    console.log("==================================");
    console.log("📝 REGISTER API");
    console.log("==================================");

    const response = await api.post(
      "/register",
      data
    );

    console.log(
      "✅ REGISTER RESPONSE:",
      response?.data
    );

    return response;
  } catch (error) {
    console.log("==================================");
    console.log("❌ REGISTER ERROR");
    console.log(
      "STATUS:",
      error?.response?.status
    );
    console.log(
      "DATA:",
      error?.response?.data
    );
    console.log(
      "MESSAGE:",
      error?.message
    );
    console.log("==================================");

    throw error;
  }
};

// ==========================================
// LOGIN
// ==========================================

export const loginApi = async (data) => {
  const username = String(data?.username || "").trim();
  const password = String(data?.password || "");

  if (!username || !password) {
    throw new Error("Username and password are required.");
  }

  return api.post("/login", { username, password });
};

// ==========================================
// EMAIL CONFIRMATION
// ==========================================

export const confirmTokenApi = async (
  email,
  otp
) => {
  return api.post("/register/confirmToken", { email: String(email).trim(), otp: String(otp).trim() });
};

// ==========================================
// VERIFY EMAIL
// ==========================================

export const verifyEmailApi = async (
  email
) => {
  return api.post("/register/verifyEmail", { emailAddress: String(email).trim() });
};

// ==========================================
// FORGOT PASSWORD
// ==========================================

export const sendotp = async (data) => {
  return api.post(
    "/auth/sendotp",
    data
  );
};

export const verifyotp = async (data) => {
  return api.post(
    "/auth/verifyotp",
    data
  );
};

export const changepassword = async (
  data
) => {
  return api.post(
    "/auth/resetpassword",
    data
  );
};
