import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Calendar,
  IndianRupee,
  Mountain,
  Shield,
  Receipt,
  Users,
  TrendingUp,
  MapPin,
  ArrowRight,
  PlusCircle,
  CalendarCheck,
  CheckSquare,
  Wallet,
  Sparkles,
  RotateCw,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { API_BASE_URL } from "../../api";
import { StatCard } from "../ui/StatCard";
import { TrendChart, DestinationDonut } from "../ui/Charts";
import { Modal } from "../ui/Modal";

interface DashboardData {
  range: {
    period: string;
    from: string;
    to: string;
    timeZone: string;
    lastUpdated: string;
  };
  kpis: {
    totalBookings: number;
    totalBookingsChange: number;
    revenue: number;
    revenueChange: number;
    paidBookings: number;
    pendingBookings: number;
    cancelledBookings: number;
    travellers: number;
    periodCustomers: number;
    activeDeparturesInPeriod: number;

    totalCustomers: number;
    tripPackages: number;
    activeTripPackages: number;
    upcomingDeparturesCount: number;
    activeCaptains: number;
    totalCaptains: number;

    pendingExpenseClaims: {
      count: number;
      totalAmount: number;
      periodCount?: number;
      periodAmount?: number;
    };
    outstandingPayouts: {
      count: number;
      totalAmount: number;
      periodCount?: number;
      periodAmount?: number;
    };
  };
  trend: Array<{
    date: string;
    label: string;
    bookings: number;
    revenue: number;
  }>;
  destinations: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  upcomingDepartures: Array<{
    slotId: string;
    tripId: string;
    title: string;
    location: string;
    image: string;
    date: string;
    bookedSlots: number;
    totalSlots: number;
    captain: { name: string; role?: string } | null;
  }>;
  recentBookings: Array<{
    id: string;
    bookingCode: string;
    customerName: string;
    tripTitle: string;
    amount: number;
    paymentStatus: string;
    bookingStatus: string;
    createdAt: string;
  }>;
  pendingApprovalsAndSettlements: Array<{
    id: string;
    targetId: string;
    targetType: "expense" | "payout";
    captainName: string;
    captainRole?: string;
    tripTitle: string;
    departureDate: string;
    claimType: string;
    description: string;
    amount: number;
    status: string;
    submittedDate: string;
    formattedDate: string;
  }>;
  captainActivity: Array<{
    id: string;
    targetId: string;
    type: "assignment" | "expense";
    status: string;
    statusColor: string;
    title: string;
    subtitle: string;
    time: string;
    targetUrl: string;
  }>;
}

// Helpers for Indian Standard Time dates
const getTodayISTString = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

const subtractDaysIST = (dateStr: string, days: number) => {
  const d = new Date(`${dateStr}T12:00:00+05:30`);
  d.setDate(d.getDate() - days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Filter State
  const [period, setPeriod] = useState<"today" | "7days" | "30days" | "custom">("30days");
  const [customFrom, setCustomFrom] = useState(() => subtractDaysIST(getTodayISTString(), 14));
  const [customTo, setCustomTo] = useState(() => getTodayISTString());

  // Dashboard Data State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>("Just now");

  // Review Modal State
  const [reviewItem, setReviewItem] = useState<DashboardData["pendingApprovalsAndSettlements"][0] | null>(null);
  const [reviewActionLoading, setReviewActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Reference for request cancellation to prevent race conditions
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchDashboard = useCallback(
    async (isBackgroundRefresh = false) => {
      // Cancel any ongoing request to avoid race condition
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (!isBackgroundRefresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      const token = localStorage.getItem("token");

      try {
        const params: Record<string, string> = {
          period,
        };

        if (period === "custom") {
          params.from = customFrom;
          params.to = customTo;
        }

        const res = await axios.get(`${API_BASE_URL}/admin/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params,
          signal: controller.signal,
        });

        if (res.data && res.data.success) {
          setData(res.data);
          const updatedDate = res.data.range?.lastUpdated ? new Date(res.data.range.lastUpdated) : new Date();
          setLastUpdatedTime(
            updatedDate.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              timeZone: "Asia/Kolkata",
            })
          );
        } else {
          setError(res.data?.message || "Failed to load dashboard data");
        }
      } catch (err: any) {
        if (axios.isCancel(err)) {
          return;
        }
        console.error("Dashboard data fetch error:", err);
        setError(err?.response?.data?.message || "Unable to reach server. Please check your connection.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period, customFrom, customTo]
  );

  useEffect(() => {
    fetchDashboard();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchDashboard]);

  const handlePeriodChange = (newPeriod: "today" | "7days" | "30days" | "custom") => {
    setPeriod(newPeriod);
  };

  const handleCustomApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFrom || !customTo) return;
    if (new Date(customFrom) > new Date(customTo)) {
      alert("From Date cannot be later than To Date");
      return;
    }
    fetchDashboard();
  };

  const handleReviewAction = async (status: "Approved" | "Rejected") => {
    if (!reviewItem) return;
    setReviewActionLoading(true);
    const token = localStorage.getItem("token");

    try {
      if (reviewItem.targetType === "expense") {
        await axios.put(
          `${API_BASE_URL}/admin/operations/expenses/${reviewItem.targetId}/status`,
          { status },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setActionFeedback({
          type: "success",
          message: `Expense claim ${status.toLowerCase()} successfully!`,
        });
      } else {
        await axios.post(
          `${API_BASE_URL}/admin/operations/payouts/settle`,
          {
            amount: reviewItem.amount,
            paymentReference: `DIRECT-DASHBOARD-${Date.now().toString().slice(-6)}`,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setActionFeedback({
          type: "success",
          message: `Captain payout recorded as settled!`,
        });
      }

      setReviewItem(null);
      // Auto-refresh dashboard data
      fetchDashboard(true);
    } catch (err: any) {
      console.error("Action error:", err);
      setActionFeedback({
        type: "error",
        message: err?.response?.data?.message || "Action failed. Please try again.",
      });
    } finally {
      setReviewActionLoading(false);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const kpis = data?.kpis;

  return (
    <div style={{ width: "100%" }}>
      {/* Loading Progress Bar */}
      {(loading || refreshing) && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "#22c55e",
            zIndex: 9999,
            boxShadow: "0 0 10px rgba(34,197,94,0.6)",
          }}
        />
      )}

      {/* Top Notification Feedback */}
      {actionFeedback && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 18px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: actionFeedback.type === "success" ? "#dcfce7" : "#fee2e2",
            color: actionFeedback.type === "success" ? "#166534" : "#b91c1c",
            border: `1px solid ${actionFeedback.type === "success" ? "#bbf7d0" : "#fecaca"}`,
          }}
        >
          {actionFeedback.type === "success" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* TOP HEADER: Title, Date Filter & Last Updated */}
      <div className="admin-page-header" style={{ alignItems: "center", gap: "16px" }}>
        <div className="admin-page-title-box">
          <h1>Dashboard</h1>
          <p>
            Welcome back, Shailesh! Here's your real-time performance summary.
          </p>
        </div>

        {/* Date Filter & Status Container */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Filter Pills */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "3px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            {(
              [
                { id: "today", label: "Today" },
                { id: "7days", label: "Last 7 Days" },
                { id: "30days", label: "Last 30 Days" },
                { id: "custom", label: "Custom Range" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => handlePeriodChange(f.id)}
                style={{
                  padding: "6px 14px",
                  fontSize: "12.5px",
                  fontWeight: period === f.id ? 700 : 500,
                  color: period === f.id ? "#ffffff" : "#475569",
                  background: period === f.id ? "#0d2b17" : "transparent",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Last Updated & Refresh Button */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "6px 12px",
              fontSize: "12px",
              color: "#64748b",
            }}
          >
            <Clock size={13} color="#94a3b8" />
            <span>Updated: <strong style={{ color: "#0f172a" }}>{lastUpdatedTime}</strong></span>
            <button
              type="button"
              onClick={() => fetchDashboard(true)}
              disabled={loading || refreshing}
              title="Refresh Dashboard"
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
                color: "#166534",
              }}
            >
              <RotateCw size={13} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Custom Range Drawer / Bar when Custom is active */}
      {period === "custom" && (
        <form
          onSubmit={handleCustomApply}
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "12px 18px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", fontWeight: 600, color: "#0f172a" }}>
            <Calendar size={15} color="#15803d" />
            <span>Select Date Range (IST):</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={{ fontSize: "12px", color: "#64748b" }}>From:</label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "12.5px",
                color: "#0f172a",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={{ fontSize: "12px", color: "#64748b" }}>To:</label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "12.5px",
                color: "#0f172a",
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              padding: "6px 16px",
              borderRadius: "8px",
              background: "#0d2b17",
              color: "#ffffff",
              fontSize: "12.5px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            Apply Range
          </button>
        </form>
      )}

      {/* Error Banner with Retry */}
      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "12px",
            padding: "16px 20px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#991b1b",
            fontSize: "13.5px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchDashboard()}
            style={{
              padding: "6px 14px",
              background: "#b91c1c",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Retry Request
          </button>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: KPI CARDS (Responsive CSS Grid)
          ========================================================================= */}
      <div className="admin-stats-grid">
        {/* KPI 1: Total Bookings (Period) */}
        <StatCard
          icon={<Calendar size={18} />}
          label={`Total Bookings (${period === "today" ? "Today" : period === "7days" ? "7 Days" : period === "custom" ? "Custom" : "30 Days"})`}
          value={kpis ? kpis.totalBookings : 0}
          change={
            kpis && kpis.totalBookingsChange !== null
              ? `${kpis.totalBookingsChange >= 0 ? "+" : ""}${kpis.totalBookingsChange}%`
              : "0%"
          }
          isPositive={(kpis?.totalBookingsChange ?? 0) >= 0}
          subtitle={`${kpis?.paidBookings || 0} Paid • ${kpis?.pendingBookings || 0} Pending`}
          iconTheme="green"
        />

        {/* KPI 2: Total Revenue (Period) */}
        <StatCard
          icon={<IndianRupee size={18} />}
          label={`Collected Revenue (${period === "today" ? "Today" : period === "7days" ? "7 Days" : period === "custom" ? "Custom" : "30 Days"})`}
          value={`₹${(kpis?.revenue ?? 0).toLocaleString("en-IN")}`}
          change={
            kpis && kpis.revenueChange !== null
              ? `${kpis.revenueChange >= 0 ? "+" : ""}${kpis.revenueChange}%`
              : "0%"
          }
          isPositive={(kpis?.revenueChange ?? 0) >= 0}
          subtitle="Net received in period"
          iconTheme="green"
        />

        {/* KPI 3: Active Departures (Period) */}
        <StatCard
          icon={<Mountain size={18} />}
          label="Active Departures"
          value={kpis?.activeDeparturesInPeriod ?? kpis?.upcomingDeparturesCount ?? 0}
          subtitle={`${kpis?.activeTripPackages || kpis?.tripPackages || 0} active packages`}
          iconTheme="green"
        />

        {/* KPI 4: Total Customers (All-Time Snapshot) */}
        <StatCard
          icon={<Users size={18} />}
          label="Registered Travellers"
          value={kpis?.totalCustomers ?? 0}
          subtitle={`${kpis?.periodCustomers || 0} bookers in period`}
          iconTheme="blue"
        />

        {/* KPI 5: Active Captains (Current Snapshot) */}
        <StatCard
          icon={<Shield size={18} />}
          label="Active Captains"
          value={kpis?.activeCaptains ?? 0}
          subtitle={`${kpis?.totalCaptains || 0} total on roster`}
          iconTheme="blue"
        />

        {/* KPI 6: Pending Expenses (All-Time Outstanding) */}
        <StatCard
          icon={<Receipt size={18} />}
          label="Pending Expenses"
          value={`₹${(kpis?.pendingExpenseClaims?.totalAmount ?? 0).toLocaleString("en-IN")}`}
          subtitle={`${kpis?.pendingExpenseClaims?.count ?? 0} claims awaiting review`}
          iconTheme="gold"
        />

        {/* KPI 7: Pending Payouts (All-Time Outstanding) */}
        <StatCard
          icon={<Wallet size={18} />}
          label="Pending Payouts"
          value={`₹${(kpis?.outstandingPayouts?.totalAmount ?? 0).toLocaleString("en-IN")}`}
          subtitle={`${kpis?.outstandingPayouts?.count ?? 0} captain balances due`}
          iconTheme="gold"
        />
      </div>

      {/* =========================================================================
          SECTION 2: CHARTS ROW (Trend Chart & Destination Breakdown)
          ========================================================================= */}
      <div className="admin-charts-grid">
        {/* Trend Chart (Left 2/3) */}
        <div className="admin-chart-card">
          <div className="admin-chart-header">
            <div className="admin-chart-title">
              <TrendingUp size={18} color="#15803d" />
              <span>Bookings & Revenue Trend</span>
            </div>

            <div className="admin-chart-legend">
              <div>
                <span className="admin-legend-dot" style={{ background: "#bbf7d0" }} />
                <span>Bookings</span>
              </div>
              <div>
                <span className="admin-legend-dot" style={{ background: "#166534" }} />
                <span>Revenue</span>
              </div>
            </div>
          </div>

          <TrendChart
            data={data?.trend && data.trend.length > 0 ? data.trend : []}
            height={250}
          />
        </div>

        {/* Destination Breakdown (Right 1/3) */}
        <div className="admin-chart-card">
          <div className="admin-chart-header">
            <div className="admin-chart-title">
              <MapPin size={18} color="#15803d" />
              <span>Destination Breakdown</span>
            </div>
          </div>

          <DestinationDonut
            totalBookings={kpis?.totalBookings || 0}
            data={data?.destinations && data.destinations.length > 0 ? data.destinations : []}
          />
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: OPERATIONS & APPROVALS (Upcoming Departures & Pending Approvals)
          ========================================================================= */}
      <div className="admin-two-col-grid">
        {/* Panel 1: Upcoming Departures */}
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <div className="admin-panel-title">
              <Mountain size={16} color="#15803d" />
              <span>Upcoming Scheduled Departures</span>
            </div>
            <Link to="/admin/trips" className="admin-panel-action-link">
              <span>View All</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="admin-panel-body" style={{ padding: 0 }}>
            {data?.upcomingDepartures && data.upcomingDepartures.length > 0 ? (
              data.upcomingDepartures.slice(0, 5).map((dep, idx) => (
                <div
                  key={dep.slotId || idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 18px",
                    borderBottom: "1px solid #f1f5f9",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    <img
                      src={dep.image}
                      alt={dep.title}
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "8px",
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <h4
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          margin: 0,
                          color: "#0f172a",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {dep.title}
                      </h4>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        {dep.date} • {dep.location}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>
                      👥 {dep.bookedSlots} / {dep.totalSlots} seats
                    </div>
                    <span style={{ fontSize: "11px", color: "#166534", fontWeight: 600 }}>
                      {dep.captain ? `👑 ${dep.captain.name}` : "Unassigned"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: "28px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                No scheduled departures found.
              </div>
            )}
          </div>
        </div>

        {/* Panel 2: Pending Approvals & Settlements */}
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <div className="admin-panel-title">
              <Receipt size={16} color="#15803d" />
              <span>Pending Approvals & Settlements</span>
            </div>
            <Link to="/admin/operations/payouts" className="admin-panel-action-link">
              <span>Manage All</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="admin-panel-body" style={{ padding: 0 }}>
            {data?.pendingApprovalsAndSettlements && data.pendingApprovalsAndSettlements.length > 0 ? (
              data.pendingApprovalsAndSettlements.slice(0, 5).map((claim) => (
                <div
                  key={claim.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 18px",
                    borderBottom: "1px solid #f1f5f9",
                    gap: "10px",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                        {claim.captainName}
                      </span>
                      {claim.captainRole && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "1px 5px",
                            borderRadius: "4px",
                            background: claim.captainRole.includes("Head") ? "#dcfce7" : "#dbeafe",
                            color: claim.captainRole.includes("Head") ? "#166534" : "#1e40af",
                          }}
                        >
                          {claim.captainRole}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {claim.tripTitle} • {claim.claimType}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                        ₹{claim.amount.toLocaleString("en-IN")}
                      </div>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "4px",
                          background: "#fffbeb",
                          color: "#b45309",
                          border: "1px solid #fef3c7",
                        }}
                      >
                        Pending Review
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReviewItem(claim)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "6px",
                        background: "#0d2b17",
                        color: "#ffffff",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        border: "none",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                      }}
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: "28px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                All claims and payouts are fully settled! No pending approvals.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 4: CAPTAIN ACTIVITY & QUICK ACTIONS
          ========================================================================= */}
      <div className="admin-two-col-grid" style={{ marginTop: "24px" }}>
        {/* Panel 3: Captain Activity */}
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <div className="admin-panel-title">
              <Shield size={16} color="#15803d" />
              <span>Captain Activity</span>
            </div>
            <Link to="/admin/operations/history" className="admin-panel-action-link">
              <span>View History</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="admin-panel-body" style={{ padding: 0 }}>
            {data?.captainActivity && data.captainActivity.length > 0 ? (
              data.captainActivity.slice(0, 5).map((act, idx) => (
                <div
                  key={act.id || idx}
                  onClick={() => navigate(act.targetUrl || "/admin/operations/assignments")}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    padding: "12px 18px",
                    borderBottom: "1px solid #f1f5f9",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                  className="hover:bg-gray-50/70"
                >
                  <div
                    style={{
                      width: "9px",
                      height: "9px",
                      borderRadius: "50%",
                      background: act.statusColor || "#2563eb",
                      marginTop: "5px",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#0f172a", lineHeight: 1.3 }}>
                      {act.title}
                    </div>
                    {act.subtitle && (
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                        {act.subtitle}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {act.time}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ padding: "28px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                No recent captain events logged.
              </div>
            )}
          </div>
        </div>

        {/* Panel 4: Quick Operational Actions */}
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <div className="admin-panel-title">
              <Sparkles size={16} color="#15803d" />
              <span>Quick Actions</span>
            </div>
          </div>

          <div className="admin-panel-body" style={{ padding: "18px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "12px",
              }}
            >
              <button
                type="button"
                onClick={() => navigate("/admin/bookings?action=new")}
                className="admin-quick-btn"
                style={{ padding: "12px 14px" }}
              >
                <CalendarCheck size={16} color="#15803d" />
                <span style={{ fontWeight: 600 }}>Add Booking</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/add-trip")}
                className="admin-quick-btn"
                style={{ padding: "12px 14px" }}
              >
                <PlusCircle size={16} color="#15803d" />
                <span style={{ fontWeight: 600 }}>Create Trip</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/operations/assignments")}
                className="admin-quick-btn"
                style={{ padding: "12px 14px" }}
              >
                <Shield size={16} color="#15803d" />
                <span style={{ fontWeight: 600 }}>Assign Captain</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/operations/attendance")}
                className="admin-quick-btn"
                style={{ padding: "12px 14px" }}
              >
                <CheckSquare size={16} color="#15803d" />
                <span style={{ fontWeight: 600 }}>Mark Attendance</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/operations/expenses")}
                className="admin-quick-btn"
                style={{ padding: "12px 14px" }}
              >
                <Receipt size={16} color="#15803d" />
                <span style={{ fontWeight: 600 }}>Add Expense</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/operations/payouts")}
                className="admin-quick-btn"
                style={{ padding: "12px 14px" }}
              >
                <Wallet size={16} color="#15803d" />
                <span style={{ fontWeight: 600 }}>Settle Payout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          REVIEW MODAL FOR PENDING APPROVALS & SETTLEMENTS
          ========================================================================= */}
      {reviewItem && (
        <Modal
          isOpen={true}
          onClose={() => setReviewItem(null)}
          title={`Review Pending ${reviewItem.targetType === "expense" ? "Expense Claim" : "Payout Settlement"}`}
          subtitle="Verify item details, authorization and proceed with sign-off."
        >
          <div className="space-y-4">
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "16px",
                fontSize: "13px",
              }}
              className="space-y-2.5"
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Captain Name:</span>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>
                  {reviewItem.captainName} {reviewItem.captainRole ? `(${reviewItem.captainRole})` : ""}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Trip Package:</span>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>{reviewItem.tripTitle}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Departure Date:</span>
                <span style={{ color: "#0f172a" }}>{reviewItem.departureDate}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Claim Type:</span>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>{reviewItem.claimType}</span>
              </div>

              {reviewItem.description && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Description / Bill:</span>
                  <span style={{ color: "#0f172a" }}>{reviewItem.description}</span>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: "10px",
                  borderTop: "1px solid #e2e8f0",
                  fontSize: "15px",
                  fontWeight: 700,
                }}
              >
                <span>Total Amount:</span>
                <span style={{ color: "#166534" }}>₹{reviewItem.amount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", paddingTop: "10px" }}>
              <button
                type="button"
                onClick={() => setReviewItem(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              {reviewItem.targetType === "expense" ? (
                <>
                  <button
                    type="button"
                    disabled={reviewActionLoading}
                    onClick={() => handleReviewAction("Rejected")}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "1px solid #fca5a5",
                      background: "#fee2e2",
                      color: "#b91c1c",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Reject Claim
                  </button>

                  <button
                    type="button"
                    disabled={reviewActionLoading}
                    onClick={() => handleReviewAction("Approved")}
                    style={{
                      padding: "8px 18px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#0d2b17",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {reviewActionLoading ? "Processing..." : "Approve & Sign-Off"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={reviewActionLoading}
                  onClick={() => handleReviewAction("Approved")}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#0d2b17",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {reviewActionLoading ? "Processing..." : "Confirm & Settle Payout"}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Dashboard;
