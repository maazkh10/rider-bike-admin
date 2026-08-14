# Release checklist

1. Copy `.env.example` to `.env` and set the production API URL.
2. Use separate restricted Google Maps/Places keys for Android and iOS; never commit unrestricted keys.
3. Configure an EAS project and set `EXPO_PUBLIC_EAS_PROJECT_ID`.
4. Run `npm install` (this will refresh package-lock for the added Expo packages if necessary).
5. Test on physical Android and iOS devices; simulators do not represent background location/push behavior.
6. Verify location permissions: foreground + background for rider.
7. Verify the full API sequence from the supplied reference: profile → rider location → request → accept → start OTP → end.
8. Confirm the deployed Neon branch has V7, V8 and V9 before release.
9. Remove/secure `/sendJWT` on the backend and harden lifecycle ownership checks before public production use.
10. Add backend push-token storage and APNs/FCM/Expo push delivery before relying on notifications while the app is killed.
11. Add a server-side end-ride OTP if that business rule is required.
