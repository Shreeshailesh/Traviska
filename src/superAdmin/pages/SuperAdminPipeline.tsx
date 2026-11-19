import React, { useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import {
  Kanban,
  Plus,
  Search,
  CheckCircle2,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { API_BASE_URL } from "../../api";
import { getSuperAdminToken } from "../authHelper";
import { Modal } from "../../admin/ui/Modal";

interface LeadItem {
  _id: string;
  enquiryId: string;
  title: string;
  name: string;
  email: string;
  phone: string;
  numTravelers: number;
  budget: number;
  status: "New" | "In Progress" | "Proposal" | "Confirmed" | "Lost";
  rawStatus: string;
  source: string;
  notes: string;
  createdAt: string;
}

const STAGES: Array<{ id: "New" | "In Progress" | "Proposal" | "Confirmed" | "Lost"; label: string; color: string; bg: string; border: string }> = [
  { id: "New", label: "New Leads", color: "#166534", bg: "#f0fdf4", border: "#bbf7d0" },
  { id: "In Progress", label: "In Progress", color: "#1e40af", bg: "#eff6ff", border: "#bfdbfe" },
  { id: "Proposal", label: "Proposal", color: "#92400e", bg: "#fefce8", border: "#fef08a" },
  { id: "Confirmed", label: "Confirmed", color: "#6b21a8", bg: "#faf5ff", border: "#e9d5ff" },
  { id: "Lost", label: "Lost", color: "#475569", bg: "#f8fafc", border: "#e2e8f0" },
];

export const SuperAdminPipeline: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    new: 0,
    inProgress: 0,
    proposal: 0,
    confirmed: 0,
    lost: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add Lead Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    phone: "",
    tripTitle: "",
    numTravelers: 2,
    budget: 25000,
    status: "New",
    source: "Website",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Lead Detail Modal
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const token = getSuperAdminToken();
      const res = await axios.get(`${API_BASE_URL}/api/super-admin/pipeline`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: { search },
      });
      if (res.data.success) {
        setLeads(res.data.leads || []);
        if (res.data.counts) {
          setCounts(res.data.counts);
        }
      }
    } catch (err) {
      console.error("Pipeline fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [search]);

  useEffect(() => {
    if (searchParams.get("action") === "add") {
      setShowAddModal(true);
    }
  }, [searchParams]);

  // Handle stage change
  const handleMoveStage = async (leadId: string, nextStage: string) => {
    try {
      const token = getSuperAdminToken();
      await axios.patch(
        `${API_BASE_URL}/api/super-admin/leads/${leadId}/stage`,
        { stage: nextStage },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      fetchLeads();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update lead stage.");
    }
  };

  // Convert to booking
  const handleConvertToBooking = async (lead: LeadItem) => {
    if (!window.confirm(`Convert enquiry "${lead.title}" for ${lead.name} into a confirmed Booking?`)) {
      return;
    }
    try {
      const token = getSuperAdminToken();
      const res = await axios.post(
        `${API_BASE_URL}/api/super-admin/leads/${lead._id}/convert`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.data.success) {
        alert(res.data.message);
        fetchLeads();
        if (selectedLead?._id === lead._id) {
          setSelectedLead(null);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to convert lead to booking.");
    }
  };

  // Create lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = getSuperAdminToken();
      const res = await axios.post(
        `${API_BASE_URL}/api/super-admin/leads`,
        addForm,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.data.success) {
        setShowAddModal(false);
        setAddForm({
          name: "",
          email: "",
          phone: "",
          tripTitle: "",
          numTravelers: 2,
          budget: 25000,
          status: "New",
          source: "Website",
          notes: "",
        });
        fetchLeads();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to create lead.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete lead
  const handleDeleteLead = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this lead from the pipeline?")) return;
    try {
      const token = getSuperAdminToken();
      await axios.delete(`${API_BASE_URL}/api/super-admin/leads/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      fetchLeads();
      if (selectedLead?._id === id) setSelectedLead(null);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete lead.");
    }
  };

  const stageOrder = ["New", "In Progress", "Proposal", "Confirmed", "Lost"];

  return (
    <div>
      {/* Page Header */}
      <div className="sa-page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Kanban size={20} style={{ color: "#166534" }} />
            <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0, color: "#0f172a" }}>
              Pipeline (CRM)
            </h1>
          </div>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
            Manage enquiries, leads and deal flow for Traviska.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => setShowAddModal(true)}
            className="sa-action-btn sa-action-btn-primary"
          >
            <Plus size={16} />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="sa-card" style={{ padding: "14px 20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
              Total Pipeline: {counts.total} Leads
            </span>
          </div>

          <div style={{ position: "relative", minWidth: "260px" }}>
            <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search leads by client, phone, destination..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(260px, 1fr))",
          gap: "16px",
          overflowX: "auto",
          paddingBottom: "16px",
        }}
      >
        {STAGES.map((col) => {
          const colLeads = leads.filter((l) => l.status === col.id);
          return (
            <div
              key={col.id}
              style={{
                background: "#f8faf8",
                borderRadius: "16px",
                border: "1px solid #e2ece5",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                minHeight: "520px",
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  background: col.bg,
                  border: `1px solid ${col.border}`,
                  marginBottom: "14px",
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: 800, color: col.color }}>
                  {col.label}
                </span>
                <span
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 800,
                    padding: "2px 7px",
                    borderRadius: "12px",
                    background: "#ffffff",
                    color: col.color,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  {colLeads.length}
                </span>
              </div>

              {/* Lead Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
                {loading ? (
                  <div style={{ textAlign: "center", padding: "24px 12px", color: "#94a3b8", fontSize: "12.5px" }}>
                    Loading...
                  </div>
                ) : colLeads.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "24px 12px",
                      color: "#94a3b8",
                      fontSize: "12.5px",
                      border: "1px dashed #cbd5e1",
                      borderRadius: "10px",
                    }}
                  >
                    No leads in this stage
                  </div>
                ) : (
                  colLeads.map((lead) => {
                    const currentIdx = stageOrder.indexOf(lead.status);
                    const nextStage = currentIdx < stageOrder.length - 1 ? stageOrder[currentIdx + 1] : null;

                    return (
                      <div
                        key={lead._id}
                        onClick={() => setSelectedLead(lead)}
                        style={{
                          background: "#ffffff",
                          borderRadius: "12px",
                          border: "1px solid #e2ece5",
                          padding: "14px",
                          cursor: "pointer",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {/* Title & Amount */}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
                          <h4 style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                            {lead.title}
                          </h4>
                        </div>

                        {/* Client Name & Travellers */}
                        <div style={{ fontSize: "12.5px", color: "#334155", fontWeight: 600, marginBottom: "8px" }}>
                          {lead.name} {lead.numTravelers > 0 && <span style={{ color: "#64748b", fontWeight: 400 }}>· {lead.numTravelers} Pax</span>}
                        </div>

                        {/* Budget & Date */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 800, color: "#166534" }}>
                            ₹{lead.budget.toLocaleString("en-IN")}
                          </span>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>
                            {lead.createdAt}
                          </span>
                        </div>

                        {/* Quick Advance / Action */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderTop: "1px solid #f1f5f9",
                            paddingTop: "8px",
                            marginTop: "6px",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {lead.status === "Confirmed" ? (
                            <button
                              onClick={() => handleConvertToBooking(lead)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "11.5px",
                                fontWeight: 700,
                                color: "#15803d",
                                background: "#dcfce7",
                                border: "none",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                cursor: "pointer",
                              }}
                            >
                              <CheckCircle2 size={13} />
                              <span>Convert to Booking</span>
                            </button>
                          ) : nextStage ? (
                            <button
                              onClick={() => handleMoveStage(lead._id, nextStage)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                fontSize: "11.5px",
                                fontWeight: 700,
                                color: "#0369a1",
                                background: "#e0f2fe",
                                border: "none",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                cursor: "pointer",
                              }}
                            >
                              <span>Move to {nextStage}</span>
                              <ChevronRight size={13} />
                            </button>
                          ) : (
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>Closed</span>
                          )}

                          <button
                            onClick={() => handleDeleteLead(lead._id)}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "#94a3b8",
                              cursor: "pointer",
                              padding: "2px",
                            }}
                            title="Delete Lead"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Lead Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New CRM Lead">
        <form onSubmit={handleCreateLead} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px", color: "#334155" }}>
              Trip Destination / Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Coorg Group Trip, Manali Package"
              value={addForm.tripTitle}
              onChange={(e) => setAddForm({ ...addForm, tripTitle: e.target.value })}
              className="sa-input"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px", color: "#334155" }}>
                Client Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="Rahul R."
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                className="sa-input"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px", color: "#334155" }}>
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                placeholder="+91 98765 43210"
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                className="sa-input"
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px", color: "#334155" }}>
              Client Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="client@example.com"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              className="sa-input"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px", color: "#334155" }}>
                Travelers (Pax)
              </label>
              <input
                type="number"
                min={1}
                value={addForm.numTravelers}
                onChange={(e) => setAddForm({ ...addForm, numTravelers: Number(e.target.value) })}
                className="sa-input"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px", color: "#334155" }}>
                Estimated Budget (₹)
              </label>
              <input
                type="number"
                value={addForm.budget}
                onChange={(e) => setAddForm({ ...addForm, budget: Number(e.target.value) })}
                className="sa-input"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px", color: "#334155" }}>
                Initial Stage
              </label>
              <select
                value={addForm.status}
                onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
                className="sa-select"
              >
                <option value="New">New</option>
                <option value="In Progress">In Progress</option>
                <option value="Proposal">Proposal</option>
                <option value="Confirmed">Confirmed</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px", color: "#334155" }}>
              Requirement Notes & Preferences
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Needs resort stay, trekking guide, departure in late November."
              value={addForm.notes}
              onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
              className="sa-input"
              style={{ resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="sa-action-btn sa-action-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="sa-action-btn sa-action-btn-primary"
            >
              {submitting ? "Adding Lead..." : "Add to Pipeline"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Lead Details Modal */}
      {selectedLead && (
        <Modal isOpen={Boolean(selectedLead)} onClose={() => setSelectedLead(null)} title={selectedLead.title}>
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                  {selectedLead.name}
                </h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Enquiry ID: {selectedLead.enquiryId}
                </span>
              </div>
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontWeight: 800,
                  fontSize: "12px",
                  background:
                    selectedLead.status === "Confirmed"
                      ? "#dcfce7"
                      : selectedLead.status === "Proposal"
                      ? "#fef3c7"
                      : "#e0f2fe",
                  color:
                    selectedLead.status === "Confirmed"
                      ? "#166534"
                      : selectedLead.status === "Proposal"
                      ? "#92400e"
                      : "#0369a1",
                }}
              >
                ● {selectedLead.status}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "#f8faf8", padding: "16px", borderRadius: "12px" }}>
              <div>
                <span style={{ fontSize: "11.5px", color: "#64748b" }}>Phone Contact</span>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{selectedLead.phone}</div>
              </div>
              <div>
                <span style={{ fontSize: "11.5px", color: "#64748b" }}>Email Address</span>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{selectedLead.email}</div>
              </div>
              <div>
                <span style={{ fontSize: "11.5px", color: "#64748b" }}>Group Size</span>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{selectedLead.numTravelers} Travelers</div>
              </div>
              <div>
                <span style={{ fontSize: "11.5px", color: "#64748b" }}>Estimated Budget</span>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#166534" }}>₹{selectedLead.budget.toLocaleString("en-IN")}</div>
              </div>
            </div>

            {selectedLead.notes && (
              <div>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>Internal Notes</span>
                <p style={{ fontSize: "13px", color: "#475569", background: "#f8fafc", padding: "12px", borderRadius: "8px", margin: "6px 0 0" }}>
                  {selectedLead.notes}
                </p>
              </div>
            )}

            {/* Quick Actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
              <button
                onClick={() => handleDeleteLead(selectedLead._id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#dc2626",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12.5px",
                  fontWeight: 600,
                }}
              >
                <Trash2 size={15} />
                <span>Delete Lead</span>
              </button>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => handleConvertToBooking(selectedLead)}
                  className="sa-action-btn sa-action-btn-primary"
                >
                  <CheckCircle2 size={15} />
                  <span>Convert to Booking</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
