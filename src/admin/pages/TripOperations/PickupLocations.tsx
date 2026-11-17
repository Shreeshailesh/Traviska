import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  MapPin,
  Clock,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Compass,
} from "lucide-react";
import { API_BASE_URL } from "../../../api";

interface DateOverride {
  slotId?: string;
  date: string;
  pickupTime: string;
}

interface Pickup {
  _id?: string;
  name: string;
  address: string;
  landmark: string;
  pickupTime: string;
  googleMapsUrl: string;
  isActive: boolean;
  order: number;
  dateOverrides: DateOverride[];
}

interface TripItem {
  _id: string;
  title: string;
  location: string;
  pickupLocations?: Pickup[];
}

interface SlotItem {
  _id: string;
  date: string;
}

export const PickupLocations: React.FC = () => {
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<Pickup>({
    name: "",
    address: "",
    landmark: "",
    pickupTime: "10:00 PM",
    googleMapsUrl: "",
    isActive: true,
    order: 0,
    dateOverrides: [],
  });
  const [overrideSlotId, setOverrideSlotId] = useState<string>("");
  const [overrideTime, setOverrideTime] = useState<string>("");

  // 1. Load Trips on mount
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${API_BASE_URL}/trips`);
        if (Array.isArray(data) && data.length > 0) {
          setTrips(data);
          setSelectedTripId(data[0]._id);
        }
      } catch (err: any) {
        console.error("Failed to fetch trips:", err);
        setSaveError("Could not load trip packages");
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, []);

  // 2. When selectedTripId changes, fetch pickup locations & slots
  useEffect(() => {
    if (!selectedTripId) return;

    const loadTripData = async () => {
      try {
        const [pickupRes, slotsRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/trips/${selectedTripId}/pickups`),
          axios.get(`${API_BASE_URL}/trips/${selectedTripId}/slots`),
        ]);

        if (pickupRes.status === "fulfilled" && pickupRes.value.data?.pickupLocations) {
          setPickups(pickupRes.value.data.pickupLocations);
        } else {
          // Fallback to trip in local state
          const tripObj = trips.find((t) => t._id === selectedTripId);
          setPickups(Array.isArray(tripObj?.pickupLocations) ? tripObj.pickupLocations : []);
        }

        if (slotsRes.status === "fulfilled" && Array.isArray(slotsRes.value.data)) {
          setSlots(
            slotsRes.value.data.map((s: any) => ({
              _id: String(s._id),
              date: String(s.date),
            }))
          );
        } else {
          setSlots([]);
        }
      } catch (err) {
        console.warn("Error loading trip pickups/slots:", err);
      }
    };

    loadTripData();
  }, [selectedTripId]);

  const selectedTrip = trips.find((t) => t._id === selectedTripId);

  // Open Modal to Add
  const handleOpenAdd = () => {
    setEditingIndex(null);
    setForm({
      name: "",
      address: "",
      landmark: "",
      pickupTime: "10:00 PM",
      googleMapsUrl: "",
      isActive: true,
      order: pickups.length,
      dateOverrides: [],
    });
    setOverrideSlotId("");
    setOverrideTime("");
    setShowModal(true);
  };

  // Open Modal to Edit
  const handleOpenEdit = (index: number) => {
    setEditingIndex(index);
    const item = pickups[index];
    setForm({
      ...item,
      dateOverrides: Array.isArray(item.dateOverrides) ? [...item.dateOverrides] : [],
    });
    setOverrideSlotId("");
    setOverrideTime("");
    setShowModal(true);
  };

  // Save Modal Form
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("Pickup point name is required");
      return;
    }

    if (editingIndex !== null) {
      setPickups((prev) =>
        prev.map((item, idx) =>
          idx === editingIndex ? { ...form, order: item.order } : item
        )
      );
    } else {
      setPickups((prev) => [...prev, { ...form, order: prev.length }]);
    }
    setShowModal(false);
  };

  // Delete
  const handleDelete = (index: number) => {
    if (window.confirm("Remove this pickup point from this trip?")) {
      setPickups((prev) => prev.filter((_, idx) => idx !== index));
    }
  };

  // Toggle Active
  const handleToggleActive = (index: number) => {
    setPickups((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, isActive: !item.isActive } : item
      )
    );
  };

  // Move Up / Down
  const handleMove = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= pickups.length) return;
    const copy = [...pickups];
    const [moved] = copy.splice(index, 1);
    copy.splice(target, 0, moved);
    setPickups(copy);
  };

  // Date Overrides inside modal
  const handleAddOverride = () => {
    if (!overrideSlotId || !overrideTime.trim()) {
      alert("Please select a departure date and enter a pickup time");
      return;
    }
    const matchedSlot = slots.find((s) => s._id === overrideSlotId);
    setForm((prev) => ({
      ...prev,
      dateOverrides: [
        ...(prev.dateOverrides || []).filter((o) => String(o.slotId) !== String(overrideSlotId)),
        {
          slotId: overrideSlotId,
          date: matchedSlot ? matchedSlot.date : "",
          pickupTime: overrideTime.trim(),
        },
      ],
    }));
    setOverrideSlotId("");
    setOverrideTime("");
  };

  const handleRemoveOverride = (overrideIdx: number) => {
    setForm((prev) => ({
      ...prev,
      dateOverrides: prev.dateOverrides.filter((_, idx) => idx !== overrideIdx),
    }));
  };

  // Save to MongoDB permanently
  const handleSaveToMongo = async () => {
    if (!selectedTripId) return;
    setSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");

    try {
      const payload = pickups.map((p, idx) => ({
        ...p,
        order: idx,
      }));

      const { data } = await axios.put(
        `${API_BASE_URL}/trips/${selectedTripId}/pickups`,
        { pickupLocations: payload },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        setSaveSuccess(`Pickup locations permanently saved for ${selectedTrip?.title || "trip"}!`);
        if (Array.isArray(data.pickupLocations)) {
          setPickups(data.pickupLocations);
        }
        setTimeout(() => setSaveSuccess(null), 4000);
      }
    } catch (err: any) {
      console.error("Save pickups failed:", err);
      setSaveError(err.response?.data?.message || "Failed to save pickup locations to database");
    } finally {
      setSaving(false);
    }
  };

  if (loading && trips.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#166534", fontWeight: 600 }}>
        Loading pickup locations...
      </div>
    );
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header & Trip Package Selector */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
              Trip Pickup Locations Management
            </h1>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
              Each trip owns its own pickup points. Customers select a boarding point during booking.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={handleOpenAdd}
              disabled={!selectedTripId}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                background: "#166534",
                color: "#ffffff",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                cursor: selectedTripId ? "pointer" : "not-allowed",
              }}
            >
              <Plus size={15} /> Add Boarding Point
            </button>

            <button
              type="button"
              onClick={handleSaveToMongo}
              disabled={saving || !selectedTripId}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "8px",
                background: "#0d2b17",
                color: "#ffffff",
                border: "none",
                fontSize: "13px",
                fontWeight: 700,
                cursor: saving ? "wait" : "pointer",
                boxShadow: "0 2px 4px rgba(13,43,23,0.2)",
              }}
            >
              <Save size={15} /> {saving ? "Saving..." : "Save to MongoDB"}
            </button>
          </div>
        </div>

        {/* Trip Selector Bar */}
        <div
          style={{
            marginTop: "16px",
            paddingTop: "16px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
            <Compass size={16} color="#166534" /> Select Trip Package:
          </label>
          <select
            value={selectedTripId}
            onChange={(e) => setSelectedTripId(e.target.value)}
            style={{
              padding: "7px 12px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              fontSize: "13.5px",
              fontWeight: 600,
              color: "#0f172a",
              background: "#f8fafc",
              minWidth: "260px",
              cursor: "pointer",
            }}
          >
            {trips.map((t) => (
              <option key={t._id} value={t._id}>
                {t.title} ({t.location || "India"})
              </option>
            ))}
          </select>

          {selectedTrip && (
            <span style={{ fontSize: "12.5px", color: "#64748b" }}>
              Total Pickups Configured: <strong>{pickups.length}</strong> (
              {pickups.filter((p) => p.isActive !== false).length} Active)
            </span>
          )}
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div
          style={{
            padding: "12px 16px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "10px",
            color: "#166534",
            fontSize: "13px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <CheckCircle2 size={16} color="#166534" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div
          style={{
            padding: "12px 16px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "10px",
            color: "#b91c1c",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertCircle size={16} color="#b91c1c" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Grid of Pickup Points */}
      {pickups.length === 0 ? (
        <div
          style={{
            padding: "48px 20px",
            textAlign: "center",
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px dashed #cbd5e1",
          }}
        >
          <MapPin size={40} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", margin: 0 }}>
            No pickup locations for {selectedTrip?.title || "this trip"}
          </h3>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "6px auto 18px", maxWidth: "440px" }}>
            Add pickup spots (such as metro stations, toll plazas or bus terminals) for travellers joining this specific trip.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            style={{
              padding: "8px 16px",
              background: "#166534",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
            Add First Pickup Point
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: "16px" }}>
          {pickups.map((pickup, idx) => (
            <div
              key={pickup._id || idx}
              style={{
                background: "#ffffff",
                borderRadius: "14px",
                border: pickup.isActive ? "1px solid #e2e8f0" : "1px dashed #cbd5e1",
                padding: "18px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                opacity: pickup.isActive ? 1 : 0.65,
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {/* Card Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      background: "#eaf5e9",
                      color: "#166534",
                      fontWeight: 700,
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid #bbf7d0",
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <h3 style={{ fontSize: "14.5px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                      {pickup.name}
                    </h3>
                    {pickup.landmark && (
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                        Landmark: <strong>{pickup.landmark}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, "up")}
                    title="Move Up"
                    style={{
                      padding: "4px 6px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      background: "#f8fafc",
                      cursor: idx === 0 ? "not-allowed" : "pointer",
                      color: idx === 0 ? "#cbd5e1" : "#475569",
                    }}
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    disabled={idx === pickups.length - 1}
                    onClick={() => handleMove(idx, "down")}
                    title="Move Down"
                    style={{
                      padding: "4px 6px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      background: "#f8fafc",
                      cursor: idx === pickups.length - 1 ? "not-allowed" : "pointer",
                      color: idx === pickups.length - 1 ? "#cbd5e1" : "#475569",
                    }}
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(idx)}
                    style={{
                      padding: "3px 8px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      background: pickup.isActive ? "#fef2f2" : "#f0fdf4",
                      color: pickup.isActive ? "#b91c1c" : "#166534",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {pickup.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(idx)}
                    title="Edit"
                    style={{
                      padding: "4px 8px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      background: "#ffffff",
                      color: "#166534",
                      cursor: "pointer",
                    }}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    title="Delete"
                    style={{
                      padding: "4px 8px",
                      border: "1px solid #fecaca",
                      borderRadius: "6px",
                      background: "#fef2f2",
                      color: "#b91c1c",
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Address & Standard Time */}
              <div
                style={{
                  background: "#f8fafc",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  fontSize: "12.5px",
                }}
              >
                {pickup.address ? (
                  <div style={{ color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
                    <MapPin size={13} color="#64748b" style={{ flexShrink: 0 }} />
                    <span>{pickup.address}</span>
                  </div>
                ) : (
                  <div style={{ color: "#94a3b8", fontStyle: "italic" }}>No street address entered</div>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "2px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontWeight: 600,
                      color: "#166534",
                      background: "#eaf5e9",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  >
                    <Clock size={12} /> Standard Pickup: {pickup.pickupTime || "10:00 PM"}
                  </span>

                  {pickup.googleMapsUrl && (
                    <a
                      href={pickup.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        color: "#2563eb",
                        textDecoration: "none",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      <ExternalLink size={12} /> Google Maps
                    </a>
                  )}
                </div>
              </div>

              {/* Departure Date Overrides */}
              {Array.isArray(pickup.dateOverrides) && pickup.dateOverrides.length > 0 && (
                <div style={{ borderLeft: "3px solid #166534", paddingLeft: "10px", fontSize: "12px" }}>
                  <span style={{ fontWeight: 600, color: "#166534" }}>Departure Date Overrides:</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                    {pickup.dateOverrides.map((ov, oIdx) => (
                      <span
                        key={oIdx}
                        style={{
                          background: "#f1f5f9",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          color: "#334155",
                          fontSize: "11.5px",
                        }}
                      >
                        📅 {ov.date || "Date"}: <strong>{ov.pickupTime}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(3px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "520px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
              border: "1px solid #e2e8f0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                  {editingIndex !== null ? "Edit Pickup Location" : "Add Pickup Location"}
                </h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Boarding point for {selectedTrip?.title || "selected trip"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  border: "none",
                  background: "#f1f5f9",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#64748b",
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Pickup Point Name <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Silk Board Junction"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    Standard Pickup Time <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10:30 PM"
                    value={form.pickupTime}
                    onChange={(e) => setForm({ ...form, pickupTime: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    Status
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", height: "38px", cursor: "pointer", fontSize: "13px", color: "#334155" }}>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      style={{ accentColor: "#166534", width: "16px", height: "16px" }}
                    />
                    <span>Active Point</span>
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Full Street Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Opposite Silk Board Police Station, Hosur Rd, Bengaluru"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Landmark
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near Petrol Bunk / Metro Pillar"
                  value={form.landmark}
                  onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Google Maps URL
                </label>
                <input
                  type="url"
                  placeholder="e.g. https://maps.google.com/?q=Silk+Board+Bangalore"
                  value={form.googleMapsUrl}
                  onChange={(e) => setForm({ ...form, googleMapsUrl: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* DATE OVERRIDES SECTION */}
              <div style={{ marginTop: "6px", padding: "14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 600, fontSize: "12.5px", color: "#166534", marginBottom: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Calendar size={14} /> Date-Specific Pickup Times (Optional)
                </div>
                <p style={{ fontSize: "11.5px", color: "#64748b", margin: "0 0 10px 0" }}>
                  Configure different boarding times for specific departure dates.
                </p>

                {slots.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr auto", gap: "8px", alignItems: "center" }}>
                      <select
                        value={overrideSlotId}
                        onChange={(e) => setOverrideSlotId(e.target.value)}
                        style={{
                          padding: "7px 10px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          fontSize: "12px",
                          background: "#ffffff",
                        }}
                      >
                        <option value="">Select Departure Date</option>
                        {slots.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.date}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        placeholder="Time (e.g. 11:00 PM)"
                        value={overrideTime}
                        onChange={(e) => setOverrideTime(e.target.value)}
                        style={{
                          padding: "7px 10px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          fontSize: "12px",
                        }}
                      />

                      <button
                        type="button"
                        onClick={handleAddOverride}
                        style={{
                          padding: "7px 12px",
                          background: "#166534",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        + Add
                      </button>
                    </div>

                    {form.dateOverrides.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                        {form.dateOverrides.map((ov, oIdx) => (
                          <div
                            key={oIdx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "6px 10px",
                              background: "#ffffff",
                              borderRadius: "6px",
                              border: "1px solid #e2e8f0",
                              fontSize: "12px",
                            }}
                          >
                            <span>
                              Departure: <strong>{ov.date}</strong> → Pickup: <strong>{ov.pickupTime}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveOverride(oIdx)}
                              style={{ border: "none", background: "none", color: "#dc2626", cursor: "pointer", fontSize: "14px", fontWeight: 700 }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: "11.5px", color: "#94a3b8", fontStyle: "italic" }}>
                    No departure dates found for this trip. Schedule departures in Trips → Departures & Slots first to set date-specific overrides.
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#475569",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#166534",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {editingIndex !== null ? "Update Pickup Point" : "Add Pickup Point"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PickupLocations;
