import { useEffect, useState } from "react";
import axios from "axios";
import { RefreshCw, CheckCircle2, XCircle, Mail, MessageSquare, Search, AlertTriangle } from "lucide-react";
import { API_BASE_URL } from "../../api";

type TabKey =
  | "ALL"
  | "CustomerCancel"
  | "CustomerReschedule"
  | "CompanyRescheduleProposal"
  | "ManualRefundAction"
  | "Completed"
  | "FailedNotifications";

export default function BookingRequests() {
  const [tab, setTab] = useState<TabKey>("ALL");
  const [search, setSearch] = useState("");
  const [requests, setRequests] = useState<any[]>([]);
  const [failedNotifications, setFailedNotifications] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const token = localStorage.getItem("token");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/admin/booking-requests`, {
        params: {
          type: ["CustomerCancel", "CustomerReschedule", "CompanyRescheduleProposal", "ManualRefundAction"].includes(tab) ? tab : "ALL",
          status: tab === "Completed" ? "Completed" : "ALL",
          search: search.trim() || undefined,
        },
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(data.requests || []);
      setCounts(data.counts || {});
      setFailedNotifications(data.failedNotifications || []);
    } catch (err) {
      console.error("Failed to load booking requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tab]);

  const handleReview = async (id: string, action: "approve" | "reject") => {
    const internalNotes = window.prompt(`Optional internal notes for ${action}:`, "") || "";
    setBusyId(id);
    try {
      await axios.post(
        `${API_BASE_URL}/api/admin/booking-requests/${id}/review`,
        { action, internalNotes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleApproveRefund = async (reqItem: any) => {
    const ok = window.confirm(
      `Approve refund of ₹${Number(reqItem.eligibleRefundAmount || 0).toLocaleString("en-IN")} (${reqItem.refundPercentage}%) for ${reqItem.bookingCode}?\nPolicy: ${reqItem.policyVersion || "2026-11-v1"}\nSource: ${reqItem.cancellationSource || "Customer"}`
    );
    if (!ok) return;
    setBusyId(reqItem._id);
    try {
      await axios.post(
        `${API_BASE_URL}/api/admin/booking-requests/${reqItem._id}/approve-refund`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to approve refund");
    } finally {
      setBusyId(null);
    }
  };

  const handleFlagInvestigation = async (reqItem: any) => {
    const note = window.prompt("Enter reason for flagging this refund for investigation:", "");
    if (!note || !note.trim()) return;
    setBusyId(reqItem._id);
    try {
      await axios.post(
        `${API_BASE_URL}/api/admin/booking-requests/${reqItem._id}/flag-investigation`,
        { note: note.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to flag request");
    } finally {
      setBusyId(null);
    }
  };

  const handleCompleteManualRefund = async (reqItem: any) => {
    const ref = window.prompt(
      `Enter verified bank/gateway refund reference for ${reqItem.bookingCode} (₹${reqItem.eligibleRefundAmount || 0}):`
    );
    if (!ref || !ref.trim()) return;
    setBusyId(reqItem._id);
    try {
      await axios.post(
        `${API_BASE_URL}/api/admin/bookings/${reqItem.bookingId}/manual-refund-complete`,
        { refundReference: ref.trim(), refundAmount: reqItem.eligibleRefundAmount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to record refund");
    } finally {
      setBusyId(null);
    }
  };

  const handleRetryNotification = async (outboxId: string) => {
    setBusyId(outboxId);
    try {
      await axios.post(
        `${API_BASE_URL}/api/admin/notifications/${outboxId}/retry`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Retry failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: "#0e3820" }}>Booking Requests &amp; Refunds</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13.5px" }}>
            Track customer cancellations, reschedule requests, company proposals, manual refunds, and failed notifications.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontWeight: 600 }}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
        {[
          { k: "ALL", label: `All (${counts.total || 0})` },
          { k: "CustomerCancel", label: `Cancellations (${counts.pendingCancellations || 0})` },
          { k: "CustomerReschedule", label: `Reschedules (${counts.pendingReschedules || 0})` },
          { k: "CompanyRescheduleProposal", label: `Awaiting Customer (${counts.awaitingCustomer || 0})` },
          { k: "ManualRefundAction", label: `Refunds Pending Approval (${counts.pendingRefunds || 0})` },
          { k: "Completed", label: "Completed" },
          { k: "FailedNotifications", label: `Failed Alerts (${counts.failedNotifications || 0})` },
        ].map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => setTab(t.k as TabKey)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: tab === t.k ? "none" : "1px solid #e2e8f0",
              background: tab === t.k ? "#0e3820" : "#ffffff",
              color: tab === t.k ? "#ffffff" : "#334155",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== "FailedNotifications" && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: "360px" }}>
            <Search size={15} style={{ position: "absolute", left: "10px", top: "11px", color: "#94a3b8" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="Search request ID, booking ID, customer..."
              style={{ width: "100%", padding: "8px 10px 8px 32px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            />
          </div>
          <button
            type="button"
            onClick={load}
            style={{ padding: "8px 14px", borderRadius: "8px", background: "#0e3820", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" }}
          >
            Search
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading...</div>
      ) : tab === "FailedNotifications" ? (
        <div style={{ display: "grid", gap: "12px" }}>
          {failedNotifications.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", color: "#64748b" }}>
              No failed notifications.
            </div>
          ) : (
            failedNotifications.map((n) => (
              <div key={n._id} style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: "12px", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#991b1b", display: "flex", alignItems: "center", gap: "6px" }}>
                    {n.channel === "email" ? <Mail size={15} /> : <MessageSquare size={15} />}
                    {n.eventType} ({n.channel.toUpperCase()} → {n.recipient})
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "4px" }}>
                    Attempts: {n.attempts} • Error: {n.lastError}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busyId === n._id}
                  onClick={() => handleRetryNotification(n._id)}
                  style={{ padding: "8px 14px", borderRadius: "8px", background: "#0e3820", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" }}
                >
                  {busyId === n._id ? "Retrying..." : "Retry Notification"}
                </button>
              </div>
            ))
          )}
        </div>
      ) : requests.length === 0 ? (
        <div style={{ padding: "36px", textAlign: "center", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", color: "#64748b" }}>
          No booking requests found in this view.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {requests.map((r) => (
            <div key={r._id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "260px" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#0e3820" }}>{r.requestCode}</span>
                  <span style={{ fontSize: "12px", padding: "2px 8px", borderRadius: "999px", background: "#f1f5f9", fontWeight: 600 }}>{r.requestType}</span>
                  <span style={{ fontSize: "12px", padding: "2px 8px", borderRadius: "999px", background: r.status === "Completed" ? "#dcfce7" : "#fef3c7", color: r.status === "Completed" ? "#166534" : "#92400e", fontWeight: 600 }}>
                    {r.status}
                  </span>
                </div>
                <div style={{ marginTop: "6px", fontWeight: 600, color: "#0f172a" }}>
                  {r.tripTitle || "Trip"} — Booking {r.bookingCode} ({r.travellers || 1} pax)
                </div>
                <div style={{ fontSize: "13px", color: "#475569", marginTop: "4px" }}>
                  Customer: {r.customerSnapshot?.name} ({r.customerSnapshot?.phone} • {r.customerSnapshot?.email})
                </div>
                <div style={{ fontSize: "13px", color: "#334155", marginTop: "4px" }}>
                  <strong>Reason:</strong> {r.reason}
                  {r.cancellationSource && <> • <strong>Source:</strong> {r.cancellationSource}</>}
                  {r.oldDate && <> • <strong>Old:</strong> {r.oldDate}</>}
                  {r.proposedDate && <> → <strong>Proposed:</strong> {r.proposedDate}</>}
                </div>
                {r.requestType === "ManualRefundAction" && (
                  <div style={{ fontSize: "12.5px", color: "#1e293b", marginTop: "6px", background: "#f8fafc", padding: "8px 10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <strong>Paid:</strong> ₹{Number(r.amountPaidRupees || 0).toLocaleString("en-IN")} •{" "}
                    <strong>Deduction:</strong> ₹{Number(r.cancellationFeeRupees || 0).toLocaleString("en-IN")} •{" "}
                    <strong>Eligible Refund:</strong> ₹{Number(r.eligibleRefundAmount || 0).toLocaleString("en-IN")} ({r.refundPercentage || 0}%) •{" "}
                    <strong>Refund State:</strong> {r.refundState || "Pending Admin Approval"}
                    <div style={{ marginTop: "3px", color: "#475569" }}>
                      <strong>Method:</strong> {r.originalPaymentMethod || "Razorpay"} •{" "}
                      <strong>Tx Ref:</strong> {r.gatewayTransactionRef || "—"} •{" "}
                      <strong>Policy:</strong> {r.policyVersion || "2026-11-v1"}
                    </div>
                  </div>
                )}
                {r.internalNotes && (
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                    <strong>Internal Notes:</strong> {r.internalNotes}
                  </div>
                )}
                {expandedHistoryId === r._id && Array.isArray(r.auditHistory) && (
                  <div style={{ marginTop: "8px", padding: "8px 10px", background: "#f1f5f9", borderRadius: "8px", fontSize: "12px" }}>
                    <strong>Audit &amp; Refund History:</strong>
                    {r.auditHistory.map((h: any, idx: number) => (
                      <div key={idx} style={{ marginTop: "3px", color: "#334155" }}>
                        • {new Date(h.at).toLocaleString("en-IN")} — <strong>{h.action}</strong> ({h.actor}) {h.note ? `: ${h.note}` : ""}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setExpandedHistoryId(expandedHistoryId === r._id ? null : r._id)}
                  style={{ padding: "7px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                >
                  {expandedHistoryId === r._id ? "Hide History" : "View Refund History"}
                </button>
                {r.requestType === "CustomerReschedule" && r.status === "Pending Review" && (
                  <>
                    <button
                      type="button"
                      disabled={busyId === r._id}
                      onClick={() => handleReview(r._id, "approve")}
                      style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "8px 12px", borderRadius: "8px", border: "none", background: "#16a34a", color: "#fff", fontWeight: 600, cursor: "pointer" }}
                    >
                      <CheckCircle2 size={15} /> Approve Move
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r._id}
                      onClick={() => handleReview(r._id, "reject")}
                      style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "8px 12px", borderRadius: "8px", border: "1px solid #dc2626", background: "#fff", color: "#dc2626", fontWeight: 600, cursor: "pointer" }}
                    >
                      <XCircle size={15} /> Reject
                    </button>
                  </>
                )}
                {r.requestType === "ManualRefundAction" && r.refundState === "Pending Admin Approval" && (
                  <>
                    <button
                      type="button"
                      disabled={busyId === r._id}
                      onClick={() => handleApproveRefund(r)}
                      style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "8px 12px", borderRadius: "8px", border: "none", background: "#16a34a", color: "#fff", fontWeight: 600, cursor: "pointer" }}
                    >
                      <CheckCircle2 size={15} /> Approve Refund
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r._id}
                      onClick={() => handleFlagInvestigation(r)}
                      style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "8px 12px", borderRadius: "8px", border: "1px solid #d97706", background: "#fff", color: "#b45309", fontWeight: 600, cursor: "pointer" }}
                    >
                      <AlertTriangle size={15} /> Flag
                    </button>
                  </>
                )}
                {r.requestType === "ManualRefundAction" && r.refundState === "Approved — Pending Initiation" && (
                  <button
                    type="button"
                    disabled={busyId === r._id}
                    onClick={() => handleCompleteManualRefund(r)}
                    style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "8px 12px", borderRadius: "8px", border: "none", background: "#0e3820", color: "#fff", fontWeight: 600, cursor: "pointer" }}
                  >
                    <AlertTriangle size={15} /> Record Manual Payout Completed
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
