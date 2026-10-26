# In-process repair constraints

We must not commit a client-only Razorpay simulation as if it were real payment. The existing backend implementation is not included in either repository and the currently supplied API notes do not define Razorpay order/payment verification endpoints. Before wiring a new payment client, get the backend route contract and expected payment timing.

Immediate safe client changes:
- remove random fare fallback; fail closed when fare is unavailable.
- stop payment processing screen from unconditionally routing to success.
- ensure payment success only renders when it receives a verified server-backed payment result; no hardcoded payment IDs.
- avoid logging auth or push tokens.
