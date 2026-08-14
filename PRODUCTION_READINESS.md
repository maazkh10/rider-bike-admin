# Production readiness — Admin app

This client is aligned with the supplied Rider Booking API reference.

## Implemented
- JWT-authenticated API client with configurable `EXPO_PUBLIC_API_URL`.
- JWT stored in Expo SecureStore (legacy AsyncStorage tokens are migrated).
- Ride request validation and server-side matching flow.
- Waiting/dispatch screen replaced by a live ride monitor.
- Admin live ride map with pickup, destination and rider marker.
- Private STOMP location subscription: `/user/queue/ride/{rideId}/location`.
- Ride lifecycle handling for ACCEPTED, STARTED, COMPLETED and rider cancellation.
- Start OTP is displayed only to the admin, as required by the API.
- Google Maps hand-off for navigation.
- Foreground local notifications for lifecycle events.
- EAS build profiles and environment example.

## Backend limitations that prevent a fully production-complete closed-app experience
The supplied backend reference does not expose a device push-token registration endpoint or a push notification service. Therefore a React Native app cannot receive a new ride notification after the OS has killed the app solely from the current STOMP connection. Add a backend push-token endpoint and Expo/FCM/APNs delivery before claiming guaranteed closed-app notifications.

The current backend also has no end-ride OTP endpoint. `/ride/end` accepts only rideId/riderId and completes a STARTED ride. If an end OTP is required, it must be generated/stored/verified server-side.

The API reference itself identifies these production hardening items: remove/secure `/sendJWT`, make `/login` deliberately public only after proper authentication/rate limits, encrypt KYC data, add ownership checks to remaining lifecycle endpoints, and authorize public STOMP topics.
