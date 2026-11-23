# Traviska Payment Gateway Integration Guide

This guide explains how to connect an approved payment gateway (such as Razorpay, ICICI Payseal/Eazypay, Cashfree, or PayU) to the Traviska Invoice & Payment System without rebuilding invoice generation, PDF rendering, or notifications.

---

## 1. Architecture Overview

The invoice system is decoupled from any specific payment provider via [server/services/paymentGatewayAdapter.js](server/services/paymentGatewayAdapter.js):

- **Interface (`BasePaymentGatewayAdapter`)**:
  - `createPaymentOrder({ bookingId, amountPaise, currency })`
  - `verifyPayment(params)`
  - `verifyWebhook(req)`
  - `getPaymentStatus(providerPaymentId)`
  - `getPaymentReference(normalizedEvent)`
  - `processRefundEvent(params)`
- **Normalized Payment Event (`server/models/PaymentEvent.js`)**:
  Every payment, advance, balance settlement, failure, or refund is recorded as a normalized `PaymentEvent` keyed by a unique `eventId` for strict idempotency.

---

## 2. Where to Add Gateway Credentials

Add your approved provider's credentials to `server/.env` (for local sandbox testing) and your Render Environment Variables (for production):

```env
# Payment Gateway Provider Selection
PAYMENT_GATEWAY_PROVIDER=your_approved_provider
PAYMENT_GATEWAY_KEY_ID=your_key_id
PAYMENT_GATEWAY_KEY_SECRET=your_key_secret
PAYMENT_GATEWAY_WEBHOOK_SECRET=your_webhook_signing_secret

# Company Legal & Tax Profile (Required before issuing LIVE invoices)
TRAVISKA_PAN=YOUR_FIRM_PAN
TRAVISKA_UDYAM=UDYAM-KR-XX-XXXXXXX
TRAVISKA_GST_REGISTERED=false
# If GST registered:
# TRAVISKA_GST_REGISTERED=true
# TRAVISKA_GSTIN=29XXXXXXXXXXXXX
# TRAVISKA_TAX_RATE_PERCENT=5
# TRAVISKA_TAX_MODE=exclusive
```

Never hardcode credentials or commit `.env` files.

---

## 3. Sandbox vs. Live Environment Configuration

- **Sandbox / Localhost (`NODE_ENV=development`)**:
  - Use gateway sandbox/test keys.
  - Invoice sequence uses the `test` counter (`TEST-TVK/26-27/0001`).
  - Test emails route safely to `travelwithtraviska@gmail.com`.
- **Production (`NODE_ENV=production` on Render)**:
  - Use gateway live keys and a separate production MongoDB Atlas database.
  - Invoice sequence uses the `live` counter (`TVK/26-27/0001`).
  - Live issuance checks `validateLiveIssuanceProfile()` in `server/config/companyProfile.js` to verify PAN, Udyam, and GST confirmation are present.

---

## 4. Implementing a Concrete Gateway Adapter

Create a subclass of `BasePaymentGatewayAdapter` inside `server/services/paymentGatewayAdapter.js` (or a dedicated file registered in `getGatewayAdapter(provider)`):

1. `createPaymentOrder()`: Calls your gateway's Orders API using **server-computed `amountPaise` from the stored Booking snapshot** (never trust a browser-submitted amount).
2. `verifyPayment()`: Verifies the gateway signature/HMAC using `PAYMENT_GATEWAY_WEBHOOK_SECRET` / `KEY_SECRET`, queries gateway status if needed, and returns a normalized `PaymentEvent` with `verified: true` only when confirmed.
3. `verifyWebhook(req)`: Validates the raw webhook signature header against `PAYMENT_GATEWAY_WEBHOOK_SECRET`, parses the event, and returns a normalized `PaymentEvent`.

---

## 5. Connecting Webhooks to Invoice Generation (Idempotency)

1. Verify the webhook signature in `adapter.verifyWebhook(req)`. Reject invalid signatures with `401`.
2. Check `PaymentEvent.findOne({ eventId: normalizedEvent.eventId })`. If it already exists, return `200 OK` immediately without creating a duplicate payment or invoice.
3. Verify the booking exists and validate `normalizedEvent.amountPaise` against the booking's expected payable or advance amount.
4. Save `PaymentEvent` (`environment: "live"`, `isSimulated: false`).
5. Call `createOrReconcileInvoiceForBooking({ bookingId, environment: "live", isSample: false })`.
6. Generate/update PDF via `ensureInvoicePdfFile(invoice)`.
7. Queue email (`sendInvoiceEmail`) and prepare WhatsApp notification (`prepareWhatsAppPreview`).

---

## 6. Handling Refunds & Failed Payments

- **Failed Payments**: Record a `PaymentEvent` with `status: "failed"`, `verified: false`. Reconcile the invoice (`paymentStatus` stays `Pending Payment` or `Failed` if no prior payment exists). Never generate a `Paid` invoice on failed or unverified events.
- **Full / Partial Refunds**: In `verifyWebhook()` or Admin refund action, record a `PaymentEvent` with `paymentType: "Refund"`, `status: "refunded"` or `"partially_refunded"`, `verified: true`, and call `createOrReconcileInvoiceForBooking(...)`. The original invoice record and number are preserved in MongoDB with updated `refundedAmountPaise`, `netPaidPaise`, and audit history.

---

## 7. Disabling the Simulator in Production

The localhost simulator is automatically blocked in production by:
- Backend guard in `server/routes/invoices.js` (`NODE_ENV === "production"` returns `403 Forbidden` on `POST /api/admin/invoices/simulate` and `simulatorEnabled: false` on `/api/admin/invoices/simulator/config`).
- Adapter guard in `LocalTestSimulatorAdapter.assertTestEnvironment()`.
- Frontend hides the **Test Payment Simulator** tab whenever `simulatorEnabled` is `false`.

Ensure `NODE_ENV=production` is set in Render's environment variables before going live.

---

## 8. Pre-Production Testing Checklist

1. Configure gateway sandbox keys in `server/.env`.
2. Verify `validateLiveIssuanceProfile()` passes with confirmed PAN, Udyam, and GST settings.
3. Test full payment, advance + balance payment, failed payment, duplicate webhook replay, and partial/full refund in sandbox.
4. Confirm PDF download in both Admin Portal (`/admin/invoices`) and Customer My Trips (`/customer/dashboard`).
5. Confirm email attachment delivery and WhatsApp template variables.

