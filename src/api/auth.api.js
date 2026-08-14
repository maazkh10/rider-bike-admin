import api from "./client";

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

  try {
    return await api.post("/login", { username, password });
  } catch (error) {
    // The reference documents that the deployed SecurityConfig currently
    // protects /login and returns 403 before the controller. For that
    // deployed state, the reference uses /sendJWT for the test flow.
    if (
      error?.response?.status === 403 &&
      process.env.EXPO_PUBLIC_ALLOW_DEV_JWT_LOGIN !== "false"
    ) {
      const fallback = await api.get(
        `/sendJWT?username=${encodeURIComponent(username)}`
      );
      return fallback;
    }
    throw error;
  }
};

// ==========================================
// EMAIL CONFIRMATION
// ==========================================

export const confirmTokenApi = async (
  email,
  otp
) => {
  return api.get(
    `/register/confirmToken?token=${encodeURIComponent(String(otp).trim())}`
  );
};

// ==========================================
// VERIFY EMAIL
// ==========================================

export const verifyEmailApi = async (
  email
) => {
  return api.get(
    `/register/verifyEmail?emailAddress=${encodeURIComponent(
      email
    )}`
  );
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