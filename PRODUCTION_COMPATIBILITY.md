# Backend production compatibility

Branch `ariyaan-changes` is based on the latest `feature/ride-end-otp-back-buttons` commit `1a0cfc9`.
Pair this app with backend `ariyaanshaikh/Rider-Booking-App:production-changes`.

The email confirmation contract is POST /register/confirmToken with {email, otp}; resend is POST /register/verifyEmail with {emailAddress}. Login requires the real password API and never falls back to /sendJWT. Account tokens are saved with the existing SecureStore helper. OTPs remain readable in the backend database.

The fare service converts amountPaise to rupees and distanceMeters to km. Booking retries persist Idempotency-Key, and concurrent taps share one pending request. The booking customer can open hosted checkout after the rider verifies the OTP. Checkout uses a ten-minute ride-scoped session; no account JWT is put in a browser URL. Configure backend APP_PUBLIC_BASE_URL to match EXPO_PUBLIC_API_URL. Operator-only KYC approval navigation uses operationsAccess from /api/profile/me; backend APP_OPERATIONS_USERNAMES identifies trusted existing accounts. ADMIN alone is a customer role, not operator permission.

Expo stays on SDK 54. Explicit Babel transforms support Hermes private fields. .npmrc uses legacy peer resolution and an Expo override prevents a second, incompatible SDK from entering the graph. Compatible security updates are in package-lock.json; remaining audit findings require review before release. No forced major SDK upgrade is included.

Run `npm ci --ignore-scripts`, `node --test scripts/api-contract.test.cjs`, and `CI=1 npx expo export --platform android --output-dir dist-production`. CI runs the same checks.

Bundle exports and service contract tests do not replace physical-device checks: signup/resend/login, dispatch, accept/cancel/rematch, OTP, Razorpay test checkout, reconnect/location, completion and invoices. Real payments, production deployment and backend secrets are outside this branch. Existing remote-push documentation still applies; durable background delivery requires backend push-token registration and a delivery worker.
