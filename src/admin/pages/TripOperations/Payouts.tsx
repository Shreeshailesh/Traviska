import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  CheckCircle2,
  Building2,
  Coins,
  Download,
  Plus,
  RotateCcw,
  Search,
  Calendar,
  Eye,
  FileCheck,
  Check,
  X,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Wallet,
  RotateCw,
  CreditCard,
  FileText,
  MessageCircle,
  Phone,
  ArrowLeft,
  ChevronRight,
  IndianRupee,
  LayoutGrid,
  List,
  Users,
} from "lucide-react";
import { API_BASE_URL } from "../../../api";
import { StatCard } from "../../ui/StatCard";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface PayoutItem {
  _id: string;
  captainId: string;
  captainName: string;
  captainAvatar?: string;
  captainPhone: string;
  captainRole: string;
  bankDetails?: {
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
    upiId?: string;
  };
  slotId: string;
  tripId: string | null;
  tripTitle: string;
  destination: string;
  departureDate: string;
  payoutPeriod: string;
  basePayout: number;
  advancePaid: number;
  approvedExpenses: number;
  totalPayout: number;
  amountPaid: number;
  remainingBalance: number;
  status: "Pending" | "Approved" | "Settled" | string;
  paymentMethod?: string;
  paymentReference?: string;
  settledAt?: string;
  settledBy?: string;
  transactions?: Array<{
    _id: string;
    amount: number;
    paymentMethod: string;
    paymentReference: string;
    settledBy: string;
    settledAt: string;
    notes?: string;
  }>;
}

interface SettlementHistoryItem {
  _id: string;
  payoutId: string;
  captainName: string;
  captainPhone: string;
  tripTitle: string;
  departureDate: string;
  amount: number;
  paymentMethod: string;
  paymentReference: string;
  settledAt: string;
  settledBy: string;
  notes?: string;
}

interface PayoutsSummary {
  pendingPayouts: { count: number; amount: number };
  approvedPayouts: { count: number; amount: number };
  settledPayouts: { count: number; amount: number };
  totalPayoutValue: number;
}

interface CaptainPayoutGroup {
  captainId: string;
  captainName: string;
  captainRole: string;
  captainPhone: string;
  captainAvatar?: string;
  bankDetails?: {
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
    upiId?: string;
  };
  payouts: PayoutItem[];
  totalBase: number;
  totalApprovedExpenses: number;
  totalLiability: number;
  pendingAmount: number;
  pendingCount: number;
  approvedAmount: number;
  approvedCount: number;
  settledAmount: number;
  settledCount: number;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export const CaptainPayouts: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<PayoutsSummary>({
    pendingPayouts: { count: 0, amount: 0 },
    approvedPayouts: { count: 0, amount: 0 },
    settledPayouts: { count: 0, amount: 0 },
    totalPayoutValue: 0,
  });

  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [settlementHistory, setSettlementHistory] = useState<SettlementHistoryItem[]>([]);
  const [availableTrips, setAvailableTrips] = useState<Array<{ _id: string; title: string }>>([]);

  // Selected Captain for drilling down into payments
  const [selectedCaptainId, setSelectedCaptainId] = useState<string | null>(null);

  // Filter Tabs: "all" | "pending" | "approved" | "settled" | "history"
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved" | "settled" | "history">("all");

  // View Mode: "cards" | "table"
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Filters Bar
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrip, setSelectedTrip] = useState("all");

  // Modals
  const [reviewingPayout, setReviewingPayout] = useState<PayoutItem | null>(null);
  const [settlingPayout, setSettlingPayout] = useState<PayoutItem | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>("");
  const [settleMethod, setSettleMethod] = useState("UPI");
  const [settleRef, setSettleRef] = useState("");
  const [settleNotes, setSettleNotes] = useState("");
  const [settleSubmitting, setSettleSubmitting] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);

  // Receipt / Audit View Modal
  const [viewingReceipt, setViewingReceipt] = useState<PayoutItem | null>(null);

  const fetchPayouts = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: "1",
        limit: "100",
        ...(selectedTrip !== "all" && { tripId: selectedTrip }),
        ...(searchQuery.trim() && { search: searchQuery.trim() }),
      });

      const res = await fetch(`${API_BASE_URL}/admin/operations/payouts?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPayouts(data.payouts || []);
        if (data.summary) setSummary(data.summary);
        if (data.settlementHistory) setSettlementHistory(data.settlementHistory);
        if (data.filterOptions && data.filterOptions.trips) {
          setAvailableTrips(data.filterOptions.trips);
        }
      } else {
        setError(data.message || "Failed to load captain payouts");
      }
    } catch (err) {
      console.error("Fetch payouts error:", err);
      setError("Network error connecting to backend service");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, [selectedTrip]);

  // Group payouts by captain
  const captainGroups = useMemo(() => {
    const map = new Map<string, CaptainPayoutGroup>();

    payouts.forEach((pay) => {
      const key = pay.captainId || pay.captainName || "unknown";
      if (!map.has(key)) {
        map.set(key, {
          captainId: pay.captainId,
          captainName: pay.captainName,
          captainRole: pay.captainRole,
          captainPhone: pay.captainPhone,
          captainAvatar: pay.captainAvatar,
          bankDetails: pay.bankDetails,
          payouts: [],
          totalBase: 0,
          totalApprovedExpenses: 0,
          totalLiability: 0,
          pendingAmount: 0,
          pendingCount: 0,
          approvedAmount: 0,
          approvedCount: 0,
          settledAmount: 0,
          settledCount: 0,
        });
      }

      const grp = map.get(key)!;
      grp.payouts.push(pay);
      grp.totalBase += pay.basePayout || 0;
      grp.totalApprovedExpenses += pay.approvedExpenses || 0;
      grp.totalLiability += pay.totalPayout || 0;

      if (pay.status === "Pending") {
        grp.pendingCount++;
        grp.pendingAmount += pay.remainingBalance || pay.totalPayout || 0;
      } else if (pay.status === "Approved") {
        grp.approvedCount++;
        grp.approvedAmount += pay.remainingBalance || pay.totalPayout || 0;
      } else if (pay.status === "Settled") {
        grp.settledCount++;
        grp.settledAmount += pay.amountPaid || pay.totalPayout || 0;
      }
    });

    return Array.from(map.values());
  }, [payouts]);

  // Filter captain groups by active tab and search
  const filteredCaptainGroups = useMemo(() => {
    return captainGroups
      .map((grp) => {
        const matchedPayouts = grp.payouts.filter((p) => {
          if (activeTab === "pending" && p.status !== "Pending") return false;
          if (activeTab === "approved" && p.status !== "Approved") return false;
          if (activeTab === "settled" && p.status !== "Settled") return false;
          if (selectedTrip !== "all" && p.tripId !== selectedTrip) return false;

          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchCap =
              grp.captainName.toLowerCase().includes(q) ||
              (grp.captainPhone || "").includes(q);
            const matchTrip = p.tripTitle.toLowerCase().includes(q);
            const matchRef = (p.paymentReference || "").toLowerCase().includes(q);
            return matchCap || matchTrip || matchRef;
          }

          return true;
        });

        return {
          ...grp,
          filteredPayouts: matchedPayouts,
        };
      })
      .filter((grp) => {
        if (activeTab === "pending") return grp.pendingCount > 0 && grp.filteredPayouts.length > 0;
        if (activeTab === "approved") return grp.approvedCount > 0 && grp.filteredPayouts.length > 0;
        if (activeTab === "settled") return grp.settledCount > 0 && grp.filteredPayouts.length > 0;

        return grp.filteredPayouts.length > 0;
      });
  }, [captainGroups, activeTab, selectedTrip, searchQuery]);

  // The captain currently selected for drilling down
  const activeCaptainGroup = useMemo(() => {
    if (!selectedCaptainId) return null;
    return captainGroups.find((g) => g.captainId === selectedCaptainId) || null;
  }, [captainGroups, selectedCaptainId]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedTrip("all");
    setActiveTab("all");
  };

  // Authorize / Approve Payout
  const handleApprovePayout = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/admin/operations/payouts/${id}/approve`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || "Failed to approve payout");
        return;
      }

      setReviewingPayout(null);
      fetchPayouts();
    } catch (err) {
      console.error("Approve payout error:", err);
      alert("Network error while approving payout");
    }
  };

  // Open Settle Modal
  const handleOpenSettle = (payout: PayoutItem) => {
    setSettlingPayout(payout);
    setSettleAmount(String(payout.remainingBalance || payout.totalPayout));
    setSettleMethod("UPI");
    setSettleRef("");
    setSettleNotes("");
    setSettleError(null);
  };

  // Confirm Settle Payment
  const handleConfirmSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingPayout) return;
    setSettleError(null);

    const amt = Number(settleAmount);
    if (!amt || amt <= 0) {
      setSettleError("Please enter a valid amount greater than ₹0.");
      return;
    }
    if (!settleRef.trim()) {
      setSettleError("Transaction Reference / UTR Number is required.");
      return;
    }

    setSettleSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/admin/operations/payouts/settle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          payoutId: settlingPayout._id,
          captainId: settlingPayout.captainId,
          slotId: settlingPayout.slotId,
          amount: amt,
          paymentMethod: settleMethod,
          paymentReference: settleRef.trim(),
          notes: settleNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Settlement transaction failed");
      }

      setSettlingPayout(null);
      fetchPayouts();
    } catch (err: any) {
      console.error("Settlement error:", err);
      setSettleError(err.message || "Failed to record settlement");
    } finally {
      setSettleSubmitting(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const list = activeTab === "history" ? settlementHistory : payouts;
    if (list.length === 0) {
      alert("No payout records to export.");
      return;
    }

    let csvContent = "";
    if (activeTab === "history") {
      const headers = [
        "Captain Name",
        "Trip",
        "Departure Date",
        "Amount (INR)",
        "Payment Method",
        "Reference (UTR)",
        "Settled At",
        "Settled By",
      ];
      const rows = settlementHistory.map((s) => [
        `"${s.captainName}"`,
        `"${s.tripTitle}"`,
        `"${s.departureDate ? new Date(s.departureDate).toLocaleDateString("en-IN") : ""}"`,
        s.amount,
        `"${s.paymentMethod}"`,
        `"${s.paymentReference}"`,
        `"${new Date(s.settledAt).toLocaleString("en-IN")}"`,
        `"${s.settledBy}"`,
      ]);
      csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    } else {
      const headers = [
        "Captain Name",
        "Role",
        "Trip Title",
        "Departure Date",
        "Base Payout (INR)",
        "Approved Expenses (INR)",
        "Advance Paid (INR)",
        "Total Payout (INR)",
        "Amount Paid (INR)",
        "Remaining Balance (INR)",
        "Status",
      ];
      const rows = payouts.map((p) => [
        `"${p.captainName}"`,
        `"${p.captainRole}"`,
        `"${p.tripTitle}"`,
        `"${p.departureDate ? new Date(p.departureDate).toLocaleDateString("en-IN") : ""}"`,
        p.basePayout,
        p.approvedExpenses,
        p.advancePaid,
        p.totalPayout,
        p.amountPaid,
        p.remainingBalance,
        `"${p.status}"`,
      ]);
      csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `traviska_payouts_settlements_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderRoleBadge = (role: string) => {
    const r = (role || "").toLowerCase();
    if (r.includes("head") || r.includes("lead")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
          <span>👑</span>
          <span>Head Captain</span>
        </span>
      );
    }
    if (r.includes("main") || r.includes("assistant")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
          <span>⭐</span>
          <span>Main Captain</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
        <span>🌱</span>
        <span>Trainee</span>
      </span>
    );
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Settled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Check className="w-3 h-3 text-emerald-600" />
            <span>Settled</span>
          </span>
        );
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            <span>Approved</span>
          </span>
        );
      case "Pending":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* 1. Header */}
      <div className="admin-page-header">
        <div className="admin-page-title-box">
          <div className="flex items-center gap-3">
            <h1>Payouts & Settlements</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Captain Accounts
            </span>
          </div>
          <p>
            Track honorariums, verify expenses, and disburse settlements captain-by-captain.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => fetchPayouts(true)}
            disabled={loading || refreshing}
            className="admin-btn admin-btn-secondary"
            title="Refresh Payouts"
          >
            <RotateCw
              className={`w-3.5 h-3.5 text-emerald-800 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="admin-btn admin-btn-secondary"
          >
            <Download className="w-4 h-4 text-gray-600" />
            <span>Export CSV</span>
          </button>

          <Link
            to="/admin/operations/assignments"
            className="admin-btn admin-btn-primary shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Captain</span>
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm shadow-2xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={() => fetchPayouts()}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Top KPI Stat Cards */}
      <div className="admin-stats-grid">
        <StatCard
          icon={<Clock size={18} />}
          label="Pending Review"
          value={loading ? "..." : `₹${summary.pendingPayouts.amount.toLocaleString("en-IN")}`}
          subtitle={`${summary.pendingPayouts.count} payouts awaiting review`}
          change={summary.pendingPayouts.count > 0 ? `${summary.pendingPayouts.count} Pending` : undefined}
          isPositive={summary.pendingPayouts.count === 0}
          iconTheme="gold"
        />

        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="Ready for Settlement"
          value={loading ? "..." : `₹${summary.approvedPayouts.amount.toLocaleString("en-IN")}`}
          subtitle={`${summary.approvedPayouts.count} payouts ready to disburse`}
          change={summary.approvedPayouts.count > 0 ? `${summary.approvedPayouts.count} Ready` : undefined}
          isPositive={true}
          iconTheme="blue"
        />

        <StatCard
          icon={<Wallet size={18} />}
          label="Settled & Disbursed"
          value={loading ? "..." : `₹${summary.settledPayouts.amount.toLocaleString("en-IN")}`}
          subtitle={`${summary.settledPayouts.count} payouts completed`}
          iconTheme="green"
        />

        <StatCard
          icon={<Coins size={18} />}
          label="Total Payout Value"
          value={loading ? "..." : `₹${summary.totalPayoutValue.toLocaleString("en-IN")}`}
          subtitle="Across all captain departures"
          iconTheme="default"
        />
      </div>

      {/* 3. Action Notification Banner if approved payouts are waiting */}
      {summary.approvedPayouts.count > 0 && activeTab !== "approved" && !selectedCaptainId && (
        <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50 border border-emerald-200/90 rounded-2xl flex items-center justify-between text-xs text-emerald-950 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#0d2b17] flex items-center justify-center text-white shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <span className="font-extrabold text-gray-900 text-[13.5px] block">
                {summary.approvedPayouts.count} Approved Payout{summary.approvedPayouts.count === 1 ? "" : "s"} Ready for Immediate Disbursement
              </span>
              <span className="text-gray-600 text-xs mt-0.5 block">
                Totaling <strong className="text-emerald-900 font-bold">₹{summary.approvedPayouts.amount.toLocaleString("en-IN")}</strong> authorized for settlement with bank UTR transaction references.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("approved")}
            className="px-4 py-2 bg-[#0d2b17] hover:bg-[#164e23] text-white font-bold rounded-xl transition-all shadow-xs shrink-0 flex items-center gap-1.5 text-xs"
          >
            <span>View Ready to Settle</span>
            <ChevronRight className="w-4 h-4 text-emerald-300" />
          </button>
        </div>
      )}

      {/* 4. Tab Navigation (SaaS Segmented Control) */}
      <div className="flex items-center gap-1.5 p-1.5 bg-gray-100/80 rounded-2xl border border-gray-200/70 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setActiveTab("all");
            setSelectedCaptainId(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === "all" && !selectedCaptainId
              ? "bg-[#0d2b17] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
          }`}
        >
          <Users size={14} className={activeTab === "all" && !selectedCaptainId ? "text-emerald-300" : "text-gray-400"} />
          <span>All Captains</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
              activeTab === "all" && !selectedCaptainId
                ? "bg-white/20 text-white"
                : "bg-gray-200/80 text-gray-700"
            }`}
          >
            {captainGroups.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("pending");
            setSelectedCaptainId(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === "pending" && !selectedCaptainId
              ? "bg-[#92400e] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
          }`}
        >
          <Clock size={14} className={activeTab === "pending" && !selectedCaptainId ? "text-amber-200" : "text-amber-600"} />
          <span>Pending Review</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
              activeTab === "pending" && !selectedCaptainId
                ? "bg-white/25 text-white"
                : "bg-amber-100 text-amber-900"
            }`}
          >
            {summary.pendingPayouts.count}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("approved");
            setSelectedCaptainId(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === "approved" && !selectedCaptainId
              ? "bg-[#166534] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
          }`}
        >
          <CheckCircle2 size={14} className={activeTab === "approved" && !selectedCaptainId ? "text-emerald-200" : "text-emerald-600"} />
          <span>Ready to Settle</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
              activeTab === "approved" && !selectedCaptainId
                ? "bg-white/25 text-white"
                : "bg-emerald-100 text-emerald-900"
            }`}
          >
            {summary.approvedPayouts.count}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("settled");
            setSelectedCaptainId(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === "settled" && !selectedCaptainId
              ? "bg-[#1e293b] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
          }`}
        >
          <Check size={14} className={activeTab === "settled" && !selectedCaptainId ? "text-emerald-300" : "text-gray-400"} />
          <span>Settled Archive</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
              activeTab === "settled" && !selectedCaptainId
                ? "bg-white/20 text-white"
                : "bg-gray-200/80 text-gray-700"
            }`}
          >
            {summary.settledPayouts.count}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("history");
            setSelectedCaptainId(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === "history"
              ? "bg-[#0f172a] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
          }`}
        >
          <ShieldCheck size={14} className={activeTab === "history" ? "text-emerald-300" : "text-gray-400"} />
          <span>Disbursement Audit Trail</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
              activeTab === "history"
                ? "bg-white/20 text-white"
                : "bg-gray-200/80 text-gray-700"
            }`}
          >
            {settlementHistory.length}
          </span>
        </button>
      </div>

      {/* 5. Main Content: Master-Detail Drilldown */}
      {activeTab === "history" ? (
        /* Permanent Audit Trail View */
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50/60 to-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#164e23] shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                  Settlement Transaction Audit Trail
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Permanent record of verified disbursements, bank references, and admin sign-offs.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50/80 border-b border-gray-200/80 text-gray-600 font-semibold uppercase tracking-wider text-[10.5px]">
                <tr>
                  <th className="px-5 py-3.5">Captain</th>
                  <th className="px-4 py-3.5">Trip & Departure</th>
                  <th className="px-3.5 py-3.5 text-right">Settled Amount</th>
                  <th className="px-3.5 py-3.5">Method</th>
                  <th className="px-4 py-3.5">Transaction Ref (UTR)</th>
                  <th className="px-4 py-3.5">Settlement Date</th>
                  <th className="px-5 py-3.5 text-right">Authorized By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {settlementHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-14 text-gray-500">
                      <div className="flex flex-col items-center gap-2 max-w-sm mx-auto">
                        <FileText className="w-8 h-8 text-gray-300" />
                        <span className="font-bold text-gray-800 text-sm">
                          No settlement logs found
                        </span>
                        <span className="text-xs text-gray-500 text-center">
                          Disbursements recorded via "Settle Payout" appear here with full audit details.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  settlementHistory.map((tx) => (
                    <tr key={tx._id} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-gray-900 block text-xs">
                          {tx.captainName}
                        </span>
                        <span className="text-[11px] text-gray-400">{tx.captainPhone}</span>
                      </td>

                      <td className="px-4 py-3.5 text-gray-700">
                        <span className="font-semibold block text-gray-900">{tx.tripTitle}</span>
                        {tx.departureDate && (
                          <span className="text-[11px] text-gray-400">
                            {new Date(tx.departureDate).toLocaleDateString("en-IN")}
                          </span>
                        )}
                      </td>

                      <td className="px-3.5 py-3.5 text-right font-black text-emerald-800 text-xs">
                        ₹{tx.amount.toLocaleString("en-IN")}
                      </td>

                      <td className="px-3.5 py-3.5 text-gray-700 font-medium">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 font-semibold text-[11px]">
                          <CreditCard className="w-3 h-3 text-gray-500" />
                          <span>{tx.paymentMethod}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold text-gray-900 text-xs">
                        {tx.paymentReference}
                      </td>

                      <td className="px-4 py-3.5 text-gray-500 text-[11px] whitespace-nowrap">
                        {new Date(tx.settledAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        <span className="text-gray-400">
                          {new Date(tx.settledAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right text-gray-700 font-semibold">
                        {tx.settledBy || "Admin"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeCaptainGroup ? (
        /* INDIVIDUAL CAPTAIN PAYMENTS VIEW (Opened on click) */
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Back Navigation & Breadcrumb */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSelectedCaptainId(null)}
              className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-2xs hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← Back to All Captains</span>
            </button>

            {/* Quick Switcher dropdown */}
            <select
              value={selectedCaptainId || ""}
              onChange={(e) => setSelectedCaptainId(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 bg-white text-gray-800 font-bold focus:ring-1 focus:ring-emerald-700 shadow-2xs"
            >
              {captainGroups.map((c) => (
                <option key={c.captainId} value={c.captainId}>
                  Captain: {c.captainName}
                </option>
              ))}
            </select>
          </div>

          {/* Captain Detail Profile Banner */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Profile details */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#0d2b17] text-white flex items-center justify-center text-lg font-bold shrink-0 shadow-xs">
                  {activeCaptainGroup.captainName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-lg font-extrabold text-gray-900">
                      {activeCaptainGroup.captainName}
                    </h2>
                    {renderRoleBadge(activeCaptainGroup.captainRole)}
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-600 flex-wrap">
                    {activeCaptainGroup.captainPhone && (
                      <span className="flex items-center gap-1 font-semibold text-gray-800">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span>{activeCaptainGroup.captainPhone}</span>
                      </span>
                    )}

                    {activeCaptainGroup.captainPhone && (
                      <a
                        href={`https://wa.me/${activeCaptainGroup.captainPhone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                        <span>WhatsApp Chat</span>
                      </a>
                    )}

                    {activeCaptainGroup.bankDetails?.upiId && (
                      <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-mono text-xs">
                        UPI: <strong>{activeCaptainGroup.bankDetails.upiId}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial summary tags for this captain */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-[10px] text-gray-500 font-semibold uppercase block">
                    Total Liability
                  </span>
                  <span className="font-extrabold text-gray-900 text-sm">
                    ₹{activeCaptainGroup.totalLiability.toLocaleString("en-IN")}
                  </span>
                </div>

                <div
                  className={`px-3.5 py-2 rounded-xl border ${
                    activeCaptainGroup.pendingCount > 0
                      ? "bg-amber-50 text-amber-900 border-amber-200 font-bold"
                      : "bg-gray-50 text-gray-500 border-gray-200"
                  }`}
                >
                  <span className="text-[10px] uppercase block opacity-80">Pending Review</span>
                  <span className="text-sm">
                    ₹{activeCaptainGroup.pendingAmount.toLocaleString("en-IN")} (
                    {activeCaptainGroup.pendingCount})
                  </span>
                </div>

                <div
                  className={`px-3.5 py-2 rounded-xl border ${
                    activeCaptainGroup.approvedCount > 0
                      ? "bg-blue-50 text-blue-900 border-blue-200 font-bold"
                      : "bg-gray-50 text-gray-500 border-gray-200"
                  }`}
                >
                  <span className="text-[10px] uppercase block opacity-80">Ready to Settle</span>
                  <span className="text-sm">
                    ₹{activeCaptainGroup.approvedAmount.toLocaleString("en-IN")} (
                    {activeCaptainGroup.approvedCount})
                  </span>
                </div>

                <div className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold">
                  <span className="text-[10px] uppercase block opacity-80">Settled</span>
                  <span className="text-sm">
                    ₹{activeCaptainGroup.settledAmount.toLocaleString("en-IN")} (
                    {activeCaptainGroup.settledCount})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Captain's Payments & Departures Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-sm font-bold text-gray-900">
                Departure Assignments & Payout Items ({activeCaptainGroup.payouts.length})
              </h3>
              <span className="text-xs text-gray-500">
                Track each departure payment, approve expenses, and record settlement.
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">Trip & Departure</th>
                    <th className="px-4 py-3.5 text-right">Base Honorarium</th>
                    <th className="px-4 py-3.5 text-right">Approved Expenses</th>
                    <th className="px-4 py-3.5 text-right">Total Payable</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeCaptainGroup.payouts.map((pay) => (
                    <tr
                      key={pay._id}
                      className="hover:bg-emerald-50/20 transition-colors group"
                    >
                      {/* Trip & Dates */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-bold text-gray-900 text-xs">{pay.tripTitle}</div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>
                            {pay.departureDate
                              ? new Date(pay.departureDate).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "Ongoing"}
                          </span>
                        </div>
                      </td>

                      {/* Base Payout */}
                      <td className="px-4 py-3.5 text-right font-bold text-gray-900 whitespace-nowrap tabular-nums">
                        ₹{pay.basePayout.toLocaleString("en-IN")}
                      </td>

                      {/* Approved Expenses */}
                      <td className="px-4 py-3.5 text-right font-bold text-emerald-800 whitespace-nowrap tabular-nums">
                        {pay.approvedExpenses > 0 ? (
                          <span>+ ₹{pay.approvedExpenses.toLocaleString("en-IN")}</span>
                        ) : (
                          <span className="text-gray-400 font-normal">₹0</span>
                        )}
                      </td>

                      {/* Total Payable */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums">
                        <span className="font-black text-gray-900 text-xs block">
                          ₹{pay.totalPayout.toLocaleString("en-IN")}
                        </span>
                        {pay.amountPaid > 0 && pay.remainingBalance > 0 && (
                          <span className="text-[10px] text-amber-700 block font-semibold">
                            Remaining: ₹{pay.remainingBalance.toLocaleString("en-IN")}
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {renderStatusBadge(pay.status)}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {pay.status === "Pending" ? (
                            <button
                              type="button"
                              onClick={() => setReviewingPayout(pay)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0d2b17] hover:bg-[#164e23] text-white text-xs font-bold shadow-2xs transition-colors"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              <span>Review & Approve</span>
                            </button>
                          ) : pay.status === "Approved" ? (
                            <button
                              type="button"
                              onClick={() => handleOpenSettle(pay)}
                              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-2xs transition-colors"
                            >
                              <Building2 className="w-3.5 h-3.5" />
                              <span>Settle Payout</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setViewingReceipt(pay)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-xs font-medium shadow-2xs transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-gray-500" />
                              <span>View Receipt</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* MASTER VIEW: PREMIUM CAPTAIN PROFILE CARDS (Grid & Table View) */
        <div className="space-y-4">
          {/* Search, Filter & View Controls Toolbar */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search captain name, phone, UPI, trip..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 shadow-2xs transition-all placeholder:text-gray-400 font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {availableTrips.length > 0 && (
                <select
                  value={selectedTrip}
                  onChange={(e) => setSelectedTrip(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-700 shadow-2xs max-w-[220px] truncate"
                >
                  <option value="all">All Scheduled Trips</option>
                  {availableTrips.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              )}

              {(searchQuery || selectedTrip !== "all") && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 hover:bg-gray-100 shadow-2xs transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Right side: Count pill + Cards vs Table Switcher */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 font-medium hidden sm:inline">
                Showing <strong className="text-gray-800">{filteredCaptainGroups.length}</strong> captain{filteredCaptainGroups.length === 1 ? "" : "s"}
              </span>

              <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200/80">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === "cards"
                      ? "bg-white text-emerald-950 shadow-2xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                  title="Grid Cards View"
                >
                  <LayoutGrid size={14} />
                  <span className="hidden md:inline">Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === "table"
                      ? "bg-white text-emerald-950 shadow-2xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                  title="Ledger Table View"
                >
                  <List size={14} />
                  <span className="hidden md:inline">Table</span>
                </button>
              </div>
            </div>
          </div>

          {/* Grid or Table View of Captain Accounts */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-2xs">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-700 mx-auto" />
              <p className="text-sm font-bold text-gray-800 mt-3">Loading captain settlement ledgers...</p>
              <p className="text-xs text-gray-500 mt-1">Fetching honorariums and approved expense claims</p>
            </div>
          ) : filteredCaptainGroups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                <Wallet className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900">No captain records found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                No captains match your current status or filter criteria. Try resetting your search or filter.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
              >
                <RotateCcw size={13} />
                <span>Reset All Filters</span>
              </button>
            </div>
          ) : viewMode === "cards" ? (
            /* Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCaptainGroups.map((grp) => {
                const cleanPhone = (grp.captainPhone || "").replace(/[^0-9]/g, "");
                const whatsappUrl = cleanPhone
                  ? `https://wa.me/${cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone}`
                  : null;

                // Priority Status
                const hasApproved = grp.approvedCount > 0;
                const hasPending = grp.pendingCount > 0;

                return (
                  <div
                    key={grp.captainId}
                    onClick={() => setSelectedCaptainId(grp.captainId)}
                    className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs hover:shadow-md hover:border-[#164e23]/60 transition-all duration-200 cursor-pointer p-5 flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div>
                      {/* Card Header: Avatar, Name, Role & Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#164e23] to-[#0d2b17] text-white flex items-center justify-center text-sm font-extrabold shrink-0 shadow-xs group-hover:scale-105 transition-transform border border-emerald-900/30">
                            {grp.captainName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-[15px] font-bold text-gray-900 group-hover:text-emerald-900 transition-colors truncate">
                                {grp.captainName}
                              </h3>
                              {renderRoleBadge(grp.captainRole)}
                            </div>
                            <div className="flex items-center gap-2.5 text-xs text-gray-500 mt-1">
                              <span className="flex items-center gap-1 font-medium text-gray-600">
                                <Phone size={12} className="text-gray-400 shrink-0" />
                                <span className="truncate">{grp.captainPhone || "No phone"}</span>
                              </span>
                              {whatsappUrl && (
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200/80 transition-colors"
                                  title="Chat on WhatsApp"
                                >
                                  <MessageCircle size={11} className="text-emerald-600" />
                                  <span>Chat</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Top Right Status Badge */}
                        {hasApproved ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            <span>Ready to Pay</span>
                          </span>
                        ) : hasPending ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs shrink-0">
                            <Clock size={12} className="text-amber-600" />
                            <span>Pending Review</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                            <Check size={12} className="text-emerald-600" />
                            <span>Settled</span>
                          </span>
                        )}
                      </div>

                      {/* Financial Metric Box */}
                      <div className="mt-4 p-4 rounded-xl bg-gradient-to-b from-[#f8fafc] to-white border border-gray-200/80 shadow-2xs space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10.5px] font-bold text-gray-500 uppercase tracking-wider block">
                              {hasApproved
                                ? "Ready for Settlement"
                                : hasPending
                                ? "Pending Review"
                                : "Total Settled"}
                            </span>
                            <span className="text-2xl font-black text-gray-900 tabular-nums tracking-tight mt-0.5 block">
                              {hasApproved
                                ? `₹${grp.approvedAmount.toLocaleString("en-IN")}`
                                : hasPending
                                ? `₹${grp.pendingAmount.toLocaleString("en-IN")}`
                                : `₹${grp.settledAmount.toLocaleString("en-IN")}`}
                            </span>
                          </div>

                          {grp.bankDetails?.upiId && (
                            <span className="px-2 py-1 rounded-lg bg-emerald-50/70 border border-emerald-200/70 font-mono text-[11px] font-semibold text-emerald-900 shadow-2xs shrink-0 flex items-center gap-1">
                              <span className="text-[9px] uppercase tracking-wider text-emerald-700 font-bold">UPI</span>
                              <span className="truncate max-w-[130px]">{grp.bankDetails.upiId}</span>
                            </span>
                          )}
                        </div>

                        {/* Micro-breakdown of financial components */}
                        <div className="pt-2.5 border-t border-gray-100 grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-gray-400 block font-semibold uppercase">Honorarium</span>
                            <span className="font-bold text-gray-800 text-[11.5px] tabular-nums">
                              ₹{grp.totalBase.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block font-semibold uppercase">Claims</span>
                            <span className={`font-bold text-[11.5px] tabular-nums ${grp.totalApprovedExpenses > 0 ? "text-emerald-700" : "text-gray-500"}`}>
                              {grp.totalApprovedExpenses > 0 ? `+₹${grp.totalApprovedExpenses.toLocaleString("en-IN")}` : "₹0"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block font-semibold uppercase">Settled</span>
                            <span className="font-bold text-gray-800 text-[11.5px] tabular-nums">
                              ₹{grp.settledAmount.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>

                        {/* Departures count tag */}
                        <div className="pt-2 border-t border-gray-100/80 flex items-center justify-between text-[11px] text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} className="text-gray-400" />
                            <span>{grp.payouts.length} departure{grp.payouts.length === 1 ? "" : "s"} assigned</span>
                          </span>
                          <span className="text-emerald-700 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                            <span>Details</span>
                            <ChevronRight size={12} />
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-3.5 pt-3 border-t border-gray-100">
                      {hasApproved ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const approvedPay = grp.payouts.find((p) => p.status === "Approved");
                            if (approvedPay && grp.approvedCount === 1) {
                              handleOpenSettle(approvedPay);
                            } else {
                              setSelectedCaptainId(grp.captainId);
                            }
                          }}
                          className="w-full py-2.5 px-4 rounded-xl bg-[#0d2b17] hover:bg-[#164e23] text-white text-xs font-bold flex items-center justify-between shadow-xs transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <CreditCard size={14} className="text-emerald-300" />
                            <span>Settle Payout (₹{grp.approvedAmount.toLocaleString("en-IN")})</span>
                          </span>
                          <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                      ) : hasPending ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const pendingPay = grp.payouts.find((p) => p.status === "Pending");
                            if (pendingPay && grp.pendingCount === 1) {
                              setReviewingPayout(pendingPay);
                            } else {
                              setSelectedCaptainId(grp.captainId);
                            }
                          }}
                          className="w-full py-2.5 px-4 rounded-xl bg-[#fef3c7] hover:bg-[#fde68a] border border-[#f59e0b]/40 text-[#92400e] text-xs font-bold flex items-center justify-between transition-colors shadow-2xs"
                        >
                          <span className="flex items-center gap-2">
                            <Clock size={14} className="text-amber-700" />
                            <span>Review Claims ({grp.pendingCount})</span>
                          </span>
                          <ChevronRight size={15} className="text-amber-700 group-hover:translate-x-1 transition-transform" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCaptainId(grp.captainId);
                          }}
                          className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold flex items-center justify-between transition-colors shadow-2xs"
                        >
                          <span className="flex items-center gap-2">
                            <Eye size={14} className="text-gray-400" />
                            <span>View History & Receipts</span>
                          </span>
                          <ChevronRight size={15} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Ledger Table View */
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">Captain</th>
                      <th className="px-4 py-3.5">Role & Contact</th>
                      <th className="px-3.5 py-3.5 text-center">Departures</th>
                      <th className="px-4 py-3.5 text-right">Base Honorarium</th>
                      <th className="px-4 py-3.5 text-right">Approved Claims</th>
                      <th className="px-4 py-3.5 text-right">Settled Amount</th>
                      <th className="px-4 py-3.5 text-right">Balance Due</th>
                      <th className="px-4 py-3.5 text-center">Status</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCaptainGroups.map((grp) => {
                      const hasApproved = grp.approvedCount > 0;
                      const hasPending = grp.pendingCount > 0;
                      const netDue = hasApproved ? grp.approvedAmount : hasPending ? grp.pendingAmount : 0;

                      return (
                        <tr
                          key={grp.captainId}
                          onClick={() => setSelectedCaptainId(grp.captainId)}
                          className="hover:bg-emerald-50/20 transition-colors cursor-pointer group"
                        >
                          {/* Captain Name & Avatar */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#164e23] to-[#0d2b17] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                                {grp.captainName.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-gray-900 group-hover:text-emerald-900 block text-xs">
                                  {grp.captainName}
                                </span>
                                {grp.bankDetails?.upiId && (
                                  <span className="font-mono text-[10.5px] text-gray-400 block">
                                    UPI: {grp.bankDetails.upiId}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Role & Phone */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {renderRoleBadge(grp.captainRole)}
                            </div>
                            <span className="text-[11px] text-gray-500 font-medium block mt-1">
                              {grp.captainPhone || "No phone"}
                            </span>
                          </td>

                          {/* Departures */}
                          <td className="px-3.5 py-3.5 text-center whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                              {grp.payouts.length}
                            </span>
                          </td>

                          {/* Base Honorarium */}
                          <td className="px-4 py-3.5 text-right font-bold text-gray-900 whitespace-nowrap tabular-nums">
                            ₹{grp.totalBase.toLocaleString("en-IN")}
                          </td>

                          {/* Approved Claims */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums">
                            {grp.totalApprovedExpenses > 0 ? (
                              <span className="font-bold text-emerald-700">
                                +₹{grp.totalApprovedExpenses.toLocaleString("en-IN")}
                              </span>
                            ) : (
                              <span className="text-gray-400">₹0</span>
                            )}
                          </td>

                          {/* Settled Amount */}
                          <td className="px-4 py-3.5 text-right font-bold text-gray-800 whitespace-nowrap tabular-nums">
                            ₹{grp.settledAmount.toLocaleString("en-IN")}
                          </td>

                          {/* Balance Due */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums">
                            <span className={`text-xs font-black block ${hasApproved ? "text-emerald-800" : hasPending ? "text-amber-800" : "text-gray-400"}`}>
                              {netDue > 0 ? `₹${netDue.toLocaleString("en-IN")}` : "₹0"}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            {hasApproved ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                <span>Ready to Pay</span>
                              </span>
                            ) : hasPending ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
                                <Clock size={11} className="text-amber-600" />
                                <span>Pending</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                <Check size={11} className="text-emerald-600" />
                                <span>Settled</span>
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            {hasApproved ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const approvedPay = grp.payouts.find((p) => p.status === "Approved");
                                  if (approvedPay && grp.approvedCount === 1) {
                                    handleOpenSettle(approvedPay);
                                  } else {
                                    setSelectedCaptainId(grp.captainId);
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d2b17] hover:bg-[#164e23] text-white text-xs font-bold shadow-2xs transition-colors"
                              >
                                <CreditCard size={13} className="text-emerald-300" />
                                <span>Settle</span>
                              </button>
                            ) : hasPending ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const pendingPay = grp.payouts.find((p) => p.status === "Pending");
                                  if (pendingPay && grp.pendingCount === 1) {
                                    setReviewingPayout(pendingPay);
                                  } else {
                                    setSelectedCaptainId(grp.captainId);
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#fef3c7] hover:bg-[#fde68a] border border-[#f59e0b]/40 text-[#92400e] text-xs font-bold transition-colors shadow-2xs"
                              >
                                <Clock size={13} className="text-amber-700" />
                                <span>Review</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCaptainId(grp.captainId);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-2xs transition-colors"
                              >
                                <Eye size={13} className="text-gray-400" />
                                <span>View</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: REVIEW PAYOUT LIABILITY (Pending -> Approved)                 */}
      {/* ===================================================================== */}
      {reviewingPayout && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            overflowY: "auto",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setReviewingPayout(null);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "min(92vh, 880px)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              border: "1px solid #e2e8f0",
              animation: "fadeIn 0.15s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
                background: "#ffffff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    background: "#dcfce7",
                    color: "#166534",
                    border: "1px solid #bbf7d0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <FileCheck size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
                    Review Captain Payout Liability
                  </h3>
                  <p style={{ margin: "3px 0 0 0", fontSize: "12.5px", color: "#64748b" }}>
                    Verify departure honorarium, approved expenses, and authorize disbursement.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setReviewingPayout(null)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#64748b",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e2e8f0";
                  e.currentTarget.style.color = "#0f172a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f1f5f9";
                  e.currentTarget.style.color = "#64748b";
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div
              style={{
                padding: "22px 24px",
                overflowY: "auto",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "18px",
              }}
            >
              {/* Captain & Trip Identity Strip */}
              <div
                style={{
                  padding: "14px 16px",
                  background: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "14px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #092312 0%, #164e23 100%)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "14px",
                      flexShrink: 0,
                    }}
                  >
                    {reviewingPayout.captainName.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>
                        {reviewingPayout.captainName}
                      </span>
                      {renderRoleBadge(reviewingPayout.captainRole)}
                    </div>
                    {reviewingPayout.captainPhone && (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "#64748b", marginTop: "3px" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Phone size={12} color="#94a3b8" />
                          <span>{reviewingPayout.captainPhone}</span>
                        </span>
                        <a
                          href={`https://wa.me/${reviewingPayout.captainPhone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            color: "#166534",
                            fontWeight: 600,
                            textDecoration: "none",
                            background: "#dcfce7",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            border: "1px solid #bbf7d0",
                          }}
                        >
                          <MessageCircle size={12} />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13px" }}>
                    {reviewingPayout.tripTitle}
                  </div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "11.5px",
                      fontWeight: 600,
                      color: "#166534",
                      background: "#dcfce7",
                      padding: "3px 10px",
                      borderRadius: "6px",
                      border: "1px solid #bbf7d0",
                      marginTop: "4px",
                    }}
                  >
                    <Calendar size={12} />
                    <span>
                      {reviewingPayout.departureDate
                        ? new Date(reviewingPayout.departureDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Ongoing Trip"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Itemized Calculation Breakdown Table */}
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  overflow: "hidden",
                  background: "#ffffff",
                }}
              >
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "10px 16px",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Itemized Liability Breakdown
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#166534",
                      background: "#dcfce7",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      border: "1px solid #bbf7d0",
                    }}
                  >
                    Audit Verified
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  {/* Row 1: Base Honorarium */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "8px",
                          background: "#f1f5f9",
                          color: "#475569",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Coins size={15} />
                      </div>
                      <div>
                        <span style={{ fontWeight: 600, color: "#0f172a", fontSize: "13px", display: "block" }}>
                          Base Captain Honorarium
                        </span>
                        <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                          Fixed compensation for departure execution
                        </span>
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px" }}>
                      ₹{reviewingPayout.basePayout.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Row 2: Approved Claims */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderBottom: reviewingPayout.advancePaid > 0 ? "1px solid #f1f5f9" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "8px",
                          background: "#dcfce7",
                          color: "#166534",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <FileText size={15} />
                      </div>
                      <div>
                        <span style={{ fontWeight: 600, color: "#0f172a", fontSize: "13px", display: "block" }}>
                          Approved Reimbursable Claims
                        </span>
                        <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                          Verified self-paid on-trip expense receipts
                        </span>
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, color: "#166534", fontSize: "14px" }}>
                      + ₹{reviewingPayout.approvedExpenses.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Row 3: Company Advance (if any) */}
                  {reviewingPayout.advancePaid > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "8px",
                            background: "#fee2e2",
                            color: "#dc2626",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <CreditCard size={15} />
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: "#0f172a", fontSize: "13px", display: "block" }}>
                            Company Advance Deducted
                          </span>
                          <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                            Pre-trip advance issued to captain
                          </span>
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, color: "#dc2626", fontSize: "14px" }}>
                        - ₹{reviewingPayout.advancePaid.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Hero Total Payable Banner */}
              <div
                style={{
                  padding: "16px 20px",
                  background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                  borderRadius: "14px",
                  border: "2px solid #86efac",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 8px rgba(22, 101, 52, 0.08)",
                }}
              >
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "#166534",
                      background: "#bbf7d0",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "4px",
                    }}
                  >
                    Total Payable Liability
                  </span>
                  <span style={{ fontSize: "12.5px", color: "#166534", fontWeight: 600, display: "block" }}>
                    Net amount authorized for disbursement
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "26px", fontWeight: 900, color: "#0d2b17", display: "block", letterSpacing: "-0.5px" }}>
                    ₹{reviewingPayout.totalPayout.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Disbursement Channel Info Strip */}
              <div
                style={{
                  padding: "12px 16px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "10px",
                      background: "#e0f2fe",
                      color: "#0369a1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Building2 size={16} />
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block" }}>
                      Disbursement Channel
                    </span>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "12.5px", color: "#0f172a" }}>
                      {reviewingPayout.bankDetails?.upiId
                        ? `UPI: ${reviewingPayout.bankDetails.upiId}`
                        : reviewingPayout.bankDetails?.accountNumber
                        ? `A/C: ${reviewingPayout.bankDetails.accountNumber} (${reviewingPayout.bankDetails.ifsc || ""})`
                        : "UPI / Bank Transfer (Direct Settlement)"}
                    </span>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#166534",
                    background: "#dcfce7",
                    border: "1px solid #bbf7d0",
                    padding: "3px 10px",
                    borderRadius: "6px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <ShieldCheck size={13} color="#166534" />
                  <span>{reviewingPayout.bankDetails?.upiId ? "Verified UPI" : "Direct Settlement"}</span>
                </span>
              </div>

              {/* Notice */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "11.5px", color: "#64748b", padding: "0 2px" }}>
                <AlertCircle size={14} color="#166534" style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>
                  Authorizing locks this payout amount and marks the departure as ready for immediate disbursement with transaction UTR.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "12px",
                background: "#f8fafc",
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setReviewingPayout(null)}
                className="admin-btn admin-btn-secondary"
                style={{
                  padding: "10px 22px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#475569",
                  background: "#ffffff",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "10px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => handleApprovePayout(reviewingPayout._id)}
                className="admin-btn admin-btn-primary"
                style={{
                  padding: "10px 26px",
                  fontSize: "13px",
                  fontWeight: 700,
                  background: "#0d2b17",
                  color: "#ffffff",
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(13, 43, 23, 0.25)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <CheckCircle2 size={16} color="#d9eec7" />
                <span>Authorize &amp; Approve Payment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: SETTLE PAYOUT (Disbursement & UTR)                          */}
      {/* ===================================================================== */}
      {settlingPayout && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            overflowY: "auto",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !settleSubmitting) setSettlingPayout(null);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "min(92vh, 880px)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              border: "1px solid #e2e8f0",
              animation: "fadeIn 0.15s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
                background: "#ffffff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    background: "#dcfce7",
                    color: "#166534",
                    border: "1px solid #bbf7d0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Building2 size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
                    Record Payout Settlement
                  </h3>
                  <p style={{ margin: "3px 0 0 0", fontSize: "12.5px", color: "#64748b" }}>
                    Confirm disbursement details, record transaction reference, and mark settled.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSettlingPayout(null)}
                disabled={settleSubmitting}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#64748b",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e2e8f0";
                  e.currentTarget.style.color = "#0f172a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f1f5f9";
                  e.currentTarget.style.color = "#64748b";
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmSettle} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div
                style={{
                  padding: "22px 24px",
                  overflowY: "auto",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "18px",
                }}
              >
                {settleError && (
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: "10px",
                      color: "#b91c1c",
                      fontSize: "12.5px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    <span>{settleError}</span>
                  </div>
                )}

                {/* Captain & Trip Identity Banner */}
                <div
                  style={{
                    padding: "14px 16px",
                    background: "#f8fafc",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "14px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "12px",
                        background: "linear-gradient(135deg, #092312 0%, #164e23 100%)",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "14px",
                        flexShrink: 0,
                      }}
                    >
                      {settlingPayout.captainName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>
                          {settlingPayout.captainName}
                        </span>
                        {renderRoleBadge(settlingPayout.captainRole)}
                      </div>
                      {settlingPayout.captainPhone && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#64748b", marginTop: "3px" }}>
                          <Phone size={12} color="#94a3b8" />
                          <span>{settlingPayout.captainPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13px" }}>
                      {settlingPayout.tripTitle}
                    </div>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        color: "#166534",
                        background: "#dcfce7",
                        padding: "3px 10px",
                        borderRadius: "6px",
                        border: "1px solid #bbf7d0",
                        marginTop: "4px",
                      }}
                    >
                      <Calendar size={12} />
                      <span>
                        {settlingPayout.departureDate
                          ? new Date(settlingPayout.departureDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "Ongoing Trip"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financial Calculation Hero Box */}
                <div
                  style={{
                    padding: "16px 20px",
                    background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                    borderRadius: "14px",
                    border: "2px solid #86efac",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    boxShadow: "0 2px 8px rgba(22, 101, 52, 0.08)",
                  }}
                >
                  <div>
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: "11px",
                        fontWeight: 800,
                        color: "#166534",
                        background: "#bbf7d0",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "4px",
                      }}
                    >
                      Remaining Balance Due
                    </span>
                    <span style={{ fontSize: "12.5px", color: "#166534", fontWeight: 600, display: "block" }}>
                      Honorarium: ₹{settlingPayout.basePayout.toLocaleString("en-IN")} • Claims: +₹{settlingPayout.approvedExpenses.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "26px", fontWeight: 900, color: "#0d2b17", display: "block", letterSpacing: "-0.5px" }}>
                      ₹{settlingPayout.remainingBalance.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Form Input Fields Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "14px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#334155",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "6px",
                      }}
                    >
                      Settlement Amount (₹) *
                    </label>
                    <div style={{ position: "relative" }}>
                      <div
                        style={{
                          position: "absolute",
                          left: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#64748b",
                          fontWeight: 700,
                          fontSize: "14px",
                        }}
                      >
                        <IndianRupee size={15} />
                      </div>
                      <input
                        type="number"
                        min="1"
                        required
                        value={settleAmount}
                        onChange={(e) => setSettleAmount(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 12px 10px 32px",
                          borderRadius: "10px",
                          border: "1.5px solid #cbd5e1",
                          fontSize: "14px",
                          fontWeight: 700,
                          color: "#0f172a",
                          background: "#ffffff",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#334155",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "6px",
                      }}
                    >
                      Payment Method *
                    </label>
                    <select
                      value={settleMethod}
                      onChange={(e) => setSettleMethod(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1.5px solid #cbd5e1",
                        fontSize: "13.5px",
                        fontWeight: 600,
                        color: "#0f172a",
                        background: "#ffffff",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      <option value="UPI">UPI Transfer</option>
                      <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                      <option value="Cash">Cash Handover</option>
                      <option value="Company Card">Company Card</option>
                    </select>
                  </div>
                </div>

                {/* Transaction Reference / UTR Number */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <label
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#334155",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Transaction Reference / UTR Number *
                    </label>
                    {settlingPayout.bankDetails?.upiId && (
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#166534",
                          background: "#dcfce7",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          border: "1px solid #bbf7d0",
                        }}
                      >
                        UPI: {settlingPayout.bankDetails.upiId}
                      </span>
                    )}
                  </div>
                  <div style={{ position: "relative" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#94a3b8",
                      }}
                    >
                      <CreditCard size={15} />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. UPI-49201940124 or IMPS-9381048102"
                      value={settleRef}
                      onChange={(e) => setSettleRef(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px 10px 34px",
                        borderRadius: "10px",
                        border: "1.5px solid #cbd5e1",
                        fontSize: "13px",
                        fontFamily: "monospace",
                        fontWeight: 600,
                        color: "#0f172a",
                        background: "#ffffff",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                {/* Settlement Notes */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#334155",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "6px",
                    }}
                  >
                    Settlement Notes / Remarks <span style={{ color: "#94a3b8", fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Full honorarium + trip expenses cleared"
                    value={settleNotes}
                    onChange={(e) => setSettleNotes(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "13px",
                      color: "#0f172a",
                      background: "#ffffff",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  padding: "16px 24px",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "12px",
                  background: "#f8fafc",
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => setSettlingPayout(null)}
                  disabled={settleSubmitting}
                  className="admin-btn admin-btn-secondary"
                  style={{
                    padding: "10px 22px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#475569",
                    background: "#ffffff",
                    border: "1.5px solid #cbd5e1",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settleSubmitting}
                  className="admin-btn admin-btn-primary"
                  style={{
                    padding: "10px 26px",
                    fontSize: "13px",
                    fontWeight: 700,
                    background: "#0d2b17",
                    color: "#ffffff",
                    borderRadius: "10px",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(13, 43, 23, 0.25)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {settleSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Recording Settlement...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} color="#d9eec7" />
                      <span>Confirm &amp; Settle Payout</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: VIEW CERTIFICATE & SETTLEMENT DETAILS                        */}
      {/* ===================================================================== */}
      {viewingReceipt && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            overflowY: "auto",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingReceipt(null);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "min(92vh, 880px)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              border: "1px solid #e2e8f0",
              animation: "fadeIn 0.15s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
                background: "#ffffff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    background: "#dcfce7",
                    color: "#166534",
                    border: "1px solid #bbf7d0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
                    Settlement Certificate &amp; Audit
                  </h3>
                  <p style={{ margin: "3px 0 0 0", fontSize: "12.5px", color: "#64748b" }}>
                    Verified disbursement ledger for {viewingReceipt.captainName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingReceipt(null)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#64748b",
                  transition: "all 0.15s ease",
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                padding: "22px 24px",
                overflowY: "auto",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "18px",
              }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  background: "#f0fdf4",
                  border: "1.5px solid #86efac",
                  borderRadius: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Settled Status:</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: "#166534",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "#ffffff",
                      border: "1px solid #bbf7d0",
                      padding: "3px 10px",
                      borderRadius: "999px",
                      fontSize: "12px",
                    }}
                  >
                    <CheckCircle2 size={14} color="#166534" />
                    <span>Fully Disbursed &amp; Settled</span>
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Total Amount Disbursed:</span>
                  <span style={{ fontWeight: 900, fontSize: "22px", color: "#0d2b17" }}>
                    ₹{viewingReceipt.amountPaid.toLocaleString("en-IN")}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Payment Method / UTR:</span>
                  <span
                    style={{
                      fontWeight: 700,
                      fontFamily: "monospace",
                      fontSize: "12.5px",
                      color: "#0f172a",
                      background: "#ffffff",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    {viewingReceipt.paymentMethod} • {viewingReceipt.paymentReference || "N/A"}
                  </span>
                </div>

                {viewingReceipt.settledAt && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Disbursed On:</span>
                    <span style={{ color: "#334155", fontWeight: 600, fontSize: "12.5px" }}>
                      {new Date(viewingReceipt.settledAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </div>

              {viewingReceipt.transactions && viewingReceipt.transactions.length > 0 && (
                <div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      display: "block",
                      marginBottom: "10px",
                    }}
                  >
                    Disbursement Audit Logs ({viewingReceipt.transactions.length})
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {viewingReceipt.transactions.map((t, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "12px 14px",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: "12.5px",
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 700, color: "#0f172a" }}>
                            ₹{t.amount.toLocaleString("en-IN")}
                          </span>{" "}
                          via <span style={{ fontWeight: 600, color: "#166534" }}>{t.paymentMethod}</span>
                          <span style={{ display: "block", fontFamily: "monospace", fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                            Ref: {t.paymentReference}
                          </span>
                        </div>
                        <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                          {new Date(t.settledAt).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                background: "#f8fafc",
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setViewingReceipt(null)}
                className="admin-btn admin-btn-primary"
                style={{
                  padding: "10px 24px",
                  fontSize: "13px",
                  fontWeight: 600,
                  background: "#0d2b17",
                  color: "#ffffff",
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaptainPayouts;
