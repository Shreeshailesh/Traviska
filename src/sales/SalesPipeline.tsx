import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../api";
import { useSalesAuth } from "./SalesAuthContext";
import {
  MessageCircle,
  ChevronRight,
  PlusCircle,
  RotateCw,
} from "lucide-react";
import { Link } from "react-router-dom";

const PIPELINE_STAGES = [
  { id: "New", title: "New Inbound", headerBg: "#e0f2fe", textColor: "#0369a1" },
  { id: "Contacted", title: "Contacted", headerBg: "#e0e7ff", textColor: "#3730a3" },
  { id: "Qualified", title: "Qualified", headerBg: "#f3e8ff", textColor: "#6b21a8" },
  { id: "Proposal Sent", title: "Proposal Sent", headerBg: "#fef3c7", textColor: "#92400e" },
  { id: "Negotiation", title: "Negotiation", headerBg: "#ffedd5", textColor: "#9a3412" },
  { id: "Won", title: "Won & Booked", headerBg: "#dcfce7", textColor: "#166534" },
  { id: "Lost", title: "Lost", headerBg: "#f1f5f9", textColor: "#475569" },
];

export const SalesPipeline: React.FC = () => {
  const { token } = useSalesAuth();
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchEnquiries = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/sales/enquiries?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setEnquiries(res.data.enquiries || []);
      }
    } catch (err) {
      console.error("Error fetching pipeline leads:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchEnquiries();
  }, [token]);

  const handleAdvanceStage = async (leadId: string, currentStage: string) => {
    const stageOrder = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won"];
    const currentIndex = stageOrder.indexOf(currentStage);
    if (currentIndex >= 0 && currentIndex < stageOrder.length - 1) {
      const nextStage = stageOrder[currentIndex + 1];
      try {
        await axios.patch(
          `${API_BASE_URL}/api/sales/enquiries/${leadId}`,
          { status: nextStage },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        fetchEnquiries();
      } catch (err) {
        console.error("Error updating stage:", err);
      }
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page Header (Admin Design Standard) */}
      <div className="admin-page-header">
        <div className="admin-page-title-box">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1>Sales Pipeline Kanban</h1>
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
              {enquiries.length} Active Opportunities
            </span>
          </div>
          <p>
            Visual stage-by-stage progression of all active customer opportunities from first contact to won booking.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={fetchEnquiries}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <RotateCw size={14} className={isLoading ? "spin-icon" : ""} />
            <span>Refresh</span>
          </button>

          <Link
            to="/sales/leads?action=new"
            className="admin-btn-primary"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <PlusCircle size={15} />
            <span>+ Add Inbound Lead</span>
          </Link>
        </div>
      </div>

      {/* Kanban Board Container */}
      {isLoading ? (
        <div style={{ padding: "80px 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "32px", height: "32px", border: "3px solid #164e23", borderTopColor: "transparent", borderRadius: "50%", animation: "spinIconAnim 0.8s linear infinite" }} />
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: "16px",
            overflowX: "auto",
            paddingBottom: "24px",
            alignItems: "flex-start",
          }}
        >
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = enquiries.filter((e) => e.status === stage.id);
            const stageTotalValue = stageLeads.reduce((acc, curr) => acc + (curr.budget || 0), 0);

            return (
              <div
                key={stage.id}
                style={{
                  width: "290px",
                  minWidth: "290px",
                  background: "#f8fafc",
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  maxHeight: "calc(100vh - 230px)",
                  boxShadow: "0 1px 3px rgba(15,23,42,0.03)",
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                    padding: "0 2px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                      {stage.title}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: "12px",
                        background: stage.headerBg,
                        color: stage.textColor,
                      }}
                    >
                      {stageLeads.length}
                    </span>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#164e23" }}>
                    ₹{stageTotalValue.toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Cards Container */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    overflowY: "auto",
                    paddingRight: "2px",
                    flex: 1,
                  }}
                >
                  {stageLeads.length === 0 ? (
                    <div
                      style={{
                        padding: "28px 14px",
                        textAlign: "center",
                        color: "#94a3b8",
                        fontSize: "12px",
                        border: "1px dashed #cbd5e1",
                        borderRadius: "10px",
                        background: "#ffffff",
                      }}
                    >
                      No leads in this stage
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead._id}
                        className="admin-stat-card"
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e7ecf0",
                          borderRadius: "10px",
                          padding: "12px 14px",
                          boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          fontSize: "12.5px",
                        }}
                      >
                        {/* Top Line */}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "6px" }}>
                          <div>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>{lead.name}</div>
                            <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#64748b" }}>
                              {lead.enquiryId}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              padding: "2px 6px",
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
                        </div>

                        {/* Trip Info */}
                        <div style={{ color: "#334155", fontWeight: 500, fontSize: "12px" }}>
                          {lead.tripTitle || "Custom Tour Inquiry"}
                        </div>

                        {/* Financial Ledger & Pax */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: "11px",
                            color: "#64748b",
                            paddingTop: "6px",
                            borderTop: "1px solid #f1f5f9",
                          }}
                        >
                          <span style={{ fontWeight: 700, color: "#0f172a" }}>
                            ₹{(lead.budget || 0).toLocaleString("en-IN")}
                          </span>
                          <span>{lead.numTravelers || 1} passenger(s)</span>
                        </div>

                        {/* Card Bottom Actions */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingTop: "4px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {lead.phone && (
                              <a
                                href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  width: "26px",
                                  height: "26px",
                                  borderRadius: "6px",
                                  background: "#dcfce7",
                                  color: "#15803d",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  textDecoration: "none",
                                }}
                                title="Chat on WhatsApp"
                              >
                                <MessageCircle size={13} />
                              </a>
                            )}
                            <Link
                              to={`/sales/leads?id=${lead._id}`}
                              style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                color: "#475569",
                                textDecoration: "none",
                              }}
                            >
                              Details
                            </Link>
                          </div>

                          {stage.id !== "Won" && stage.id !== "Lost" && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceStage(lead._id, stage.id)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "2px",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                background: "#eaf5e9",
                                color: "#164e23",
                                border: "none",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              <span>Next</span>
                              <ChevronRight size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SalesPipeline;
