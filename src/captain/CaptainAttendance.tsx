import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Search,
  Users,
  Check,
  CheckCircle2,
  Clock,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import { API_BASE_URL } from "../api";
import { useCaptainAuth } from "./CaptainAuthContext";

interface IndividualTraveller {
  travellerKey: string;
  bookingId: string;
  travellerIndex: number;
  name: string;
  phone?: string;
  pickupLocation: string;
  isBoarded: boolean;
}

export const CaptainAttendance: React.FC = () => {
  const { slotId } = useParams<{ slotId: string }>();
  const navigate = useNavigate();
  const { token } = useCaptainAuth();

  const [loading, setLoading] = useState(true);
  const [tripData, setTripData] = useState<any>(null);
  const [travellers, setTravellers] = useState<IndividualTraveller[]>([]);
  const [filter, setFilter] = useState<"All" | "Boarded" | "Pending">("All");
  const [search, setSearch] = useState("");
  const [selectedPickup, setSelectedPickup] = useState<string>("All");
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  useEffect(() => {
    if (slotId) {
      loadTripData();
    }
  }, [slotId, token]);

  const loadTripData = async () => {
    setLoading(true);
    try {
      const curToken = token || localStorage.getItem("captainToken");
      const res = await fetch(`${API_BASE_URL}/captain/trips/${slotId}`, {
        headers: curToken ? { Authorization: `Bearer ${curToken}` } : {},
      });
      const result = await res.json();
      if (result.success) {
        setTripData(result);
        buildTravellerList(result.bookings || [], result.attendanceRecords || []);
      }
    } catch (err) {
      console.error("Attendance load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const buildTravellerList = (bookings: any[], attendanceRecords: any[]) => {
    const attendanceMap = new Map<string, string>();
    attendanceRecords.forEach((a) => {
      const bId = a.bookingId || a.booking || "";
      const tIdx = Number(a.travellerIndex) || 0;
      const key = `${bId}_${tIdx}`;
      attendanceMap.set(key, a.status);
    });

    const list: IndividualTraveller[] = [];

    bookings.forEach((b) => {
      const count = b.travellers || 1;
      const pickup = b.pickupLocation || b.pickupDetails?.name || "Main Pickup Point";
      const leadName = b.customerName || b.name || "Traveller";
      const leadPhone = b.customerPhone || b.phone || "";

      for (let i = 0; i < count; i++) {
        const key = `${b._id}_${i}`;

        let travellerName = "";
        if (b.travellerDetails && Array.isArray(b.travellerDetails) && b.travellerDetails[i]?.name?.trim()) {
          travellerName = b.travellerDetails[i].name.trim();
        } else if (i === 0) {
          travellerName = leadName;
        } else {
          travellerName = `${leadName} (Guest ${i + 1})`;
        }

        let travellerPhone = "";
        if (b.travellerDetails && Array.isArray(b.travellerDetails) && b.travellerDetails[i]?.phone?.trim()) {
          travellerPhone = b.travellerDetails[i].phone.trim();
        } else {
          travellerPhone = leadPhone;
        }

        const status = attendanceMap.get(key) || "Pending";
        const isBoarded = status === "Present" || status === "Boarded";

        list.push({
          travellerKey: key,
          bookingId: b._id,
          travellerIndex: i,
          name: travellerName,
          phone: travellerPhone,
          pickupLocation: pickup,
          isBoarded,
        });
      }
    });

    setTravellers(list);
  };

  const handleToggleAttendance = async (t: IndividualTraveller) => {
    const nextStatus = t.isBoarded ? "Pending" : "Present";
    setTogglingKey(t.travellerKey);

    // Optimistically update
    setTravellers((prev) =>
      prev.map((item) =>
        item.travellerKey === t.travellerKey ? { ...item, isBoarded: !t.isBoarded } : item
      )
    );

    try {
      const curToken = token || localStorage.getItem("captainToken");
      const res = await fetch(`${API_BASE_URL}/captain/attendance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(curToken ? { Authorization: `Bearer ${curToken}` } : {}),
        },
        body: JSON.stringify({
          slotId,
          bookingId: t.bookingId,
          travellerIndex: t.travellerIndex,
          travellerName: t.name,
          pickupLocation: t.pickupLocation,
          status: nextStatus,
        }),
      });

      const resData = await res.json();
      if (!resData.success) {
        // Rollback
        setTravellers((prev) =>
          prev.map((item) =>
            item.travellerKey === t.travellerKey ? { ...item, isBoarded: t.isBoarded } : item
          )
        );
      }
    } catch (err) {
      console.error("Attendance toggle failed:", err);
      // Rollback
      setTravellers((prev) =>
        prev.map((item) =>
          item.travellerKey === t.travellerKey ? { ...item, isBoarded: t.isBoarded } : item
        )
      );
    } finally {
      setTogglingKey(null);
    }
  };

  const pickupLocations = useMemo(() => {
    const set = new Set<string>();
    travellers.forEach((t) => {
      if (t.pickupLocation) set.add(t.pickupLocation);
    });
    return Array.from(set);
  }, [travellers]);

  const totalCount = travellers.length;
  const boardedCount = travellers.filter((t) => t.isBoarded).length;
  const pendingCount = totalCount - boardedCount;
  const boardingPercent = totalCount > 0 ? Math.round((boardedCount / totalCount) * 100) : 0;

  const filteredTravellers = useMemo(() => {
    return travellers.filter((t) => {
      if (filter === "Boarded" && !t.isBoarded) return false;
      if (filter === "Pending" && t.isBoarded) return false;
      if (selectedPickup !== "All" && t.pickupLocation !== selectedPickup) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = t.name.toLowerCase().includes(q);
        const matchPhone = (t.phone || "").includes(q);
        const matchPickup = t.pickupLocation.toLowerCase().includes(q);
        return matchName || matchPhone || matchPickup;
      }
      return true;
    });
  }, [travellers, filter, selectedPickup, search]);

  const trip = tripData?.slot?.trip || {};
  const tripTitle = trip.title || tripData?.slot?.customTitle || "Expedition Attendance";

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
              <h1 className="admin-page-title">Boarding &amp; Attendance Manifest</h1>
              <span
                style={{
                  background: "#e8f5e9",
                  color: "#164e23",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: "999px",
                }}
              >
                {boardedCount} / {totalCount} On Board
              </span>
            </div>
            <p className="admin-page-subtitle">
              {tripTitle} • Check off travellers as they board transport at each scheduled pickup point.
            </p>
          </div>

          <div className="admin-page-actions">
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={loadTripData}
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? "spinIconAnim" : ""} />
              <span>Refresh Manifest</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
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
              <Users size={22} />
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
              Total
            </span>
          </div>
          <div className="admin-stat-label">Total Travellers</div>
          <div className="admin-stat-value">{totalCount}</div>
          <div className="admin-stat-sub">Booked passengers for this slot</div>
        </div>

        <div className="admin-stat-card">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div className="admin-stat-icon-wrapper" style={{ background: "#dcfce7", color: "#15803d" }}>
              <CheckCircle2 size={22} />
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
              Verified
            </span>
          </div>
          <div className="admin-stat-label">Boarded / Present</div>
          <div className="admin-stat-value">{boardedCount}</div>
          <div className="admin-stat-sub">Checked into vehicle</div>
        </div>

        <div className="admin-stat-card">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div className="admin-stat-icon-wrapper" style={{ background: "#fef3c7", color: "#b45309" }}>
              <Clock size={22} />
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
              Awaiting
            </span>
          </div>
          <div className="admin-stat-label">Pending Boarding</div>
          <div className="admin-stat-value">{pendingCount}</div>
          <div className="admin-stat-sub">Travellers yet to arrive</div>
        </div>

        <div className="admin-stat-card">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div className="admin-stat-icon-wrapper" style={{ background: "#d1fae5", color: "#065f46" }}>
              <UserCheck size={22} />
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
              Capacity
            </span>
          </div>
          <div className="admin-stat-label">Boarding Rate</div>
          <div className="admin-stat-value">{boardingPercent}%</div>
          <div className="admin-stat-sub">Overall departure readiness</div>
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <div
        className="admin-card"
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        {/* Left: Filter tabs */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { key: "All", label: `All (${totalCount})` },
            { key: "Boarded", label: `Boarded (${boardedCount})` },
            { key: "Pending", label: `Pending (${pendingCount})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key as any)}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: filter === tab.key ? "#0d2b17" : "#f1f5f9",
                color: filter === tab.key ? "#ffffff" : "#475569",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right: Pickup Location dropdown & Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1, justifyContent: "flex-end" }}>
          {pickupLocations.length > 1 && (
            <select
              value={selectedPickup}
              onChange={(e) => setSelectedPickup(e.target.value)}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                color: "#1e293b",
                background: "#ffffff",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="All">All Pickup Points ({pickupLocations.length})</option>
              {pickupLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          )}

          <div
            style={{
              position: "relative",
              minWidth: "240px",
            }}
          >
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <input
              type="text"
              placeholder="Search traveller name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 12px 7px 32px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                color: "#1e293b",
                outline: "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* Attendance Manifest Data Table */}
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
              Loading Travellers...
            </div>
          </div>
        ) : filteredTravellers.length === 0 ? (
          <div style={{ padding: "50px 20px", textAlign: "center" }}>
            <Users size={36} color="#94a3b8" style={{ margin: "0 auto 12px auto" }} />
            <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b", marginBottom: "4px" }}>
              No Passengers Found
            </h4>
            <p style={{ fontSize: "13px", color: "#64748b" }}>
              No travellers match your current search or pickup filter.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {filteredTravellers.map((t, idx) => {
              const isToggling = togglingKey === t.travellerKey;

              return (
                <div
                  key={t.travellerKey}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 20px",
                    borderBottom: idx === filteredTravellers.length - 1 ? "none" : "1px solid #f1f5f9",
                    background: t.isBoarded ? "#f0fdf4" : "#ffffff",
                    transition: "background 0.15s ease",
                  }}
                >
                  {/* Left End: Checkbox */}
                  <div
                    onClick={() => handleToggleAttendance(t)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      cursor: "pointer",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <button
                      type="button"
                      disabled={isToggling}
                      style={{
                        width: "26px",
                        height: "26px",
                        borderRadius: "6px",
                        border: t.isBoarded ? "2px solid #164e23" : "2px solid #cbd5e1",
                        background: t.isBoarded ? "#164e23" : "#ffffff",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                        padding: 0,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {t.isBoarded ? (
                        <Check size={16} strokeWidth={3} />
                      ) : (
                        <span style={{ display: "none" }} />
                      )}
                    </button>

                    {/* Middle: Name & Pickup */}
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 700,
                          color: t.isBoarded ? "#166534" : "#0f172a",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {t.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <MapPin size={11} color="#0284c7" />
                        <span>{t.pickupLocation}</span>
                        <span>•</span>
                        <span>ref: {t.bookingId?.slice(-6) || "TRV"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right End: Call Button */}
                  <div style={{ flexShrink: 0, marginLeft: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    {t.phone ? (
                      <a
                        href={`tel:${t.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        title={`Call ${t.name}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: "#e8f5e9",
                          color: "#164e23",
                          border: "1px solid #c8e6c9",
                          textDecoration: "none",
                        }}
                      >
                        <Phone size={16} />
                      </a>
                    ) : (
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: "#f1f5f9",
                          color: "#94a3b8",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title="No phone number"
                      >
                        <Phone size={14} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CaptainAttendance;
