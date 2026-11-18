import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Plus,
  Star,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Award,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { API_BASE_URL } from "../../../api";
import { StatusBadge } from "../../ui/StatusBadge";
import { CaptainFormModal, type CaptainFormData } from "../../components/CaptainFormModal";

interface Captain {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  status: "Active" | "Inactive" | "Unavailable" | "On Trip";
  role?: "Head Captain" | "Main Captain" | "Trainee Captain" | string;
  rating: number;
  totalTrips: number;
  completedTrips: number;
  upcomingTrips?: number;
  specialities?: string[];
  specialties?: string[];
  avatar?: string;
}

const getCaptainRoleBadge = (role: string | undefined) => {
  const r = (role || "Main Captain").toLowerCase();
  if (r.includes("head") || r.includes("lead")) {
    return {
      label: "Head Captain",
      bg: "#dcfce7",
      color: "#166534",
      border: "1px solid #bbf7d0",
      rank: 1,
    };
  }
  if (r.includes("main") || r.includes("assistant")) {
    return {
      label: "Main Captain",
      bg: "#dbeafe",
      color: "#1e40af",
      border: "1px solid #bfdbfe",
      rank: 2,
    };
  }
  return {
    label: "Trainee Captain",
    bg: "#f1f5f9",
    color: "#334155",
    border: "1px solid #e2e8f0",
    rank: 3,
  };
};

export const TripCaptains: React.FC = () => {
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCaptain, setEditingCaptain] = useState<CaptainFormData | null>(null);

  const fetchCaptains = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/admin/operations/captains`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.captains)) {
        setCaptains(data.captains);
      } else {
        setError(data.message || "Failed to load captains list");
      }
    } catch (err: any) {
      console.error("Fetch captains error:", err);
      setError("Network error while connecting to server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptains();
  }, []);

  const handleOpenAdd = () => {
    setEditingCaptain(null);
    setShowModal(true);
  };

  const handleOpenEdit = (captain: Captain) => {
    setEditingCaptain({
      _id: captain._id,
      name: captain.name,
      phone: captain.phone,
      email: captain.email,
      role: captain.role || "Head Captain",
      status: captain.status || "Active",
      rating: captain.rating,
      specialities: captain.specialities || captain.specialties,
    });
    setShowModal(true);
  };

  const handleDeleteCaptain = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name}?`)) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/admin/operations/captains/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || "Failed to delete captain.");
        return;
      }
      setCaptains((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      console.error("Delete captain error:", err);
      alert("Network error while deleting captain.");
    }
  };

  const handleModalSuccess = () => {
    fetchCaptains();
  };

  const filteredCaptains = captains
    .filter((c) => {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => getCaptainRoleBadge(a.role).rank - getCaptainRoleBadge(b.role).rank);

  return (
    <div style={{ width: "100%" }}>
      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-page-title-box">
          <h1>Trip Captains</h1>
          <p>Add, manage, and view trip leaders, guide credentials and ratings.</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button onClick={handleOpenAdd} className="admin-btn admin-btn-primary">
            <Plus size={16} />
            <span>Add Captain</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e7ecf0",
          borderRadius: "12px",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
          <Search
            size={16}
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
          />
          <input
            type="text"
            placeholder="Search captain by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 36px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "13px",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "13px", color: "#64748b" }}>
          <span>
            Total Captains: <strong style={{ color: "#0f172a" }}>{captains.length}</strong>
          </span>
          <span>
            Active:{" "}
            <strong style={{ color: "#166534" }}>
              {captains.filter((c) => c.status === "Active").length}
            </strong>
          </span>
        </div>
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 16px",
            background: "#fef2f2",
            border: "1px solid #fee2e2",
            borderRadius: "10px",
            color: "#991b1b",
            fontSize: "13.5px",
            marginBottom: "16px",
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Captains Table */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e7ecf0",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          width: "100%",
        }}
      >
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: "260px" }}>Captain</th>
                <th style={{ width: "160px" }}>Role & Hierarchy</th>
                <th>Phone & Email</th>
                <th style={{ textAlign: "center", width: "140px" }}>Trips Completed</th>
                <th style={{ textAlign: "center", width: "130px" }}>Rating</th>
                <th style={{ textAlign: "center", width: "110px" }}>Status</th>
                <th style={{ textAlign: "right", width: "100px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "48px 20px" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", color: "#166534", fontWeight: 600 }}>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Loading Trip Captains...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCaptains.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "48px 20px", color: "#64748b" }}>
                    No trip captains found. Click "Add Captain" above to register a captain.
                  </td>
                </tr>
              ) : (
                filteredCaptains.map((captain) => {
                  const roleInfo = getCaptainRoleBadge(captain.role);
                  const specs = captain.specialities || captain.specialties || [];
                  const ratingVal = Number(captain.rating) || 0;

                  return (
                    <tr key={captain._id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "50%",
                              background: "#0d2b17",
                              color: "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "13.5px",
                              flexShrink: 0,
                            }}
                          >
                            {captain.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            {/* Requirement 1: Clickable Captain Name navigating via unique MongoDB ID */}
                            <Link
                              to={`/admin/operations/history?captainId=${captain._id}`}
                              style={{
                                fontWeight: 700,
                                color: "#0f172a",
                                textDecoration: "none",
                                fontSize: "14px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                transition: "color 0.15s ease",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "#166534")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "#0f172a")}
                              title="Click to view full Captain Profile and Trip History"
                            >
                              <span>{captain.name}</span>
                            </Link>
                            {specs.length > 0 && (
                              <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
                                {specs.slice(0, 2).map((s, idx) => (
                                  <span
                                    key={idx}
                                    style={{
                                      fontSize: "10.5px",
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                      background: "#f1f5f9",
                                      color: "#475569",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {s}
                                  </span>
                                ))}
                                {specs.length > 2 && (
                                  <span style={{ fontSize: "10px", color: "#94a3b8", alignSelf: "center" }}>
                                    +{specs.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            padding: "3px 9px",
                            borderRadius: "6px",
                            background: roleInfo.bg,
                            color: roleInfo.color,
                            border: roleInfo.border,
                          }}
                        >
                          {roleInfo.rank === 1 && "👑 "}
                          {roleInfo.rank === 2 && "⭐ "}
                          {roleInfo.rank === 3 && "🌱 "}
                          {roleInfo.label}
                        </span>
                      </td>

                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "12.5px",
                            color: "#0f172a",
                            fontWeight: 500,
                          }}
                        >
                          <Phone size={13} color="#94a3b8" />
                          <span>{captain.phone}</span>
                        </div>
                        {captain.email && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "11.5px",
                              color: "#64748b",
                              marginTop: "2px",
                            }}
                          >
                            <Mail size={13} color="#94a3b8" />
                            <span>{captain.email}</span>
                          </div>
                        )}
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
                          <Award size={15} color="#15803d" />
                          <span>{captain.completedTrips ?? 0}</span>
                        </span>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        {ratingVal > 0 ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "12px",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: "12px",
                              background: "#fffbeb",
                              color: "#b45309",
                              border: "1px solid #fef3c7",
                            }}
                          >
                            <Star size={13} color="#f59e0b" fill="#f59e0b" />
                            <span>{ratingVal.toFixed(1)}</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: "11.5px", color: "#94a3b8", fontWeight: 500 }}>
                            Not rated yet
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <StatusBadge status={captain.status === "Active" ? "confirmed" : "pending"} />
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <button
                            onClick={() => handleOpenEdit(captain)}
                            style={{
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              padding: "6px",
                              color: "#64748b",
                              borderRadius: "6px",
                              transition: "color 0.15s ease",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#0f172a")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
                            title="Edit Captain"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteCaptain(captain._id, captain.name)}
                            style={{
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              padding: "6px",
                              color: "#ef4444",
                              borderRadius: "6px",
                              transition: "opacity 0.15s ease",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                            title="Remove Captain"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Redesigned Add / Edit Captain Modal strictly matching reference image */}
      <CaptainFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        captain={editingCaptain}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default TripCaptains;
