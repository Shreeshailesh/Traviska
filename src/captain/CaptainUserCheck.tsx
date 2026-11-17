import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RotateCcw,
  Check,
  Phone,
  Search,
  Users,
  CheckCircle2,
  Clock,
  RefreshCw,
  X,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { API_BASE_URL } from "../api";
import { useCaptainAuth } from "./CaptainAuthContext";

interface SightseeingTraveller {
  travellerKey: string;
  bookingId: string;
  travellerIndex: number;
  name: string;
  phone?: string;
  pickupLocation: string;
}

export const CaptainUserCheck: React.FC = () => {
  const { slotId } = useParams<{ slotId: string }>();
  const navigate = useNavigate();
  const { token } = useCaptainAuth();

  const [loading, setLoading] = useState(true);
  const [tripData, setTripData] = useState<any>(null);
  const [travellers, setTravellers] = useState<SightseeingTraveller[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  useEffect(() => {
    if (slotId) {
      loadData();
    }
  }, [slotId, token]);

  const loadData = async () => {
    setLoading(true);
    try {
      const curToken = token || localStorage.getItem("captainToken");
      const headers: Record<string, string> = curToken ? { Authorization: `Bearer ${curToken}` } : {};

      const resTrip = await fetch(`${API_BASE_URL}/captain/trips/${slotId}`, { headers });
      const dataTrip = await resTrip.json();
      if (dataTrip.success) {
        setTripData(dataTrip);
        buildTravellers(dataTrip.bookings || []);
      }

      const resCheck = await fetch(`${API_BASE_URL}/captain/trips/${slotId}/user-check`, { headers });
      const dataCheck = await resCheck.json();
      if (dataCheck.success) {
        setCheckedKeys(new Set(dataCheck.checkedTravellers || []));
      }
    } catch (err) {
      console.error("User check load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const buildTravellers = (bookings: any[]) => {
    const list: SightseeingTraveller[] = [];

    bookings.forEach((b) => {
      const count = b.travellers || 1;
      const pickup = b.pickupLocation || b.pickupDetails?.name || "Main Pickup";
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

        list.push({
          travellerKey: key,
          bookingId: b._id,
          travellerIndex: i,
          name: travellerName,
          phone: travellerPhone,
          pickupLocation: pickup,
        });
      }
    });

    setTravellers(list);
  };

  const handleToggle = async (t: SightseeingTraveller) => {
    const isCurrentlyChecked = checkedKeys.has(t.travellerKey);
    setTogglingKey(t.travellerKey);

    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (isCurrentlyChecked) {
        next.delete(t.travellerKey);
      } else {
        next.add(t.travellerKey);
      }
      return next;
    });

    try {
      const curToken = token || localStorage.getItem("captainToken");
      const res = await fetch(`${API_BASE_URL}/captain/trips/${slotId}/user-check/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(curToken ? { Authorization: `Bearer ${curToken}` } : {}),
        },
        body: JSON.stringify({ travellerKey: t.travellerKey, travellerId: t.travellerKey }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.checkedTravellers)) {
        setCheckedKeys(new Set(data.checkedTravellers));
      }
    } catch (err) {
      console.error("Toggle error:", err);
      setCheckedKeys((prev) => {
        const next = new Set(prev);
        if (isCurrentlyChecked) {
          next.add(t.travellerKey);
        } else {
          next.delete(t.travellerKey);
        }
        return next;
      });
    } finally {
      setTogglingKey(null);
    }
  };

  const handleResetChecklist = async () => {
    setResetting(true);
    try {
      const curToken = token || localStorage.getItem("captainToken");
      const res = await fetch(`${API_BASE_URL}/captain/trips/${slotId}/user-check/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(curToken ? { Authorization: `Bearer ${curToken}` } : {}),
        },
      });

      const data = await res.json();
      if (data.success) {
        setCheckedKeys(new Set());
        setShowResetModal(false);
      }
    } catch (err) {
      console.error("Reset error:", err);
    } finally {
      setResetting(false);
    }
  };

  const totalCount = travellers.length;
  const checkedCount = travellers.filter((t) => checkedKeys.has(t.travellerKey)).length;
  const uncheckedCount = totalCount - checkedCount;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const filteredTravellers = useMemo(() => {
    if (!search.trim()) return travellers;
    const q = search.toLowerCase();
    return travellers.filter((t) => {
      const matchName = t.name.toLowerCase().includes(q);
      const matchPhone = (t.phone || "").includes(q);
      const matchPickup = t.pickupLocation.toLowerCase().includes(q);
      return matchName || matchPhone || matchPickup;
    });
  }, [travellers, search]);

  const trip = tripData?.slot?.trip || {};
  const tripTitle = trip.title || tripData?.slot?.customTitle || "Expedition Headcount";

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
              <h1 className="admin-page-title">Mid-Trip Headcount &amp; Sightseeing Checklist</h1>
              <span
                style={{
                  background: checkedCount === totalCount && totalCount > 0 ? "#dcfce7" : "#e8f5e9",
                  color: checkedCount === totalCount && totalCount > 0 ? "#166534" : "#164e23",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: "999px",
                }}
              >
                {checkedCount} / {totalCount} Accounted For
              </span>
            </div>
            <p className="admin-page-subtitle">
              {tripTitle} • Re-verify traveller count after stops, meal breaks, trek points and sightseeing locations.
            </p>
          </div>

          <div className="admin-page-actions">
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => setShowResetModal(true)}
              disabled={checkedCount === 0 || loading}
            >
              <RotateCcw size={15} />
              <span>Reset for Next Stop</span>
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
              Capacity
            </span>
          </div>
          <div className="admin-stat-label">Total Travellers</div>
          <div className="admin-stat-value">{totalCount}</div>
          <div className="admin-stat-sub">Full expedition group count</div>
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
              Present
            </span>
          </div>
          <div className="admin-stat-label">Verified Present</div>
          <div className="admin-stat-value">{checkedCount}</div>
          <div className="admin-stat-sub">Travellers checked at this stop</div>
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
              Pending
            </span>
          </div>
          <div className="admin-stat-label">Awaiting Verification</div>
          <div className="admin-stat-value">{uncheckedCount}</div>
          <div className="admin-stat-sub">Travellers to confirm before moving</div>
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
              Readiness
            </span>
          </div>
          <div className="admin-stat-label">Checklist Completion</div>
          <div className="admin-stat-value">{progressPercent}%</div>
          <div className="admin-stat-sub">Safe to depart when 100%</div>
        </div>
      </div>

      {/* Search Bar */}
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
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
          Traveller Headcount Register
        </div>

        <div style={{ position: "relative", minWidth: "260px" }}>
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
            placeholder="Search passenger name or phone..."
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

      {/* Manifest Table */}
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
              Loading Sightseeing Checklist...
            </div>
          </div>
        ) : filteredTravellers.length === 0 ? (
          <div style={{ padding: "50px 20px", textAlign: "center" }}>
            <Users size={36} color="#94a3b8" style={{ margin: "0 auto 12px auto" }} />
            <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b", marginBottom: "4px" }}>
              No Passengers Found
            </h4>
            <p style={{ fontSize: "13px", color: "#64748b" }}>No travellers match your search.</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>#</th>
                  <th>Traveller / Guest</th>
                  <th>Contact Phone</th>
                  <th>Boarding Point</th>
                  <th>Headcount Verification</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTravellers.map((t, idx) => {
                  const isChecked = checkedKeys.has(t.travellerKey);
                  const isToggling = togglingKey === t.travellerKey;

                  return (
                    <tr
                      key={t.travellerKey}
                      style={{
                        background: isChecked ? "rgba(220, 252, 231, 0.2)" : "transparent",
                      }}
                    >
                      <td style={{ color: "#64748b", fontWeight: 600, fontSize: "12px" }}>
                        {idx + 1}
                      </td>

                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "34px",
                              height: "34px",
                              borderRadius: "50%",
                              background: isChecked ? "#dcfce7" : "#f1f5f9",
                              color: isChecked ? "#166534" : "#475569",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "13px",
                              flexShrink: 0,
                            }}
                          >
                            {isChecked ? <Check size={16} strokeWidth={3} /> : t.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13px" }}>
                              {t.name}
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                              Booking ID: {t.bookingId?.slice(-6) || "TRV-001"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        {t.phone ? (
                          <a
                            href={`tel:${t.phone}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              color: "#164e23",
                              fontWeight: 600,
                              textDecoration: "none",
                              fontSize: "13px",
                            }}
                          >
                            <Phone size={13} />
                            <span>{t.phone}</span>
                          </a>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "12px" }}>Not provided</span>
                        )}
                      </td>

                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#334155" }}>
                          <MapPin size={14} color="#0284c7" />
                          <span>{t.pickupLocation}</span>
                        </div>
                      </td>

                      <td>
                        {isChecked ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              background: "#dcfce7",
                              color: "#166534",
                              padding: "3px 9px",
                              borderRadius: "999px",
                              fontSize: "11px",
                              fontWeight: 700,
                            }}
                          >
                            <Check size={12} strokeWidth={3} />
                            Verified Present
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              background: "#fef3c7",
                              color: "#b45309",
                              padding: "3px 9px",
                              borderRadius: "999px",
                              fontSize: "11px",
                              fontWeight: 700,
                            }}
                          >
                            <Clock size={12} />
                            Unchecked
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => handleToggle(t)}
                          disabled={isToggling}
                          className={`admin-btn ${isChecked ? "admin-btn-secondary" : "admin-btn-primary"}`}
                          style={{
                            padding: "6px 12px",
                            fontSize: "12px",
                            minWidth: "100px",
                            justifyContent: "center",
                          }}
                        >
                          {isToggling ? (
                            <RefreshCw size={13} className="spinIconAnim" />
                          ) : isChecked ? (
                            <>
                              <Check size={13} strokeWidth={2.5} />
                              <span>Present</span>
                            </>
                          ) : (
                            <>
                              <span>Verify</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Signature Dark Forest Green Mountain Reset Modal */}
      {showResetModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              background: "#ffffff",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            {/* Dark Forest Mountain Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #092312 0%, #0d381c 50%, #164e27 100%)",
                padding: "20px 24px",
                position: "relative",
                color: "#ffffff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "rgba(217, 238, 199, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#d9eec7",
                    }}
                  >
                    <RotateCcw size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#ffffff" }}>
                      Reset Sightseeing Headcount
                    </h3>
                    <p style={{ fontSize: "12px", color: "#d9eec7", margin: 0, opacity: 0.9 }}>
                      Clear marks for next sightseeing stop
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.7)",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px" }}>
              <p style={{ fontSize: "14px", color: "#334155", lineHeight: 1.5, margin: "0 0 20px 0" }}>
                Are you sure you want to reset all <strong>{checkedCount} verified passenger marks</strong>? This will clear the headcount for the next sightseeing location or rest break.
              </p>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setShowResetModal(false)}
                  disabled={resetting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={handleResetChecklist}
                  disabled={resetting}
                  style={{ background: "#dc2626", borderColor: "#dc2626" }}
                >
                  {resetting ? "Resetting..." : "Confirm & Reset"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaptainUserCheck;
