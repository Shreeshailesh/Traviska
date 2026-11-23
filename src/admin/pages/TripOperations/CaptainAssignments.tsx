import React, { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  Users,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Compass,
  Award,
  Crown,
  MapPin,
  Phone,
  AlertCircle,
  Clock,
  Search,
} from "lucide-react";
import { API_BASE_URL } from "../../../api";
import { Modal } from "../../ui/Modal";

interface Assignment {
  _id: string;
  slotId?: string;
  captainId?: string;
  tripTitle: string;
  destination: string;
  dates: string;
  captainName: string;
  captainPhone: string;
  role: "Head Captain" | "Main Captain" | "Trainee Captain";
  travellers: number;
  capacity: number;
  captainFee: number;
  advancePaid: number;
  notes?: string;
  status: "Assigned" | "On Trip" | "Completed" | "Cancelled";
}

interface SlotItem {
  _id: string;
  tripTitle: string;
  destination: string;
  dates: string;
  duration?: string;
  bookedSlots: number;
  totalSlots: number;
  image?: string;
}

interface CaptainItem {
  _id: string;
  name: string;
  phone: string;
  role: "Head Captain" | "Main Captain" | "Trainee Captain";
  rating: number;
  tripsCount: number;
  defaultFee: number;
  avatar?: string;
}


const getRoleBadge = (role: string) => {
  const r = (role || "Head Captain").toLowerCase();
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

export const CaptainAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [availableSlots, setAvailableSlots] = useState<SlotItem[]>([]);
  const [availableCaptains, setAvailableCaptains] = useState<CaptainItem[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tripFilter, setTripFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [form, setForm] = useState({
    slotId: "",
    tripTitle: "",
    destination: "",
    dates: "",
    captainId: "",
    captainName: "",
    captainPhone: "",
    role: "Head Captain" as "Head Captain" | "Main Captain" | "Trainee Captain",
    travellers: 0,
    capacity: 24,
    captainFee: 5000,
    advancePaid: 0,
    notes: "",
    status: "Assigned" as "Assigned" | "On Trip" | "Completed" | "Cancelled",
  });

  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/admin/operations/assignments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();

        // Populate slots from backend if available
        if (Array.isArray(data.slots)) {
          const parsedSlots: SlotItem[] = data.slots.map((s: any) => ({
            _id: s._id,
            tripTitle: s.trip?.title || s.customTitle || "Expedition Package",
            destination: s.trip?.location || "South India",
            dates: s.date
              ? new Date(s.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
              : s.startDate || "Upcoming",
            duration: s.trip?.duration || "Weekend Tour",
            bookedSlots: s.bookedSlots || 0,
            totalSlots: s.totalSlots || 24,
            image: s.trip?.image,
          }));
          setAvailableSlots(parsedSlots);
        }

        // Populate captains from backend if available
        if (Array.isArray(data.captains)) {
          const parsedCaps: CaptainItem[] = data.captains.map((c: any) => ({
            _id: c._id,
            name: c.name || "Captain",
            phone: c.phone || "",
            role: (c.role as any) || "Head Captain",
            rating: c.rating || 4.9,
            tripsCount: c.tripsCompleted || c.tripsCount || 0,
            defaultFee: c.defaultTripFee || 5000,
            avatar: c.avatar,
          }));
          setAvailableCaptains(parsedCaps);
        }

        // Populate assignments
        if (Array.isArray(data.assignments)) {
          const mapped: Assignment[] = data.assignments.map((a: any) => {
            const r = a.role || "Head Captain";
            const normRole: "Head Captain" | "Main Captain" | "Trainee Captain" =
              r.includes("Head") || r.includes("Lead")
                ? "Head Captain"
                : r.includes("Main") || r.includes("Assistant")
                ? "Main Captain"
                : "Trainee Captain";

            return {
              _id: a._id,
              slotId: a.slotId?._id || a.slotId,
              captainId: a.captainId?._id || a.captainId,
              tripTitle: a.tripId?.title || a.slotId?.trip?.title || "Trip Package",
              destination: a.tripId?.location || a.slotId?.trip?.location || "South India",
              dates: a.slotId?.date
                ? new Date(a.slotId.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Upcoming",
              captainName: a.captainId?.name || "Assigned Captain",
              captainPhone: a.captainId?.phone || "",
              role: normRole,
              travellers: a.slotId?.bookedSlots || 0,
              capacity: a.slotId?.totalSlots || 24,
              captainFee: a.captainFee || a.captainId?.defaultTripFee || 5000,
              advancePaid: a.advancePaid || 0,
              notes: a.notes || "",
              status: a.status || "Assigned",
            };
          });

          mapped.sort((a, b) => getRoleBadge(a.role).rank - getRoleBadge(b.role).rank);
          setAssignments(mapped);
        } else {
          setAssignments([]);
        }
      }
    } catch (e) {
      console.error("Assignments fetch error:", e);
      setAssignments([]);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleOpenAdd = () => {
    if (availableSlots.length === 0) {
      alert("No departure slots found. Please ensure at least one trip departure exists before assigning.");
      return;
    }
    if (availableCaptains.length === 0) {
      alert("No captains found. Please add a captain in Trip Captains first before assigning.");
      return;
    }

    setEditingId(null);
    setFormError(null);
    const defaultSlot = availableSlots[0];
    const defaultCap = availableCaptains[0];

    setForm({
      slotId: defaultSlot._id,
      tripTitle: defaultSlot.tripTitle,
      destination: defaultSlot.destination,
      dates: defaultSlot.dates,
      captainId: defaultCap._id,
      captainName: defaultCap.name,
      captainPhone: defaultCap.phone,
      role: defaultCap.role,
      travellers: defaultSlot.bookedSlots,
      capacity: defaultSlot.totalSlots,
      captainFee: defaultCap.defaultFee || 5000,
      advancePaid: 0,
      notes: "",
      status: "Assigned",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (row: Assignment) => {
    setEditingId(row._id);
    setFormError(null);
    setForm({
      slotId: row.slotId || availableSlots[0]?._id || "",
      tripTitle: row.tripTitle,
      destination: row.destination,
      dates: row.dates,
      captainId: row.captainId || availableCaptains[0]?._id || "",
      captainName: row.captainName,
      captainPhone: row.captainPhone,
      role: row.role,
      travellers: row.travellers,
      capacity: row.capacity,
      captainFee: row.captainFee,
      advancePaid: row.advancePaid,
      notes: row.notes || "",
      status: row.status,
    });
    setShowModal(true);
  };

  // When departure slot dropdown changes
  const handleSlotChange = (slotId: string) => {
    const s = availableSlots.find((item) => item._id === slotId);
    if (s) {
      setForm((prev) => ({
        ...prev,
        slotId: s._id,
        tripTitle: s.tripTitle,
        destination: s.destination,
        dates: s.dates,
        travellers: s.bookedSlots,
        capacity: s.totalSlots,
      }));
    }
  };

  // When captain dropdown changes
  const handleCaptainChange = (captainId: string) => {
    const c = availableCaptains.find((item) => item._id === captainId);
    if (c) {
      setForm((prev) => ({
        ...prev,
        captainId: c._id,
        captainName: c.name,
        captainPhone: c.phone,
        role: c.role,
        captainFee: c.defaultFee || prev.captainFee,
      }));
    }
  };

  // Active selected slot preview
  const selectedSlot = useMemo(() => {
    return availableSlots.find((s) => s._id === form.slotId) || availableSlots[0];
  }, [availableSlots, form.slotId]);

  // Active selected captain preview
  const selectedCaptain = useMemo(() => {
    return availableCaptains.find((c) => c._id === form.captainId) || availableCaptains[0];
  }, [availableCaptains, form.captainId]);

  // Balance fee calculation
  const balanceDue = Math.max(0, (Number(form.captainFee) || 0) - (Number(form.advancePaid) || 0));

  const uniqueTripTitles = useMemo(() => {
    const set = new Set<string>();
    assignments.forEach((a) => {
      if (a.tripTitle) set.add(a.tripTitle);
    });
    return Array.from(set);
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((row) => {
      if (tripFilter !== "all" && row.tripTitle !== tripFilter) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          row.tripTitle.toLowerCase().includes(q) ||
          row.captainName.toLowerCase().includes(q) ||
          row.dates.toLowerCase().includes(q) ||
          (row.destination || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [assignments, tripFilter, statusFilter, searchQuery]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const token = localStorage.getItem("token");
      // Attempt backend persistence if available
      const res = await fetch(`${API_BASE_URL}/admin/operations/assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          slotId: form.slotId,
          captainId: form.captainId,
          role: form.role,
          captainFee: form.captainFee,
          advancePaid: form.advancePaid,
          notes: form.notes,
          confirmReassign: true,
        }),
      });

      if (res.ok) {
        // Reload list from server
        await fetchAssignments();
        setShowModal(false);
        return;
      }
    } catch {
      // Fallback to local state if backend unreachable
    } finally {
      setIsSubmitting(false);
    }

    // Local state fallback update
    if (editingId) {
      setAssignments((prev) =>
        prev.map((a) => (a._id === editingId ? { ...a, ...form } : a))
      );
    } else {
      const created: Assignment = {
        _id: "as-" + Date.now(),
        ...form,
      };
      setAssignments([created, ...assignments]);
    }
    setShowModal(false);
  };

  const handleDelete = async (row: Assignment) => {
    if (!window.confirm(`Are you sure you want to remove assignment for "${row.captainName}"?`)) return;

    try {
      const token = localStorage.getItem("token");
      let res = await fetch(`${API_BASE_URL}/admin/operations/assignments/${row._id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok && row.slotId && row.captainId) {
        res = await fetch(`${API_BASE_URL}/admin/operations/assignments/${row.slotId}/${row.captainId}`, {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      }

      setAssignments((prev) => prev.filter((a) => a._id !== row._id));
      await fetchAssignments();
    } catch (err) {
      console.error("Delete assignment error:", err);
      alert("Network error while removing assignment.");
    }
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-page-title-box">
          <h1>Trip Assignments</h1>
          <p>
            Assign qualified captains to upcoming departures, set guide honorarium and track execution.
          </p>
        </div>

        <button onClick={handleOpenAdd} className="admin-btn admin-btn-primary assignments-add-btn">
          <Plus size={16} />
          <span>New Assignment</span>
        </button>
      </div>

      {/* Search & Filter Controls (Client-side over live assignments) */}
      <div className="assignments-filters-bar">
        <div className="assignments-search-box">
          <Search
            size={15}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
            }}
          />
          <input
            type="text"
            placeholder="Search by trip, captain or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 34px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "13px",
              outline: "none",
            }}
          />
        </div>

        <div className="assignments-filter-selects">
          <select
            value={tripFilter}
            onChange={(e) => setTripFilter(e.target.value)}
            aria-label="Filter by trip"
          >
            <option value="all">All Trips</option>
            {uniqueTripTitles.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="Assigned">Assigned</option>
            <option value="On Trip">On Trip</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Assignments Table (Desktop) & Cards (Mobile) */}
      <div
        className="assignments-list-wrapper"
        style={{
          background: "#ffffff",
          border: "1px solid #e7ecf0",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          width: "100%",
        }}
      >
        {/* Mobile Assignment Cards (<= 768px) */}
        <div className="assignments-mobile-cards">
          {filteredAssignments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 16px" }}>
              <div style={{ color: "#64748b", fontSize: "14px", fontWeight: 600 }}>
                No captain assignments found.
              </div>
              <div style={{ color: "#94a3b8", fontSize: "12.5px", marginTop: "4px", marginBottom: "14px" }}>
                Tap "New Assignment" to assign a captain to an upcoming departure slot.
              </div>
              <button type="button" onClick={handleOpenAdd} className="admin-btn admin-btn-primary">
                <Plus size={15} />
                <span>New Assignment</span>
              </button>
            </div>
          ) : (
            filteredAssignments.map((row) => {
              const roleBadge = getRoleBadge(row.role);
              return (
                <div key={`mob-${row._id}`} className="assignment-mobile-card">
                  <div className="assignment-mobile-card-top">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "14.5px", wordBreak: "break-word" }}>
                        {row.tripTitle}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                        {row.destination}
                      </div>
                    </div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "3px 9px",
                        borderRadius: "999px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: "#dcfce7",
                        color: "#166534",
                        border: "1px solid #bbf7d0",
                        flexShrink: 0,
                      }}
                    >
                      <CheckCircle2 size={11} />
                      {row.status}
                    </span>
                  </div>

                  <div className="assignment-mobile-card-meta">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <Calendar size={13} color="#64748b" />
                      {row.dates}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <Users size={13} color="#64748b" />
                      {row.travellers} / {row.capacity} Travellers
                    </span>
                  </div>

                  <div className="assignment-mobile-captain-row">
                    <div style={{ display: "flex", alignItems: "center", gap: "9px", minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
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
                        {row.captainName.slice(0, 1)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600, color: "#0f172a", fontSize: "13px" }}>
                            {row.captainName}
                          </span>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              background: roleBadge.bg,
                              color: roleBadge.color,
                              border: roleBadge.border,
                              padding: "1px 6px",
                              borderRadius: "10px",
                            }}
                          >
                            {roleBadge.label}
                          </span>
                        </div>
                        {row.captainPhone && (
                          <div style={{ fontSize: "11.5px", color: "#64748b" }}>{row.captainPhone}</div>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>
                        ₹{row.captainFee.toLocaleString("en-IN")}
                      </div>
                      <div style={{ fontSize: "11px", color: "#166534", fontWeight: 600 }}>
                        Adv: ₹{row.advancePaid.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>

                  <div className="assignment-mobile-card-actions">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(row)}
                      className="admin-btn admin-btn-secondary"
                      style={{ flex: 1, minHeight: "38px", justifyContent: "center" }}
                    >
                      <Edit2 size={14} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row)}
                      className="admin-btn"
                      style={{
                        flex: 1,
                        minHeight: "38px",
                        justifyContent: "center",
                        background: "#fef2f2",
                        color: "#b91c1c",
                        border: "1px solid #fecaca",
                      }}
                    >
                      <Trash2 size={14} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="admin-table-container assignments-desktop-table">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: "220px" }}>Trip / Departure</th>
                <th style={{ width: "180px" }}>Dates</th>
                <th>Assigned Captain</th>
                <th style={{ textAlign: "center", width: "130px" }}>Travellers</th>
                <th style={{ textAlign: "right", width: "140px" }}>Captain Fee</th>
                <th style={{ textAlign: "center", width: "110px" }}>Status</th>
                <th style={{ textAlign: "right", width: "100px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "48px 20px" }}>
                    <div style={{ color: "#64748b", fontSize: "14px", fontWeight: 600 }}>
                      No captain assignments found.
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: "12.5px", marginTop: "4px" }}>
                      Click "New Assignment" above to assign a captain to an upcoming departure slot.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((row) => (
                <tr key={row._id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "13.5px" }}>
                      {row.tripTitle}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "#64748b" }}>{row.destination}</div>
                  </td>

                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12.5px",
                        color: "#334155",
                      }}
                    >
                      <Calendar size={13} color="#94a3b8" />
                      {row.dates}
                    </div>
                  </td>

                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
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
                        {row.captainName.slice(0, 1)}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontWeight: 600, color: "#0f172a", fontSize: "12.5px" }}>
                            {row.captainName}
                          </span>
                          {(() => {
                            const b = getRoleBadge(row.role);
                            return (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  background: b.bg,
                                  color: b.color,
                                  border: b.border,
                                  padding: "1px 6px",
                                  borderRadius: "10px",
                                }}
                              >
                                {b.label}
                              </span>
                            );
                          })()}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                          {row.captainPhone}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td style={{ textAlign: "center" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "12.5px",
                        fontWeight: 600,
                        color: "#0f172a",
                      }}
                    >
                      <Users size={13} color="#64748b" />
                      <span>
                        {row.travellers} / {row.capacity}
                      </span>
                    </div>
                  </td>

                  <td style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13px" }}>
                      ₹{row.captainFee.toLocaleString("en-IN")}
                    </div>
                    <div style={{ fontSize: "11px", color: "#166534", fontWeight: 600 }}>
                      Adv: ₹{row.advancePaid.toLocaleString("en-IN")}
                    </div>
                  </td>

                  <td style={{ textAlign: "center" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "2px 8px",
                        borderRadius: "999px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: "#dcfce7",
                        color: "#166534",
                        border: "1px solid #bbf7d0",
                      }}
                    >
                      <CheckCircle2 size={11} />
                      {row.status}
                    </span>
                  </td>

                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <button
                        onClick={() => handleOpenEdit(row)}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          padding: "6px",
                          color: "#64748b",
                          borderRadius: "6px",
                        }}
                        title="Edit Assignment"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(row)}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          padding: "6px",
                          color: "#ef4444",
                          borderRadius: "6px",
                        }}
                        title="Remove Assignment"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* REDESIGNED LUXURY MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "Edit Captain Assignment" : "Assign Captain to Departure"}
        subtitle="Select trip departure date and assign a qualified team captain."
        maxWidth="680px"
      >
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Error Banner */}
          {formError && (
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
              <span>{formError}</span>
            </div>
          )}

          {/* STEP 1: SELECT DEPARTURE SLOT */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#334155",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Calendar size={14} color="#166534" />
              <span>Select Departure Slot *</span>
            </label>

            <select
              value={form.slotId}
              onChange={(e) => handleSlotChange(e.target.value)}
              required
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
                transition: "border-color 0.15s ease",
              }}
            >
              {availableSlots.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.tripTitle} • {s.dates} ({s.bookedSlots}/{s.totalSlots} Booked)
                </option>
              ))}
            </select>

            {/* Live Departure Preview Card */}
            {selectedSlot && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  background: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <img
                    src={
                      selectedSlot.image ||
                      "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=200&auto=format&fit=crop&q=80"
                    }
                    alt={selectedSlot.tripTitle}
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "8px",
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "13.5px",
                        fontWeight: 700,
                        color: "#0f172a",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {selectedSlot.tripTitle}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "11.5px",
                        color: "#64748b",
                        marginTop: "2px",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                        <MapPin size={11} color="#166534" />
                        {selectedSlot.destination}
                      </span>
                      <span>•</span>
                      <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                        <Clock size={11} />
                        {selectedSlot.duration || "2D / 1N"}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: "4px 10px",
                    borderRadius: "999px",
                    background: "#dcfce7",
                    color: "#166534",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    flexShrink: 0,
                    border: "1px solid #bbf7d0",
                  }}
                >
                  {selectedSlot.bookedSlots} / {selectedSlot.totalSlots} Booked
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: SELECT ASSIGNED CAPTAIN */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#334155",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <ShieldCheck size={14} color="#166534" />
              <span>Assigned Captain *</span>
            </label>

            <select
              value={form.captainId}
              onChange={(e) => handleCaptainChange(e.target.value)}
              required
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
              {availableCaptains.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.phone}) — {c.role} • ⭐ {c.rating}
                </option>
              ))}
            </select>

            {/* Live Captain Profile Preview */}
            {selectedCaptain && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #092312 0%, #164e23 100%)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      fontWeight: 700,
                    }}
                  >
                    {selectedCaptain.name.slice(0, 1)}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                        {selectedCaptain.name}
                      </span>
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "8px",
                          background: getRoleBadge(selectedCaptain.role).bg,
                          color: getRoleBadge(selectedCaptain.role).color,
                          border: getRoleBadge(selectedCaptain.role).border,
                        }}
                      >
                        {selectedCaptain.role}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "11.5px",
                        color: "#64748b",
                        marginTop: "1px",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                        <Phone size={11} />
                        {selectedCaptain.phone}
                      </span>
                      <span>•</span>
                      <span>⭐ {selectedCaptain.rating} Rating</span>
                      <span>•</span>
                      <span>{selectedCaptain.tripsCount} Completed</span>
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 700,
                    color: "#166534",
                    background: "#e8f5e9",
                    padding: "3px 8px",
                    borderRadius: "6px",
                  }}
                >
                  Standard Fee: ₹{selectedCaptain.defaultFee?.toLocaleString("en-IN")}
                </span>
              </div>
            )}
          </div>

          {/* STEP 3: HIERARCHY ROLE (INTERACTIVE VISUAL CARDS) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#334155",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Crown size={14} color="#166534" />
                <span>Hierarchy Role *</span>
              </label>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                Sets captain command level &amp; portal permissions
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px",
              }}
            >
              {/* Role 1: Head Captain */}
              <div
                onClick={() => setForm({ ...form, role: "Head Captain" })}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  border:
                    form.role === "Head Captain" ? "2px solid #164e23" : "1px solid #cbd5e1",
                  background: form.role === "Head Captain" ? "#f0fdf4" : "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "8px",
                      background: form.role === "Head Captain" ? "#dcfce7" : "#f1f5f9",
                      color: "#166534",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Crown size={15} />
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      background: "#dcfce7",
                      color: "#166534",
                      padding: "1px 6px",
                      borderRadius: "6px",
                    }}
                  >
                    Max 1
                  </span>
                </div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                  1. Head Captain
                </div>
                <p style={{ fontSize: "11px", color: "#64748b", margin: 0, lineHeight: 1.35 }}>
                  Highest authority. Manages bus attendance, overall safety &amp; claims.
                </p>
              </div>

              {/* Role 2: Main Captain */}
              <div
                onClick={() => setForm({ ...form, role: "Main Captain" })}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  border:
                    form.role === "Main Captain" ? "2px solid #1d4ed8" : "1px solid #cbd5e1",
                  background: form.role === "Main Captain" ? "#eff6ff" : "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "8px",
                      background: form.role === "Main Captain" ? "#dbeafe" : "#f1f5f9",
                      color: "#1d4ed8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Compass size={15} />
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      background: "#dbeafe",
                      color: "#1d4ed8",
                      padding: "1px 6px",
                      borderRadius: "6px",
                    }}
                  >
                    Max 1
                  </span>
                </div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                  2. Main Captain
                </div>
                <p style={{ fontSize: "11px", color: "#64748b", margin: 0, lineHeight: 1.35 }}>
                  Second-in-command. Oversees user check, headcount &amp; logistics.
                </p>
              </div>

              {/* Role 3: Trainee Captain */}
              <div
                onClick={() => setForm({ ...form, role: "Trainee Captain" })}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  border:
                    form.role === "Trainee Captain" ? "2px solid #475569" : "1px solid #cbd5e1",
                  background: form.role === "Trainee Captain" ? "#f8fafc" : "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "8px",
                      background: "#f1f5f9",
                      color: "#475569",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Award size={15} />
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      background: "#f1f5f9",
                      color: "#475569",
                      padding: "1px 6px",
                      borderRadius: "6px",
                    }}
                  >
                    Multiple
                  </span>
                </div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                  3. Trainee Captain
                </div>
                <p style={{ fontSize: "11px", color: "#64748b", margin: 0, lineHeight: 1.35 }}>
                  Assisting guide. Supports passenger briefing &amp; sightseeing.
                </p>
              </div>
            </div>
          </div>

          {/* STEP 4: HONORARIUM FINANCIALS & ADVANCE BREAKDOWN */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
                  Total Agreed Honorarium (₹) *
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontWeight: 700,
                      color: "#64748b",
                      fontSize: "14px",
                    }}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    required
                    min={0}
                    value={form.captainFee}
                    onChange={(e) => setForm({ ...form, captainFee: Number(e.target.value) })}
                    style={{
                      width: "100%",
                      padding: "10px 12px 10px 28px",
                      borderRadius: "10px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#0f172a",
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
                  Advance Paid (₹) *
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontWeight: 700,
                      color: "#64748b",
                      fontSize: "14px",
                    }}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    required
                    min={0}
                    value={form.advancePaid}
                    onChange={(e) => setForm({ ...form, advancePaid: Number(e.target.value) })}
                    style={{
                      width: "100%",
                      padding: "10px 12px 10px 28px",
                      borderRadius: "10px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#0f172a",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Real-time Settlement Calculator Banner */}
            <div
              style={{
                background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "4px",
              }}
            >
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                  Agreed Fee: ₹{Number(form.captainFee || 0).toLocaleString("en-IN")} &bull; Upfront: ₹{Number(form.advancePaid || 0).toLocaleString("en-IN")}
                </span>
                <div style={{ fontSize: "12px", color: "#334155", marginTop: "2px" }}>
                  Balance payable upon successful trip completion &amp; audit:
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: 800,
                    color: "#166534",
                    background: "#dcfce7",
                    padding: "4px 12px",
                    borderRadius: "8px",
                    border: "1px solid #bbf7d0",
                    display: "inline-block",
                  }}
                >
                  ₹{balanceDue.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* STEP 5: SPECIAL NOTES & INSTRUCTIONS */}
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
              Operational Briefing / Special Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Lead passenger coordinator at Majestic bus terminal at 06:00 AM. Ensure WhatsApp broadcast before departure."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "10px",
                border: "1.5px solid #cbd5e1",
                fontSize: "13px",
                color: "#0f172a",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </div>

          {/* MODAL FOOTER BUTTONS (SPACIOUS & ELEGANT) */}
          <div
            style={{
              paddingTop: "16px",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={() => setShowModal(false)}
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
              disabled={isSubmitting}
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
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? "Saving..." : editingId ? "Update Assignment" : "Save Assignment"}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CaptainAssignments;
