# Payment integration status — updated from backend API reference

The updated backend reference documents `PUT /ride/paymentCompleted?rideId={rideId}&paymentCompleted=COMPLETED`. It records payment data and broadcasts a `PAYMENT_COMPLETED` WebSocket event, but the document explicitly says it has no role/ownership check, does not validate payment status/body, and can update any existing ride.

The document also says the required `RIDE_DETAILS.PAYMENT_COMPLETED` and `RIDE_DETAILS.PAYMENT_JSON` columns do not yet have a migration file. It does **not** document Razorpay order creation, server-side signature verification, or a Razorpay webhook.

Therefore:
- Do not use this endpoint as proof that a customer paid.
- Do not report a payment as successful from a client-side flag or SDK callback alone.
- The customer pays after the ride is completed; the backend must verify the payment and update the ride/invoice state authoritatively.
- Keep payment status display pending until a verified backend result is available.
- Never store the Razorpay Key Secret in either mobile app.

The Rider repository contains the detailed backend handoff checklist in `PAYMENT_BACKEND_HANDOFF.md`.
