import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Star,
  Eye,
  Users,
  MapPin,
  Loader2,
  AlertCircle,
  X,
  Edit,
} from "lucide-react";
import { API_BASE_URL } from "../../../api";
import { CaptainFormModal } from "../../components/CaptainFormModal";

interface CaptainProfileData {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  status: "Active" | "Inactive" | "Unavailable" | string;
  role: "Head Captain" | "Main Captain" | "Trainee Captain" | string;
  rating: number;
  avatar?: string;
  bio?: string;
  specialities: string[];
  specialties?: string[];
  joinedDate?: string;
  createdAt?: string;
}

interface TripHistoryItem {
  id: string;
  assignmentId: string;
  tripTitle: string;
  destination: string;
  duration: string;
  departureDate: string | null;
  returnDate: string | null;
  role: string;
  roleRank: number;
  status: "Assigned" | "Confirmed" | "On Trip" | "Completed" | "Cancelled" | string;
  slotId: string | null;
  tripId: string | null;
  bookedCustomers: number;
  captainFee: number;
  advancePaid: number;
  customerRating: number | null;
}

interface SlotDetailsModalData {
  slot: {
    _id: string;
    date: string;
    totalSlots: number;
    bookedSlots: number;
    status: string;
  };
  trip: {
    _id: string;
    title: string;
    location: string;
    duration: string;
    price: number;
    image?: string;
  } | null;
  assignedCaptains: Array<{
    _id: string;
    captainId?: string;
    name: string;
    phone: string;
    avatar?: string;
    role: string;
    roleRank: number;
    status: string;
    captainFee: number;
    advancePaid: number;
  }>;
  bookings: Array<{
    _id: string;
    bookingCode: string;
    name: string;
    phone: string;
    email?: string;
    travellers: number;
    total: number;
    paymentStatus: string;
    pickupLocation: string;
    status: string;
  }>;
  attendanceSummary: {
    totalTravellers: number;
    markedPresent: number;
    markedAbsent: number;
    totalRecords: number;
  };
  expenses: Array<{
    _id: string;
    title: string;
    amount: number;
    category: string;
    captainName: string;
    status: string;
  }>;
  payouts: Array<{
    _id: string;
    amountPaid: number;
    status: string;
    paymentReference: string;
  }>;
}

const getRoleBadge = (role: string | undefined) => {
  const r = (role || "Main Captain").toLowerCase();
  if (r.includes("head") || r.includes("lead")) {
    return { label: "Head Captain", bg: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0", rank: 1, icon: "👑" };
  }
  if (r.includes("main") || r.includes("assistant")) {
    return { label: "Main Captain", bg: "#dbeafe", color: "#1e40af", border: "1px solid #bfdbfe", rank: 2, icon: "⭐" };
  }
  return { label: "Trainee Captain", bg: "#f1f5f9", color: "#334155", border: "1px solid #e2e8f0", rank: 3, icon: "🌱" };
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Completed":
      return { label: "Completed", bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0" };
    case "Cancelled":
      return { label: "Cancelled", bg: "#fef2f2", color: "#991b1b", border: "#fecaca" };
    case "Confirmed":
      return { label: "Confirmed", bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe" };
    case "On Trip":
      return { label: "On Trip", bg: "#fefce8", color: "#854d0e", border: "#fef08a" };
    case "Assigned":
    default:
      return { label: "Upcoming", bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" };
  }
};

export const CaptainHistory: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract captainId from query string ?captainId=... OR pathname /admin/operations/captains/:id
  const queryParams = new URLSearchParams(location.search);
  const queryCaptainId = queryParams.get("captainId");
  const pathParts = location.pathname.split("/");
  const pathCaptainId = pathParts[pathParts.length - 1] !== "history" && pathParts[pathParts.length - 1] !== "captains"
    ? pathParts[pathParts.length - 1]
    : null;

  const currentCaptainId = queryCaptainId || pathCaptainId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [captain, setCaptain] = useState<CaptainProfileData | null>(null);
  const [stats, setStats] = useState({
    totalTrips: 0,
    completedTrips: 0,
    upcomingTrips: 0,
    cancelledTrips: 0,
    averageRating: 0,
  });
  const [history, setHistory] = useState<TripHistoryItem[]>([]);
  const [allCaptains, setAllCaptains] = useState<Array<{ _id: string; name: string }>>([]);

  // Active History Tab: All Trips | Completed Trips | Upcoming Trips | Cancelled Assignments
  const [activeTab, setActiveTab] = useState<"all" | "completed" | "upcoming" | "cancelled">("all");

  // Modal State for Edit Captain
  const [showEditModal, setShowEditModal] = useState(false);

  // Modal State for View Trip Details
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [slotDetails, setSlotDetails] = useState<SlotDetailsModalData | null>(null);
  const [loadingSlotDetails, setLoadingSlotDetails] = useState(false);
  const [slotDetailsError, setSlotDetailsError] = useState<string | null>(null);

  const fetchCaptainProfile = async (targetId: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/admin/operations/captains/${targetId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success && data.captain) {
        setCaptain(data.captain);
        setStats(data.stats || {
          totalTrips: 0,
          completedTrips: 0,
          upcomingTrips: 0,
          cancelledTrips: 0,
          averageRating: 0,
        });
        setHistory(data.history || []);
      } else {
        setError(data.message || "Failed to load captain profile.");
      }
    } catch (err: any) {
      console.error("Captain profile fetch error:", err);
      setError("Network error while connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  // Initial load: fetch captains list if no specific captain ID provided
  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API_BASE_URL}/admin/operations/captains`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && Array.isArray(data.captains) && data.captains.length > 0) {
          setAllCaptains(data.captains);
          if (!currentCaptainId) {
            navigate(`/admin/operations/history?captainId=${data.captains[0]._id}`, { replace: true });
          }
        }
      })
      .catch((err) => console.error("Fetch all captains error:", err));
  }, [currentCaptainId, navigate]);

  useEffect(() => {
    if (currentCaptainId) {
      fetchCaptainProfile(currentCaptainId);
    }
  }, [currentCaptainId]);

  // Open "View Trip Details" Modal
  const handleOpenTripDetails = async (slotId: string | null) => {
    if (!slotId) {
      alert("No departure slot linked to this assignment.");
      return;
    }
    setSelectedSlotId(slotId);
    setLoadingSlotDetails(true);
    setSlotDetailsError(null);
    setSlotDetails(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/admin/operations/slots/${slotId}/details`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSlotDetails(data);
      } else {
        setSlotDetailsError(data.message || "Failed to load departure slot details.");
      }
    } catch (err) {
      console.error("Slot details fetch error:", err);
      setSlotDetailsError("Network error while loading departure details.");
    } finally {
      setLoadingSlotDetails(false);
    }
  };

  // Filter history based on active tab
  const filteredHistory = history.filter((item) => {
    if (activeTab === "completed") return item.status === "Completed";
    if (activeTab === "upcoming") return ["Assigned", "Confirmed", "On Trip"].includes(item.status);
    if (activeTab === "cancelled") return item.status === "Cancelled";
    return true; // "all"
  });

  const roleInfo = getRoleBadge(captain?.role);

  return (
    <div style={{ width: "100%", maxWidth: "1280px", margin: "0 auto", paddingBottom: "40px" }}>
      {/* Top Bar: Back button and Captain Quick Switcher */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          marginBottom: "18px",
          flexWrap: "wrap",
        }}
      >
        <Link
          to="/admin/operations/captains"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13.5px",
            fontWeight: 600,
            color: "#166534",
            textDecoration: "none",
            padding: "8px 14px",
            borderRadius: "8px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f0fdf4";
            e.currentTarget.style.borderColor = "#bbf7d0";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#ffffff";
            e.currentTarget.style.borderColor = "#e2e8f0";
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Captains</span>
        </Link>

        {allCaptains.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "12.5px", color: "#64748b", fontWeight: 500 }}>Select Captain:</span>
            <select
              value={currentCaptainId || ""}
              onChange={(e) => navigate(`/admin/operations/history?captainId=${e.target.value}`)}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                fontWeight: 600,
                color: "#0f172a",
                background: "#ffffff",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {allCaptains.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e7ecf0",
            padding: "60px 20px",
            textAlign: "center",
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: "12px", color: "#166534", fontWeight: 600 }}>
            <Loader2 size={24} className="animate-spin" />
            <span>Loading Captain Profile & Trip History...</span>
          </div>
        </div>
      ) : error || !captain ? (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #fee2e2",
            padding: "40px 24px",
            textAlign: "center",
          }}
        >
          <AlertCircle size={32} color="#dc2626" style={{ margin: "0 auto 12px" }} />
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#991b1b", marginBottom: "6px" }}>
            Captain Profile Not Found
          </h2>
          <p style={{ fontSize: "13.5px", color: "#64748b", marginBottom: "20px" }}>
            {error || "The requested captain record does not exist or has been removed."}
          </p>
          <Link
            to="/admin/operations/captains"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 18px",
              borderRadius: "8px",
              background: "#0d2b17",
              color: "#ffffff",
              fontSize: "13.5px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Return to Captains List
          </Link>
        </div>
      ) : (
        <>
          {/* Requirement 1: Profile Dashboard Header Card */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e7ecf0",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
              padding: "24px 28px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "20px",
                flexWrap: "wrap",
              }}
            >
              {/* Left: Avatar + Details */}
              <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                <div
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #0d2b17 0%, #1c542e 100%)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "24px",
                    boxShadow: "0 4px 10px rgba(13, 43, 23, 0.2)",
                    flexShrink: 0,
                  }}
                >
                  {captain.name.slice(0, 2).toUpperCase()}
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: "#0f172a" }}>
                      {captain.name}
                    </h1>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "12px",
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: "6px",
                        background: roleInfo.bg,
                        color: roleInfo.color,
                        border: roleInfo.border,
                      }}
                    >
                      <span>{roleInfo.icon}</span>
                      <span>{roleInfo.label}</span>
                    </span>

                    <span
                      style={{
                        fontSize: "11.5px",
                        fontWeight: 700,
                        padding: "3px 9px",
                        borderRadius: "12px",
                        background: captain.status === "Active" ? "#f0fdf4" : "#f1f5f9",
                        color: captain.status === "Active" ? "#166534" : "#475569",
                        border: `1px solid ${captain.status === "Active" ? "#bbf7d0" : "#cbd5e1"}`,
                      }}
                    >
                      {captain.status}
                    </span>
                  </div>

                  {/* Contact & Meta Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "18px",
                      marginTop: "10px",
                      flexWrap: "wrap",
                      fontSize: "13px",
                      color: "#475569",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 500 }}>
                      <Phone size={14} color="#166534" />
                      <strong style={{ color: "#0f172a" }}>{captain.phone}</strong>
                    </span>

                    {captain.email && (
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Mail size={14} color="#64748b" />
                        <span>{captain.email}</span>
                      </span>
                    )}

                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Calendar size={14} color="#64748b" />
                      <span>
                        Joined{" "}
                        {captain.createdAt
                          ? new Date(captain.createdAt).toLocaleDateString("en-IN", {
                              month: "short",
                              year: "numeric",
                            })
                          : "Jan 2024"}
                      </span>
                    </span>
                  </div>

                  {/* Specialties Tags */}
                  {(captain.specialities || captain.specialties) && (
                    <div style={{ display: "flex", gap: "6px", marginTop: "12px", flexWrap: "wrap" }}>
                      {(captain.specialities || captain.specialties || []).map((s, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "6px",
                            background: "#f1f5f9",
                            color: "#334155",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Edit Captain Button */}
              <div>
                <button
                  onClick={() => setShowEditModal(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "9px 18px",
                    borderRadius: "8px",
                    background: "#0d2b17",
                    color: "#ffffff",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#143e22")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#0d2b17")}
                >
                  <Edit size={15} />
                  <span>Edit Captain</span>
                </button>
              </div>
            </div>

            {/* Requirement 1: 4 Profile Summary Cards calculated from database */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "14px",
                marginTop: "24px",
                paddingTop: "22px",
                borderTop: "1px solid #f1f5f9",
              }}
            >
              {/* Card 1: Total Trips Assigned */}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  padding: "16px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Total Trips Assigned
                </div>
                <div style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
                  {stats.totalTrips}
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                  All scheduled departures
                </div>
              </div>

              {/* Card 2: Completed Trips */}
              <div
                style={{
                  background: "#f0fdf4",
                  borderRadius: "12px",
                  border: "1px solid #bbf7d0",
                  padding: "16px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#166534", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Completed Trips
                </div>
                <div style={{ fontSize: "28px", fontWeight: 800, color: "#15803d", marginTop: "4px" }}>
                  {stats.completedTrips}
                </div>
                <div style={{ fontSize: "11px", color: "#166534", opacity: 0.8, marginTop: "2px" }}>
                  Successfully executed
                </div>
              </div>

              {/* Card 3: Upcoming Trips */}
              <div
                style={{
                  background: "#eff6ff",
                  borderRadius: "12px",
                  border: "1px solid #bfdbfe",
                  padding: "16px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Upcoming Trips
                </div>
                <div style={{ fontSize: "28px", fontWeight: 800, color: "#1d4ed8", marginTop: "4px" }}>
                  {stats.upcomingTrips}
                </div>
                <div style={{ fontSize: "11px", color: "#1e40af", opacity: 0.8, marginTop: "2px" }}>
                  Assigned & ready
                </div>
              </div>

              {/* Card 4: Average Customer Rating */}
              <div
                style={{
                  background: "#fffbeb",
                  borderRadius: "12px",
                  border: "1px solid #fef3c7",
                  padding: "16px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Average Customer Rating
                </div>
                <div
                  style={{
                    fontSize: "26px",
                    fontWeight: 800,
                    color: "#92400e",
                    marginTop: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  {stats.averageRating && stats.averageRating > 0 ? (
                    <>
                      <Star size={22} color="#f59e0b" fill="#f59e0b" />
                      <span>{Number(stats.averageRating).toFixed(1)}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: "15px", color: "#b45309", fontWeight: 600 }}>
                      Not rated yet
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "11px", color: "#b45309", opacity: 0.8, marginTop: "2px" }}>
                  Based on traveller reviews
                </div>
              </div>
            </div>
          </div>

          {/* Requirement 2: Complete Captain Trip History Section */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e7ecf0",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
              overflow: "hidden",
            }}
          >
            {/* History Section Title & 4 Tabs */}
            <div
              style={{
                padding: "20px 24px 0 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "14px",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0f172a" }}>
                  Captain Trip History
                </h2>
                <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", color: "#64748b" }}>
                  Complete record of expeditions, role assignments, traveller turnouts, and operational details.
                </p>
              </div>

              {/* 4 Tabs: All Trips, Completed Trips, Upcoming Trips, Cancelled Assignments */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", overflowX: "auto" }}>
                {[
                  { id: "all", label: "All Trips", count: stats.totalTrips },
                  { id: "completed", label: "Completed Trips", count: stats.completedTrips },
                  { id: "upcoming", label: "Upcoming Trips", count: stats.upcomingTrips },
                  { id: "cancelled", label: "Cancelled Assignments", count: stats.cancelledTrips },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      style={{
                        padding: "10px 16px",
                        fontSize: "13px",
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? "#0d2b17" : "#64748b",
                        border: "none",
                        borderBottom: isActive ? "2.5px solid #0d2b17" : "2.5px solid transparent",
                        background: "transparent",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        whiteSpace: "nowrap",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span>{tab.label}</span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "1px 7px",
                          borderRadius: "10px",
                          background: isActive ? "#0d2b17" : "#f1f5f9",
                          color: isActive ? "#ffffff" : "#64748b",
                        }}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trip History Table */}
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: "240px" }}>Trip Package</th>
                    <th>Destination</th>
                    <th style={{ width: "160px" }}>Trip Date</th>
                    <th style={{ width: "160px" }}>Role on This Trip</th>
                    <th style={{ textAlign: "center", width: "140px" }}>Booked Customers</th>
                    <th style={{ textAlign: "center", width: "120px" }}>Trip Status</th>
                    <th style={{ textAlign: "center", width: "110px" }}>Customer Rating</th>
                    <th style={{ textAlign: "right", width: "140px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "48px 20px", color: "#64748b" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                          <Calendar size={28} color="#94a3b8" />
                          <span style={{ fontSize: "14px", fontWeight: 600, color: "#334155" }}>
                            No {activeTab === "all" ? "" : activeTab} trips found
                          </span>
                          <span style={{ fontSize: "12.5px", color: "#94a3b8" }}>
                            {activeTab === "completed"
                              ? "Trips only appear here when explicitly marked Completed by the admin."
                              : "No assignment records currently match this filter."}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((item) => {
                      const itemRoleInfo = getRoleBadge(item.role);
                      const statusInfo = getStatusBadge(item.status);
                      const formattedDate = item.departureDate
                        ? new Date(item.departureDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Date to be scheduled";

                      return (
                        <tr key={item.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>
                              {item.tripTitle}
                            </div>
                            <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                              {item.duration}
                            </div>
                          </td>

                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#475569", fontSize: "13px" }}>
                              <MapPin size={13} color="#94a3b8" />
                              <span>{item.destination}</span>
                            </div>
                          </td>

                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "#0f172a", fontWeight: 500 }}>
                              <Calendar size={13} color="#94a3b8" />
                              <span>{formattedDate}</span>
                            </div>
                          </td>

                          <td>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "11px",
                                fontWeight: 700,
                                padding: "2.5px 8px",
                                borderRadius: "6px",
                                background: itemRoleInfo.bg,
                                color: itemRoleInfo.color,
                                border: itemRoleInfo.border,
                              }}
                            >
                              <span>{itemRoleInfo.icon}</span>
                              <span>{itemRoleInfo.label}</span>
                            </span>
                          </td>

                          <td style={{ textAlign: "center" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                fontWeight: 700,
                                color: "#0f172a",
                                fontSize: "13px",
                              }}
                            >
                              <Users size={14} color="#166534" />
                              <span>{item.bookedCustomers} travellers</span>
                            </span>
                          </td>

                          <td style={{ textAlign: "center" }}>
                            <span
                              style={{
                                display: "inline-block",
                                fontSize: "11.5px",
                                fontWeight: 700,
                                padding: "2.5px 9px",
                                borderRadius: "12px",
                                background: statusInfo.bg,
                                color: statusInfo.color,
                                border: `1px solid ${statusInfo.border}`,
                              }}
                            >
                              {statusInfo.label}
                            </span>
                          </td>

                          <td style={{ textAlign: "center" }}>
                            {item.status === "Completed" && item.customerRating ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  color: "#b45309",
                                }}
                              >
                                <Star size={12} color="#f59e0b" fill="#f59e0b" />
                                <span>{item.customerRating.toFixed(1)}</span>
                              </span>
                            ) : item.status === "Completed" ? (
                              <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>Unrated</span>
                            ) : (
                              <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>—</span>
                            )}
                          </td>

                          <td style={{ textAlign: "right" }}>
                            <button
                              onClick={() => handleOpenTripDetails(item.slotId)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                background: "#f8fafc",
                                border: "1px solid #cbd5e1",
                                color: "#1e293b",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#0d2b17";
                                e.currentTarget.style.color = "#ffffff";
                                e.currentTarget.style.borderColor = "#0d2b17";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#f8fafc";
                                e.currentTarget.style.color = "#1e293b";
                                e.currentTarget.style.borderColor = "#cbd5e1";
                              }}
                              title="View Departure Slot Team, Bookings, Attendance and Expenses"
                            >
                              <Eye size={13} />
                              <span>View Trip Details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Edit Captain Modal (Same exact look from Reference Image) */}
      {captain && (
        <CaptainFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          captain={{
            _id: captain._id,
            name: captain.name,
            phone: captain.phone,
            email: captain.email,
            role: captain.role,
            status: captain.status,
            rating: captain.rating,
            specialities: captain.specialities,
          }}
          onSuccess={() => {
            fetchCaptainProfile(captain._id);
          }}
        />
      )}

      {/* Requirement 2: View Trip Details Modal */}
      {selectedSlotId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            backgroundColor: "rgba(10, 25, 15, 0.7)",
            backdropFilter: "blur(4px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedSlotId(null);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "840px",
              maxHeight: "90vh",
              background: "#ffffff",
              borderRadius: "16px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #092312 0%, #0d381c 50%, #164e27 100%)",
                padding: "20px 24px",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
                  Departure Slot Operations & Roster
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", color: "rgba(255,255,255,0.75)" }}>
                  Assigned captain crew, booked traveller turnout, attendance and expenses
                </p>
              </div>

              <button
                onClick={() => setSelectedSlotId(null)}
                style={{
                  background: "rgba(255, 255, 255, 0.12)",
                  border: "none",
                  color: "#ffffff",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
              {loadingSlotDetails ? (
                <div style={{ textAlign: "center", padding: "48px 20px", color: "#166534" }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                  <p style={{ fontSize: "13.5px", fontWeight: 600 }}>Loading Departure Details...</p>
                </div>
              ) : slotDetailsError || !slotDetails ? (
                <div style={{ textAlign: "center", padding: "32px 16px", color: "#991b1b" }}>
                  <AlertCircle size={28} style={{ margin: "0 auto 8px" }} />
                  <p style={{ fontSize: "14px", fontWeight: 600 }}>{slotDetailsError || "Could not load slot details."}</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {/* Trip Summary Card */}
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "16px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "14px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                        {slotDetails.trip?.title || "Custom Expedition"}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "4px", fontSize: "12.5px", color: "#64748b" }}>
                        <span>📍 {slotDetails.trip?.location || "South India"}</span>
                        <span>⏱️ {slotDetails.trip?.duration || "2 Days / 1 Night"}</span>
                        <span>📅 Departure: {new Date(slotDetails.slot.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Capacity</div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                          {slotDetails.slot.bookedSlots} / {slotDetails.slot.totalSlots} Seats
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 1: Assigned Captain Team (Hierarchy Enforced) */}
                  <div>
                    <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                      Assigned Captain Team (Hierarchy Order)
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
                      {slotDetails.assignedCaptains.length === 0 ? (
                        <div style={{ padding: "14px", background: "#f8fafc", borderRadius: "8px", fontSize: "13px", color: "#64748b" }}>
                          No captains assigned to this slot yet.
                        </div>
                      ) : (
                        slotDetails.assignedCaptains.map((cap) => {
                          const capRoleInfo = getRoleBadge(cap.role);
                          return (
                            <div
                              key={cap._id}
                              style={{
                                padding: "12px 14px",
                                borderRadius: "10px",
                                border: "1px solid #e2e8f0",
                                background: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                              }}
                            >
                              <div
                                style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "50%",
                                  background: "#0d2b17",
                                  color: "#ffffff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 700,
                                  fontSize: "12px",
                                  flexShrink: 0,
                                }}
                              >
                                {cap.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a" }}>
                                  {cap.name}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                                  <span
                                    style={{
                                      fontSize: "10.5px",
                                      fontWeight: 700,
                                      padding: "1.5px 6px",
                                      borderRadius: "4px",
                                      background: capRoleInfo.bg,
                                      color: capRoleInfo.color,
                                      border: capRoleInfo.border,
                                    }}
                                  >
                                    {capRoleInfo.icon} {capRoleInfo.label}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Section 2: Booked Travellers & Attendance Summary */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                      <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                        Booked Travellers ({slotDetails.bookings.length} Bookings • {slotDetails.attendanceSummary.totalTravellers} Travellers)
                      </h4>
                      <div style={{ display: "flex", gap: "8px", fontSize: "11.5px" }}>
                        <span style={{ color: "#166534", fontWeight: 600 }}>
                          ✓ {slotDetails.attendanceSummary.markedPresent} Present
                        </span>
                        {slotDetails.attendanceSummary.markedAbsent > 0 && (
                          <span style={{ color: "#991b1b", fontWeight: 600 }}>
                            ✕ {slotDetails.attendanceSummary.markedAbsent} Absent
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", textAlign: "left" }}>
                            <th style={{ padding: "8px 12px" }}>Booking Code</th>
                            <th style={{ padding: "8px 12px" }}>Customer</th>
                            <th style={{ padding: "8px 12px" }}>Contact</th>
                            <th style={{ padding: "8px 12px", textAlign: "center" }}>Seats</th>
                            <th style={{ padding: "8px 12px" }}>Pickup Point</th>
                            <th style={{ padding: "8px 12px", textAlign: "center" }}>Payment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {slotDetails.bookings.length === 0 ? (
                            <tr>
                              <td colSpan={6} style={{ textAlign: "center", padding: "16px", color: "#64748b" }}>
                                No bookings recorded for this departure.
                              </td>
                            </tr>
                          ) : (
                            slotDetails.bookings.map((b) => (
                              <tr key={b._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "8px 12px", fontWeight: 600, color: "#0f172a", fontFamily: "monospace" }}>
                                  {b.bookingCode}
                                </td>
                                <td style={{ padding: "8px 12px", fontWeight: 600 }}>{b.name}</td>
                                <td style={{ padding: "8px 12px", color: "#475569" }}>{b.phone}</td>
                                <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700 }}>{b.travellers}</td>
                                <td style={{ padding: "8px 12px", color: "#64748b" }}>{b.pickupLocation}</td>
                                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                  <span
                                    style={{
                                      fontSize: "10.5px",
                                      fontWeight: 700,
                                      padding: "1.5px 6px",
                                      borderRadius: "4px",
                                      background: b.paymentStatus === "Paid" ? "#dcfce7" : "#fef3c7",
                                      color: b.paymentStatus === "Paid" ? "#166534" : "#92400e",
                                    }}
                                  >
                                    {b.paymentStatus}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 3: Expenses & Settlements */}
                  <div>
                    <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                      Slot Expenses & Captain Settlements
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
                      <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Trip Expenses Logged</div>
                        <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginTop: "4px" }}>
                          ₹{slotDetails.expenses.reduce((acc, e) => acc + (e.amount || 0), 0).toLocaleString("en-IN")}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                          {slotDetails.expenses.length} expense record(s) on file
                        </div>
                      </div>

                      <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Captain Settlements Paid</div>
                        <div style={{ fontSize: "16px", fontWeight: 700, color: "#166534", marginTop: "4px" }}>
                          ₹{slotDetails.payouts.reduce((acc, p) => acc + (p.amountPaid || 0), 0).toLocaleString("en-IN")}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                          {slotDetails.payouts.length} payout disbursement(s) completed
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "14px 24px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", textAlign: "right" }}>
              <button
                onClick={() => setSelectedSlotId(null)}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  background: "#0d2b17",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaptainHistory;
