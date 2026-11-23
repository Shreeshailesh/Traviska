const crypto = require("crypto");

/**
 * Provider-Independent Payment Gateway Adapter Interface
 *
 * No specific provider (Razorpay, ICICI, Cashfree, etc.) is activated here.
 * When an approved gateway is ready, implement a concrete adapter conforming
 * to these methods and register it in `getGatewayAdapter(provider)`.
 *
 * Normalized Payment Event Structure:
 * {
 *   eventId: string,
 *   provider: string,
 *   providerOrderId: string,
 *   providerPaymentId: string,
 *   providerRefundId: string,
 *   bookingId: string,
 *   paymentType: "Full" | "Advance" | "Balance" | "Refund",
 *   paymentMethod: string,
 *   amountPaise: number,
 *   currency: "INR",
 *   status: "pending" | "succeeded" | "failed" | "refunded" | "partially_refunded",
 *   verified: boolean,
 *   occurredAt: Date,
 *   rawPayload: object
 * }
 */

class BasePaymentGatewayAdapter {
  constructor(providerName) {
    this.providerName = providerName;
  }

  async createPaymentOrder(_params) {
    throw new Error(`${this.providerName}: createPaymentOrder() not implemented`);
  }

  async verifyPayment(_params) {
    throw new Error(`${this.providerName}: verifyPayment() not implemented`);
  }

  async verifyWebhook(_req) {
    throw new Error(`${this.providerName}: verifyWebhook() not implemented`);
  }

  async getPaymentStatus(_providerPaymentId) {
    throw new Error(`${this.providerName}: getPaymentStatus() not implemented`);
  }

  getPaymentReference(normalizedEvent) {
    return (
      normalizedEvent?.providerPaymentId ||
      normalizedEvent?.providerOrderId ||
      normalizedEvent?.eventId ||
      ""
    );
  }

  async processRefundEvent(_params) {
    throw new Error(`${this.providerName}: processRefundEvent() not implemented`);
  }
}

/**
 * Development-only Localhost Simulator Adapter.
 * Strictly blocked in production environments.
 */
class LocalTestSimulatorAdapter extends BasePaymentGatewayAdapter {
  constructor() {
    super("simulator");
  }

  assertTestEnvironment() {
    if (process.env.NODE_ENV === "production") {
      const err = new Error(
        "Payment simulator is strictly disabled in production."
      );
      err.statusCode = 403;
      throw err;
    }
  }

  async createPaymentOrder({ bookingId, amountPaise, currency = "INR" }) {
    this.assertTestEnvironment();
    const orderId = `SIM_ORD_${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    return {
      provider: "simulator",
      providerOrderId: orderId,
      bookingId: String(bookingId || ""),
      amountPaise,
      currency,
      status: "created",
    };
  }

  async verifyPayment({
    bookingId,
    amountPaise,
    paymentType = "Full",
    simulateOutcome = "succeeded",
  }) {
    this.assertTestEnvironment();
    const suffix = crypto.randomBytes(5).toString("hex").toUpperCase();
    const isSuccess = simulateOutcome === "succeeded";

    return {
      eventId: `SIM_EVT_${suffix}`,
      provider: "simulator",
      providerOrderId: `SIM_ORD_${suffix}`,
      providerPaymentId: `SIM_PAY_${suffix}`,
      providerRefundId: "",
      bookingId: String(bookingId || ""),
      paymentType,
      paymentMethod: "Online Payment (Test)",
      amountPaise,
      currency: "INR",
      status: isSuccess ? "succeeded" : "failed",
      verified: isSuccess,
      occurredAt: new Date(),
      rawPayload: { simulated: true, simulateOutcome },
    };
  }

  async processRefundEvent({ bookingId, amountPaise, fullRefund = false }) {
    this.assertTestEnvironment();
    const suffix = crypto.randomBytes(5).toString("hex").toUpperCase();
    return {
      eventId: `SIM_REF_EVT_${suffix}`,
      provider: "simulator",
      providerOrderId: "",
      providerPaymentId: "",
      providerRefundId: `SIM_REF_${suffix}`,
      bookingId: String(bookingId || ""),
      paymentType: "Refund",
      paymentMethod: "Refund (Test)",
      amountPaise,
      currency: "INR",
      status: fullRefund ? "refunded" : "partially_refunded",
      verified: true,
      occurredAt: new Date(),
      rawPayload: { simulated: true, fullRefund },
    };
  }
}

function getGatewayAdapter(provider = "simulator") {
  if (provider === "simulator") {
    if (process.env.NODE_ENV === "production") {
      const err = new Error("Payment simulator is strictly disabled in production.");
      err.statusCode = 403;
      throw err;
    }
    return new LocalTestSimulatorAdapter();
  }
  throw new Error(
    `Payment gateway provider "${provider}" is not activated yet. Configure and register an approved adapter first.`
  );
}

module.exports = {
  BasePaymentGatewayAdapter,
  LocalTestSimulatorAdapter,
  getGatewayAdapter,
};

