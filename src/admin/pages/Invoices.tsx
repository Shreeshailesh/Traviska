import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FileText,
  Download,
  Eye,
  Mail,
  MessageSquare,
  Search,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { API_BASE_URL } from "../../api";
import { Modal } from "../ui/Modal";

interface InvoiceRecord {
  _id: string;
  invoiceNumber: string;
  environment: "test" | "live";
  isSample: boolean;
  documentType: string;
  bookingCode: string;
  customerSnapshot: {
    name: string;
    email: string;
    phone?: string;
    billingAddress?: string;
  };
  tripSnapshot: {
    title: string;
    duration?: string;
    travelDate?: string;
    travellers: number;
    packagePricePaise: number;
  };
  pricing: {
    subtotalPaise: number;
    discountPaise: number;
    taxAmountPaise: number;
    totalPayablePaise: number;
    amountPaidPaise: number;
    refundedAmountPaise: number;
    netPaidPaise: number;
    balanceDuePaise: number;
  };
  paymentStatus: string;
  refundSettlement?: {
    status: "Not Applicable" | "Initiated" | "Credited";
    initiatedAt?: string;
    creditedAt?: string;
    refundReference?: string;
  };
  paymentSummary?: {
    mode?: string;
    reference?: string;
    paidAt?: string;
    paymentType?: string;
  };
  emailDelivery: {
    status: string;
    lastAttemptAt?: string;
    lastError?: string;
    attempts?: Array<{
      attemptedAt: string;
      status: string;
      recipient?: string;
      messageId?: string;
      error?: string;
    }>;
  };
  whatsappDelivery: {
    status: string;
    previewMessage?: string;
    secureLink?: string;
    lastError?: string;
  };
  issuedAt: string;
}

const formatINR = (paise: number) => {
  const rupees = Math.round(paise || 0) / 100;
  return `₹${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getStatusBadgeStyle = (status: string): React.CSSProperties => {
  switch (status) {
    case "Paid":
    case "Accepted by Provider":
    case "API Accepted":
    case "Delivered":
    case "Read":
      return { background: "#dcfce7", color: "#166534" };
    case "Partially Paid":
    case "Partially Refunded":
    case "Queued":
    case "Sending":
    case "Template Pending Approval":
      return { background: "#fef3c7", color: "#92400e" };
    case "Failed":
    case "Cancelled":
    case "Refunded":
      return { background: "#fee2e2", color: "#991b1b" };
    default:
      return { background: "#f1f5f9", color: "#334155" };
  }
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileMissing, setProfileMissing] = useState<string[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tripFilter, setTripFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modals
  const [previewModal, setPreviewModal] = useState<{
    invoice: InvoiceRecord;
    html: string;
  } | null>(null);
  const [detailsModal, setDetailsModal] = useState<{
    invoice: InvoiceRecord;
    paymentEvents: any[];
  } | null>(null);
  const [refundModal, setRefundModal] = useState<{
    invoice: InvoiceRecord;
    amount: string;
    reason: string;
    submitting: boolean;
    error: string;
  } | null>(null);
  const [statusBanner, setStatusBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/admin/invoices`, {
        headers: authHeaders(),
        params: {
          search: search || undefined,
          status: statusFilter,
          trip: tripFilter || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      });
      if (res.data.success) {
        setInvoices(res.data.invoices || []);
        setProfileMissing(res.data.companyProfileCheck?.missingFields || []);
      }
    } catch (err) {
      console.error("Load invoices error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDownloadPdf = async (invoice: InvoiceRecord) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/admin/invoices/${invoice._id}/pdf`,
        {
          headers: authHeaders(),
          responseType: "blob",
        }
      );
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoiceNumber.replace(/\//g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download PDF.");
    }
  };

  const handleOpenPreview = async (invoice: InvoiceRecord) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/admin/invoices/${invoice._id}`,
        { headers: authHeaders() }
      );
      if (res.data.success) {
        setPreviewModal({
          invoice: res.data.invoice,
          html: res.data.htmlPreview,
        });
      }
    } catch {
      alert("Failed to load invoice preview.");
    }
  };

  const handleOpenDetails = async (invoice: InvoiceRecord) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/admin/invoices/${invoice._id}`,
        { headers: authHeaders() }
      );
      if (res.data.success) {
        setDetailsModal({
          invoice: res.data.invoice,
          paymentEvents: res.data.paymentEvents || [],
        });
      }
    } catch {
      alert("Failed to load invoice details.");
    }
  };

  const handleResendEmail = async (invoiceId: string) => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/admin/invoices/${invoiceId}/resend-email`,
        {},
        { headers: authHeaders() }
      );
      if (res.data.success) {
        alert(`Email attempt status: ${res.data.emailResult?.status}`);
        fetchInvoices();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to resend invoice email.");
    }
  };

  const handleRetryWhatsApp = async (invoiceId: string) => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/admin/invoices/${invoiceId}/retry-whatsapp`,
        {},
        { headers: authHeaders() }
      );
      if (res.data.success) {
        alert(`WhatsApp status: ${res.data.whatsappPreview?.status}`);
        fetchInvoices();
      }
    } catch {
      alert("Failed to prepare WhatsApp notification.");
    }
  };

  const handleRecordRefund = (invoice: InvoiceRecord) => {
    const maxRupees = invoice.pricing.netPaidPaise / 100;
    setRefundModal({
      invoice,
      amount: String(maxRupees),
      reason: "Customer requested refund",
      submitting: false,
      error: "",
    });
  };

  const submitRefundModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModal) return;
    const numericAmount = Number(refundModal.amount);
    const maxRupees = refundModal.invoice.pricing.netPaidPaise / 100;

    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > maxRupees) {
      setRefundModal({
        ...refundModal,
        error: `Please enter a valid refund amount between ₹1 and ₹${maxRupees.toLocaleString("en-IN")}.`,
      });
      return;
    }

    try {
      setRefundModal({ ...refundModal, submitting: true, error: "" });
      const res = await axios.post(
        `${API_BASE_URL}/api/admin/invoices/${refundModal.invoice._id}/refund`,
        { refundAmount: numericAmount, reason: refundModal.reason.trim() },
        { headers: authHeaders() }
      );
      if (res.data.success) {
        setStatusBanner({ type: "success", text: res.data.message });
        setRefundModal(null);
        fetchInvoices();
      }
    } catch (err: any) {
      setRefundModal({
        ...refundModal,
        submitting: false,
        error: err.response?.data?.message || "Failed to initiate refund.",
      });
    }
  };

  return (
    <div style={{ padding: "8px 4px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
            Invoices
          </h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
            Manage Traviska booking invoices, PDF downloads, email & WhatsApp notifications.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 16px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#0e3820",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "13px",
            }}
          >
            <FileText size={16} />
            <span>All Invoices ({invoices.length})</span>
          </span>
        </div>
      </div>

      {/* Missing legal/tax profile warning before live issuance */}
      {profileMissing.length > 0 && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "18px",
            fontSize: "12.5px",
            color: "#92400e",
          }}
        >
          <strong>Live Invoice Legal/Tax Configuration Notice:</strong> Sample/test invoices are active, while live invoice issuance requires confirming:{" "}
          {profileMissing.join(" • ")}
        </div>
      )}

      {statusBanner && (
        <div
          style={{
            background: statusBanner.type === "success" ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${statusBanner.type === "success" ? "#bbf7d0" : "#fecaca"}`,
            color: statusBanner.type === "success" ? "#166534" : "#991b1b",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "18px",
            fontSize: "13px",
            fontWeight: 600,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{statusBanner.text}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            style={{ background: "transparent", border: "none", cursor: "pointer", fontWeight: 700, color: "inherit" }}
          >
            ✕
          </button>
        </div>
      )}

        <div className="admin-card" style={{ padding: "18px" }}>
          {/* Filters */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            <div style={{ position: "relative" }}>
              <Search
                size={15}
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "10px",
                  color: "#94a3b8",
                }}
              />
              <input
                type="text"
                placeholder="Search invoice #, booking ID, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px 8px 32px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
              }}
            >
              <option value="all">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Pending Payment">Pending Payment</option>
              <option value="Failed">Failed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Refunded">Refunded</option>
              <option value="Partially Refunded">Partially Refunded</option>
            </select>

            <input
              type="text"
              placeholder="Filter by trip..."
              value={tripFilter}
              onChange={(e) => setTripFilter(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
              }}
            />

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
              }}
            />

            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
              }}
            />

            <button
              type="button"
              onClick={fetchInvoices}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                border: "none",
                background: "#0e3820",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={14} />
              <span>Apply</span>
            </button>
          </div>

          {/* Invoices Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "10px 8px" }}>Invoice No.</th>
                  <th style={{ padding: "10px 8px" }}>Customer</th>
                  <th style={{ padding: "10px 8px" }}>Booking ID</th>
                  <th style={{ padding: "10px 8px" }}>Trip</th>
                  <th style={{ padding: "10px 8px" }}>Date</th>
                  <th style={{ padding: "10px 8px" }}>Total</th>
                  <th style={{ padding: "10px 8px" }}>Paid</th>
                  <th style={{ padding: "10px 8px" }}>Balance</th>
                  <th style={{ padding: "10px 8px" }}>Payment</th>
                  <th style={{ padding: "10px 8px" }}>Email</th>
                  <th style={{ padding: "10px 8px" }}>WhatsApp</th>
                  <th style={{ padding: "10px 8px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
                      Loading invoices...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: "28px", textAlign: "center", color: "#64748b" }}>
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 8px", fontWeight: 700, color: "#0f172a" }}>
                        {inv.invoiceNumber}
                        {inv.isSample && (
                          <span
                            style={{
                              display: "block",
                              fontSize: "10px",
                              color: "#b91c1c",
                              fontWeight: 700,
                            }}
                          >
                            SAMPLE / TEST
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <div style={{ fontWeight: 600 }}>{inv.customerSnapshot?.name}</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          {inv.customerSnapshot?.email}
                        </div>
                      </td>
                      <td style={{ padding: "10px 8px", fontFamily: "monospace" }}>
                        {inv.bookingCode}
                      </td>
                      <td style={{ padding: "10px 8px" }}>{inv.tripSnapshot?.title}</td>
                      <td style={{ padding: "10px 8px" }}>
                        {new Date(inv.issuedAt).toLocaleDateString("en-IN")}
                      </td>
                      <td style={{ padding: "10px 8px", fontWeight: 600 }}>
                        {formatINR(inv.pricing?.totalPayablePaise)}
                      </td>
                      <td style={{ padding: "10px 8px", color: "#166534", fontWeight: 600 }}>
                        {formatINR(inv.pricing?.netPaidPaise)}
                      </td>
                      <td style={{ padding: "10px 8px", color: "#b45309", fontWeight: 600 }}>
                        {formatINR(inv.pricing?.balanceDuePaise)}
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        {inv.refundSettlement?.status === "Initiated" ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 8px",
                              borderRadius: "999px",
                              fontSize: "11px",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              background: "#fef3c7",
                              color: "#92400e",
                            }}
                          >
                            Refund Initiated
                          </span>
                        ) : inv.refundSettlement?.status === "Credited" ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 8px",
                              borderRadius: "999px",
                              fontSize: "11px",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              background: "#dcfce7",
                              color: "#166534",
                            }}
                          >
                            {inv.paymentStatus === "Partially Refunded"
                              ? "Partially Refunded (Credited)"
                              : "Refunded (Credited)"}
                          </span>
                        ) : (
                          <span
                            style={{
                              ...getStatusBadgeStyle(inv.paymentStatus),
                              padding: "3px 8px",
                              borderRadius: "999px",
                              fontSize: "11px",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {inv.paymentStatus}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <span
                          style={{
                            ...getStatusBadgeStyle(inv.emailDelivery?.status),
                            padding: "3px 8px",
                            borderRadius: "999px",
                            fontSize: "11px",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {inv.emailDelivery?.status || "Not Configured"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 8px", fontSize: "11px", color: "#475569" }}>
                        {inv.whatsappDelivery?.status || "Preview Only / Not Configured"}
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            title="Preview Invoice"
                            onClick={() => handleOpenPreview(inv)}
                            style={{ padding: "5px 7px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            title="Download PDF"
                            onClick={() => handleDownloadPdf(inv)}
                            style={{ padding: "5px 7px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
                          >
                            <Download size={14} />
                          </button>
                          <button
                            type="button"
                            title="Payment & Delivery History"
                            onClick={() => handleOpenDetails(inv)}
                            style={{ padding: "5px 7px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
                          >
                            <FileText size={14} />
                          </button>
                          <button
                            type="button"
                            title="Resend Email"
                            onClick={() => handleResendEmail(inv._id)}
                            style={{ padding: "5px 7px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
                          >
                            <Mail size={14} />
                          </button>
                          <button
                            type="button"
                            title="Prepare WhatsApp"
                            onClick={() => handleRetryWhatsApp(inv._id)}
                            style={{ padding: "5px 7px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
                          >
                            <MessageSquare size={14} />
                          </button>
                          {inv.pricing?.netPaidPaise > 0 && (
                            <button
                              type="button"
                              title="Initiate Refund (sends Refund Initiated email)"
                              onClick={() => handleRecordRefund(inv)}
                              style={{ padding: "5px 7px", borderRadius: "6px", border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", cursor: "pointer" }}
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* HTML Preview Modal */}
      {previewModal && (
        <Modal
          isOpen={Boolean(previewModal)}
          onClose={() => setPreviewModal(null)}
          title={`Invoice Preview — ${previewModal.invoice.invoiceNumber}`}
        >
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
            <button
              type="button"
              onClick={() => handleDownloadPdf(previewModal.invoice)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                border: "none",
                background: "#0e3820",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "12.5px",
                cursor: "pointer",
              }}
            >
              <Download size={14} />
              <span>Download A4 PDF</span>
            </button>
          </div>
          <iframe
            title="Invoice Modal Preview"
            srcDoc={previewModal.html}
            style={{
              width: "100%",
              height: "560px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
            }}
          />
        </Modal>
      )}

      {/* Payment & Delivery Details Modal */}
      {detailsModal && (
        <Modal
          isOpen={Boolean(detailsModal)}
          onClose={() => setDetailsModal(null)}
          title={`Payment & Delivery History — ${detailsModal.invoice.invoiceNumber}`}
        >
          <div style={{ display: "grid", gap: "14px", fontSize: "12.5px" }}>
            <div>
              <strong>Payment Events ({detailsModal.paymentEvents.length})</strong>
              <ul style={{ marginTop: "6px", paddingLeft: "18px" }}>
                {detailsModal.paymentEvents.map((ev) => (
                  <li key={ev._id}>
                    <strong>{ev.paymentType}</strong> — {formatINR(ev.amountPaise)} ({ev.status}) • Ref:{" "}
                    <code>{ev.providerPaymentId || ev.providerRefundId || ev.eventId}</code>
                  </li>
                ))}
              </ul>
            </div>

            {detailsModal.invoice.pricing?.refundedAmountPaise > 0 && (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div>
                  <strong>Bank Refund Settlement Status: </strong>
                  <span>
                    {detailsModal.invoice.refundSettlement?.status || "Initiated"}
                  </span>
                </div>
              </div>
            )}

            <div>
              <strong>Email Attempts ({detailsModal.invoice.emailDelivery?.attempts?.length || 0})</strong>
              <ul style={{ marginTop: "6px", paddingLeft: "18px" }}>
                {(detailsModal.invoice.emailDelivery?.attempts || []).map((a, idx) => (
                  <li key={idx}>
                    {new Date(a.attemptedAt).toLocaleString("en-IN")} — <strong>{a.status}</strong>{" "}
                    ({a.recipient}) {a.error ? `— ${a.error}` : ""}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <strong>WhatsApp Preview ({detailsModal.invoice.whatsappDelivery?.status})</strong>
              <pre
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  padding: "10px",
                  borderRadius: "8px",
                  whiteSpace: "pre-wrap",
                  fontSize: "11.5px",
                  marginTop: "6px",
                }}
              >
                {detailsModal.invoice.whatsappDelivery?.previewMessage || "No preview generated yet."}
              </pre>
            </div>
          </div>
        </Modal>
      )}
      {/* Refund Confirmation Modal */}
      {refundModal && (
        <Modal
          isOpen={Boolean(refundModal)}
          onClose={() => !refundModal.submitting && setRefundModal(null)}
          title={`Confirm Refund Initiation — ${refundModal.invoice.invoiceNumber}`}
        >
          <form onSubmit={submitRefundModal} style={{ display: "grid", gap: "14px", fontSize: "13px" }}>
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "12px",
                display: "grid",
                gap: "4px",
              }}
            >
              <div>
                <strong>Customer:</strong> {refundModal.invoice.customerSnapshot?.name} (
                {refundModal.invoice.customerSnapshot?.email})
              </div>
              <div>
                <strong>Trip:</strong> {refundModal.invoice.tripSnapshot?.title} •{" "}
                <strong>Booking ID:</strong> {refundModal.invoice.bookingCode}
              </div>
              <div>
                <strong>Refundable Balance:</strong>{" "}
                <span style={{ color: "#166534", fontWeight: 700 }}>
                  {formatINR(refundModal.invoice.pricing.netPaidPaise)}
                </span>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                <label style={{ fontWeight: 700, fontSize: "12.5px" }}>Refund Amount (INR) *</label>
                <button
                  type="button"
                  onClick={() =>
                    setRefundModal({
                      ...refundModal,
                      amount: String(refundModal.invoice.pricing.netPaidPaise / 100),
                      error: "",
                    })
                  }
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#0e3820",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Use Full Refund ({formatINR(refundModal.invoice.pricing.netPaidPaise)})
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                min="1"
                max={refundModal.invoice.pricing.netPaidPaise / 100}
                required
                value={refundModal.amount}
                onChange={(e) => setRefundModal({ ...refundModal, amount: e.target.value, error: "" })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontWeight: 700, fontSize: "12.5px", marginBottom: "5px" }}>
                Refund / Cancellation Reason
              </label>
              <input
                type="text"
                value={refundModal.reason}
                onChange={(e) => setRefundModal({ ...refundModal, reason: e.target.value })}
                placeholder="Customer requested cancellation"
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
              />
            </div>

            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "8px",
                padding: "10px 12px",
                fontSize: "12px",
                color: "#92400e",
              }}
            >
              Confirming this will set the refund status to <strong>Initiated</strong> and immediately send the{" "}
              <strong>Refund Initiated</strong> email and WhatsApp notification (the updated adjustment PDF is sent once the refund is credited).
            </div>

            {refundModal.error && (
              <div style={{ color: "#b91c1c", fontWeight: 600, fontSize: "12.5px" }}>
                {refundModal.error}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
              <button
                type="button"
                disabled={refundModal.submitting}
                onClick={() => setRefundModal(null)}
                style={{
                  padding: "9px 16px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={refundModal.submitting}
                style={{
                  padding: "9px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#b91c1c",
                  color: "#ffffff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {refundModal.submitting ? "Initiating & Sending Mail..." : "Confirm & Initiate Refund"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

