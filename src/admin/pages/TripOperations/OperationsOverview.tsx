import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Calendar,
  Receipt,
  Wallet,
  CalendarCheck,
  Zap,
  UserPlus,
  MapPin,
  AlertCircle,
  Eye,
  Search,
  Star,
  User,
  History,
  Loader2,
  RotateCw,
  MessageCircle,
  ShieldCheck,
  LayoutGrid,
  Table as TableIcon,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
} from "lucide-react";
import { API_BASE_URL } from "../../../api";
import { StatCard } from "../../ui/StatCard";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface AssignedCaptainInfo {
  _id: string;
  captainId: string;
  assignmentId?: string;
  name: string;
  phone: string;
  avatar?: string;
  role: string;
  roleRank: number;
  status: string;
}

interface DepartureRosterItem {
  slotId: string;
  tripId: string | null;
  tripTitle: string;
  location: string;
  duration: string;
  departureDate: string;
  totalSlots: number;
  bookedSlots: number;
  status: string;
  assignedCaptains: AssignedCaptainInfo[];
  isAssigned: boolean;
  tripImage?: string;
}

interface CaptainOverviewItem {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  roleRank: number;
  age: number | null;
  rating: number;
  status: string;
  avatar?: string;
  assignedTrips: number;
  completedTrips: number;
  totalTrips: number;
}

interface OperationsStats {
  activeCaptains: number;
  totalCaptains: number;
  upcomingDepartures: number;
  next7DaysDepartures: number;
  tripsInProgress: number;
  unsettledExpenses: { count: number; totalAmount: number };
  pendingPayouts: { count: number; totalAmount: number };
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export const OperationsOverview: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active top-level tab: "departures" | "captains" | "command"
  const [activeTab, setActiveTab] = useState<"departures" | "captains" | "command">("departures");

  // Departures view mode: "cards" | "table"
  const [departuresViewMode, setDeparturesViewMode] = useState<"cards" | "table">("cards");

  // Captains view mode: "cards" | "table"
  const [captainsViewMode, setCaptainsViewMode] = useState<"cards" | "table">("cards");

  const [stats, setStats] = useState<OperationsStats>({
    activeCaptains: 0,
    totalCaptains: 0,
    upcomingDepartures: 0,
    next7DaysDepartures: 0,
    tripsInProgress: 0,
    unsettledExpenses: { count: 0, totalAmount: 0 },
    pendingPayouts: { count: 0, totalAmount: 0 },
  });

  const [departures, setDepartures] = useState<DepartureRosterItem[]>([]);
  const [captains, setCaptains] = useState<CaptainOverviewItem[]>([]);

  // Roster Filter: "all" | "assigned" | "unassigned"
  const [rosterFilter, setRosterFilter] = useState<"all" | "assigned" | "unassigned">("all");
  const [rosterSearch, setRosterSearch] = useState("");

  // Captain search query & status filter
  const [captainSearch, setCaptainSearch] = useState("");
  const [captainStatusFilter, setCaptainStatusFilter] = useState<string>("all");

  // Pagination
  const [rosterPage, setRosterPage] = useState(1);
  const rosterPageSize = 9;

  const [captainPage, setCaptainPage] = useState(1);
  const captainPageSize = 9;

  const fetchOverviewData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/admin/operations/overview`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.stats) setStats(data.stats);
        if (Array.isArray(data.departureRoster)) setDepartures(data.departureRoster);
        if (Array.isArray(data.captainOverview)) setCaptains(data.captainOverview);
      } else {
        setError(data.message || "Failed to load operations command center");
      }
    } catch (err) {
      console.error("Operations overview error:", err);
      setError("Network error connecting to backend service");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  // Filter departures
  const filteredDepartures = useMemo(() => {
    return departures.filter((item) => {
      if (rosterFilter === "assigned" && !item.isAssigned) return false;
      if (rosterFilter === "unassigned" && item.isAssigned) return false;

      if (rosterSearch.trim()) {
        const q = rosterSearch.toLowerCase();
        const matchTitle = item.tripTitle.toLowerCase().includes(q);
        const matchLoc = (item.location || "").toLowerCase().includes(q);
        const matchCap = item.assignedCaptains.some((c) =>
          c.name.toLowerCase().includes(q)
        );
        if (!matchTitle && !matchLoc && !matchCap) return false;
      }

      return true;
    });
  }, [departures, rosterFilter, rosterSearch]);

  const assignedCount = useMemo(() => departures.filter((d) => d.isAssigned).length, [departures]);
  const unassignedCount = useMemo(() => departures.filter((d) => !d.isAssigned).length, [departures]);

  const paginatedDepartures = useMemo(() => {
    const start = (rosterPage - 1) * rosterPageSize;
    return filteredDepartures.slice(start, start + rosterPageSize);
  }, [filteredDepartures, rosterPage]);

  const totalRosterPages = Math.ceil(filteredDepartures.length / rosterPageSize) || 1;

  // Filter captains
  const filteredCaptains = useMemo(() => {
    return captains.filter((c) => {
      const matchesSearch =
        !captainSearch.trim() ||
        c.name.toLowerCase().includes(captainSearch.toLowerCase()) ||
        c.phone.includes(captainSearch) ||
        (c.role && c.role.toLowerCase().includes(captainSearch.toLowerCase()));

      const matchesStatus =
        captainStatusFilter === "all" ||
        (captainStatusFilter === "Active" && c.status === "Active") ||
        (captainStatusFilter === "Unavailable" && c.status === "Unavailable") ||
        (captainStatusFilter === "Inactive" && c.status === "Inactive");

      return matchesSearch && matchesStatus;
    });
  }, [captains, captainSearch, captainStatusFilter]);

  const paginatedCaptains = useMemo(() => {
    const start = (captainPage - 1) * captainPageSize;
    return filteredCaptains.slice(start, start + captainPageSize);
  }, [filteredCaptains, captainPage]);

  const totalCaptainPages = Math.ceil(filteredCaptains.length / captainPageSize) || 1;

  const renderRoleBadge = (role: string) => {
    const r = (role || "").toLowerCase();
    if (r.includes("head") || r.includes("lead")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
          <span>👑</span>
          <span>Head</span>
        </span>
      );
    }
    if (r.includes("main") || r.includes("assistant")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
          <span>⭐</span>
          <span>Main</span>
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

  const readinessPercent = departures.length > 0
    ? Math.round((assignedCount / departures.length) * 100)
    : 100;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* 1. Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-title-box">
          <div className="flex items-center gap-3">
            <h1>Trip Operations Overview</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Operations
            </span>
          </div>
          <p>
            Real-time command center for departures, captains, and crew assignments.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => fetchOverviewData(true)}
            disabled={loading || refreshing}
            className="admin-btn admin-btn-secondary"
            title="Refresh Operations Center"
          >
            <RotateCw className={`w-3.5 h-3.5 text-emerald-800 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/admin/operations/assignments"
            className="admin-btn admin-btn-primary shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Assign Captain</span>
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
            onClick={() => fetchOverviewData()}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Top KPI Stat Cards (4 well-proportioned cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Captains */}
        <StatCard
          icon={<Users size={18} />}
          label="Active Captains"
          value={loading ? "..." : stats.activeCaptains}
          subtitle={`Out of ${stats.totalCaptains} registered captains`}
          iconTheme="green"
        />

        {/* Upcoming Departures */}
        <StatCard
          icon={<Calendar size={18} />}
          label="Upcoming Departures"
          value={loading ? "..." : stats.upcomingDepartures}
          subtitle={`${stats.next7DaysDepartures} departing in next 7 days`}
          iconTheme="blue"
        />

        {/* Pending Expenses */}
        <StatCard
          icon={<Receipt size={18} />}
          label="Pending Expenses"
          value={loading ? "..." : `₹${stats.unsettledExpenses.totalAmount.toLocaleString("en-IN")}`}
          subtitle={`${stats.unsettledExpenses.count} claims pending approval`}
          iconTheme="gold"
        />

        {/* Pending Payouts */}
        <StatCard
          icon={<Wallet size={18} />}
          label="Pending Payouts"
          value={loading ? "..." : `₹${stats.pendingPayouts.totalAmount.toLocaleString("en-IN")}`}
          subtitle={`${stats.pendingPayouts.count} captains due for payout`}
          iconTheme="green"
        />
      </div>

      {/* 3. Primary Tab Navigation (Matching Trips.tsx & Bookings.tsx) */}
      <div className="flex items-center gap-2.5 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("departures")}
          style={{
            padding: "9px 18px",
            borderRadius: "10px",
            fontWeight: 700,
            fontSize: "13px",
            border: "1.5px solid",
            borderColor: activeTab === "departures" ? "#166534" : "#e2e8f0",
            background: activeTab === "departures" ? "#eaf5e9" : "#ffffff",
            color: activeTab === "departures" ? "#166534" : "#475569",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.15s ease",
          }}
        >
          <CalendarCheck size={16} />
          <span>Upcoming Departures ({departures.length})</span>
          {unassignedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
              {unassignedCount} need crew
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("captains")}
          style={{
            padding: "9px 18px",
            borderRadius: "10px",
            fontWeight: 700,
            fontSize: "13px",
            border: "1.5px solid",
            borderColor: activeTab === "captains" ? "#166534" : "#e2e8f0",
            background: activeTab === "captains" ? "#eaf5e9" : "#ffffff",
            color: activeTab === "captains" ? "#166534" : "#475569",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.15s ease",
          }}
        >
          <Users size={16} />
          <span>Captains Roster ({captains.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("command")}
          style={{
            padding: "9px 18px",
            borderRadius: "10px",
            fontWeight: 700,
            fontSize: "13px",
            border: "1.5px solid",
            borderColor: activeTab === "command" ? "#166534" : "#e2e8f0",
            background: activeTab === "command" ? "#eaf5e9" : "#ffffff",
            color: activeTab === "command" ? "#166534" : "#475569",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.15s ease",
          }}
        >
          <Zap size={16} />
          <span>Operations Command & Hub</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: UPCOMING DEPARTURES                                            */}
      {/* ===================================================================== */}
      {activeTab === "departures" && (
        <div className="space-y-4">
          {/* Controls Bar: Filter Pills + Search + View Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setRosterFilter("all");
                  setRosterPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  rosterFilter === "all"
                    ? "bg-[#0d2b17] text-white shadow-xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All Departures ({departures.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setRosterFilter("unassigned");
                  setRosterPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  rosterFilter === "unassigned"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
                }`}
              >
                <span>Needs Captain</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-bold">
                  {unassignedCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRosterFilter("assigned");
                  setRosterPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  rosterFilter === "assigned"
                    ? "bg-[#0d2b17] text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                <span>Crew Confirmed</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-bold">
                  {assignedCount}
                </span>
              </button>
            </div>

            {/* Search + View Switcher */}
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search trip, date, captain..."
                  value={rosterSearch}
                  onChange={(e) => {
                    setRosterSearch(e.target.value);
                    setRosterPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setDeparturesViewMode("cards")}
                  className={`p-1.5 rounded-md text-xs font-semibold transition-all ${
                    departuresViewMode === "cards"
                      ? "bg-white text-gray-900 shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                  title="Card View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeparturesViewMode("table")}
                  className={`p-1.5 rounded-md text-xs font-semibold transition-all ${
                    departuresViewMode === "table"
                      ? "bg-white text-gray-900 shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                  title="Table View"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-2xs">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-700 mx-auto" />
              <p className="text-sm font-semibold text-gray-700 mt-2">Loading upcoming departures...</p>
            </div>
          ) : filteredDepartures.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto mb-3">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900">No departures found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                {rosterFilter === "unassigned"
                  ? "All upcoming departures currently have captains assigned!"
                  : "No scheduled departures match your current filters."}
              </p>
            </div>
          ) : departuresViewMode === "cards" ? (
            /* CARDS VIEW (Spacious, modern, beautiful) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedDepartures.map((dep) => {
                const formattedDate = dep.departureDate
                  ? new Date(dep.departureDate).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "Unscheduled";

                return (
                  <div
                    key={dep.slotId}
                    className="bg-white rounded-2xl border border-gray-200 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
                  >
                    <div>
                      {/* Card Cover & Badge */}
                      <div className="relative h-32 bg-gray-100 overflow-hidden">
                        <img
                          src={
                            dep.tripImage ||
                            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400"
                          }
                          alt={dep.tripTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                        {/* Crew Readiness Status Badge */}
                        <div className="absolute top-2.5 right-2.5">
                          {dep.isAssigned ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-white text-emerald-800 shadow-xs border border-emerald-200">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span>Crew Ready</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs animate-pulse">
                              <span>⚠ Needs Captain</span>
                            </span>
                          )}
                        </div>

                        {/* Trip Title on Cover */}
                        <div className="absolute bottom-2.5 left-3 right-3 text-white">
                          <h4 className="text-sm font-bold truncate drop-shadow-sm">
                            {dep.tripTitle}
                          </h4>
                          <div className="flex items-center gap-1 text-[11px] text-gray-200 mt-0.5">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{dep.location || "South India"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-3.5">
                        {/* Departure Date */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400 font-medium">Departure Date</span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 font-bold text-gray-800">
                            <Calendar className="w-3.5 h-3.5 text-emerald-800" />
                            {formattedDate}
                          </span>
                        </div>

                        {/* Assigned Crew Section */}
                        <div className="pt-2 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                              Assigned Crew ({dep.assignedCaptains.length})
                            </span>
                            {dep.isAssigned && (
                              <span className="text-[11px] text-emerald-700 font-semibold">
                                ✓ Confirmed
                              </span>
                            )}
                          </div>

                          {dep.assignedCaptains.length === 0 ? (
                            <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-amber-900 text-xs flex items-center justify-between">
                              <span className="font-medium">No captain assigned yet</span>
                              <Link
                                to="/admin/operations/assignments"
                                className="font-bold text-emerald-800 hover:underline"
                              >
                                Assign Now →
                              </Link>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {dep.assignedCaptains.map((cap) => (
                                <div
                                  key={cap._id}
                                  className="flex items-center justify-between p-2 rounded-xl bg-gray-50/80 border border-gray-100"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-[#0d2b17] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                      {cap.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 truncate">
                                      {cap.name}
                                    </span>
                                  </div>
                                  <div>{renderRoleBadge(cap.role)}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="p-3 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-2">
                      <Link
                        to="/admin/trips"
                        className="text-xs font-semibold text-gray-600 hover:text-emerald-900"
                      >
                        Trip Details
                      </Link>

                      <Link
                        to="/admin/operations/assignments"
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                          dep.isAssigned
                            ? "bg-white border border-gray-200 text-gray-800 hover:bg-gray-100"
                            : "bg-[#0d2b17] hover:bg-[#164e23] text-white"
                        }`}
                      >
                        {dep.isAssigned ? (
                          <>
                            <Eye className="w-3.5 h-3.5 text-gray-500" />
                            <span>Manage Crew</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>+ Assign Captain</span>
                          </>
                        )}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* TABLE VIEW (Spacious full-width table) */
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">Trip & Destination</th>
                      <th className="px-4 py-3.5">Departure Date</th>
                      <th className="px-4 py-3.5">Assigned Crew</th>
                      <th className="px-4 py-3.5 text-center">Readiness Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedDepartures.map((dep) => {
                      const formattedDate = dep.departureDate
                        ? new Date(dep.departureDate).toLocaleDateString("en-IN", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Unscheduled";

                      return (
                        <tr key={dep.slotId} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <img
                                src={
                                  dep.tripImage ||
                                  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=120"
                                }
                                alt={dep.tripTitle}
                                className="w-11 h-9 rounded-lg object-cover border border-gray-200 shrink-0"
                              />
                              <div>
                                <span className="font-bold text-gray-900 block text-xs">
                                  {dep.tripTitle}
                                </span>
                                <span className="text-[11px] text-gray-400">
                                  {dep.location || "South India"}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 font-medium text-gray-800 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200 text-xs">
                              <Calendar className="w-3.5 h-3.5 text-emerald-800" />
                              <span>{formattedDate}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            {dep.assignedCaptains.length === 0 ? (
                              <span className="text-amber-800 font-semibold text-xs">
                                Needs Captain
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {dep.assignedCaptains.map((cap) => (
                                  <div
                                    key={cap._id}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-[11px] font-semibold"
                                  >
                                    <span>{cap.name}</span>
                                    {renderRoleBadge(cap.role)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                                dep.isAssigned
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-amber-50 text-amber-900 border-amber-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  dep.isAssigned ? "bg-emerald-600" : "bg-amber-500 animate-pulse"
                                }`}
                              />
                              <span>{dep.isAssigned ? "Crew Confirmed" : "Needs Captain"}</span>
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <Link
                              to="/admin/operations/assignments"
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold shadow-2xs transition-all ${
                                dep.isAssigned
                                  ? "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                                  : "bg-[#0d2b17] hover:bg-[#164e23] text-white"
                              }`}
                            >
                              {dep.isAssigned ? "Manage Crew" : "+ Assign"}
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Roster Pagination */}
          {filteredDepartures.length > rosterPageSize && (
            <div className="flex items-center justify-between text-xs text-gray-500 px-2 pt-2">
              <span>
                Showing <strong>{(rosterPage - 1) * rosterPageSize + 1}</strong>-
                <strong>
                  {Math.min(rosterPage * rosterPageSize, filteredDepartures.length)}
                </strong>{" "}
                of <strong>{filteredDepartures.length}</strong> departures
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRosterPage((p) => Math.max(1, p - 1))}
                  disabled={rosterPage === 1}
                  className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-bold text-gray-700">
                  {rosterPage} / {totalRosterPages}
                </span>
                <button
                  type="button"
                  onClick={() => setRosterPage((p) => Math.min(totalRosterPages, p + 1))}
                  disabled={rosterPage === totalRosterPages}
                  className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: CAPTAINS ROSTER                                                */}
      {/* ===================================================================== */}
      {activeTab === "captains" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search captain by name, phone, email..."
                value={captainSearch}
                onChange={(e) => {
                  setCaptainSearch(e.target.value);
                  setCaptainPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Status Filter */}
              <select
                value={captainStatusFilter}
                onChange={(e) => {
                  setCaptainStatusFilter(e.target.value);
                  setCaptainPage(1);
                }}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              >
                <option value="all">All Statuses ({captains.length})</option>
                <option value="Active">Active Only</option>
                <option value="Unavailable">Unavailable Only</option>
                <option value="Inactive">Inactive Only</option>
              </select>

              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setCaptainsViewMode("cards")}
                  className={`p-1.5 rounded-md text-xs font-semibold transition-all ${
                    captainsViewMode === "cards"
                      ? "bg-white text-gray-900 shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                  title="Card View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCaptainsViewMode("table")}
                  className={`p-1.5 rounded-md text-xs font-semibold transition-all ${
                    captainsViewMode === "table"
                      ? "bg-white text-gray-900 shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                  title="Table View"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>

              <Link
                to="/admin/operations/captains"
                className="admin-btn admin-btn-secondary text-xs py-1.5 px-3"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Manage Captains</span>
              </Link>
            </div>
          </div>

          {/* Captains Content */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-2xs">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-700 mx-auto" />
              <p className="text-sm font-semibold text-gray-700 mt-2">Loading captain roster...</p>
            </div>
          ) : filteredCaptains.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-2xs">
              <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <h3 className="text-base font-bold text-gray-900">No captains match your search</h3>
              <p className="text-xs text-gray-500 mt-1">Try adjusting your search query or status filter.</p>
            </div>
          ) : captainsViewMode === "cards" ? (
            /* CAPTAINS CARDS VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedCaptains.map((cap) => {
                const cleanPhone = (cap.phone || "").replace(/[^0-9]/g, "");
                const whatsappUrl = cleanPhone
                  ? `https://wa.me/${cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone}`
                  : null;

                return (
                  <div
                    key={cap._id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-4 flex flex-col justify-between hover:shadow-md transition-all"
                  >
                    <div>
                      {/* Top Row: Avatar + Name + Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-full bg-[#0d2b17] text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-2xs">
                            {cap.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-gray-900 truncate">
                              {cap.name}
                            </h4>
                            <div className="mt-0.5">{renderRoleBadge(cap.role)}</div>
                          </div>
                        </div>

                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                            cap.status === "Active"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : cap.status === "Unavailable"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          }`}
                        >
                          {cap.status || "Active"}
                        </span>
                      </div>

                      {/* Phone & WhatsApp */}
                      <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-700">
                        <span className="font-medium">{cap.phone}</span>
                        {whatsappUrl && (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white transition-colors text-[11px] font-bold border border-emerald-200"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>

                      {/* Quick Metrics */}
                      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100 text-center">
                        <div className="bg-gray-50 rounded-xl p-2 border border-gray-100">
                          <span className="text-[10px] text-gray-400 block font-semibold">Assigned</span>
                          <span className="text-sm font-bold text-gray-900">{cap.assignedTrips || 0}</span>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-2 border border-gray-100">
                          <span className="text-[10px] text-gray-400 block font-semibold">Completed</span>
                          <span className="text-sm font-bold text-emerald-800">{cap.completedTrips || 0}</span>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-2 border border-gray-100">
                          <span className="text-[10px] text-gray-400 block font-semibold">Rating</span>
                          <span className="text-sm font-bold text-amber-700 inline-flex items-center gap-0.5 justify-center">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                            {cap.rating ? Number(cap.rating).toFixed(1) : "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Links */}
                    <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                      <Link
                        to={`/admin/operations/history?captainId=${cap._id}`}
                        className="inline-flex items-center gap-1 text-gray-600 hover:text-emerald-900 font-semibold"
                      >
                        <History className="w-3.5 h-3.5 text-gray-400" />
                        <span>Trip History</span>
                      </Link>

                      <Link
                        to={`/admin/operations/history?captainId=${cap._id}`}
                        className="inline-flex items-center gap-1 text-emerald-800 hover:underline font-bold"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Profile →</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* CAPTAINS TABLE VIEW */
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">Captain Name</th>
                      <th className="px-4 py-3.5">Role</th>
                      <th className="px-4 py-3.5">Contact</th>
                      <th className="px-3 py-3.5 text-center">Assigned</th>
                      <th className="px-3 py-3.5 text-center">Completed</th>
                      <th className="px-3 py-3.5 text-center">Rating</th>
                      <th className="px-4 py-3.5 text-center">Availability</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedCaptains.map((cap) => {
                      const cleanPhone = (cap.phone || "").replace(/[^0-9]/g, "");
                      const whatsappUrl = cleanPhone
                        ? `https://wa.me/${cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone}`
                        : null;

                      return (
                        <tr key={cap._id} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#0d2b17] text-white flex items-center justify-center text-xs font-bold shrink-0">
                                {cap.name.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="font-bold text-gray-900">{cap.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">{renderRoleBadge(cap.role)}</td>
                          <td className="px-4 py-3.5 font-medium text-gray-700 whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <span>{cap.phone}</span>
                              {whatsappUrl && (
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-colors"
                                  title="WhatsApp"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3.5 text-center font-bold text-gray-800">
                            {cap.assignedTrips || 0}
                          </td>
                          <td className="px-3 py-3.5 text-center font-bold text-emerald-800">
                            {cap.completedTrips || 0}
                          </td>
                          <td className="px-3 py-3.5 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                              {cap.rating ? Number(cap.rating).toFixed(1) : "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                cap.status === "Active"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : cap.status === "Unavailable"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-gray-100 text-gray-600 border-gray-200"
                              }`}
                            >
                              {cap.status || "Active"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <Link
                              to={`/admin/operations/history?captainId=${cap._id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              Profile & History
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Captain Pagination */}
          {filteredCaptains.length > captainPageSize && (
            <div className="flex items-center justify-between text-xs text-gray-500 px-2 pt-2">
              <span>
                Showing <strong>{(captainPage - 1) * captainPageSize + 1}</strong>-
                <strong>
                  {Math.min(captainPage * captainPageSize, filteredCaptains.length)}
                </strong>{" "}
                of <strong>{filteredCaptains.length}</strong> captains
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCaptainPage((p) => Math.max(1, p - 1))}
                  disabled={captainPage === 1}
                  className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-bold text-gray-700">
                  {captainPage} / {totalCaptainPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCaptainPage((p) => Math.min(totalCaptainPages, p + 1))}
                  disabled={captainPage === totalCaptainPages}
                  className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: OPERATIONS COMMAND & HUB                                       */}
      {/* ===================================================================== */}
      {activeTab === "command" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left 2 Cols: Operations Action Center */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-600" />
                  <span>Operations Action Hub</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Direct shortcuts to perform daily operations workflows.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* 1. Assign Captains */}
                <Link
                  to="/admin/operations/assignments"
                  className="p-4 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex items-start gap-3.5 group shadow-2xs"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 group-hover:text-emerald-950">
                        Assign Captains
                      </span>
                      {unassignedCount > 0 && (
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                          {unassignedCount} need crew
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Allocate head, main, and trainee captains to departure slots.
                    </p>
                  </div>
                </Link>

                {/* 2. Verify Expenses */}
                <Link
                  to="/admin/operations/expenses"
                  className="p-4 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex items-start gap-3.5 group shadow-2xs"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100 group-hover:bg-blue-100 transition-colors">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 group-hover:text-emerald-950">
                        Verify Expenses
                      </span>
                      {stats.unsettledExpenses.count > 0 && (
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                          {stats.unsettledExpenses.count} pending
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Review receipts, audit bills, and approve captain reimbursements.
                    </p>
                  </div>
                </Link>

                {/* 3. Settle Payouts */}
                <Link
                  to="/admin/operations/payouts"
                  className="p-4 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex items-start gap-3.5 group shadow-2xs"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100 group-hover:bg-amber-100 transition-colors">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 group-hover:text-emerald-950">
                        Settle Payouts
                      </span>
                      {stats.pendingPayouts.count > 0 && (
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ₹{stats.pendingPayouts.totalAmount.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Process fee settlements, UPI transfers, and payment vouchers.
                    </p>
                  </div>
                </Link>

                {/* 4. Pickup Locations */}
                <Link
                  to="/admin/operations/pickups"
                  className="p-4 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex items-start gap-3.5 group shadow-2xs"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100 group-hover:bg-purple-100 transition-colors">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-900 group-hover:text-emerald-950">
                      Manage Pickup Points
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Configure traveler pickup points, landmarks, and departure timings.
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Col: Readiness & Quick Stats */}
          <div className="space-y-4">
            {/* Readiness Card */}
            <div className="bg-gradient-to-br from-[#0d2b17] to-[#164e23] text-white rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  Crew Readiness
                </span>
                <span className="text-xl font-extrabold text-white">
                  {readinessPercent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-400 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${readinessPercent}%` }}
                />
              </div>

              <div className="pt-2 border-t border-white/10 space-y-2 text-xs text-emerald-100">
                <div className="flex justify-between">
                  <span>Assigned Departures:</span>
                  <strong className="text-white">{assignedCount}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Needs Captain:</span>
                  <strong className="text-amber-300">{unassignedCount}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Total Departures:</span>
                  <strong className="text-white">{departures.length}</strong>
                </div>
              </div>
            </div>

            {/* Quick Helper Note */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Operational Guidelines</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Ensure each departure has at least one <strong>Head Captain</strong> or <strong>Main Captain</strong> assigned 48 hours prior to start date for guest briefings and WhatsApp group setup.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsOverview;
