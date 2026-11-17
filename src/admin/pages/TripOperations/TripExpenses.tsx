import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  UploadCloud,
  X,
  Receipt,
  CreditCard,
  Wallet,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Mountain,
} from "lucide-react";
import { API_BASE_URL } from "../../../api";
import { StatCard } from "../../ui/StatCard";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type PaymentMode = "Traviska Card" | "Traviska UPI" | "Self";
type StatusLabel = "Auto Approved" | "Pending Approval" | "Approved" | "Rejected" | "Settled";

interface RawExpense {
  _id: string;
  slotId: string;
  tripId: string | null;
  tripName: string;
  tripSublocation?: string;
  tripDate: string;
  tripDateRaw?: string | null;
  departureDateFull?: string;
  createdAt: string;
  expenseDate: string;
  expenseTime?: string;
  paymentMode: PaymentMode;
  expenseType: string;
  title: string;
  notes: string;
  amount: number;
  status: string;
  rawStatus: string;
  isCompanyPaid: boolean;
  isSettled?: boolean;
  receiptUrl?: string;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  canApprove: boolean;
  canReject: boolean;
}

interface Expense extends RawExpense {
  captainId: string;
  captainName: string;
  captainPhone: string;
  captainStatus: string;
  statusLabel: StatusLabel;
  submittedAt: number;
}

interface CaptainGroup {
  captainId: string | null;
  captainName: string;
  captainStatus: string;
  captainPhone: string;
  payoutInfo?: { status?: string };
  expenses: RawExpense[];
}

interface TripOption {
  _id: string;
  title: string;
  slots: Array<{
    _id: string;
    dateLabel: string;
    assignedCaptains: Array<{ _id: string; name: string; role?: string }>;
  }>;
}

const EXPENSE_TYPES = ["Breakfast", "Parking", "Tickets", "Tolls", "Transport", "Hotel", "Coordinator Food", "Others"];
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const inr = (n: number) => `₹${(Number(n) || 0).toLocaleString("en-IN")}`;
const initials = (name: string) => {
  const p = (name || "?").trim().split(/\s+/);
  return (p.length > 1 ? p[0][0] + p[1][0] : name.slice(0, 2)).toUpperCase();
};

const toStatusLabel = (e: RawExpense): StatusLabel => {
  if (e.isCompanyPaid) return "Auto Approved";
  if (e.isSettled || e.status === "Settled") return "Settled";
  if (e.status === "Approved") return "Approved";
  if (e.status === "Rejected") return "Rejected";
  return "Pending Approval";
};

const statusBadgeStyle: Record<StatusLabel, { bg: string; text: string; border: string }> = {
  "Auto Approved": { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" },
  Approved: { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" },
  Settled: { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
  "Pending Approval": { bg: "#fef3c7", text: "#b45309", border: "#fde68a" },
  Rejected: { bg: "#fee2e2", text: "#b91c1c", border: "#fecaca" },
};

const StatusPill: React.FC<{ s: StatusLabel }> = ({ s }) => {
  const conf = statusBadgeStyle[s] || { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" };
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "11px",
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: "12px",
        background: conf.bg,
        color: conf.text,
        border: `1px solid ${conf.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {s}
    </span>
  );
};

const modeBadgeStyle: Record<PaymentMode, { bg: string; text: string; border: string }> = {
  "Traviska Card": { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  "Traviska UPI": { bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe" },
  Self: { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
};

const modeLabel = (m: PaymentMode) => (m === "Self" ? "Self" : m);

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

const receiptKind = (url?: string) => {
  if (!url) return "none";
  if (url.startsWith("data:application/pdf") || /\.pdf($|\?)/i.test(url)) return "pdf";
  return "image";
};

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export const TripExpenses: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<"dashboard" | "form">("dashboard");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<CaptainGroup[]>([]);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // filters
  const [search, setSearch] = useState("");
  const [fTrip, setFTrip] = useState("all");
  const [fCaptain, setFCaptain] = useState("all");
  const [fMode, setFMode] = useState("all");
  const [fType, setFType] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  // pagination (by captain)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Expense | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const showNotice = (type: "ok" | "err", text: string) => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 5000);
  };

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/admin/operations/expenses`, { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || `Failed to load expenses (${res.status})`);
      setGroups(Array.isArray(data.captainGroups) ? data.captainGroups : []);
    } catch (e: any) {
      setError(e.message || "Could not load expenses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // flatten
  const allExpenses: Expense[] = useMemo(
    () =>
      groups.flatMap((g) =>
        g.expenses.map((e) => ({
          ...e,
          captainId: g.captainId || "unassigned",
          captainName: g.captainName,
          captainPhone: g.captainPhone,
          captainStatus: g.captainStatus,
          statusLabel: toStatusLabel(e),
          submittedAt: new Date(e.createdAt).getTime(),
        }))
      ),
    [groups]
  );

  const tripFilterOptions = useMemo(() => {
    const m = new Map<string, string>();
    allExpenses.forEach((e) => e.tripId && m.set(String(e.tripId), e.tripName));
    return Array.from(m, ([id, name]) => ({ id, name }));
  }, [allExpenses]);

  const captainFilterOptions = useMemo(() => {
    const m = new Map<string, string>();
    allExpenses.forEach((e) => m.set(e.captainId, e.captainName));
    return Array.from(m, ([id, name]) => ({ id, name }));
  }, [allExpenses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = fFrom ? new Date(fFrom + "T00:00:00").getTime() : null;
    const to = fTo ? new Date(fTo + "T23:59:59").getTime() : null;
    return allExpenses.filter((e) => {
      if (fTrip !== "all" && String(e.tripId) !== fTrip) return false;
      if (fCaptain !== "all" && e.captainId !== fCaptain) return false;
      if (fMode !== "all" && e.paymentMode !== fMode) return false;
      if (fType !== "all" && e.expenseType !== fType) return false;
      if (fStatus !== "all" && e.statusLabel !== fStatus) return false;
      if (from && e.submittedAt < from) return false;
      if (to && e.submittedAt > to) return false;
      if (q && !`${e.title} ${e.notes} ${e.captainName} ${e.tripName}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allExpenses, search, fTrip, fCaptain, fMode, fType, fStatus, fFrom, fTo]);

  useEffect(() => setPage(1), [search, fTrip, fCaptain, fMode, fType, fStatus, fFrom, fTo, pageSize]);

  // summary
  const summary = useMemo(() => {
    const s = { total: 0, totalN: 0, company: 0, companyN: 0, self: 0, selfN: 0, pending: 0, pendingN: 0 };
    filtered.forEach((e) => {
      s.total += e.amount;
      s.totalN++;
      if (e.isCompanyPaid) {
        s.company += e.amount;
        s.companyN++;
      } else {
        s.self += e.amount;
        s.selfN++;
        if (e.statusLabel === "Pending Approval") {
          s.pending += e.amount;
          s.pendingN++;
        }
      }
    });
    return s;
  }, [filtered]);

  const pendingQueue = useMemo(
    () => filtered.filter((e) => e.canApprove).sort((a, b) => a.submittedAt - b.submittedAt),
    [filtered]
  );

  // captain grouping of filtered
  const captainSections = useMemo(() => {
    const m = new Map<string, { id: string; name: string; phone: string; status: string; items: Expense[] }>();
    filtered.forEach((e) => {
      if (!m.has(e.captainId))
        m.set(e.captainId, { id: e.captainId, name: e.captainName, phone: e.captainPhone, status: e.captainStatus, items: [] });
      m.get(e.captainId)!.items.push(e);
    });
    return Array.from(m.values())
      .map((c) => {
        let company = 0, total = 0, approved = 0, pending = 0;
        c.items.forEach((e) => {
          total += e.amount;
          if (e.isCompanyPaid) company += e.amount;
          else if (e.statusLabel === "Approved" || e.statusLabel === "Settled") approved += e.amount;
          else if (e.statusLabel === "Pending Approval") pending += e.amount;
        });
        // group by departure
        const deps = new Map<string, { key: string; label: string; trip: string; items: Expense[] }>();
        c.items
          .sort((a, b) => b.submittedAt - a.submittedAt)
          .forEach((e) => {
            const key = String(e.slotId);
            if (!deps.has(key)) deps.set(key, { key, label: e.departureDateFull || e.tripDate, trip: e.tripName, items: [] });
            deps.get(key)!.items.push(e);
          });
        return { ...c, total, company, approved, pending, departures: Array.from(deps.values()) };
      })
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(captainSections.length / pageSize));
  const pagedSections = captainSections.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (captainSections.length && expanded.size === 0) setExpanded(new Set([captainSections[0].id]));
  }, [groups]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const filtersActive =
    !!search || fTrip !== "all" || fCaptain !== "all" || fMode !== "all" || fType !== "all" || fStatus !== "all" || !!fFrom || !!fTo;

  const resetFilters = () => {
    setSearch("");
    setFTrip("all");
    setFCaptain("all");
    setFMode("all");
    setFType("all");
    setFStatus("all");
    setFFrom("");
    setFTo("");
  };

  /* ---------------- actions ---------------- */

  const approve = async (e: Expense) => {
    if (!window.confirm(`Approve ${inr(e.amount)} for ${e.captainName}? It will be added to the captain's reimbursement.`)) return;
    setBusyId(e._id);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/operations/expenses/${e._id}/status`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ status: "Approved" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || "Approval failed");
      showNotice("ok", "Expense approved.");
      await fetchExpenses();
    } catch (err: any) {
      showNotice("err", err.message || "Approval failed");
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = async () => {
    if (!rejecting) return;
    if (!reason.trim()) return;
    setBusyId(rejecting._id);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/operations/expenses/${rejecting._id}/status`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ status: "Rejected", reason: reason.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || "Rejection failed");
      showNotice("ok", "Expense rejected.");
      setRejecting(null);
      setReason("");
      await fetchExpenses();
    } catch (err: any) {
      showNotice("err", err.message || "Rejection failed");
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = () => {
    if (!filtered.length) {
      showNotice("err", "No expenses to export for the current selection.");
      return;
    }
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Captain", "Trip", "Departure", "Category", "Payment Mode", "Title", "Notes", "Amount", "Status", "Submitted"];
    const rows = filtered.map((e) =>
      [e.captainName, e.tripName, e.departureDateFull || e.tripDate, e.expenseType, e.paymentMode, e.title, e.notes, e.amount, e.statusLabel, new Date(e.createdAt).toLocaleString("en-GB")]
        .map(esc)
        .join(",")
    );
    const blob = new Blob([[head.map(esc).join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `traviska_trip_expenses_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const drawerExpense = allExpenses.find((e) => e._id === drawerId) || null;

  /* ---------------- Screen 2: Manual Log Expense Form ---------------- */
  if (view === "form") {
    return (
      <ManualForm
        onCancel={() => setView("dashboard")}
        onSaved={async (msg) => {
          setView("dashboard");
          showNotice("ok", msg);
          await fetchExpenses();
        }}
      />
    );
  }

  /* ---------------- Screen 1: Dashboard ---------------- */
  return (
    <div style={{ width: "100%", paddingBottom: "48px" }}>
      {/* 1. Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-title-box">
          <h1>Trip Expenses</h1>
          <p>Manage captain operational expenses, approvals, and reimbursements across scheduled departures.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={exportCsv}
            className="admin-btn admin-btn-secondary"
            title="Export filtered expenses to CSV"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setView("form")}
            className="admin-btn admin-btn-primary"
          >
            <Plus size={16} />
            <span>Log Expense</span>
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {notice && (
        <div
          role="status"
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            marginBottom: "20px",
            fontSize: "13px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: notice.type === "ok" ? "#dcfce7" : "#fee2e2",
            color: notice.type === "ok" ? "#15803d" : "#b91c1c",
            border: `1px solid ${notice.type === "ok" ? "#bbf7d0" : "#fecaca"}`,
          }}
        >
          {notice.type === "ok" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{notice.text}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            marginBottom: "20px",
            fontSize: "13px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#fee2e2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchExpenses}
            style={{ textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "#b91c1c", fontWeight: 700 }}
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Top KPI Stat Cards Grid */}
      <div className="admin-stats-grid">
        <StatCard
          icon={<Receipt size={18} />}
          label="Total Expenses"
          value={loading ? "..." : inr(summary.total)}
          subtitle={`${summary.totalN} logged expenses`}
          iconTheme="green"
        />
        <StatCard
          icon={<CreditCard size={18} />}
          label="Company Paid"
          value={loading ? "..." : inr(summary.company)}
          subtitle={`Card + UPI · ${summary.companyN} expenses`}
          iconTheme="blue"
        />
        <StatCard
          icon={<Wallet size={18} />}
          label="Self Expenses"
          value={loading ? "..." : inr(summary.self)}
          subtitle={`${summary.selfN} claims`}
          iconTheme="gold"
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Pending Approval"
          value={loading ? "..." : inr(summary.pending)}
          subtitle={`${summary.pendingN} awaiting review`}
          change={summary.pendingN > 0 ? `${summary.pendingN} Pending` : undefined}
          isPositive={summary.pendingN === 0}
          iconTheme="default"
        />
      </div>

      {/* 3. Pending Approvals Queue Card */}
      <div style={{ marginBottom: "24px" }}>
        {pendingQueue.length === 0 ? (
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#15803d", fontWeight: 600, fontSize: "13px" }}>
              <CheckCircle2 size={18} color="#15803d" />
              <span>No Self expenses are waiting for approval. Everything is up to date!</span>
            </div>
            <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b", background: "#f1f5f9", padding: "4px 10px", borderRadius: "12px" }}>
              0 Pending
            </span>
          </div>
        ) : (
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #fde68a",
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(180, 83, 9, 0.06)",
            }}
          >
            <div
              style={{
                background: "#fffbeb",
                padding: "12px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #fef3c7",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, color: "#92400e", fontSize: "14px" }}>
                <AlertCircle size={16} />
                <span>Pending Approvals ({pendingQueue.length})</span>
              </div>
              <span style={{ fontSize: "12px", color: "#b45309", fontWeight: 600 }}>
                Requires Admin Review
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {pendingQueue.map((e) => (
                <div
                  key={e._id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    borderBottom: "1px solid #f1f5f9",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "#fef3c7",
                        color: "#92400e",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "13px",
                      }}
                    >
                      {initials(e.captainName)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "13.5px", color: "#0f172a" }}>
                        {e.title} • <span style={{ color: "#166534" }}>{inr(e.amount)}</span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        {e.captainName} • {e.tripName} • {e.expenseDate} ({e.expenseType})
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setDrawerId(e._id)}
                      className="admin-btn admin-btn-secondary"
                      style={{ padding: "5px 12px", fontSize: "12px" }}
                    >
                      <Eye size={13} /> View
                    </button>
                    <button
                      type="button"
                      disabled={busyId === e._id}
                      onClick={() => approve(e)}
                      className="admin-btn"
                      style={{
                        background: "#166534",
                        color: "#fff",
                        padding: "5px 14px",
                        fontSize: "12px",
                        fontWeight: 600,
                        borderRadius: "8px",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <Check size={13} /> Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyId === e._id}
                      onClick={() => {
                        setRejecting(e);
                        setReason("");
                      }}
                      className="admin-btn"
                      style={{
                        background: "#fee2e2",
                        color: "#b91c1c",
                        border: "1px solid #fecaca",
                        padding: "5px 12px",
                        fontSize: "12px",
                        fontWeight: 600,
                        borderRadius: "8px",
                        cursor: "pointer",
                      }}
                    >
                      <X size={13} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Filter Toolbar */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "16px 18px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "10px",
              alignItems: "center",
            }}
          >
            {/* Search Input */}
            <div style={{ position: "relative", gridColumn: "span 2" }}>
              <Search
                size={15}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                placeholder="Search title, trip, captain..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 36px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  color: "#0f172a",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Dropdowns */}
            <select
              value={fTrip}
              onChange={(e) => setFTrip(e.target.value)}
              className="bookings-departure-select"
              style={{ height: "38px", fontSize: "12.5px" }}
            >
              <option value="all">All Trips</option>
              {tripFilterOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <select
              value={fCaptain}
              onChange={(e) => setFCaptain(e.target.value)}
              className="bookings-departure-select"
              style={{ height: "38px", fontSize: "12.5px" }}
            >
              <option value="all">All Captains</option>
              {captainFilterOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={fMode}
              onChange={(e) => setFMode(e.target.value)}
              className="bookings-departure-select"
              style={{ height: "38px", fontSize: "12.5px" }}
            >
              <option value="all">All Payment Modes</option>
              {["Traviska Card", "Traviska UPI", "Self"].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={fType}
              onChange={(e) => setFType(e.target.value)}
              className="bookings-departure-select"
              style={{ height: "38px", fontSize: "12.5px" }}
            >
              <option value="all">All Categories</option>
              {EXPENSE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value)}
              className="bookings-departure-select"
              style={{ height: "38px", fontSize: "12.5px" }}
            >
              <option value="all">All Statuses</option>
              {["Auto Approved", "Pending Approval", "Approved", "Rejected", "Settled"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range & Reset Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
              paddingTop: "8px",
              borderTop: "1px solid #f1f5f9",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#475569" }}>
              <Calendar size={13} color="#166534" />
              <span>Date Filter:</span>
              <input
                type="date"
                value={fFrom}
                onChange={(e) => setFFrom(e.target.value)}
                style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
              />
              <span>–</span>
              <input
                type="date"
                value={fTo}
                onChange={(e) => setFTo(e.target.value)}
                style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
              />
            </div>

            {filtersActive && (
              <button
                type="button"
                onClick={resetFilters}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "12px",
                  color: "#166534",
                  fontWeight: 600,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={12} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Captains Expense Explorer */}
      {loading ? (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "48px 20px",
            textAlign: "center",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <Loader2 size={18} className="spin-icon" color="#166534" />
          <span>Loading expenses...</span>
        </div>
      ) : captainSections.length === 0 ? (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "48px 20px",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#0f172a", fontWeight: 600, fontSize: "14px" }}>No expenses recorded for this selection.</p>
          {filtersActive && (
            <button
              type="button"
              onClick={resetFilters}
              style={{
                marginTop: "8px",
                fontSize: "13px",
                color: "#166534",
                fontWeight: 600,
                background: "none",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {pagedSections.map((c) => {
            const open = expanded.has(c.id);

            return (
              <div
                key={c.id}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                }}
              >
                {/* Captain Card Header Bar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 20px",
                    background: "#ffffff",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  {/* Left: Captain avatar and name */}
                  <button
                    type="button"
                    onClick={() => toggle(c.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      minWidth: "220px",
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        background: "#eaf5e9",
                        color: "#166534",
                        fontWeight: 700,
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid #b9deb4",
                      }}
                    >
                      {initials(c.name)}
                    </div>
                    <div>
                      <div style={{ fontSize: "14.5px", fontWeight: 700, color: "#0f172a" }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                        <span>{c.items.length} {c.items.length === 1 ? "expense" : "expenses"}</span>
                        {c.phone && <span>• {c.phone}</span>}
                      </div>
                    </div>
                  </button>

                  {/* Middle: Summary Metrics Badges */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "6px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Total</div>
                      <div style={{ fontSize: "13.5px", fontWeight: 800, color: "#0f172a" }}>{inr(c.total)}</div>
                    </div>
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "6px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Company Paid</div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#1d4ed8" }}>{inr(c.company)}</div>
                    </div>
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "6px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Approved Self</div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#166534" }}>{inr(c.approved)}</div>
                    </div>
                    <div
                      style={{
                        background: c.pending > 0 ? "#fef3c7" : "#f8fafc",
                        border: `1px solid ${c.pending > 0 ? "#fde68a" : "#e2e8f0"}`,
                        borderRadius: "8px",
                        padding: "6px 12px",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "10px", fontWeight: 700, color: c.pending > 0 ? "#92400e" : "#64748b", textTransform: "uppercase" }}>Pending</div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: c.pending > 0 ? "#b45309" : "#0f172a" }}>{inr(c.pending)}</div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => navigate("/admin/operations/payouts")}
                      className="admin-btn admin-btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "12px" }}
                    >
                      <Wallet size={13} />
                      <span>View Payout</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(c.id)}
                      className="booking-action-icon-btn"
                      style={{ width: "34px", height: "34px" }}
                      aria-label={open ? "Collapse" : "Expand"}
                    >
                      {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Expenses List */}
                {open && (
                  <div style={{ borderTop: "1px solid #e2e8f0" }}>
                    {c.departures.map((d) => (
                      <div key={d.key}>
                        {/* Departure Subheader */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 18px",
                            background: "#f8fafc",
                            borderBottom: "1px solid #e2e8f0",
                            fontSize: "12px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, color: "#166534" }}>
                            <Mountain size={13} />
                            <span>{d.trip}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontWeight: 600 }}>
                            <Calendar size={13} />
                            <span>{d.label}</span>
                          </div>
                        </div>

                        {/* Structured Table (Explicit column widths with spacing) */}
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead>
                              <tr style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                                <th style={{ padding: "10px 18px", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", width: "24%" }}>
                                  Expense
                                </th>
                                <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", width: "22%" }}>
                                  Trip & Departure
                                </th>
                                <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", width: "14%" }}>
                                  Category
                                </th>
                                <th style={{ padding: "10px 14px", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", width: "14%" }}>
                                  Payment
                                </th>
                                <th style={{ padding: "10px 16px", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", width: "12%", textAlign: "right" }}>
                                  Amount
                                </th>
                                <th style={{ padding: "10px 16px", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", width: "14%", textAlign: "center" }}>
                                  Status
                                </th>
                                <th style={{ padding: "10px 18px", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", width: "10%", textAlign: "right" }}>
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {d.items.map((e) => (
                                <tr
                                  key={e._id}
                                  style={{
                                    borderBottom: "1px solid #f1f5f9",
                                    transition: "background 0.15s ease",
                                  }}
                                  onMouseEnter={(ev) => (ev.currentTarget.style.background = "#fcfdfd")}
                                  onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
                                >
                                  {/* Expense Title */}
                                  <td style={{ padding: "12px 18px", fontWeight: 600, color: "#0f172a" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                      {e.receiptUrl ? (
                                        <span
                                          title="Receipt attached"
                                          style={{
                                            color: "#166534",
                                            background: "#f0fdf4",
                                            padding: "3px 6px",
                                            borderRadius: "4px",
                                            display: "inline-flex",
                                            alignItems: "center",
                                          }}
                                        >
                                          <Paperclip size={12} />
                                        </span>
                                      ) : null}
                                      <span>{e.title}</span>
                                    </div>
                                  </td>

                                  {/* Trip & Departure */}
                                  <td style={{ padding: "12px 14px", color: "#475569", fontSize: "12.5px" }}>
                                    <div style={{ fontWeight: 600, color: "#1e293b" }}>{e.tripName}</div>
                                    <div style={{ color: "#64748b", fontSize: "11.5px" }}>{e.tripDate}</div>
                                  </td>

                                  {/* Category */}
                                  <td style={{ padding: "12px 14px" }}>
                                    <span
                                      style={{
                                        background: "#f1f5f9",
                                        padding: "3px 8px",
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                        fontWeight: 500,
                                        color: "#334155",
                                      }}
                                    >
                                      {e.expenseType}
                                    </span>
                                  </td>

                                  {/* Payment Mode */}
                                  <td style={{ padding: "12px 14px" }}>
                                    <span
                                      style={{
                                        fontSize: "11px",
                                        fontWeight: 600,
                                        padding: "3px 8px",
                                        borderRadius: "6px",
                                        background: modeBadgeStyle[e.paymentMode]?.bg || "#f1f5f9",
                                        color: modeBadgeStyle[e.paymentMode]?.text || "#334155",
                                        border: `1px solid ${modeBadgeStyle[e.paymentMode]?.border || "#e2e8f0"}`,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {modeLabel(e.paymentMode)}
                                    </span>
                                  </td>

                                  {/* Amount (Separate column, clear font) */}
                                  <td
                                    style={{
                                      padding: "12px 16px",
                                      textAlign: "right",
                                      fontWeight: 700,
                                      fontSize: "13.5px",
                                      color: "#0f172a",
                                      fontVariantNumeric: "tabular-nums",
                                    }}
                                  >
                                    {inr(e.amount)}
                                  </td>

                                  {/* Status Badge (Separate column, centered) */}
                                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                                    <StatusPill s={e.statusLabel} />
                                  </td>

                                  {/* Actions */}
                                  <td style={{ padding: "12px 18px", textAlign: "right" }}>
                                    <button
                                      type="button"
                                      onClick={() => setDrawerId(e._id)}
                                      className="admin-btn admin-btn-secondary"
                                      style={{ padding: "4px 10px", fontSize: "11.5px" }}
                                    >
                                      <Eye size={12} />
                                      <span>Details</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 6px",
              flexWrap: "wrap",
              gap: "12px",
              fontSize: "13px",
              color: "#64748b",
            }}
          >
            <span>
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, captainSections.length)} of {captainSections.length}{" "}
              {captainSections.length === 1 ? "captain" : "captains"}
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                style={{
                  height: "34px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: "12.5px",
                  padding: "0 8px",
                  color: "#0f172a",
                }}
              >
                {[5, 10, 25].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="admin-btn admin-btn-secondary"
                style={{ height: "34px", padding: "0 12px", fontSize: "12.5px" }}
              >
                Previous
              </button>

              <span style={{ color: "#0f172a", fontWeight: 600, padding: "0 4px" }}>
                {page} / {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="admin-btn admin-btn-secondary"
                style={{ height: "34px", padding: "0 12px", fontSize: "12.5px" }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screen 3: Details Drawer */}
      {drawerExpense && (
        <Drawer
          e={drawerExpense}
          busy={busyId === drawerExpense._id}
          onClose={() => setDrawerId(null)}
          onApprove={() => approve(drawerExpense)}
          onReject={() => {
            setRejecting(drawerExpense);
            setReason("");
          }}
          onPreview={(u) => setPreviewUrl(u)}
          settlement={groups.find((g) => (g.captainId || "unassigned") === drawerExpense.captainId)?.payoutInfo?.status}
        />
      )}

      {/* Reject Modal */}
      {rejecting && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(3px)",
            padding: "16px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              background: "#ffffff",
              borderRadius: "14px",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              Reject Expense Claim
            </h3>
            <p style={{ marginTop: "4px", fontSize: "13px", color: "#64748b" }}>
              {rejecting.title} • {inr(rejecting.amount)} ({rejecting.captainName})
            </p>

            <label style={{ display: "block", marginTop: "16px", fontSize: "12.5px", fontWeight: 600, color: "#334155" }}>
              Rejection Reason <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              autoFocus
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this expense claim is being rejected..."
              style={{
                marginTop: "6px",
                width: "100%",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                padding: "10px",
                fontSize: "13px",
                color: "#0f172a",
                boxSizing: "border-box",
                outline: "none",
              }}
            />

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setRejecting(null)}
                className="admin-btn admin-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reason.trim() || busyId === rejecting._id}
                onClick={confirmReject}
                style={{
                  background: "#b91c1c",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {busyId === rejecting._id && <Loader2 size={14} className="spin-icon" />}
                <span>Reject Claim</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal Preview */}
      {previewUrl && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.75)",
            padding: "16px",
          }}
          onClick={() => setPreviewUrl(null)}
        >
          <div
            style={{
              position: "relative",
              maxHeight: "90vh",
              maxWidth: "800px",
              background: "#ffffff",
              borderRadius: "14px",
              padding: "12px",
              overflow: "auto",
            }}
            onClick={(ev) => ev.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewUrl(null)}
              style={{
                position: "absolute",
                right: "12px",
                top: "12px",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.9)",
                border: "1px solid #cbd5e1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              aria-label="Close preview"
            >
              <X size={16} />
            </button>
            <img src={previewUrl} alt="Receipt" style={{ maxHeight: "80vh", maxWidth: "100%", borderRadius: "8px" }} />
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Details Drawer Component                                            */
/* ------------------------------------------------------------------ */

const Drawer: React.FC<{
  e: Expense;
  busy: boolean;
  settlement?: string;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onPreview: (url: string) => void;
}> = ({ e, busy, settlement, onClose, onApprove, onReject, onPreview }) => {
  useEffect(() => {
    const h = (ev: KeyboardEvent) => ev.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const approvedReimb = !e.isCompanyPaid && (e.statusLabel === "Approved" || e.statusLabel === "Settled") ? e.amount : 0;
  const settlementText = e.isCompanyPaid
    ? "Not applicable (company paid)"
    : e.statusLabel === "Settled"
    ? "Settled"
    : e.statusLabel === "Approved"
    ? "Awaiting settlement"
    : e.statusLabel === "Rejected"
    ? "Not reimbursable"
    : "Awaiting approval";
  void settlement;

  const kind = receiptKind(e.receiptUrl);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(2px)",
        }}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-label="Expense details"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          maxWidth: "520px",
          background: "#ffffff",
          boxShadow: "-8px 0 24px rgba(0, 0, 0, 0.15)",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        <header
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              Expense Details
            </h2>
            <p style={{ marginTop: "4px", fontSize: "12.5px", color: "#64748b" }}>
              {e.title} • {e.tripName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="booking-action-icon-btn"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px", fontSize: "13px" }}>
          {/* Big Amount and Status */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "32px", fontWeight: 800, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
              {inr(e.amount)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
              <StatusPill s={e.statusLabel} />
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: modeBadgeStyle[e.paymentMode]?.bg || "#f1f5f9",
                  color: modeBadgeStyle[e.paymentMode]?.text || "#334155",
                  border: `1px solid ${modeBadgeStyle[e.paymentMode]?.border || "#e2e8f0"}`,
                }}
              >
                {modeLabel(e.paymentMode)}
              </span>
            </div>
          </div>

          {/* Details Table */}
          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "8px" }}>
              <span style={{ color: "#64748b" }}>Captain:</span>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>{e.captainName} ({e.captainPhone})</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "8px" }}>
              <span style={{ color: "#64748b" }}>Trip Package:</span>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>{e.tripName}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "8px" }}>
              <span style={{ color: "#64748b" }}>Departure Date:</span>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>{e.departureDateFull || e.tripDate}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "8px" }}>
              <span style={{ color: "#64748b" }}>Category:</span>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>{e.expenseType}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "8px" }}>
              <span style={{ color: "#64748b" }}>Expense Date:</span>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>{e.expenseDate} {e.expenseTime ? `at ${e.expenseTime}` : ""}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "8px" }}>
              <span style={{ color: "#64748b" }}>Reimbursement:</span>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>{inr(approvedReimb)}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "8px" }}>
              <span style={{ color: "#64748b" }}>Settlement:</span>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>{settlementText}</span>
            </div>
            {e.notes && (
              <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "8px", marginTop: "4px" }}>
                <span style={{ color: "#64748b" }}>Notes:</span>
                <span style={{ color: "#334155", background: "#f8fafc", padding: "8px", borderRadius: "6px" }}>{e.notes}</span>
              </div>
            )}
            {e.rejectionReason && (
              <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "8px", marginTop: "4px" }}>
                <span style={{ color: "#b91c1c", fontWeight: 600 }}>Rejection Note:</span>
                <span style={{ color: "#b91c1c", background: "#fef2f2", padding: "8px", borderRadius: "6px" }}>{e.rejectionReason}</span>
              </div>
            )}
          </div>

          {/* Receipt Section */}
          <div style={{ marginTop: "24px", borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>
              Receipt Attachment
            </h3>
            {e.receiptUrl ? (
              <div>
                {kind === "image" ? (
                  <div
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      overflow: "hidden",
                      cursor: "pointer",
                      maxHeight: "220px",
                    }}
                    onClick={() => onPreview(e.receiptUrl!)}
                  >
                    <img src={e.receiptUrl} alt="Receipt" style={{ width: "100%", height: "auto", display: "block" }} />
                  </div>
                ) : (
                  <a
                    href={e.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-btn admin-btn-secondary"
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
                  >
                    <FileText size={14} /> View Attached PDF Receipt
                  </a>
                )}
              </div>
            ) : (
              <p style={{ color: "#94a3b8", fontSize: "12.5px" }}>No receipt attached to this expense.</p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <footer
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <button type="button" onClick={onClose} className="admin-btn admin-btn-secondary">
            Close
          </button>
          {e.canApprove && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                disabled={busy}
                onClick={onReject}
                style={{
                  background: "#fee2e2",
                  color: "#b91c1c",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Reject
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onApprove}
                className="admin-btn admin-btn-primary"
                style={{ background: "#166534", borderColor: "#166534" }}
              >
                Approve Claim
              </button>
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Screen 2: Manual Form Component                                     */
/* ------------------------------------------------------------------ */

const ManualForm: React.FC<{
  onCancel: () => void;
  onSaved: (msg: string) => void;
}> = ({ onCancel, onSaved }) => {
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [tripId, setTripId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [captainId, setCaptainId] = useState("");
  const [mode, setMode] = useState<PaymentMode>("Traviska Card");
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] = useState<{ name: string; data: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/operations/expenses/trip-options`, { headers: authHeaders() });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) throw new Error(data.message || "Could not load trips");
        setTrips(data.trips || []);
      } catch (e: any) {
        setLoadErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const trip = trips.find((t) => t._id === tripId);
  const slot = trip?.slots.find((s) => s._id === slotId);
  const captains = slot?.assignedCaptains || [];

  const readFile = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) {
      setErr("Receipt must be a JPG, PNG or PDF file.");
      return;
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      setErr("Receipt must be 5 MB or smaller.");
      return;
    }
    setErr(null);
    const r = new FileReader();
    r.onload = () => setReceipt({ name: file.name, data: String(r.result) });
    r.onerror = () => setErr("Could not read the selected file.");
    r.readAsDataURL(file);
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (submitting) return;
    setErr(null);
    const amt = Number(amount);
    if (!tripId || !slotId) return setErr("Select a trip package and scheduled departure.");
    if (!captainId) return setErr("Select an assigned captain for this departure.");
    if (!type) return setErr("Select an expense category.");
    if (!title.trim()) return setErr("Enter an expense title.");
    if (!Number.isFinite(amt) || amt <= 0) return setErr("Enter an amount greater than ₹0.");

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/operations/expenses`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          slotId,
          captainId,
          paymentMode: mode,
          expenseType: type,
          category: type,
          title: title.trim(),
          amount: amt,
          notes: notes.trim(),
          receiptUrl: receipt?.data || "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to save expense");
      onSaved(data.message || "Expense saved successfully.");
    } catch (e: any) {
      setErr(e.message || "Failed to save expense");
      setSubmitting(false);
    }
  };

  const modes: Array<{ v: PaymentMode; l: string; d: string }> = [
    { v: "Traviska Card", l: "Traviska Card", d: "Company paid" },
    { v: "Traviska UPI", l: "Traviska UPI", d: "Company paid" },
    { v: "Self", l: "Self (Any Mode)", d: "Needs approval" },
  ];

  return (
    <div style={{ width: "100%", paddingBottom: "48px" }}>
      {/* Header */}
      <div className="admin-page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Back"
            className="booking-action-icon-btn"
            style={{ width: "36px", height: "36px" }}
          >
            <ArrowLeft size={16} />
          </button>
          <div className="admin-page-title-box">
            <h1>Log Manual Trip Expense</h1>
            <p>Record an operational expense on behalf of a captain or departure.</p>
          </div>
        </div>
      </div>

      {loadErr && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca", marginBottom: "16px" }}>
          {loadErr}
        </div>
      )}

      {err && (
        <div role="alert" style={{ padding: "12px 16px", borderRadius: "10px", background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca", marginBottom: "16px" }}>
          {err}
        </div>
      )}

      <form
        onSubmit={submit}
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          maxWidth: "880px",
        }}
      >
        {/* Step 1: Trip & Captain */}
        <div>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>
            1. Trip & Departure Information
          </h2>
          {loading ? (
            <div style={{ color: "#64748b", fontSize: "13px" }}>Loading trips...</div>
          ) : trips.length === 0 && !loadErr ? (
            <p style={{ color: "#64748b", fontSize: "13px" }}>No trips with scheduled departures found.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  Trip Package <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={tripId}
                  onChange={(e) => {
                    setTripId(e.target.value);
                    setSlotId("");
                    setCaptainId("");
                  }}
                  style={{
                    width: "100%",
                    height: "40px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    padding: "0 12px",
                    fontSize: "13px",
                    color: "#0f172a",
                    background: "#ffffff",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">Select trip package</option>
                  {trips.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  Departure Date <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={slotId}
                  disabled={!trip}
                  onChange={(e) => {
                    setSlotId(e.target.value);
                    setCaptainId("");
                  }}
                  style={{
                    width: "100%",
                    height: "40px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    padding: "0 12px",
                    fontSize: "13px",
                    color: "#0f172a",
                    background: trip ? "#ffffff" : "#f8fafc",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">{trip ? "Select departure" : "Select a trip first"}</option>
                  {trip?.slots.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.dateLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  Assigned Captain <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={captainId}
                  disabled={!slot}
                  onChange={(e) => setCaptainId(e.target.value)}
                  style={{
                    width: "100%",
                    height: "40px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    padding: "0 12px",
                    fontSize: "13px",
                    color: "#0f172a",
                    background: slot ? "#ffffff" : "#f8fafc",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">
                    {!slot ? "Select a departure first" : captains.length ? "Select captain" : "No captain assigned"}
                  </option>
                  {captains.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.role ? `(${c.role})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Payment Mode */}
        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "18px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>
            2. Payment Mode <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
            {modes.map((m) => {
              const sel = mode === m.v;
              return (
                <button
                  key={m.v}
                  type="button"
                  onClick={() => setMode(m.v)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: sel ? "1.5px solid #166534" : "1px solid #cbd5e1",
                    background: sel ? "#f0fdf4" : "#ffffff",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      border: sel ? "5px solid #166534" : "1.5px solid #cbd5e1",
                      boxSizing: "border-box",
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: sel ? "#166534" : "#0f172a" }}>{m.l}</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>{m.d}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Expense Details */}
        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "18px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>
            3. Expense Details
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                Category <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{
                  width: "100%",
                  height: "40px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  padding: "0 12px",
                  fontSize: "13px",
                  color: "#0f172a",
                  boxSizing: "border-box",
                }}
              >
                <option value="">Select category</option>
                {EXPENSE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                Amount (₹) <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                style={{
                  width: "100%",
                  height: "40px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  padding: "0 12px",
                  fontSize: "13px",
                  color: "#0f172a",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                Expense Title <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Toll charges on Bangalore–Sakleshpur Highway"
                style={{
                  width: "100%",
                  height: "40px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  padding: "0 12px",
                  fontSize: "13px",
                  color: "#0f172a",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                Additional Notes (optional)
              </label>
              <textarea
                rows={2}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter any additional details, payment reference or invoice number..."
                style={{
                  width: "100%",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  padding: "10px",
                  fontSize: "13px",
                  color: "#0f172a",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
        </div>

        {/* Step 4: Receipt Upload */}
        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "18px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>
            4. Receipt Attachment (optional)
          </label>
          {receipt ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                border: "1px solid #bbf7d0",
                background: "#f0fdf4",
                borderRadius: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#166534", fontWeight: 600, fontSize: "13px" }}>
                <FileText size={16} />
                <span>{receipt.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                style={{ color: "#b91c1c", fontWeight: 600, fontSize: "12px", background: "none", border: "none", cursor: "pointer" }}
              >
                Remove
              </button>
            </div>
          ) : (
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                readFile(e.dataTransfer.files?.[0]);
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "24px 16px",
                border: `2px dashed ${dragOver ? "#166534" : "#cbd5e1"}`,
                background: dragOver ? "#f0fdf4" : "#fafafa",
                borderRadius: "10px",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <UploadCloud size={24} color="#64748b" />
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                Drop receipt here or click to browse
              </span>
              <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                JPG, PNG or PDF • up to 5 MB
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                style={{ display: "none" }}
                onChange={(e) => readFile(e.target.files?.[0])}
              />
            </label>
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "16px",
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Company Card/UPI are auto-approved; Self claims require review.
          </span>
          <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" onClick={onCancel} className="admin-btn admin-btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loading}
              className="admin-btn admin-btn-primary"
            >
              {submitting && <Loader2 size={15} className="spin-icon" />}
              <span>Save Expense</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default TripExpenses;
