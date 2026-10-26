# Remote push notification backend handoff

## Current mobile behavior

- Rider and admin apps request notification permission and obtain an Expo push token on supported physical-device builds.
- Rider stores its token locally. The admin registration function currently returns its token to the caller.
- WebSocket-driven local notifications only work while the app process and socket are active. A killed/backgrounded app cannot rely on a WebSocket callback to show a notification.
- This repository does not contain the Spring Boot backend, and no documented token-registration endpoint or push-send endpoint was provided.

## Required backend work for reliable app-off notifications

1. Add an authenticated endpoint to register/update the signed-in user's Expo push token, platform, and role (rider/admin). Store tokens against the user, support multiple devices, and remove invalid tokens.
2. Call that endpoint from both apps immediately after Expo token registration and whenever the token changes.
3. On ride events generated server-side (ride request, cancellation, ride started, ride completed), have the backend send a remote push via Expo Push Service to the relevant registered user token(s). Do not depend on the app being connected to a WebSocket.
4. Validate Expo push receipts and deactivate invalid tokens. Keep ride data in notification payloads minimal; authorize every deep-link/API read on the server.
5. Add a server-generated completion OTP only if the business flow requires one. The currently documented mobile API exposes `POST /ride/end` with rideId/riderId but no completion-OTP generation or verification endpoint. Do not fabricate an OTP in the mobile client.

## Verification required before release

- Test on physical Android/iOS devices using EAS development/production builds, not only Expo Go.
- Test foreground, background, terminated-app delivery, denied permissions, token refresh, logout, multiple devices, duplicate events, and invalid Expo tokens.
- Verify backend delivery and receipts with a real registered token. A locally scheduled notification is not proof that remote push works.
