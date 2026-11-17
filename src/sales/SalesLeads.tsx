import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../api";
import { useSalesAuth } from "./SalesAuthContext";
import {
  Search,
  PlusCircle,
  Phone,
  MessageCircle,
  Calendar,
  Users,
  X,
  FileCheck,
  TicketCheck,
  Loader2,
  Download,
} from "lucide-react";

export const SalesLeads: React.FC = () => {
  const { token } = useSalesAuth();
  const [searchParams] = useSearchParams();

  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedPriority, setSelectedPriority] = useState<string>("All");

  // Selected lead for detail modal
  const [activeLead, setActiveLead] = useState<any | null>(null);
  const [leadFollowUps, setLeadFollowUps] = useState<any[]>([]);

  // New Lead Modal
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState<boolean>(false);
  const [newLeadForm, setNewLeadForm] = useState({
    name: "",
    email: "",
    phone: "",
    tripTitle: "",
    departureDate: "",
    numTravelers: 1,
    budget: 0,
    source: "Phone Call",
    priority: "Medium",
    notes: "",
  });
  const [isSubmittingLead, setIsSubmittingLead] = useState<boolean>(false);

  // Add Follow Up Modal
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState<boolean>(false);
  const [followUpForm, setFollowUpForm] = useState({
    scheduledAt: "",
    type: "Call",
    summary: "",
  });

  // Convert to Booking Modal
  const [isConvertModalOpen, setIsConvertModalOpen] = useState<boolean>(false);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [convertForm, setConvertForm] = useState({
    slotId: "",
    total: 0,
    paymentMethod: "UPI",
    paymentReference: "",
    paymentStatus: "Paid",
    requests: "",
  });
  const [isConverting, setIsConverting] = useState<boolean>(false);

  const fetchEnquiries = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/sales/enquiries`, {
        params: {
          search: search || undefined,
          status: selectedStatus !== "All" ? selectedStatus : undefined,
          priority: selectedPriority !== "All" ? selectedPriority : undefined,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setEnquiries(res.data.enquiries || []);
        setTotalCount(res.data.total || 0);
      }
    } catch (err) {
      console.error("Error fetching enquiries:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchEnquiries();
    }
  }, [token, selectedStatus, selectedPriority]);

  useEffect(() => {
    const idParam = searchParams.get("id");
    const actionParam = searchParams.get("action");
    const searchParam = searchParams.get("search");

    if (actionParam === "new") {
      setIsAddLeadModalOpen(true);
    }
    if (idParam) {
      openLeadDetails(idParam);
    }
    if (searchParam) {
      setSearch(searchParam);
    }
  }, [searchParams]);

  const openLeadDetails = async (id: string) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/sales/enquiries/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setActiveLead(res.data.enquiry);
        setLeadFollowUps(res.data.followUps || []);
      }
    } catch (err) {
      console.error("Error loading lead details:", err);
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/api/sales/enquiries/${leadId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (activeLead && activeLead._id === leadId) {
        setActiveLead({ ...activeLead, status: newStatus });
      }
      fetchEnquiries();
    } catch (err) {
      console.error("Error updating lead status:", err);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.name || !newLeadForm.phone) {
      alert("Please provide customer name and phone number");
      return;
    }

    try {
      setIsSubmittingLead(true);
      const res = await axios.post(`${API_BASE_URL}/api/sales/enquiries`, newLeadForm, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setIsAddLeadModalOpen(false);
        setNewLeadForm({
          name: "",
          email: "",
          phone: "",
          tripTitle: "",
          departureDate: "",
          numTravelers: 1,
          budget: 0,
          source: "Phone Call",
          priority: "Medium",
          notes: "",
        });
        fetchEnquiries();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to create lead");
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead || !followUpForm.scheduledAt || !followUpForm.summary) {
      alert("Please specify follow-up time and summary notes.");
      return;
    }

    try {
      await axios.post(
        `${API_BASE_URL}/api/sales/follow-ups`,
        {
          enquiryId: activeLead._id,
          scheduledAt: followUpForm.scheduledAt,
          type: followUpForm.type,
          summary: followUpForm.summary,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setIsFollowUpModalOpen(false);
      setFollowUpForm({ scheduledAt: "", type: "Call", summary: "" });
      openLeadDetails(activeLead._id);
    } catch (err) {
      console.error("Error creating follow-up:", err);
    }
  };

  const openConvertModal = async () => {
    if (!activeLead) return;
    try {
      setConvertForm({
        slotId: activeLead.slotId || "",
        total: activeLead.budget || 0,
        paymentMethod: "UPI",
        paymentReference: "",
        paymentStatus: "Paid",
        requests: activeLead.notes || "",
      });

      const slotsRes = await axios.get(`${API_BASE_URL}/slots?limit=100`);
      if (slotsRes.data) {
        setAvailableSlots(slotsRes.data);
      }
      setIsConvertModalOpen(true);
    } catch (err) {
      console.error("Error fetching slots:", err);
    }
  };

  const handleConvertBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertForm.slotId) {
      alert("Please select a departure slot for this booking.");
      return;
    }

    try {
      setIsConverting(true);
      const res = await axios.post(
        `${API_BASE_URL}/api/sales/enquiries/${activeLead._id}/convert`,
        convertForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        alert(`Booking successfully created! Booking Code: ${res.data.booking.bookingCode}`);
        setIsConvertModalOpen(false);
        setActiveLead(null);
        fetchEnquiries();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to convert booking");
    } finally {
      setIsConverting(false);
    }
  };

  const handleExportCSV = () => {
    if (enquiries.length === 0) return;
    const headers = ["Enquiry ID", "Name", "Phone", "Email", "Trip", "Date", "Travelers", "Budget", "Status", "Priority", "Agent"];
    const rows = enquiries.map((e) => [
      e.enquiryId,
      `"${e.name}"`,
      e.phone,
      e.email,
      `"${e.tripTitle || ""}"`,
      e.departureDate || "",
      e.numTravelers || 1,
      e.budget || 0,
      e.status,
      e.priority,
      `"${e.assignedToName || "Unassigned"}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `traviska_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page Header (Admin Design Standard) */}
      <div className="admin-page-header">
        <div className="admin-page-title-box">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1>Leads &amp; Customer Enquiries</h1>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 9px",
                borderRadius: "20px",
                background: "#f1f5f9",
                color: "#475569",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              {totalCount} Total Registered
            </span>
          </div>
          <p>
            Filter, qualify, schedule interaction follow-ups and convert inquiries into confirmed trip bookings.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={handleExportCSV}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            className="admin-btn-primary"
            onClick={() => setIsAddLeadModalOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <PlusCircle size={15} />
            <span>+ Add Inbound Lead</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar Card (Admin Card Style) */}
      <div
        className="admin-card"
        style={{
          background: "#ffffff",
          border: "1px solid #e7ecf0",
          borderRadius: "14px",
          padding: "16px 20px",
          boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
            <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchEnquiries()}
              placeholder="Search by customer name, phone, enquiry ID, or destination..."
              style={{
                width: "100%",
                padding: "9px 14px 9px 38px",
                borderRadius: "10px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                fontSize: "13px",
                color: "#0f172a",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              style={{
                padding: "9px 12px",
                borderRadius: "10px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                fontSize: "12.5px",
                fontWeight: 600,
                color: "#475569",
                outline: "none",
              }}
            >
              <option value="All">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <button
              type="button"
              onClick={fetchEnquiries}
              className="admin-btn-secondary"
              style={{ padding: "8px 14px" }}
            >
              Filter
            </button>
          </div>
        </div>

        {/* Stage Filter Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
          {["All", "New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won", "Lost"].map((stage) => {
            const isSelected = selectedStatus === stage;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => setSelectedStatus(stage)}
                style={{
                  border: "none",
                  background: isSelected ? "#0d2b17" : "#f1f5f9",
                  color: isSelected ? "#ffffff" : "#475569",
                  padding: "5px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                {stage}
              </button>
            );
          })}
        </div>
      </div>

      {/* Leads Data Table (Admin Card Style) */}
      <div
        className="admin-card"
        style={{
          background: "#ffffff",
          border: "1px solid #e7ecf0",
          borderRadius: "14px",
          boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
          overflow: "hidden",
        }}
      >
        {isLoading ? (
          <div style={{ padding: "80px 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "32px", height: "32px", border: "3px solid #164e23", borderTopColor: "transparent", borderRadius: "50%", animation: "spinIconAnim 0.8s linear infinite" }} />
          </div>
        ) : enquiries.length === 0 ? (
          <div style={{ padding: "80px 20px", textAlign: "center", color: "#94a3b8" }}>
            <Users size={40} style={{ opacity: 0.35, margin: "0 auto 10px" }} />
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#334155", margin: 0 }}>No Customer Enquiries Found</h3>
            <p style={{ fontSize: "12.5px", color: "#64748b", margin: "4px 0 0" }}>
              No leads match your selected status or search term.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12.5px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  <th style={{ padding: "12px 16px" }}>Customer &amp; Enquiry ID</th>
                  <th style={{ padding: "12px 16px" }}>Trip Interest</th>
                  <th style={{ padding: "12px 16px" }}>Travelers &amp; Budget</th>
                  <th style={{ padding: "12px 16px" }}>Pipeline Stage</th>
                  <th style={{ padding: "12px 16px" }}>Priority</th>
                  <th style={{ padding: "12px 16px" }}>Assigned Agent</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((lead) => (
                  <tr
                    key={lead._id}
                    style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s ease" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Customer */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "10px",
                            background: "#0d2b17",
                            color: "#d9eec7",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "12px",
                            flexShrink: 0,
                          }}
                        >
                          {lead.name ? lead.name.slice(0, 2).toUpperCase() : "CU"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>{lead.name}</div>
                          <div style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                            <span style={{ fontFamily: "monospace", color: "#164e23", fontWeight: 600 }}>{lead.enquiryId}</span>
                            <span>•</span>
                            <span>{lead.phone}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Trip */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{lead.tripTitle || "Custom Tour Inquiry"}</div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Calendar size={11} color="#164e23" />
                        <span>{lead.departureDate || "Flexible Dates"}</span>
                      </div>
                    </td>

                    {/* Travelers & Budget */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>
                        ₹{(lead.budget || 0).toLocaleString("en-IN")}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                        {lead.numTravelers || 1} passenger{lead.numTravelers > 1 ? "s" : ""}
                      </div>
                    </td>

                    {/* Pipeline Stage */}
                    <td style={{ padding: "14px 16px" }}>
                      <select
                        value={lead.status}
                        onChange={(e) => handleUpdateStatus(lead._id, e.target.value)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          background:
                            lead.status === "Won"
                              ? "#dcfce7"
                              : lead.status === "New"
                              ? "#e0f2fe"
                              : lead.status === "Lost"
                              ? "#fee2e2"
                              : "#fef3c7",
                          color:
                            lead.status === "Won"
                              ? "#15803d"
                              : lead.status === "New"
                              ? "#0369a1"
                              : lead.status === "Lost"
                              ? "#b91c1c"
                              : "#b45309",
                          outline: "none",
                        }}
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Proposal Sent">Proposal Sent</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Won">Won</option>
                        <option value="Lost">Lost</option>
                      </select>
                    </td>

                    {/* Priority */}
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: "4px",
                          background:
                            lead.priority === "Urgent"
                              ? "#fee2e2"
                              : lead.priority === "High"
                              ? "#ffedd5"
                              : "#f1f5f9",
                          color:
                            lead.priority === "Urgent"
                              ? "#b91c1c"
                              : lead.priority === "High"
                              ? "#c2410c"
                              : "#475569",
                        }}
                      >
                        {lead.priority}
                      </span>
                    </td>

                    {/* Assigned Agent */}
                    <td style={{ padding: "14px 16px", color: "#334155", fontWeight: 500 }}>
                      {lead.assignedToName || "Unassigned"}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        {lead.phone && (
                          <a
                            href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "8px",
                              background: "#dcfce7",
                              color: "#15803d",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              textDecoration: "none",
                            }}
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle size={15} />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => openLeadDetails(lead._id)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "8px",
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            color: "#0f172a",
                            fontSize: "11.5px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* MODAL 1: ADD NEW MANUAL INBOUND LEAD                                */}
      {/* =================================================================== */}
      {isAddLeadModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddLeadModalOpen(false);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "540px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Mountain Watermark Header */}
            <div
              style={{
                position: "relative",
                background: "linear-gradient(135deg, #092312 0%, #0d381c 50%, #164e27 100%)",
                padding: "20px 24px",
                color: "#ffffff",
                overflow: "hidden",
              }}
            >
              <svg
                style={{
                  position: "absolute",
                  right: 0,
                  bottom: 0,
                  height: "100%",
                  width: "55%",
                  opacity: 0.18,
                  pointerEvents: "none",
                }}
                preserveAspectRatio="none"
                viewBox="0 0 400 160"
              >
                <path d="M0 160 L70 80 L140 140 L220 50 L300 130 L370 70 L400 110 L400 160 Z" fill="#ffffff" />
                <path d="M100 160 L180 90 L260 150 L340 85 L400 130 L400 160 Z" fill="#a7f3d0" opacity="0.3" />
              </svg>

              <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.12)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#a7f3d0",
                    }}
                  >
                    <PlusCircle size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "17.5px", fontWeight: 700, color: "#ffffff" }}>
                      Add Inbound Customer Lead
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "rgba(255, 255, 255, 0.78)" }}>
                      Record an inquiry received via phone call, WhatsApp, or direct walk-in
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddLeadModalOpen(false)}
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "none",
                    color: "#ffffff",
                    width: "30px",
                    height: "30px",
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
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateLead} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px", fontSize: "13px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px", fontSize: "12px" }}>
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newLeadForm.name}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                    placeholder="Full customer name"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px", fontSize: "12px" }}>
                    Phone Number (WhatsApp) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                    placeholder="10-digit mobile"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px", fontSize: "12px" }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newLeadForm.email}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                    placeholder="customer@example.com"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px", fontSize: "12px" }}>
                    Trip / Expedition
                  </label>
                  <input
                    type="text"
                    value={newLeadForm.tripTitle}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, tripTitle: e.target.value })}
                    placeholder="e.g. Coorg Weekend, Gokarna"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px", fontSize: "12px" }}>
                    Travelers
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newLeadForm.numTravelers}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, numTravelers: Number(e.target.value) })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px", fontSize: "12px" }}>
                    Budget (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newLeadForm.budget}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, budget: Number(e.target.value) })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px", fontSize: "12px" }}>
                    Priority
                  </label>
                  <select
                    value={newLeadForm.priority}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, priority: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px", fontSize: "12px" }}>
                  Notes &amp; Requirements
                </label>
                <textarea
                  rows={2}
                  value={newLeadForm.notes}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                  placeholder="Customer queries, preferences, or discount requests..."
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", marginTop: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
                <button
                  type="button"
                  onClick={() => setIsAddLeadModalOpen(false)}
                  className="admin-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLead}
                  className="admin-btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {isSubmittingLead && <Loader2 size={14} className="spin-icon" />}
                  <span>Save Lead</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: LEAD DETAILS DRAWER / MODAL                                */}
      {/* =================================================================== */}
      {activeLead && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveLead(null);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "560px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Watermark Header */}
            <div
              style={{
                position: "relative",
                background: "linear-gradient(135deg, #092312 0%, #0d381c 50%, #164e27 100%)",
                padding: "20px 24px",
                color: "#ffffff",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.12)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#a7f3d0",
                      fontWeight: 700,
                    }}
                  >
                    <FileCheck size={20} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <h3 style={{ margin: 0, fontSize: "17.5px", fontWeight: 700, color: "#ffffff" }}>
                        {activeLead.name}
                      </h3>
                      <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.2)", padding: "2px 6px", borderRadius: "4px", fontFamily: "monospace" }}>
                        {activeLead.enquiryId}
                      </span>
                    </div>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "rgba(255, 255, 255, 0.78)" }}>
                      {activeLead.tripTitle || "Custom Tour Inquiry"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveLead(null)}
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "none",
                    color: "#ffffff",
                    width: "30px",
                    height: "30px",
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
            </div>

            {/* Content Body */}
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px", fontSize: "13px" }}>
              {/* Contact Strip */}
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "10px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{activeLead.phone}</div>
                  <div style={{ fontSize: "11.5px", color: "#64748b" }}>{activeLead.email}</div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <a
                    href={`https://wa.me/${activeLead.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: "#dcfce7",
                      color: "#15803d",
                      fontWeight: 600,
                      fontSize: "12px",
                      textDecoration: "none",
                    }}
                  >
                    <MessageCircle size={14} />
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`tel:${activeLead.phone}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: "#e2e8f0",
                      color: "#334155",
                      fontWeight: 600,
                      fontSize: "12px",
                      textDecoration: "none",
                    }}
                  >
                    <Phone size={14} />
                    <span>Call</span>
                  </a>
                </div>
              </div>

              {/* Status & Priority */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>
                    Pipeline Stage
                  </label>
                  <select
                    value={activeLead.status}
                    onChange={(e) => handleUpdateStatus(activeLead._id, e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#0f172a",
                      background: "#ffffff",
                    }}
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Proposal Sent">Proposal Sent</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>
                    Priority Rating
                  </label>
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    {activeLead.priority}
                  </div>
                </div>
              </div>

              {/* Financial & Group Ledger */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Number of Travelers</span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>{activeLead.numTravelers || 1} Person(s)</span>
                </div>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Estimated Budget</span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>₹{(activeLead.budget || 0).toLocaleString("en-IN")}</span>
                </div>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Channel Source</span>
                  <span style={{ fontWeight: 600, color: "#334155" }}>{activeLead.source || "Website"}</span>
                </div>
                <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b" }}>Odoo Integration</span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#164e23", background: "#eaf5e9", padding: "2px 8px", borderRadius: "4px" }}>
                    Standby (Safely in MongoDB)
                  </span>
                </div>
              </div>

              {/* Notes */}
              {activeLead.notes && (
                <div style={{ padding: "12px 14px", borderRadius: "10px", background: "#fefce8", border: "1px solid #fef08a" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#854d0e", textTransform: "uppercase", marginBottom: "2px" }}>
                    Customer Requirements / Notes
                  </div>
                  <div style={{ color: "#1f2937", fontSize: "12.5px" }}>{activeLead.notes}</div>
                </div>
              )}

              {/* Follow-up Timeline */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>Follow-up Agenda &amp; Activity Log</span>
                  <button
                    type="button"
                    onClick={() => setIsFollowUpModalOpen(true)}
                    style={{ background: "none", border: "none", color: "#164e23", fontWeight: 700, fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <PlusCircle size={14} />
                    <span>+ Schedule Task</span>
                  </button>
                </div>

                {leadFollowUps.length === 0 ? (
                  <div style={{ padding: "16px", borderRadius: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", textAlign: "center", color: "#94a3b8", fontSize: "12px" }}>
                    No follow-ups recorded yet. Click "+ Schedule Task" to add one.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {leadFollowUps.map((fu) => (
                      <div
                        key={fu._id}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "8px",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontWeight: 700, color: "#0f172a" }}>{fu.type}</span>
                            <span style={{ fontSize: "10.5px", background: "#e2e8f0", padding: "1px 6px", borderRadius: "4px" }}>{fu.status}</span>
                          </div>
                          <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>{fu.summary}</div>
                        </div>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>{new Date(fu.scheduledAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div
              style={{
                padding: "16px 24px",
                background: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveLead(null)}
                className="admin-btn-secondary"
              >
                Close
              </button>

              {activeLead.status !== "Won" && (
                <button
                  type="button"
                  onClick={openConvertModal}
                  className="admin-btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <TicketCheck size={16} />
                  <span>Convert to Confirmed Booking</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: SCHEDULE FOLLOW-UP                                         */}
      {/* =================================================================== */}
      {isFollowUpModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsFollowUpModalOpen(false);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "440px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              fontSize: "13px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                Schedule Follow-up Task
              </h3>
              <button
                type="button"
                onClick={() => setIsFollowUpModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleScheduleFollowUp} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px", fontSize: "12px" }}>
                  Channel / Interaction
                </label>
                <select
                  value={followUpForm.type}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, type: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                >
                  <option value="Call">Phone Call</option>
                  <option value="WhatsApp">WhatsApp Message</option>
                  <option value="Email">Email</option>
                  <option value="Meeting">Meeting / Visit</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px", fontSize: "12px" }}>
                  Scheduled Date &amp; Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={followUpForm.scheduledAt}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, scheduledAt: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px", fontSize: "12px" }}>
                  Task Summary / Notes *
                </label>
                <textarea
                  rows={2}
                  required
                  value={followUpForm.summary}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, summary: e.target.value })}
                  placeholder="e.g. Call customer to confirm booking details and payment preference"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
                <button
                  type="button"
                  onClick={() => setIsFollowUpModalOpen(false)}
                  className="admin-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 4: CONVERT ENQUIRY TO CONFIRMED BOOKING                       */}
      {/* =================================================================== */}
      {isConvertModalOpen && activeLead && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsConvertModalOpen(false);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              fontSize: "13px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  Convert Lead to Confirmed Booking
                </h3>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
                  Issues booking code and moves lead to Won stage
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsConvertModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConvertBooking} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px", fontSize: "12px" }}>
                  Select Departure Date Slot *
                </label>
                <select
                  required
                  value={convertForm.slotId}
                  onChange={(e) => setConvertForm({ ...convertForm, slotId: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                >
                  <option value="">-- Choose active departure slot --</option>
                  {availableSlots.map((slot) => (
                    <option key={slot._id} value={slot._id}>
                      {slot.tripId?.title || "Trip"} • {slot.date} ({slot.bookedCount || 0}/{slot.capacity || 20} seats)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px", fontSize: "12px" }}>
                    Total Booking Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={convertForm.total}
                    onChange={(e) => setConvertForm({ ...convertForm, total: Number(e.target.value) })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: 700, boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px", fontSize: "12px" }}>
                    Payment Mode
                  </label>
                  <select
                    value={convertForm.paymentMethod}
                    onChange={(e) => setConvertForm({ ...convertForm, paymentMethod: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                  >
                    <option value="UPI">UPI Transfer</option>
                    <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                    <option value="Cash">Cash at Office</option>
                    <option value="Razorpay">Razorpay Gateway</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px", fontSize: "12px" }}>
                  Transaction UTR / Reference
                </label>
                <input
                  type="text"
                  value={convertForm.paymentReference}
                  onChange={(e) => setConvertForm({ ...convertForm, paymentReference: e.target.value })}
                  placeholder="e.g. UPI-1234567890"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", marginTop: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setIsConvertModalOpen(false)}
                  className="admin-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConverting}
                  className="admin-btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {isConverting && <Loader2 size={14} className="spin-icon" />}
                  <span>Confirm &amp; Issue Booking</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesLeads;
