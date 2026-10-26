# Ride lifecycle and payments repair — updated audit

## Separate app repositories and release targets

- Rider app repository: `maazkh10/rider-bike-rider`
- Admin app repository: `maazkh10/rider-bike-admin`
- Both repair branches: `repair/ride-lifecycle-notifications-payments`
- Rider distribution target: Google Play Store (Android only)
- Admin distribution target: Apple App Store and Google Play Store (iOS and Android)
- Payment requirement: customer pays after ride completion.
- Notification requirement: rider should receive ride notifications while app is open, backgrounded, and closed.

The two applications remain separate projects and must be built/released separately. Their app identifiers are already distinct: `com.bikerider.rider` and `com.bikerider.admin`.

## Confirmed code-level findings

1. Rider app can generate and locally store an Expo push token in a supported development/standalone build. The backend reference does not document a token-registration endpoint or remote push delivery, so a token alone does not provide background/killed-app notifications.
2. Admin ride creation calls `POST /ride/request`; rider acceptance calls `POST /ride/accept`. These routes and event publication need a live end-to-end test against the deployed Spring backend.
3. The admin random fare fallback has been removed on the repair branch. If the backend fare endpoint does not return a valid positive fare, the client now fails closed rather than inventing a price.
4. Rider payment screens no longer fabricate a successful payment, payment/order IDs, or a sample payable amount. Real Razorpay checkout is not implemented yet.
5. Admin ride monitor uses `/topic/user/{adminId}` for ride events and `/user/queue/ride/{rideId}/location` for private live location updates. Confirm the live backend authorizes and publishes to these destinations.
6. Repository comparison confirms the rider repair branch is 9 commits ahead of its own `main`, and the admin repair branch is 6 commits ahead of its own `main`; neither branch is behind. No automated GitHub Actions test runs were found for these commits.

## Required backend/deployment work

- Share/access the backend repository to implement and test missing server features; the two mobile repositories do not contain the Spring backend source.
- Add authenticated device push-token registration, storage, and Expo push delivery for new ride assignment and ride lifecycle changes. Test Android and iOS; do not treat local notifications as remote push delivery.
- Verify ride matching and single-winner acceptance on the server so two riders cannot accept the same ride.
- Implement server-created Razorpay orders and server-side signature verification plus webhook reconciliation. Capture/confirm the customer payment after ride completion as required, and define failure, cancellation, refund, and duplicate-webhook behavior.
- Ensure the payable amount is calculated and validated by the server, not trusted from client parameters.
- Never expose Razorpay key secrets in the rider/admin app or any `EXPO_PUBLIC_*` variable.
- Confirm the EAS project ID for each app, configure store signing/build credentials, and use separate Android-only production builds for the rider and iOS+Android builds for admin.
- Review authentication and the development `/sendJWT` path before production release.

## Validation still required

No physical-device build, deployed-backend end-to-end ride, background push delivery, or Razorpay sandbox transaction was executed during repository review. Do not merge/release as production-ready until those tests pass.


## Revised backend document findings (26 October 2026)

The updated API reference does document `PUT /ride/paymentCompleted?rideId={rideId}&paymentCompleted=COMPLETED`. This is a payment-status persistence endpoint, **not a complete Razorpay integration**. The same reference says it lacks endpoint role/ownership checks, does not verify provider payment status/body, and can update any ride. It also says the `RIDE_DETAILS.PAYMENT_COMPLETED` and `RIDE_DETAILS.PAYMENT_JSON` columns have no migration file. Do not call it from the app as proof of payment.

The reference does not provide Razorpay order-create, signature-verification, webhook, or payment-status endpoint contracts. See `PAYMENT_BACKEND_HANDOFF.md` in the Rider repository for the exact backend work list. Checkout remains intentionally blocked until the backend provides these verified endpoints.

The document also describes WebSocket destinations, but does not document remote push-token registration or Expo/FCM push delivery. WebSocket/local notifications do not meet the requirement for notifications when the app is killed. A backend push-delivery path and physical-device tests remain release blockers.
