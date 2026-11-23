import React, { useEffect, useState } from "react";
import axios from "axios";
import { X, AlertTriangle, CalendarClock, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { API_BASE_URL } from "../api";

interface ModalProps {
  mode: "cancel" | "reschedule" | "decision";
  booking: any;
  proposal?: any;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CANCEL_REASONS = [
  "Change of travel plans",
  "Personal emergency",
  "Medical emergency",
  "Unable to attend",
  "Transport difficulty",
  "Booked by mistake",
  "Other",
];

export const CustomerBookingActionsModal: React.FC<ModalProps> = ({
  mode,
  booking,
  proposal,
  token,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(mode !== "decision");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmStep, setConfirmStep] = useState(false);

  // Cancel state
  const [preview, setPreview] = useState<any>(null);
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [explanation, setExplanation] = useState("");

  // Reschedule state
  const [options, setOptions] = useState<any[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [reschedReason, setReschedReason] = useState("Schedule conflict");

  // Decision state
  const [decisionChoice, setDecisionChoice] = useState<"Accept New Date" | "Request 100% Refund" | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (mode === "cancel") {
          const { data } = await axios.get(
            `${API_BASE_URL}/api/customer/bookings/${booking._id}/cancellation-preview`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!cancelled) setPreview(data.preview);
        } else if (mode === "reschedule") {
          const { data } = await axios.get(
            `${API_BASE_URL}/api/customer/bookings/${booking._id}/reschedule-options`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!cancelled) {
            setOptions(data.options || []);
            if (data.options?.length > 0) setSelectedSlotId(data.options[0].slotId);
          }
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.message || "Failed to load details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [mode, booking._id, token]);

  const selectedOption = options.find((o) => o.slotId === selectedSlotId);

  const handleConfirmCancel = async () => {
    setSubmitting(true);
    setError("");
    try {
      await axios.post(
        `${API_BASE_URL}/api/customer/bookings/${booking._id}/cancel`,
        {
          reason,
          explanation,
          idempotencyKey: `cust-cancel:${booking._id}`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to cancel booking");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReschedule = async () => {
    if (!selectedSlotId) return;
    setSubmitting(true);
    setError("");
    try {
      await axios.post(
        `${API_BASE_URL}/api/customer/bookings/${booking._id}/reschedule-request`,
        {
          targetSlotId: selectedSlotId,
          reason: reschedReason,
          explanation,
          idempotencyKey: `cust-resched:${booking._id}:${selectedSlotId}`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to submit reschedule request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitDecision = async () => {
    if (!decisionChoice || !proposal) return;
    setSubmitting(true);
    setError("");
    try {
      await axios.post(
        `${API_BASE_URL}/api/customer/bookings/${booking._id}/reschedule-decision`,
        {
          decision: decisionChoice,
          requestId: proposal._id,
          idempotencyKey: `cust-decision:${proposal._id}:${decisionChoice}`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to submit your decision");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          maxWidth: "560px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "24px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0e3820" }}>
            {mode === "cancel"
              ? "Cancel Booking"
              : mode === "reschedule"
              ? "Request Reschedule"
              : "Action Required — Trip Rescheduled"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#475569" }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
            Loading booking &amp; policy details...
          </div>
        ) : (
          <>
            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "10px 12px", borderRadius: "8px", marginBottom: "14px", fontSize: "13px" }}>
                {error}
              </div>
            )}

            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 14px", marginBottom: "16px", fontSize: "13px", color: "#334155" }}>
              <div><strong>Trip:</strong> {booking.trip?.title || "Expedition"}</div>
              <div><strong>Booking ID:</strong> {booking.bookingCode || booking._id}</div>
              <div><strong>Departure:</strong> {booking.date || "TBA"} • <strong>Travellers:</strong> {booking.travellers || 1}</div>
              <div><strong>Amount Paid:</strong> ₹{Number(preview?.amountPaidRupees ?? booking.total ?? 0).toLocaleString("en-IN")}</div>
            </div>

            {mode === "cancel" && preview && (
              <>
                {!confirmStep ? (
                  <>
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px", fontSize: "13px" }}>
                      <div style={{ fontWeight: 700, color: "#166534", marginBottom: "6px" }}>
                        Refund Calculation ({preview.tierLabel})
                      </div>
                      <div>Cancellation Charges: <strong>₹{preview.cancellationFeeRupees.toLocaleString("en-IN")}</strong></div>
                      <div>Eligible Refund Amount: <strong style={{ color: "#15803d" }}>₹{preview.eligibleRefundRupees.toLocaleString("en-IN")} ({preview.refundPercentage}%)</strong></div>
                      <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px" }}>
                        Refund Method: Original payment method ({booking.paymentMethod || "Razorpay"}) • {preview.deductionExplanation}
                      </div>
                    </div>

                    <div style={{ fontSize: "12px", color: "#475569", marginBottom: "12px" }}>
                      <ShieldCheck size={13} style={{ display: "inline", marginRight: "4px" }} />
                      <strong>Policy ({preview.policyVersion}):</strong> 15+ days: 90% • 7–14 days: 50% • 72h–7 days: 25% • &lt;72h: 0% refund.
                    </div>

                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                      Cancellation Reason *
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      style={{ width: "100%", padding: "9px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", marginBottom: "12px" }}
                    >
                      {CANCEL_REASONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>

                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                      Additional Details (Optional, kept private)
                    </label>
                    <textarea
                      rows={3}
                      value={explanation}
                      onChange={(e) => setExplanation(e.target.value)}
                      placeholder="Share any context..."
                      style={{ width: "100%", padding: "9px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", marginBottom: "16px" }}
                    />

                    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                      <button type="button" onClick={onClose} style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontWeight: 600 }}>
                        Keep My Booking
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmStep(true)}
                        style={{ padding: "10px 16px", borderRadius: "8px", border: "none", background: "#dc2626", color: "#fff", cursor: "pointer", fontWeight: 600 }}
                      >
                        Review Cancellation
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "16px" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", color: "#991b1b", fontWeight: 700, marginBottom: "8px" }}>
                      <AlertTriangle size={18} />
                      Confirm Booking Cancellation
                    </div>
                    <p style={{ fontSize: "13px", color: "#7f1d1d", marginBottom: "14px" }}>
                      Are you sure you want to cancel this booking? The applicable refund (₹{preview.eligibleRefundRupees.toLocaleString("en-IN")}) and cancellation charges (₹{preview.cancellationFeeRupees.toLocaleString("en-IN")}) are displayed above.
                    </p>
                    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                      <button type="button" onClick={() => setConfirmStep(false)} style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontWeight: 600 }}>
                        Keep My Booking
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleConfirmCancel}
                        style={{ padding: "10px 16px", borderRadius: "8px", border: "none", background: "#dc2626", color: "#fff", cursor: "pointer", fontWeight: 600 }}
                      >
                        {submitting ? "Cancelling..." : "Confirm Cancellation"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {mode === "reschedule" && (
              <>
                {options.length === 0 ? (
                  <div style={{ padding: "16px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "10px", fontSize: "13px", color: "#9a3412" }}>
                    No alternative departure dates with {booking.travellers || 1}+ available seats are currently open for this trip.
                  </div>
                ) : (
                  <>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                      Select Available New Departure Date *
                    </label>
                    <select
                      value={selectedSlotId}
                      onChange={(e) => setSelectedSlotId(e.target.value)}
                      style={{ width: "100%", padding: "9px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", marginBottom: "12px" }}
                    >
                      {options.map((opt) => (
                        <option key={opt.slotId} value={opt.slotId}>
                          {opt.formattedDate} ({opt.availableSlots} seats left)
                        </option>
                      ))}
                    </select>

                    {selectedOption?.breakdown && (
                      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "12px 14px", marginBottom: "12px", fontSize: "13px" }}>
                        <div style={{ fontWeight: 700, color: "#166534", marginBottom: "4px" }}>
                          <CalendarClock size={14} style={{ display: "inline", marginRight: "5px" }} />
                          Price &amp; Fee Breakdown
                        </div>
                        <div>Rescheduling Fee: <strong>₹{selectedOption.breakdown.rescheduleFeeTotal.toLocaleString("en-IN")}</strong></div>
                        <div>Package Price Difference: <strong>₹{selectedOption.breakdown.priceDifferenceTotal.toLocaleString("en-IN")}</strong></div>
                        <div>Total Extra Payable: <strong>₹{selectedOption.breakdown.netPayableExtra.toLocaleString("en-IN")}</strong></div>
                        <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px" }}>
                          {selectedOption.breakdown.ruleSummary}
                        </div>
                      </div>
                    )}

                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                      Reason for Rescheduling *
                    </label>
                    <input
                      type="text"
                      value={reschedReason}
                      onChange={(e) => setReschedReason(e.target.value)}
                      style={{ width: "100%", padding: "9px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", marginBottom: "14px" }}
                    />

                    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                      <button type="button" onClick={onClose} style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontWeight: 600 }}>
                        Close
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleSubmitReschedule}
                        style={{ padding: "10px 16px", borderRadius: "8px", border: "none", background: "#0e3820", color: "#fff", cursor: "pointer", fontWeight: 600 }}
                      >
                        {submitting ? "Submitting..." : "Submit Reschedule Request"}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {mode === "decision" && proposal && (
              <>
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "14px", marginBottom: "14px", fontSize: "13px" }}>
                  <div><strong>Proposed New Date:</strong> {proposal.proposedDate} (was {proposal.oldDate})</div>
                  <div><strong>Reason:</strong> {proposal.customerExplanation || proposal.reason}</div>
                  {proposal.responseDeadline && (
                    <div><strong>Respond By:</strong> {new Date(proposal.responseDeadline).toLocaleDateString("en-IN")}</div>
                  )}
                </div>

                {!decisionChoice ? (
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setDecisionChoice("Accept New Date")}
                      style={{ flex: 1, padding: "11px 14px", borderRadius: "8px", border: "none", background: "#0e3820", color: "#fff", fontWeight: 600, cursor: "pointer" }}
                    >
                      Accept New Date (₹0 Fee)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecisionChoice("Request 100% Refund")}
                      style={{ flex: 1, padding: "11px 14px", borderRadius: "8px", border: "1px solid #dc2626", background: "#fff", color: "#dc2626", fontWeight: 600, cursor: "pointer" }}
                    >
                      Request 100% Refund
                    </button>
                  </div>
                ) : (
                  <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "14px" }}>
                    <div style={{ fontWeight: 700, marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <CheckCircle2 size={16} color="#0e3820" />
                      Confirm Choice: {decisionChoice}
                    </div>
                    <p style={{ fontSize: "13px", color: "#475569", marginBottom: "12px" }}>
                      {decisionChoice === "Accept New Date"
                        ? `Your ${booking.travellers || 1} seat(s) will be moved to ${proposal.proposedDate} with ₹0 rescheduling fee.`
                        : `Your booking will be cancelled with ₹0 fee and a 100% refund of ₹${Number(booking.total || 0).toLocaleString("en-IN")} will be initiated.`}
                    </p>
                    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                      <button type="button" onClick={() => setDecisionChoice(null)} style={{ padding: "9px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}>
                        Back
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleSubmitDecision}
                        style={{ padding: "9px 14px", borderRadius: "8px", border: "none", background: "#0e3820", color: "#fff", fontWeight: 600, cursor: "pointer" }}
                      >
                        {submitting ? "Processing..." : "Confirm Decision"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
