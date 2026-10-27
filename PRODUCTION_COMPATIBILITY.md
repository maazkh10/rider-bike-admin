# Backend production compatibility

Branch `ariyaan-changes` is based on the latest `feature/ride-end-otp-back-buttons` commit `1a0cfc9`.
Pair this app with backend `ariyaanshaikh/Rider-Booking-App:production-changes`.

The email confirmation contract is POST /register/confirmToken with {email, otp}; resend is POST /register/verifyEmail with {emailAddress}. Login requires the real password API and never falls back to /sendJWT. Account tokens are saved with the existing SecureStore helper. OTPs remain readable in the backend database.

The fare service converts amountPaise to rupees and distanceMeters to km. Booking retries persist Idempotency-Key, and concurrent taps share one pending request. The booking customer can open hosted checkout after the rider verifies the OTP. Checkout uses a ten-minute ride-scoped session; no account JWT is put in a browser URL. Configure backend APP_PUBLIC_BASE_URL to match EXPO_PUBLIC_API_URL. Operator-only KYC approval navigation uses operationsAccess from /api/profile/me; backend APP_OPERATIONS_USERNAMES identifies trusted existing accounts. ADMIN alone is a customer role, not operator permission.

Expo stays on SDK 54. Explicit Babel transforms support Hermes private fields. .npmrc uses legacy peer resolution and an Expo override prevents a second, incompatible SDK from entering the graph. Compatible security updates and tested CommonJS adapters for the maintained URI decoder/image parser preserve existing Metro/navigation APIs. The lockfile audit now reports zero vulnerabilities; no forced major SDK upgrade is included.

Run `npm ci --ignore-scripts`, `node --test scripts/*.test.cjs`, `npm audit`, and `CI=1 npx expo export --platform android --output-dir dist-production`. CI tests both Android and iOS bundle exports. Contract and lifecycle tests cover registration, rotation, denied permissions, logout, account switching and dependency adapters.

The forgot-password screen now implements email code verification and a single-use reset session. OTPs remain readable in the database. Device registration, refresh, logout cleanup and closed-app notification taps use the matching backend's durable private push queues. Configure EXPO_PUBLIC_EAS_PROJECT_ID (or extra.eas.projectId), FCM/APNs native credentials and EXPO_PUSH_ENABLED on the backend. Install a fresh native build; Expo Go cannot validate remote push. EXPO_ACCESS_TOKEN, if required, is a backend secret only. The backend docs/RECOVERY_AND_NOTIFICATIONS.md is the current setup/operations guide and supersedes older remote-push notes.

Bundle exports and automated tests do not replace physical-device checks: signup/resend/login/reset, notification permissions/background/closed-app taps, dispatch, accept/cancel/rematch, OTP, Razorpay test checkout, reconnect/location, completion and invoices. Notification taps reload authorized current ride state; no OTPs or sensitive account data are sent in remote payloads. Delivery still depends on OS permission/network and cannot bypass Android force-stop. Real payments, production deployment and backend secrets are outside this branch.
