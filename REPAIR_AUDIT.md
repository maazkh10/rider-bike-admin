# Ride lifecycle and payments repair — initial audit

## Scope

Branches created from `main`:
- Rider: `repair/ride-lifecycle-notifications-payments`
- Admin: `repair/ride-lifecycle-notifications-payments`

Main has not been changed.

## Confirmed code-level findings

1. The rider app registers an Expo push token and saves it in AsyncStorage, but the current documented backend has no endpoint to register/store that token and no push-delivery service. Thus connected foreground STOMP notifications are possible, but guaranteed notifications after the app is backgrounded/killed require backend support and an Android/iOS development build.
2. Admin ride creation currently sends the ride request through `POST /ride/request`, while rider acceptance uses `POST /ride/accept`. The mobile flow depends on the deployed backend correctly creating/publishing per-rider request events.
3. Admin `src/api/ride.api.js` contains a temporary random fare fallback (₹300–₹1200) despite its comments elsewhere saying the placeholder fare endpoint must not produce random production fares. This can charge an arbitrary amount and should be removed before payment is enabled.
4. Rider payment summary is fully dummy/static (example delivery and ₹204 total); processing navigates to success after 3 seconds without contacting Razorpay; success screen displays dummy payment/order IDs. This is not real payment integration and must not be treated as paid.
5. Admin ride monitor listens for the private STOMP destination `/user/queue/ride/{rideId}/location` and ride events on `/topic/user/{adminId}`; these destinations must be confirmed against the actual backend configuration.
6. Existing implementation reports explicitly state they did not perform physical-device or deployed-backend end-to-end tests. The live backend and Razorpay account must be tested by the project owner in test mode; no production payment should be triggered during validation.

## Required backend/deployment work

- Add authenticated push-token registration and secure storage for rider devices.
- Publish Expo/FCM/APNs push events on new rider assignment, cancellation, and lifecycle state changes.
- Verify transactional rider matching and single-winner acceptance to prevent two riders accepting the same ride.
- Add server-created Razorpay orders and server-side payment signature verification/webhook reconciliation. Never expose Razorpay secret keys in either Expo app.
- Define when the payment is captured (before ride request vs after completion), refund/cancellation rules, and who pays (customer/admin).
- Harden dev `/sendJWT` path and authorization according to the existing readiness notes before production.

## Validation limits

Repository code and route wiring were inspected through GitHub. This environment did not run the Expo applications on physical devices, confirm the deployed Spring backend's live WebSocket messages, or make a Razorpay transaction. These remain required acceptance tests before claiming production readiness.
