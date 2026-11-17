import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  UserCheck,
  Users,
  Receipt,
  FolderOpen,
  MessageCircle,
  ChevronRight,
  FileText,
  Phone,
  CheckSquare,
  Square,
  CheckCircle2,
  ExternalLink,
  MapPin,
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

export const CaptainTripDetails: React.FC = () => {
  const { slotId } = useParams<{ slotId: string }>();
  const navigate = useNavigate();
  const { token, captain } = useCaptainAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [travellers, setTravellers] = useState<IndividualTraveller[]>([]);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Group travellers strictly by pickup location - called at top level unconditionally
  const groupedPickups = useMemo(() => {
    if (!Array.isArray(travellers)) return [];
    const map = new Map<string, IndividualTraveller[]>();
    travellers.forEach((t) => {
      if (!t) return;
      const loc = (typeof t.pickupLocation === "string" && t.pickupLocation.trim())
        ? t.pickupLocation.trim()
        : "Main Pickup Point";
      if (!map.has(loc)) {
        map.set(loc, []);
      }
      map.get(loc)!.push(t);
    });

    return Array.from(map.entries()).map(([pickup, list]) => ({
      pickup,
      travellers: list || [],
      boarded: (list || []).filter((t) => Boolean(t?.isBoarded)).length,
      total: (list || []).length,
    }));
  }, [travellers]);

  useEffect(() => {
    if (slotId) {
      fetchDetails();
    }
  }, [slotId, token]);

  const fetchDetails = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const curToken = token || localStorage.getItem("captainToken");
      const res = await fetch(`${API_BASE_URL}/captain/trips/${slotId}`, {
        headers: curToken ? { Authorization: `Bearer ${curToken}` } : {},
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setData(result);
        buildTravellerList(result.bookings || [], result.attendanceRecords || [], result.pickups || []);
      } else {
        setErrorMessage(result.message || "Failed to load expedition details");
      }
    } catch (err: any) {
      console.error("Failed to load trip details:", err);
      setErrorMessage(err?.message || "Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  const formatSafeDate = (dStr?: any) => {
    if (!dStr) return "Upcoming";
    if (typeof dStr !== "string") return String(dStr);
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    try {
      return d.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dStr;
    }
  };

  const buildTravellerList = (bookings: any[] = [], attendanceRecords: any[] = [], pickupsList: any[] = []) => {
    try {
      const attendanceMap = new Map<string, string>();
      if (Array.isArray(attendanceRecords)) {
        attendanceRecords.forEach((a) => {
          if (!a) return;
          const bId = a.bookingId || a.booking || "";
          const tIdx = Number(a.travellerIndex) || 0;
          const key = `${bId}_${tIdx}`;
          attendanceMap.set(key, a.status);
        });
      }

      const pickupLookup = new Map<string, string>();
      if (Array.isArray(pickupsList)) {
        pickupsList.forEach((p) => {
          if (!p) return;
          if (p._id) pickupLookup.set(String(p._id), p.name);
          if (p.name) pickupLookup.set(String(p.name), String(p.name));
        });
      }

      const list: IndividualTraveller[] = [];

      if (Array.isArray(bookings)) {
        bookings.forEach((b) => {
          if (!b) return;
          const count = Math.max(1, Number(b.travellers) || 1);

          let pickup = "Main Pickup Point";
          if (typeof b.pickupLocation === "string" && b.pickupLocation.trim()) {
            pickup = b.pickupLocation.trim();
          } else if (b.pickupLocation && typeof b.pickupLocation === "object" && typeof b.pickupLocation.name === "string" && b.pickupLocation.name.trim()) {
            pickup = b.pickupLocation.name.trim();
          } else if (b.pickupLocationId && pickupLookup.has(String(b.pickupLocationId))) {
            pickup = pickupLookup.get(String(b.pickupLocationId))!;
          } else if (b.pickupDetails && typeof b.pickupDetails.name === "string" && b.pickupDetails.name.trim()) {
            pickup = b.pickupDetails.name.trim();
          }

          const leadName = (typeof b.customerName === "string" && b.customerName.trim())
            ? b.customerName.trim()
            : (typeof b.name === "string" && b.name.trim())
            ? b.name.trim()
            : "Traveller";

          const leadPhone = (typeof b.customerPhone === "string" && b.customerPhone.trim())
            ? b.customerPhone.trim()
            : (typeof b.phone === "string" && b.phone.trim())
            ? b.phone.trim()
            : "";

          const bookingIdStr = b._id ? String(b._id) : (b.bookingCode ? String(b.bookingCode) : "TRV");

          for (let i = 0; i < count; i++) {
            const key = `${bookingIdStr}_${i}`;

            let travellerName = "";
            if (
              b.travellerDetails &&
              Array.isArray(b.travellerDetails) &&
              b.travellerDetails[i] &&
              typeof b.travellerDetails[i].name === "string" &&
              b.travellerDetails[i].name.trim()
            ) {
              travellerName = b.travellerDetails[i].name.trim();
            } else if (i === 0) {
              travellerName = leadName;
            } else {
              travellerName = `${leadName} (Guest ${i + 1})`;
            }

            let travellerPhone = "";
            if (
              b.travellerDetails &&
              Array.isArray(b.travellerDetails) &&
              b.travellerDetails[i] &&
              typeof b.travellerDetails[i].phone === "string" &&
              b.travellerDetails[i].phone.trim()
            ) {
              travellerPhone = b.travellerDetails[i].phone.trim();
            } else {
              travellerPhone = leadPhone;
            }

            const status = attendanceMap.get(key) || "Pending";
            const isBoarded = status === "Present" || status === "Boarded";

            list.push({
              travellerKey: key,
              bookingId: bookingIdStr,
              travellerIndex: i,
              name: travellerName,
              phone: travellerPhone,
              pickupLocation: pickup,
              isBoarded,
            });
          }
        });
      }

      setTravellers(list);
    } catch (parseErr) {
      console.error("Error building traveller list:", parseErr);
    }
  };

  const handleToggleAttendance = async (t: IndividualTraveller) => {
    const nextStatus = t.isBoarded ? "Pending" : "Present";
    setTogglingKey(t.travellerKey);

    // Optimistically update local state immediately
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenLink = (linkUrl?: string, label?: string) => {
    if (linkUrl && linkUrl.trim()) {
      let finalUrl = linkUrl.trim();
      if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
        finalUrl = `https://${finalUrl}`;
      }
      window.open(finalUrl, "_blank", "noopener,noreferrer");
    } else {
      showToast(`${label || "Link"} will be configured by Operations.`);
    }
  };

  if (loading) {
    return (
      <div
        className="admin-card"
        style={{
          padding: "80px 20px",
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
          Loading Expedition Details...
        </div>
      </div>
    );
  }

  const slot = data?.slot;
  if (!slot) {
    return (
      <div
        className="admin-card"
        style={{
          padding: "50px 20px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "14px",
          maxWidth: "440px",
          margin: "40px auto",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: "#fee2e2",
            color: "#dc2626",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            fontWeight: 800,
          }}
        >
          !
        </div>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: "0 0 6px 0" }}>
            {errorMessage ? "Failed to Load Expedition" : "Expedition Not Found"}
          </h3>
          <p style={{ color: "#64748b", fontSize: "13px", margin: 0, lineHeight: 1.5 }}>
            {errorMessage || "The expedition departure could not be loaded from the server."}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
          <button
            type="button"
            onClick={() => fetchDetails()}
            style={{
              padding: "9px 18px",
              background: "#164e23",
              color: "#ffffff",
              borderRadius: "8px",
              border: "none",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Retry Loading
          </button>
          <button
            type="button"
            onClick={() => navigate("/captain/trips")}
            style={{
              padding: "9px 18px",
              background: "#f1f5f9",
              color: "#334155",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            All Expeditions
          </button>
        </div>
      </div>
    );
  }

  const trip = slot?.trip || {};
  const stats = data?.stats || {
    attendance: { boarded: 0, total: 0 },
    userCheck: { checked: 0, total: 0 },
    expenses: { count: 0, total: 0 },
  };

  const tripTitle = trip.title || slot?.customTitle || "Expedition Departure";
  const tripImage =
    trip.image ||
    "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1200&auto=format&fit=crop&q=80";

  const dateLabel = formatSafeDate(slot?.startDate);
  const durationLabel = trip.duration || "2 Days / 1 Night";
  const role =
    slot?.assignedCaptains?.find((c: any) => String(c?.captain?._id || c?.captain) === String(captain?.id))
      ?.role || "Head Captain";

  const boardedCount = Array.isArray(travellers) ? travellers.filter((t) => t && t.isBoarded).length : 0;
  const totalCount = Array.isArray(travellers) ? travellers.length : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            background: "#0d2b17",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "10px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "13px",
            fontWeight: 600,
            border: "1px solid rgba(217, 238, 199, 0.3)",
          }}
        >
          <CheckCircle2 size={16} color="#d9eec7" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Back button and page title */}
      <div>
        <button
          type="button"
          onClick={() => navigate("/captain/trips")}
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
            marginBottom: "8px",
            padding: 0,
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to All Expeditions</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                {tripTitle}
              </h1>
              <span
                style={{
                  background: "#d9eec7",
                  color: "#0d2b17",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  textTransform: "uppercase",
                }}
              >
                {role}
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0 0" }}>
              {dateLabel} • {durationLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Top Banner Thumbnail Image */}
      <div
        className="admin-card"
        style={{
          padding: 0,
          overflow: "hidden",
          position: "relative",
          height: "140px",
          borderRadius: "14px",
        }}
      >
        <img
          src={tripImage}
          alt={tripTitle}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(13, 43, 23, 0.85) 0%, rgba(0,0,0,0.3) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "14px",
            left: "16px",
            right: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "12px", fontWeight: 600 }}>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Calendar size={14} color="#d9eec7" />
              {dateLabel}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Clock size={14} color="#d9eec7" />
              {durationLabel}
            </span>
          </div>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#d9eec7" }}>
            {boardedCount} / {totalCount} Boarded
          </span>
        </div>
      </div>

      {/* 1. ATTENDANCE (with checkbox at left end and call button on right end) */}
      <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "16px 20px",
            background: "#ffffff",
            borderBottom: "1px solid #e7ecf0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#e8f5e9",
                color: "#164e23",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UserCheck size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: "15px", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                Attendance
              </h3>
              <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>
                Tap checkbox to board • Tap phone to call
              </p>
            </div>
          </div>

          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#164e23",
              background: "#dcfce7",
              padding: "4px 10px",
              borderRadius: "999px",
            }}
          >
            {boardedCount} / {totalCount} Boarded
          </span>
        </div>

        {/* Pickup Points & Customer Lists Grouped According to Pickup Point */}
        {travellers.length === 0 ? (
          <div style={{ padding: "30px 20px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
            No travellers booked for this slot.
          </div>
        ) : (
          <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "14px", background: "#f8fafc" }}>
            {groupedPickups.map((group, gIdx) => (
              <div
                key={group.pickup || gIdx}
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                {/* 📍 Prominent Pickup Point Header */}
                <div
                  style={{
                    padding: "10px 14px",
                    background: "linear-gradient(135deg, #092312 0%, #0d381c 50%, #164e27 100%)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        background: "#d9eec7",
                        color: "#0d2b17",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <MapPin size={12} strokeWidth={2.5} />
                    </div>
                    <span style={{ fontSize: "13px", fontWeight: 800, color: "#ffffff", letterSpacing: "0.2px" }}>
                      {group.pickup}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: group.boarded === group.total && group.total > 0 ? "#166534" : "#0d2b17",
                      background: "#d9eec7",
                      padding: "2px 8px",
                      borderRadius: "999px",
                    }}
                  >
                    {group.boarded} / {group.total} Boarded
                  </span>
                </div>

                {/* Customers Under This Pickup Point */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {group.travellers.map((traveller, tIdx) => {
                    const isToggling = togglingKey === traveller.travellerKey;

                    return (
                      <div
                        key={traveller.travellerKey || tIdx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 14px",
                          borderBottom:
                            tIdx === group.travellers.length - 1 ? "none" : "1px solid #f1f5f9",
                          background: traveller.isBoarded ? "#f0fdf4" : "#ffffff",
                          transition: "background 0.15s ease",
                        }}
                      >
                        {/* Left End: Checkbox */}
                        <div
                          onClick={() => handleToggleAttendance(traveller)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            cursor: "pointer",
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <button
                            type="button"
                            disabled={isToggling}
                            style={{
                              width: "22px",
                              height: "22px",
                              borderRadius: "6px",
                              border: traveller.isBoarded ? "2px solid #164e23" : "2px solid #94a3b8",
                              background: traveller.isBoarded ? "#164e23" : "#ffffff",
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
                            {traveller.isBoarded ? (
                              <CheckSquare size={14} strokeWidth={3} />
                            ) : (
                              <Square size={14} color="transparent" />
                            )}
                          </button>

                          {/* Middle: Name & Booking Ref */}
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: "13px",
                                fontWeight: 700,
                                color: traveller.isBoarded ? "#166534" : "#0f172a",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {traveller.name || "Traveller"}
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px" }}>
                              Booking ref: {String(traveller.bookingId || "TRV").slice(-6)}
                            </div>
                          </div>
                        </div>

                        {/* Right End: Call Button */}
                        <div style={{ flexShrink: 0, marginLeft: "10px" }}>
                          {traveller.phone ? (
                            <a
                              href={`tel:${traveller.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              title={`Call ${traveller.name}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                background: "#e8f5e9",
                                color: "#164e23",
                                border: "1px solid #c8e6c9",
                                textDecoration: "none",
                              }}
                            >
                              <Phone size={14} />
                            </a>
                          ) : (
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                background: "#f1f5f9",
                                color: "#94a3b8",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              title="No phone number provided"
                            >
                              <Phone size={13} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. USER CHECK */}
      <div
        className="admin-card"
        onClick={() => navigate(`/captain/trips/${slotId}/user-check`)}
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          borderRadius: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "#e0f2fe",
              color: "#0369a1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>User Check</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>
              Sightseeing headcount &amp; passenger verification
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: "999px",
              background: "#f1f5f9",
              color: "#334155",
            }}
          >
            {stats.userCheck?.checked || 0} / {stats.userCheck?.total || totalCount}
          </span>
          <ChevronRight size={18} color="#94a3b8" />
        </div>
      </div>

      {/* 3. DRIVE LINK */}
      <div
        className="admin-card"
        onClick={() => handleOpenLink(slot?.photoDriveLink, "Photo Drive Folder")}
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          borderRadius: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "#fffbeb",
              color: "#b45309",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <FolderOpen size={20} />
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>Drive Link</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>
              Google Drive photos &amp; trip media folder
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#b45309" }}>
          <span>Open Drive</span>
          <ExternalLink size={15} />
        </div>
      </div>

      {/* 4. WHATSAPP LINK */}
      <div
        className="admin-card"
        onClick={() => handleOpenLink(slot?.whatsappGroupLink, "WhatsApp Group")}
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          borderRadius: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "#dcfce7",
              color: "#16a34a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <MessageCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>WhatsApp Link</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>
              Expedition community group chat
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#16a34a" }}>
          <span>Join Chat</span>
          <ExternalLink size={15} />
        </div>
      </div>

      {/* 5. TRIP EXPENSE */}
      <div
        className="admin-card"
        onClick={() => navigate(`/captain/trips/${slotId}/expenses`)}
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          borderRadius: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "#fef3c7",
              color: "#b45309",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Receipt size={20} />
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>Trip Expense</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>
              Log &amp; review fuel, toll, stay &amp; food claims
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: "999px",
              background: "#ecfdf5",
              color: "#065f46",
            }}
          >
            ₹ {Number(stats.expenses?.total || 0).toLocaleString("en-IN")}
          </span>
          <ChevronRight size={18} color="#94a3b8" />
        </div>
      </div>

      {/* 6. BILL LINK */}
      <div
        className="admin-card"
        onClick={() => handleOpenLink(slot?.billDriveLink, "Bills & Invoices Drive Folder")}
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          borderRadius: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "#f3e8ff",
              color: "#7e22ce",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <FileText size={20} />
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>Bill Link</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>
              Trip invoices &amp; hotel receipts folder
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#7e22ce" }}>
          <span>View Bills</span>
          <ExternalLink size={15} />
        </div>
      </div>
    </div>
  );
};

export default CaptainTripDetails;
