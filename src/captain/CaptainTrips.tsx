import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Compass,
  Calendar,
  Users,
  Star,
  Receipt,
  Clock,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import { API_BASE_URL } from "../api";
import { useCaptainAuth } from "./CaptainAuthContext";

interface TripItem {
  slotId: string;
  tripId: string;
  tripTitle: string;
  location?: string;
  image?: string;
  duration?: string;
  startDate?: string;
  endDate?: string;
  dateRangeLabel?: string;
  passengers?: number;
  role?: string;
  slotStatus?: string;
  bucket?: "upcoming" | "ongoing" | "completed";
  rating?: number;
  reviewsCount?: number;
  photoDriveLink?: string;
  whatsappGroupLink?: string;
}

export const CaptainTrips: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useCaptainAuth();
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "upcoming" | "ongoing" | "completed">("all");

  const searchQuery = searchParams.get("search")?.toLowerCase() || "";

  useEffect(() => {
    fetchTrips();
  }, [token]);

  const fetchTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      const curToken = token || localStorage.getItem("captainToken");
      const res = await fetch(`${API_BASE_URL}/captain/portal/trips`, {
        headers: curToken ? { Authorization: `Bearer ${curToken}` } : {},
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.trips)) {
        setTrips(data.trips);
      } else {
        setError(data.message || "Failed to load assigned trips");
      }
    } catch (err: any) {
      console.error("Error fetching trips:", err);
      setError("Unable to connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      // Tab filter
      if (activeTab === "upcoming" && t.bucket !== "upcoming") return false;
      if (activeTab === "ongoing" && t.bucket !== "ongoing") return false;
      if (activeTab === "completed" && t.bucket !== "completed") return false;

      // Search filter
      if (searchQuery) {
        const titleMatch = (t.tripTitle || "").toLowerCase().includes(searchQuery);
        const locMatch = (t.location || "").toLowerCase().includes(searchQuery);
        return titleMatch || locMatch;
      }
      return true;
    });
  }, [trips, activeTab, searchQuery]);

  const formatDateDisplay = (startDateStr?: string, fallbackLabel?: string) => {
    if (!startDateStr) return fallbackLabel || "Upcoming";
    try {
      const d = new Date(startDateStr);
      if (isNaN(d.getTime())) return fallbackLabel || "Upcoming";
      return d.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return fallbackLabel || "Upcoming";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header Banner */}
      <div className="admin-page-header">
        <div className="admin-page-title-group">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <h1 className="admin-page-title">Assigned Expeditions</h1>
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
              Active Operations
            </span>
          </div>
          <p className="admin-page-subtitle">
            Manage your assigned departures, live passenger manifest, attendance check-in &amp; on-trip claims.
          </p>
        </div>

        <div className="admin-page-actions">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={fetchTrips}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "spinIconAnim" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          borderBottom: "1px solid #e7ecf0",
          paddingBottom: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { key: "all", label: "All Departures" },
            { key: "upcoming", label: "Upcoming" },
            { key: "ongoing", label: "Ongoing" },
            { key: "completed", label: "Completed" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                padding: "7px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: activeTab === tab.key ? "#0d2b17" : "#ffffff",
                color: activeTab === tab.key ? "#ffffff" : "#475569",
                boxShadow:
                  activeTab === tab.key
                    ? "0 2px 5px rgba(13, 43, 23, 0.2)"
                    : "0 1px 2px rgba(0, 0, 0, 0.05)",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {searchQuery && (
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            Showing results for <strong>"{searchQuery}"</strong> (
            <button
              onClick={() => navigate("/captain/trips")}
              style={{
                color: "#164e23",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                textDecoration: "underline",
              }}
            >
              Clear
            </button>
            )
          </div>
        )}
      </div>

      {/* Trips Content */}
      {loading ? (
        <div
          className="admin-card"
          style={{
            padding: "60px 20px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              border: "3px solid #164e23",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spinIconAnim 0.8s linear infinite",
            }}
          />
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>
            Loading Assigned Expeditions...
          </div>
        </div>
      ) : error ? (
        <div
          className="admin-card"
          style={{
            padding: "30px",
            textAlign: "center",
            borderLeft: "4px solid #ef4444",
          }}
        >
          <AlertCircle size={32} color="#ef4444" style={{ margin: "0 auto 12px auto" }} />
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
            Unable to Load Expeditions
          </h3>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>{error}</p>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={fetchTrips}
          >
            Retry Connection
          </button>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div
          className="admin-card"
          style={{
            padding: "60px 20px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
            }}
          >
            <Compass size={28} />
          </div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
            No Assigned Expeditions Found
          </h3>
          <p style={{ fontSize: "13px", color: "#64748b", maxWidth: "400px" }}>
            No departures currently match your selection. Assigned trips from the Operations Desk will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px" }}>
          {filteredTrips.map((item) => {
            const dateStr = formatDateDisplay(item.startDate, item.dateRangeLabel);
            const role = item.role || "Head Captain";

            return (
              <div
                key={item.slotId}
                className="admin-card"
                style={{
                  padding: "0",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                {/* Card Banner Image */}
                <div style={{ position: "relative", height: "180px", width: "100%", background: "#0d2b17" }}>
                  <img
                    src={
                      item.image ||
                      "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&auto=format&fit=crop&q=80"
                    }
                    alt={item.tripTitle}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)",
                    }}
                  />

                  {/* Top Badges Overlay */}
                  <div
                    style={{
                      position: "absolute",
                      top: "14px",
                      left: "14px",
                      right: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        background: "rgba(13, 43, 23, 0.9)",
                        color: "#d9eec7",
                        backdropFilter: "blur(4px)",
                        border: "1px solid rgba(217, 238, 199, 0.3)",
                        padding: "4px 10px",
                        borderRadius: "999px",
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                      }}
                    >
                      {role}
                    </span>

                    <span
                      style={{
                        background: "rgba(255, 255, 255, 0.95)",
                        color: "#0f172a",
                        padding: "3px 8px",
                        borderRadius: "999px",
                        fontSize: "11px",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      }}
                    >
                      <Star size={12} fill="#eab308" color="#eab308" />
                      {item.rating || "4.9"} ({item.reviewsCount || 4})
                    </span>
                  </div>

                  {/* Bottom title in banner */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "14px",
                      left: "14px",
                      right: "14px",
                    }}
                  >
                    <h3
                      style={{
                        color: "#ffffff",
                        fontSize: "17px",
                        fontWeight: 800,
                        margin: 0,
                        lineHeight: 1.3,
                        textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                      }}
                    >
                      {item.tripTitle}
                    </h3>
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px", flex: 1 }}>
                  {/* Schedule Details Row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                      background: "#f8fafc",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#334155" }}>
                      <Calendar size={15} color="#164e23" />
                      <span style={{ fontWeight: 600 }}>{dateStr}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#334155" }}>
                      <Clock size={15} color="#164e23" />
                      <span style={{ fontWeight: 600 }}>{item.duration || "2 Days 1 Night"}</span>
                    </div>
                  </div>

                  {/* Status & Manifest count */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                      <Users size={15} color="#64748b" />
                      <span>
                        <strong style={{ color: "#0f172a" }}>{item.passengers || 18}</strong> Passengers Booked
                      </span>
                    </div>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        color: "#166534",
                        background: "#dcfce7",
                        padding: "2px 8px",
                        borderRadius: "999px",
                        fontWeight: 600,
                        fontSize: "11px",
                      }}
                    >
                      <CheckCircle2 size={12} />
                      Slot Active
                    </span>
                  </div>

                  {/* Actions Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                      marginTop: "auto",
                      paddingTop: "6px",
                    }}
                  >
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      onClick={() => navigate(`/captain/trips/${item.slotId}/attendance`)}
                      style={{ justifyContent: "center", fontSize: "12px", padding: "8px 10px" }}
                    >
                      <UserCheck size={14} />
                      <span>Attendance</span>
                    </button>

                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      onClick={() => navigate(`/captain/trips/${item.slotId}/expenses`)}
                      style={{ justifyContent: "center", fontSize: "12px", padding: "8px 10px" }}
                    >
                      <Receipt size={14} />
                      <span>Expenses</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={() => navigate(`/captain/trips/${item.slotId}`)}
                    style={{ width: "100%", justifyContent: "center", marginTop: "2px" }}
                  >
                    <span>Manifest &amp; Departure Desk</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CaptainTrips;
