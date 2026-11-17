import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Building2,
} from "lucide-react";
import { API_BASE_URL } from "../api";
import { useCaptainAuth } from "./CaptainAuthContext";

export const CaptainBankDetails: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useCaptainAuth();

  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchBankDetails();
  }, [token]);

  const fetchBankDetails = async () => {
    setLoading(true);
    try {
      const curToken = token || localStorage.getItem("captainToken");
      const res = await fetch(`${API_BASE_URL}/captain/bank-details`, {
        headers: curToken ? { Authorization: `Bearer ${curToken}` } : {},
      });
      const data = await res.json();
      if (data.success && data.bankDetails) {
        setAccountHolderName(data.bankDetails.accountHolderName || "");
        setBankName(data.bankDetails.bankName || "");
        setAccountNumber(data.bankDetails.accountNumber || "");
        setIfscCode(data.bankDetails.ifscCode || "");
        setUpiId(data.bankDetails.upiId || "");
      }
    } catch (err) {
      console.error("Failed to load bank details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const curToken = token || localStorage.getItem("captainToken");
      const res = await fetch(`${API_BASE_URL}/captain/bank-details`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(curToken ? { Authorization: `Bearer ${curToken}` } : {}),
        },
        body: JSON.stringify({
          accountHolderName: accountHolderName.trim(),
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
          upiId: upiId.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Bank & UPI details successfully verified and saved!");
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        setErrorMsg(data.message || "Failed to update bank details");
      }
    } catch (err) {
      console.error("Bank details update error:", err);
      setErrorMsg("Failed to connect to server");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate("/captain/profile")}
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
          <span>Back to Profile</span>
        </button>

        <div className="admin-page-header" style={{ marginBottom: 0 }}>
          <div className="admin-page-title-group">
            <h1 className="admin-page-title">Bank &amp; UPI Settlement Setup</h1>
            <p className="admin-page-subtitle">
              Configure your verified receiving account for direct automated IMPS and UPI settlements of trip honorariums and reimbursable claims.
            </p>
          </div>
        </div>
      </div>

      {/* Main Bank Card */}
      <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Signature Dark Forest Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #092312 0%, #0d381c 50%, #164e23 100%)",
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
              <Building2 size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#ffffff" }}>
                Captain Disbursement Account
              </h2>
              <p style={{ fontSize: "13px", color: "#d9eec7", margin: 0, opacity: 0.9 }}>
                Encrypted &amp; audited directly by Traviska Finance Desk
              </p>
            </div>
          </div>
        </div>

        {/* Security Banner */}
        <div
          style={{
            background: "#f0fdf4",
            borderBottom: "1px solid #dcfce7",
            padding: "12px 28px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "12px",
            color: "#166534",
            fontWeight: 600,
          }}
        >
          <ShieldCheck size={16} />
          <span>Your bank information is encrypted and transmitted securely via 256-bit SSL.</span>
        </div>

        {/* Form Body */}
        {loading ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                border: "3px solid #164e23",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spinIconAnim 0.8s linear infinite",
                margin: "0 auto 12px auto",
              }}
            />
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>
              Loading Saved Settlement Details...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: "28px" }}>
          {successMsg && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
                borderRadius: "10px",
                padding: "12px 16px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                borderRadius: "10px",
                padding: "12px 16px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "13px",
              }}
            >
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

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
                Beneficiary Name (As in Bank) *
              </label>
              <input
                type="text"
                placeholder="e.g. Shailesh Kumar"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
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
                Bank Name *
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC Bank Ltd."
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
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
          </div>

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
                Account Number *
              </label>
              <input
                type="password"
                placeholder="•••• •••• ••••"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
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
                IFSC Code *
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC0001234"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  color: "#0f172a",
                  fontFamily: "monospace",
                  outline: "none",
                }}
              />
            </div>
          </div>

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
              Primary UPI ID (Instant Payouts)
            </label>
            <input
              type="text"
              placeholder="e.g. captain@okhdfcbank"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
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
            <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>
              Settlements below ₹10,000 can be processed instantly to this UPI address.
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => navigate("/captain/profile")}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={saving}
              style={{ minWidth: "160px", justifyContent: "center" }}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="spinIconAnim" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Bank Details</span>
              )}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

export default CaptainBankDetails;
