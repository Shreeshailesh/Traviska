import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Users,
  CheckCircle2,
  Wallet,
  FileText,
  UserCheck,
  ChevronRight,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { API_BASE_URL } from "../api";
import { useCaptainAuth } from "./CaptainAuthContext";

interface NextTripData {
  slotId: string;
  tripId: string;
  tripTitle: string;
  location?: string;
  image?: string;
  duration?: string;
  dateRangeLabel?: string;
  passengers?: number;
  role?: string;
}

interface DashboardStats {
  upcomingTrips: number;
  completedTrips: number;
  ongoingTrips: number;
  pendingExpenseCount: number;
  pendingExpenseAmount: number;
  availablePayout: number;
}

export const CaptainDashboard: React.FC = () => {
  const { token, captain, refreshProfile } = useCaptainAuth();
  const [loading, setLoading] = useState(true);
  const [nextTrip, setNextTrip] = useState<NextTripData | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    upcomingTrips: 1,
    completedTrips: 0,
    ongoingTrips: 0,
    pendingExpenseCount: 0,
    pendingExpenseAmount: 0,
    availablePayout: 0,
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const curToken = token || localStorage.getItem("captainToken");
      const res = await fetch(`${API_BASE_URL}/captain/portal/home`, {
        headers: {
          Authorization: `Bearer ${curToken}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.nextTrip) {
            setNextTrip(data.nextTrip);
          }
          if (data.stats) {
            setStats(data.stats);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load captain dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    refreshProfile();
  }, [token]);

  const captainName = captain?.name || "Naveen R.";

  return (
    <div className="space-y-4 max-w-xl mx-auto w-full animate-in fade-in duration-200">
      {/* ============================================================ */}
      {/* 1. GREETING WITH MISTY MOUNTAIN SCENIC BACKDROP             */}
      {/* ============================================================ */}
      <div className="relative pt-1 pb-1 min-h-[85px] flex items-center justify-between overflow-hidden">
        {/* Text */}
        <div className="relative z-10 max-w-[65%]">
          <h1 className="text-2xl sm:text-3xl font-black text-[#11241C] tracking-tight leading-tight">
            Hi, {captainName}
          </h1>
          <p className="text-xs sm:text-sm text-[#66756E] font-medium mt-1">
            Here's your trip overview.
          </p>
        </div>

        {/* Misty Mountain Illustration matching the reference */}
        <div className="absolute right-0 -top-2 w-48 h-24 pointer-events-none select-none flex items-end justify-end">
          <svg
            viewBox="0 0 220 110"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full object-contain"
          >
            {/* Distant soft mountain peak */}
            <path
              d="M30 110 L130 20 C145 10 160 15 175 35 L220 110 Z"
              fill="url(#mistDistant)"
              opacity="0.55"
            />
            {/* Mid mountain ridge */}
            <path
              d="M0 110 L85 45 C100 35 115 40 135 60 L185 110 Z"
              fill="url(#mistMid)"
              opacity="0.65"
            />
            {/* Fore slope with subtle pine silhouettes */}
            <path
              d="M70 110 L115 72 L130 84 L150 62 L172 82 L195 68 L220 110 Z"
              fill="url(#mistFore)"
              opacity="0.75"
            />
            {/* Pine tree silhouettes on the ridge */}
            <g fill="#2B5D45" opacity="0.45">
              <polygon points="120,85 123,73 126,85" />
              <polygon points="128,90 131,78 134,90" />
              <polygon points="138,82 141,68 144,82" />
              <polygon points="148,88 151,75 154,88" />
              <polygon points="158,80 161,65 164,80" />
              <polygon points="168,87 171,73 174,87" />
              <polygon points="178,82 181,69 184,82" />
              <polygon points="188,90 191,77 194,90" />
              <polygon points="198,84 201,70 204,84" />
              <polygon points="208,92 211,79 214,92" />
            </g>
            <defs>
              <linearGradient id="mistDistant" x1="130" y1="15" x2="130" y2="110" gradientUnits="userSpaceOnUse">
                <stop stopColor="#A8C4B4" />
                <stop offset="1" stopColor="#F7F9F6" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="mistMid" x1="90" y1="35" x2="90" y2="110" gradientUnits="userSpaceOnUse">
                <stop stopColor="#7EAA92" />
                <stop offset="1" stopColor="#F7F9F6" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="mistFore" x1="145" y1="62" x2="145" y2="110" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4A8467" />
                <stop offset="1" stopColor="#F7F9F6" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. FOUR CLEAN SUMMARY METRIC CARDS (2x2 Grid)               */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
        {/* Card 1: Upcoming Trip */}
        <div className="bg-white rounded-[18px] sm:rounded-[22px] border border-[#E9EFEA] p-3 sm:p-4 shadow-[0_2px_10px_rgba(0,0,0,0.025)] flex items-center gap-2.5 sm:gap-3 hover:border-[#174C3C]/30 transition-all min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#EAF5EF] flex items-center justify-center text-[#174C3C] shrink-0">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#174C3C] stroke-[2]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl sm:text-2xl font-black text-[#11241C] leading-none">
              {loading ? "..." : stats.upcomingTrips}
            </div>
            <div className="text-[11px] sm:text-xs font-semibold text-[#66756E] mt-1 truncate">
              Upcoming Trip
            </div>
          </div>
        </div>

        {/* Card 2: Completed Trips */}
        <div className="bg-white rounded-[18px] sm:rounded-[22px] border border-[#E9EFEA] p-3 sm:p-4 shadow-[0_2px_10px_rgba(0,0,0,0.025)] flex items-center gap-2.5 sm:gap-3 hover:border-[#174C3C]/30 transition-all min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#EAF5EF] flex items-center justify-center text-[#174C3C] shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#174C3C] stroke-[2]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl sm:text-2xl font-black text-[#11241C] leading-none">
              {loading ? "..." : stats.completedTrips}
            </div>
            <div className="text-[11px] sm:text-xs font-semibold text-[#66756E] mt-1 truncate">
              Completed Trips
            </div>
          </div>
        </div>

        {/* Card 3: Pending Claims */}
        <div className="bg-white rounded-[18px] sm:rounded-[22px] border border-[#E9EFEA] p-3 sm:p-4 shadow-[0_2px_10px_rgba(0,0,0,0.025)] flex items-center gap-2.5 sm:gap-3 hover:border-[#174C3C]/30 transition-all min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#EAF5EF] flex items-center justify-center text-[#174C3C] shrink-0">
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-[#174C3C] stroke-[2]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl sm:text-2xl font-black text-[#11241C] leading-none">
              {loading ? "..." : stats.pendingExpenseCount}
            </div>
            <div className="text-[11px] sm:text-xs font-semibold text-[#66756E] mt-1 truncate">
              Pending Claims
            </div>
          </div>
        </div>

        {/* Card 4: Available Payout */}
        <div className="bg-white rounded-[18px] sm:rounded-[22px] border border-[#E9EFEA] p-3 sm:p-4 shadow-[0_2px_10px_rgba(0,0,0,0.025)] flex items-center gap-2.5 sm:gap-3 hover:border-[#174C3C]/30 transition-all min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#EAF5EF] flex items-center justify-center text-[#174C3C] shrink-0">
            <span className="text-lg sm:text-xl font-bold text-[#174C3C] leading-none">₹</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl sm:text-2xl font-black text-[#11241C] leading-none truncate">
              {loading ? "..." : `₹${stats.availablePayout.toLocaleString("en-IN")}`}
            </div>
            <div className="text-[11px] sm:text-xs font-semibold text-[#66756E] mt-1 truncate">
              Available Payout
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. NEXT TRIP SECTION                                         */}
      {/* ============================================================ */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-[#11241C]">Next Trip</h2>
          <Link
            to="/captain/trips"
            className="text-xs sm:text-sm font-bold text-[#174C3C] hover:underline inline-flex items-center gap-1 group"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="h-[120px] rounded-[18px] border border-[#E9EFEA] bg-white flex items-center justify-center text-[#66756E]">
            <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#174C3C]" />
            <span className="text-xs font-semibold">Loading assigned departure...</span>
          </div>
        ) : nextTrip ? (
          <Link
            to={nextTrip.slotId ? `/captain/trips?slotId=${nextTrip.slotId}` : "/captain/trips"}
            className="block rounded-[18px] sm:rounded-[22px] overflow-hidden relative border border-[#E9EFEA] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.025)] hover:border-[#174C3C]/40 transition-all group"
          >
            {/* Lush green rolling hill landscape matching the reference image */}
            <img
              src={nextTrip.image || "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1000&auto=format&fit=crop&q=80"}
              alt={nextTrip.tripTitle}
              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />

            {/* Soft, crisp white gradient overlay matching the reference */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-transparent" />

            {/* Card Content */}
            <div className="relative z-10 p-4 sm:p-5 flex flex-col justify-between min-h-[120px]">
              <h3 className="text-lg sm:text-xl font-black text-[#11241C] tracking-tight">
                {nextTrip.tripTitle}
              </h3>

              <div className="flex items-center justify-between gap-2 mt-3 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2 sm:gap-4 text-xs text-[#11241C] font-semibold min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <Calendar className="w-3.5 h-3.5 text-[#174C3C] shrink-0 stroke-[2]" />
                    <span className="truncate">{nextTrip.dateRangeLabel || "18 Sept – 19 Sept 2026"}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Users className="w-3.5 h-3.5 text-[#174C3C] shrink-0 stroke-[2]" />
                    <span>{nextTrip.passengers || 2} Travelers</span>
                  </div>
                </div>

                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EAF5EF] text-[#174C3C] border border-[#CDE3D5] shrink-0">
                  Assigned
                </span>
              </div>
            </div>
          </Link>
        ) : (
          <div className="rounded-[18px] p-5 border border-[#E9EFEA] bg-white text-center shadow-xs">
            <Calendar className="w-7 h-7 text-gray-300 mx-auto mb-1.5" />
            <h3 className="text-xs font-bold text-[#11241C]">No Upcoming Trips</h3>
            <p className="text-[11px] text-[#66756E] mt-0.5">
              You do not have any active trip assignments currently.
            </p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 4. QUICK ACTIONS SECTION (2-Column Grid)                     */}
      {/* ============================================================ */}
      <div className="space-y-2 pt-1">
        <h2 className="text-lg sm:text-xl font-black text-[#11241C]">Quick Actions</h2>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
          {/* Action 1: Log Expense */}
          <Link
            to="/captain/expenses?action=add"
            className="bg-white border border-[#E9EFEA] rounded-[18px] sm:rounded-[22px] p-3 sm:p-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.025)] hover:border-[#174C3C]/40 hover:bg-[#FAFCFA] transition-all group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#EAF5EF] flex items-center justify-center text-[#174C3C] shrink-0 group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[#174C3C] stroke-[2]" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-[#11241C] group-hover:text-[#174C3C] transition-colors truncate">
                Log Expense
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8C9B93] group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>

          {/* Action 2: Mark Attendance */}
          <Link
            to="/captain/attendance"
            className="bg-white border border-[#E9EFEA] rounded-[18px] sm:rounded-[22px] p-3 sm:p-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.025)] hover:border-[#174C3C]/40 hover:bg-[#FAFCFA] transition-all group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#EAF5EF] flex items-center justify-center text-[#174C3C] shrink-0 group-hover:scale-105 transition-transform">
                <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#174C3C] stroke-[2]" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-[#11241C] group-hover:text-[#174C3C] transition-colors truncate">
                Mark Attendance
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8C9B93] group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CaptainDashboard;
