import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Receipt,
  Fuel,
  Hotel,
  Utensils,
  Car,
  Ticket,
  FileText,
  Clock,
  CheckCircle2,
  CreditCard,
  Wallet,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
} from "lucide-react";
import { API_BASE_URL } from "../api";
import { useCaptainAuth } from "./CaptainAuthContext";

interface ExpenseItem {
  _id: string;
  category: string;
  expenseType?: string;
  title: string;
  amount: number;
  paymentMode: "Traviska Card" | "Traviska UPI" | "Self" | string;
  status: "Pending" | "Approved" | "Settled" | "Rejected";
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
  submittedBy?: string;
}

export const CaptainTripExpenses: React.FC = () => {
  const { slotId } = useParams<{ slotId: string }>();
  const navigate = useNavigate();
  const { token } = useCaptainAuth();

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  useEffect(() => {
    if (slotId) {
      loadExpenses();
    }
  }, [slotId, token]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const curToken = token || localStorage.getItem("captainToken");
      const res = await fetch(`${API_BASE_URL}/captain/trips/${slotId}`, {
        headers: curToken ? { Authorization: `Bearer ${curToken}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setExpenses(data.expenses || []);
      }
    } catch (err) {
      console.error("Failed to load expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category?: string, expenseType?: string) => {
    const cat = (category || expenseType || "").toLowerCase();
    if (cat.includes("fuel")) return <Fuel size={16} color="#0284c7" />;
    if (cat.includes("hotel") || cat.includes("stay") || cat.includes("room"))
      return <Hotel size={16} color="#7c3aed" />;
    if (cat.includes("food") || cat.includes("breakfast") || cat.includes("lunch") || cat.includes("dinner"))
      return <Utensils size={16} color="#d97706" />;
    if (cat.includes("transport") || cat.includes("toll") || cat.includes("cab") || cat.includes("vehicle"))
      return <Car size={16} color="#2563eb" />;
    if (cat.includes("ticket") || cat.includes("entry"))
      return <Ticket size={16} color="#059669" />;
    return <Receipt size={16} color="#164e23" />;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Just now";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const totalExpense = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [expenses]);

  const selfPaidTotal = useMemo(() => {
    return expenses
      .filter((e) => e.paymentMode === "Self")
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [expenses]);

  const companyCardTotal = useMemo(() => {
    return expenses
      .filter((e) => e.paymentMode !== "Self")
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [expenses]);

  const approvedTotal = useMemo(() => {
    return expenses
      .filter((e) => e.status === "Approved" || e.status === "Settled")
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    if (categoryFilter === "All") return expenses;
    return expenses.filter(
      (e) => (e.category || e.expenseType || "").toLowerCase() === categoryFilter.toLowerCase()
    );
  }, [expenses, categoryFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Back button and page title */}
      <div>
        <button
          type="button"
          onClick={() => navigate(`/captain/trips/${slotId}`)}
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
          <span>Back to Expedition Details</span>
        </button>

        <div className="admin-page-header" style={{ marginBottom: 0 }}>
          <div className="admin-page-title-group">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 className="admin-page-title">Trip Expense Claims</h1>
              <span
                style={{
                  background: "#dcfce7",
                  color: "#166534",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: "999px",
                }}
              >
                ₹ {totalExpense.toLocaleString("en-IN")} Total Logged
              </span>
            </div>
            <p className="admin-page-subtitle">
              Expedition slot ID: <strong>{slotId}</strong> • Log and review reimbursable costs, fuel receipts, hotel vouchers, and company card transactions.
            </p>
          </div>

          <div className="admin-page-actions">
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={loadExpenses}
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? "spinIconAnim" : ""} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => navigate(`/captain/trips/${slotId}/expenses/add`)}
            >
              <PlusCircle size={15} />
              <span>+ Log New Expense</span>
            </button>
          </div>
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
        <div className="admin-stat-card">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div className="admin-stat-icon-wrapper" style={{ background: "#e0f2fe", color: "#0369a1" }}>
              <Receipt size={22} />
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
              {expenses.length} Receipts
            </span>
          </div>
          <div className="admin-stat-label">Total Claims Logged</div>
          <div className="admin-stat-value">₹ {totalExpense.toLocaleString("en-IN")}</div>
          <div className="admin-stat-sub">Across all payment modes</div>
        </div>

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
              Reimbursable
            </span>
          </div>
          <div className="admin-stat-label">Self-Paid Out of Pocket</div>
          <div className="admin-stat-value">₹ {selfPaidTotal.toLocaleString("en-IN")}</div>
          <div className="admin-stat-sub">Added to captain payout liability</div>
        </div>

        <div className="admin-stat-card">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div className="admin-stat-icon-wrapper" style={{ background: "#fef3c7", color: "#b45309" }}>
              <CreditCard size={22} />
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
              Prepaid
            </span>
          </div>
          <div className="admin-stat-label">Traviska Card / UPI</div>
          <div className="admin-stat-value">₹ {companyCardTotal.toLocaleString("en-IN")}</div>
          <div className="admin-stat-sub">Charged directly to company account</div>
        </div>

        <div className="admin-stat-card">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div className="admin-stat-icon-wrapper" style={{ background: "#d1fae5", color: "#065f46" }}>
              <ShieldCheck size={22} />
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
              Approved
            </span>
          </div>
          <div className="admin-stat-label">Approved &amp; Settled</div>
          <div className="admin-stat-value">₹ {approvedTotal.toLocaleString("en-IN")}</div>
          <div className="admin-stat-sub">Verified by operations desk</div>
        </div>
      </div>

      {/* Categories Toolbar */}
      <div
        className="admin-card"
        style={{
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {["All", "Fuel", "Hotel", "Food", "Transport", "Tickets", "Others"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: categoryFilter === cat ? "#0d2b17" : "#f1f5f9",
                color: categoryFilter === cat ? "#ffffff" : "#475569",
                transition: "all 0.15s ease",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
          Showing <strong>{filteredExpenses.length}</strong> of {expenses.length} claims
        </div>
      </div>

      {/* Expenses Table Card */}
      <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
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
              Loading Expense Claims...
            </div>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <Receipt size={36} color="#94a3b8" style={{ margin: "0 auto 12px auto" }} />
            <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b", marginBottom: "4px" }}>
              No Expense Claims Logged Yet
            </h4>
            <p style={{ fontSize: "13px", color: "#64748b", maxWidth: "380px", margin: "0 auto 16px auto" }}>
              Log fuel bills, hotel invoices, toll payments, and emergency road expenses to claim reimbursements.
            </p>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => navigate(`/captain/trips/${slotId}/expenses/add`)}
            >
              <PlusCircle size={15} />
              <span>Log First Claim</span>
            </button>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Expense Category &amp; Title</th>
                  <th>Date &amp; Time</th>
                  <th>Payment Mode</th>
                  <th>Receipt / Voucher</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((exp) => {
                  const isSelf = exp.paymentMode === "Self";

                  return (
                    <tr key={exp._id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "10px",
                              background: "#f1f5f9",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {getCategoryIcon(exp.category, exp.expenseType)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13px" }}>
                              {exp.title}
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                              {exp.category || exp.expenseType || "General"} {exp.notes ? `• ${exp.notes}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ fontSize: "12px", color: "#475569" }}>
                        {formatDate(exp.createdAt)}
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
                            background: isSelf ? "#ecfdf5" : "#f1f5f9",
                            color: isSelf ? "#065f46" : "#334155",
                            border: isSelf ? "1px solid #a7f3d0" : "1px solid #e2e8f0",
                          }}
                        >
                          {isSelf ? <Wallet size={12} /> : <CreditCard size={12} />}
                          {exp.paymentMode}
                        </span>
                      </td>

                      <td>
                        {exp.receiptUrl ? (
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(exp.receiptUrl || null)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              color: "#164e23",
                              fontWeight: 600,
                              fontSize: "12px",
                              padding: 0,
                              textDecoration: "underline",
                            }}
                          >
                            <FileText size={13} />
                            <span>View Receipt</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>No receipt</span>
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
                            background:
                              exp.status === "Approved" || exp.status === "Settled"
                                ? "#dcfce7"
                                : "#fef3c7",
                            color:
                              exp.status === "Approved" || exp.status === "Settled"
                                ? "#166534"
                                : "#b45309",
                          }}
                        >
                          {exp.status === "Approved" || exp.status === "Settled" ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <Clock size={12} />
                          )}
                          {exp.status || "Pending"}
                        </span>
                      </td>

                      <td style={{ textAlign: "right", fontWeight: 800, fontSize: "14px", color: "#0f172a" }}>
                        ₹ {Number(exp.amount || 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Preview Lightbox Modal */}
      {selectedReceipt && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "600px",
              maxHeight: "85vh",
              background: "#ffffff",
              borderRadius: "14px",
              padding: "16px",
              boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>Receipt Voucher Preview</div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#475569",
                }}
              >
                ✕
              </button>
            </div>
            <img
              src={selectedReceipt}
              alt="Receipt Preview"
              style={{ width: "100%", height: "auto", borderRadius: "8px", objectFit: "contain" }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CaptainTripExpenses;
