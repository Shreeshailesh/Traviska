import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  UploadCloud,
  Loader2,
  AlertCircle,
  Receipt,
  Wallet,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import { API_BASE_URL } from "../api";
import { useCaptainAuth } from "./CaptainAuthContext";

export const CaptainAddExpense: React.FC = () => {
  const { slotId } = useParams<{ slotId: string }>();
  const navigate = useNavigate();
  const { token, captain } = useCaptainAuth();

  const [paymentMode, setPaymentMode] = useState<"Traviska Card" | "Traviska UPI" | "Self">(
    "Self"
  );
  const [expenseType, setExpenseType] = useState<string>("Fuel");
  const [title, setTitle] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const expenseTypes = [
    "Fuel",
    "Hotel",
    "Food",
    "Transport",
    "Tickets",
    "Tolls",
    "Parking",
    "Captain Food",
    "Others",
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("File size cannot exceed 10MB");
        return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount.replace(/,/g, ""));
    if (!title.trim()) {
      setError("Please enter an expense title.");
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    setLoading(true);
    try {
      const curToken = token || localStorage.getItem("captainToken");

      // Auto-approval determination
      const isAutoApproved = paymentMode === "Traviska Card" || paymentMode === "Traviska UPI";
      const status = isAutoApproved ? "Approved" : "Pending";

      const payload = {
        slotId,
        slot: slotId,
        title: title.trim(),
        amount: parsedAmount,
        category: expenseType,
        expenseType,
        paymentMode,
        status,
        notes: notes.trim(),
        receiptUrl: receiptBase64 || "",
        submittedBy: captain?.name || "Captain Officer",
      };

      const res = await fetch(`${API_BASE_URL}/captain/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(curToken ? { Authorization: `Bearer ${curToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        navigate(`/captain/trips/${slotId}/expenses`);
      } else {
        setError(data.message || "Failed to save expense claim.");
      }
    } catch (err: any) {
      console.error("Expense submit error:", err);
      setError("Server connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate(`/captain/trips/${slotId}/expenses`)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "none",
            border: "none",
            color: "#164e23",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
            marginBottom: "12px",
            padding: 0,
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Claims List</span>
        </button>

        <div className="admin-page-header" style={{ marginBottom: 0 }}>
          <div className="admin-page-title-group">
            <h1 className="admin-page-title">Submit Trip Expense Claim</h1>
            <p className="admin-page-subtitle">
              Record on-trip expenses for slot ID <strong>{slotId}</strong>. Reimbursable self-paid claims are audited and settled directly to your bank account.
            </p>
          </div>
        </div>
      </div>

      {/* Main Expense Form Card with Signature Mountain Watermark Header */}
      <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Signature Dark Forest Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #092312 0%, #0d381c 50%, #164e27 100%)",
            padding: "24px 28px",
            position: "relative",
            color: "#ffffff",
          }}
        >
          {/* Watermark SVG */}
          <svg
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              height: "100%",
              opacity: 0.15,
              pointerEvents: "none",
            }}
            viewBox="0 0 300 100"
            fill="none"
          >
            <polygon points="50,100 150,20 250,100" fill="#ffffff" />
            <polygon points="120,100 220,10 320,100" fill="#ffffff" />
          </svg>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative", zIndex: 1 }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "rgba(217, 238, 199, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#d9eec7",
              }}
            >
              <Receipt size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#ffffff" }}>
                Record Expense Disbursement
              </h2>
              <p style={{ fontSize: "13px", color: "#d9eec7", margin: 0, opacity: 0.9 }}>
                Attach physical/digital tax invoice or receipt to speed up verification
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "28px" }}>
          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                borderRadius: "10px",
                padding: "12px 16px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "13px",
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Payment Mode Selection */}
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: "8px",
              }}
            >
              Payment Mode *
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
              {[
                {
                  id: "Self",
                  label: "Self Paid (Reimbursable)",
                  sub: "Refund to your bank account",
                  icon: <Wallet size={16} />,
                },
                {
                  id: "Traviska Card",
                  label: "Traviska Card",
                  sub: "Charged directly to company card",
                  icon: <CreditCard size={16} />,
                },
                {
                  id: "Traviska UPI",
                  label: "Traviska UPI",
                  sub: "Company UPI QR / Scanner",
                  icon: <Receipt size={16} />,
                },
              ].map((mode) => {
                const isSelected = paymentMode === mode.id;

                return (
                  <div
                    key={mode.id}
                    onClick={() => setPaymentMode(mode.id as any)}
                    style={{
                      border: isSelected ? "2px solid #164e23" : "1px solid #cbd5e1",
                      background: isSelected ? "#f0fdf4" : "#ffffff",
                      borderRadius: "10px",
                      padding: "14px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <div style={{ color: isSelected ? "#164e23" : "#64748b" }}>{mode.icon}</div>
                      <span style={{ fontWeight: 700, fontSize: "13px", color: isSelected ? "#164e23" : "#0f172a" }}>
                        {mode.label}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>{mode.sub}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Pills */}
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: "8px",
              }}
            >
              Expense Category *
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {expenseTypes.map((type) => {
                const isSelected = expenseType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setExpenseType(type)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: isSelected ? "1px solid #164e23" : "1px solid #cbd5e1",
                      background: isSelected ? "#0d2b17" : "#ffffff",
                      color: isSelected ? "#ffffff" : "#334155",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Two-column layout: Title & Amount */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#0f172a",
                  marginBottom: "6px",
                }}
              >
                Expense Title / Description *
              </label>
              <input
                type="text"
                placeholder="e.g. Diesel at Shell Petrol Bunk"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  color: "#0f172a",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#0f172a",
                  marginBottom: "6px",
                }}
              >
                Amount (₹) *
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 2500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  color: "#0f172a",
                  fontWeight: 700,
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Receipt Upload Dropzone */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: "6px",
              }}
            >
              Receipt / Tax Invoice Voucher (Optional)
            </label>

            <label
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "2px dashed #cbd5e1",
                borderRadius: "10px",
                padding: "24px 16px",
                background: "#f8fafc",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />

              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "#e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#475569",
                  marginBottom: "8px",
                }}
              >
                <UploadCloud size={20} />
              </div>

              {fileName ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#166534", fontWeight: 600, fontSize: "13px" }}>
                  <CheckCircle2 size={16} />
                  <span>{fileName} attached</span>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                    Click to browse or drag &amp; drop receipt photo
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    PNG, JPG, JPEG up to 10MB
                  </div>
                </>
              )}
            </label>
          </div>

          {/* Additional Notes */}
          <div style={{ marginBottom: "28px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: "6px",
              }}
            >
              Additional Remarks / Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Fuel receipt for traveller mini-bus. Odometer reading 42,100 km."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                color: "#0f172a",
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>

          {/* Form Actions */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => navigate(`/captain/trips/${slotId}/expenses`)}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={loading}
              style={{ minWidth: "160px", justifyContent: "center" }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spinIconAnim" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Expense Claim</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CaptainAddExpense;
