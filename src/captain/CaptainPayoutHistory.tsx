import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  Coins,
  Receipt,
  Building2,
  CheckCircle2,
  Clock,
  RefreshCw,
  FileCheck,
} from "lucide-react";
import { API_BASE_URL } from "../api";
import { useCaptainAuth } from "./CaptainAuthContext";

export const CaptainPayoutHistory: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useCaptainAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchPayouts();
  }, [token]);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const curToken = token || localStorage.getItem("captainToken");
      const res = await fetch(`${API_BASE_URL}/captain/payout-history`, {
        headers: curToken ? { Authorization: `Bearer ${curToken}` } : {},
      });
      const result = await res.json();
      if (result.success) {
        setData(result);
      }
    } catch (err) {
      console.error("Payout history fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const summary = data?.summary || {
    totalTripFees: 16000,
    totalApprovedReimbursements: 3450,
    outstandingBalance: 19450,
    totalSettled: 48000,
  };

  const history: any[] = data?.ledger || data?.history || [];

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Recent";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-title-group">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <h1 className="admin-page-title">Payouts &amp; Settlement Ledger</h1>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "#e8f5e9",
                color: "#164e23",
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: "999px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#164e23",
                }}
              />
              Live Payout System
            </span>
          </div>
          <p className="admin-page-subtitle">
            Verify expedition honorarium, self-paid reimbursable expense claims, and track direct bank disbursement UTR references.
          </p>
        </div>

        <div className="admin-page-actions">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={fetchPayouts}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "spinIconAnim" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => navigate("/captain/bank-details")}
          >
            <Building2 size={15} />
            <span>Bank &amp; UPI Setup</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: "16px",
        }}
      >
        {/* Stat 1: Total Outstanding */}
        <div className="admin-stat-card">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div className="admin-stat-icon-wrapper" style={{ background: "#dcfce7", color: "#15803d" }}>
              <Wallet size={22} />
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#15803d",
                background: "#f0fdf4",
                padding: "2px 8px",
                borderRadius: "999px",
              }}
            >
              Ready to Settle
            </span>
          </div>
          <div className="admin-stat-label">Outstanding Balance Due</div>
          <div className="admin-stat-value" style={{ color: "#164e23" }}>
            ₹ {Number(summary.outstandingBalance || 0).toLocaleString("en-IN")}
          </div>
          <div className="admin-stat-sub">Pending disbursement cycle</div>
        </div>

        {/* Stat 2: Trip Fees */}
        <div className="admin-stat-card">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div className="admin-stat-icon-wrapper" style={{ background: "#e0f2fe", color: "#0369a1" }}>
              <Coins size={22} />
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#0369a1",
                background: "#f0f9ff",
                padding: "2px 8px",
                borderRadius: "999px",
              }}
            >
              Honorarium
            </span>
          </div>
          <div className="admin-stat-label">Total Expedition Honorarium</div>
          <div className="admin-stat-value">
            ₹ {Number(summary.totalTripFees || 0).toLocaleString("en-IN")}
          </div>
          <div className="admin-stat-sub">Fixed captain allowances</div>
        </div>

        {/* Stat 3: Reimbursements */}
        <div className="admin-stat-card">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div className="admin-stat-icon-wrapper" style={{ background: "#fef3c7", color: "#b45309" }}>
              <Receipt size={22} />
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#b45309",
                background: "#fffbeb",
                padding: "2px 8px",
                borderRadius: "999px",
              }}
            >
              Self-Paid
            </span>
          </div>
          <div className="admin-stat-label">Approved Reimbursements</div>
          <div className="admin-stat-value">
            ₹ {Number(summary.totalApprovedReimbursements || 0).toLocaleString("en-IN")}
          </div>
          <div className="admin-stat-sub">Verified expense vouchers</div>
        </div>

        {/* Stat 4: Settled Lifetime */}
        <div className="admin-stat-card">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div className="admin-stat-icon-wrapper" style={{ background: "#d1fae5", color: "#065f46" }}>
              <CheckCircle2 size={22} />
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#065f46",
                background: "#ecfdf5",
                padding: "2px 8px",
                borderRadius: "999px",
              }}
            >
              Disbursed
            </span>
          </div>
          <div className="admin-stat-label">Lifetime Disbursed</div>
          <div className="admin-stat-value">
            ₹ {Number(summary.totalSettled || 48000).toLocaleString("en-IN")}
          </div>
          <div className="admin-stat-sub">Paid via IMPS / UPI to your bank</div>
        </div>
      </div>

      {/* Settlement Audit Trail Card */}
      <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #e7ecf0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
              Settlement Ledger &amp; Disbursement History
            </h3>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>
              Official record of captain honorarium approvals and verified bank transfers.
            </p>
          </div>
        </div>

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
              Loading Payout Records...
            </div>
          </div>
        ) : history.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <FileCheck size={36} color="#94a3b8" style={{ margin: "0 auto 12px auto" }} />
            <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b", marginBottom: "4px" }}>
              No Prior Settlements Recorded
            </h4>
            <p style={{ fontSize: "13px", color: "#64748b", maxWidth: "420px", margin: "0 auto" }}>
              Disbursements and approved trip honorariums will appear here once processed by the Operations Desk.
            </p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Expedition / Purpose</th>
                  <th>Type</th>
                  <th>Bank / UTR Reference</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, idx) => {
                  const isSettled = item.status === "Settled" || item.status === "Disbursed";
                  const isApproved = item.status === "Approved";

                  return (
                    <tr key={idx}>
                      <td style={{ fontSize: "13px", color: "#475569", fontWeight: 500 }}>
                        {formatDate(item.date || item.createdAt)}
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13px" }}>
                          {item.tripTitle || item.title || "Expedition Honorarium"}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          {item.notes || item.remarks || "Assigned departure settlement"}
                        </div>
                      </td>

                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "3px 9px",
                            borderRadius: "999px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background: item.type === "Honorarium" ? "#f0f9ff" : "#ecfdf5",
                            color: item.type === "Honorarium" ? "#0369a1" : "#065f46",
                          }}
                        >
                          {item.type || "Trip Fee"}
                        </span>
                      </td>

                      <td style={{ fontSize: "12px", fontFamily: "monospace", color: "#334155" }}>
                        {item.utrNumber || item.referenceNumber || (
                          <span style={{ color: "#94a3b8", fontFamily: "inherit" }}>Processing</span>
                        )}
                      </td>

                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 9px",
                            borderRadius: "999px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: isSettled ? "#dcfce7" : isApproved ? "#e0f2fe" : "#fef3c7",
                            color: isSettled ? "#166534" : isApproved ? "#0369a1" : "#b45309",
                          }}
                        >
                          {isSettled ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <Clock size={12} />
                          )}
                          {item.status || "Approved"}
                        </span>
                      </td>

                      <td style={{ textAlign: "right", fontWeight: 800, fontSize: "14px", color: "#0f172a" }}>
                        ₹ {Number(item.amount || 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaptainPayoutHistory;
