import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../api";
import { useSalesAuth } from "./SalesAuthContext";
import {
  Clock,
  Phone,
  MessageCircle,
  CheckCircle2,
  X,
  Loader2,
  CalendarClock,
  RotateCw,
  FileCheck,
} from "lucide-react";

export const SalesFollowUps: React.FC = () => {
  const { token } = useSalesAuth();
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("today");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Mark done popup state
  const [activeFollowUp, setActiveFollowUp] = useState<any | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState<string>("");
  const [isSubmittingOutcome, setIsSubmittingOutcome] = useState<boolean>(false);

  const fetchFollowUps = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/sales/follow-ups?filter=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setFollowUps(res.data.followUps || []);
      }
    } catch (err) {
      console.error("Error loading follow ups:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchFollowUps();
  }, [token, filter]);

  const handleCompleteFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFollowUp) return;

    try {
      setIsSubmittingOutcome(true);
      await axios.patch(
        `${API_BASE_URL}/api/sales/follow-ups/${activeFollowUp._id}`,
        {
          status: "Completed",
          outcome: outcomeNotes || "Call/Interaction completed successfully",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setActiveFollowUp(null);
      setOutcomeNotes("");
      fetchFollowUps();
    } catch (err) {
      console.error("Error completing follow-up:", err);
    } finally {
      setIsSubmittingOutcome(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page Header (Admin Design Standard) */}
      <div className="admin-page-header">
        <div className="admin-page-title-box">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1>Follow-ups Agenda &amp; Tasks</h1>
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
              {followUps.length} Tasks Scheduled
            </span>
          </div>
          <p>
            Customer callback appointments, WhatsApp outreach deadlines, and recorded interaction outcomes.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Filter Pills */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "3px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            {[
              { id: "today", label: "Today's Agenda" },
              { id: "overdue", label: "Overdue" },
              { id: "upcoming", label: "Upcoming" },
              { id: "completed", label: "Completed History" },
              { id: "all", label: "All Tasks" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                style={{
                  border: "none",
                  background: filter === tab.id ? "#0d2b17" : "transparent",
                  color: filter === tab.id ? "#ffffff" : "#64748b",
                  padding: "6px 12px",
                  borderRadius: "7px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="admin-btn-secondary"
            onClick={fetchFollowUps}
            title="Refresh Tasks"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <RotateCw size={14} className={isLoading ? "spin-icon" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Follow-ups List Card (Admin Card Style) */}
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
        ) : followUps.length === 0 ? (
          <div style={{ padding: "80px 20px", textAlign: "center", color: "#94a3b8" }}>
            <CalendarClock size={40} style={{ opacity: 0.35, margin: "0 auto 10px" }} />
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#334155", margin: 0 }}>
              No Follow-ups Found
            </h3>
            <p style={{ fontSize: "12.5px", color: "#64748b", margin: "4px 0 0" }}>
              There are no tasks matching the selected filter.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {followUps.map((task, idx) => {
              const isOverdue =
                task.status === "Scheduled" && new Date(task.scheduledAt) < new Date();

              return (
                <div
                  key={task._id}
                  style={{
                    padding: "16px 20px",
                    borderBottom: idx === followUps.length - 1 ? "none" : "1px solid #f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ minWidth: 0, flex: 1, fontSize: "12.5px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>
                        {task.customerName}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "2px 7px",
                          borderRadius: "4px",
                          background: "#e2e8f0",
                          color: "#334155",
                        }}
                      >
                        {task.type}
                      </span>
                      {isOverdue && (
                        <span
                          style={{
                            fontSize: "10.5px",
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: "4px",
                            background: "#fee2e2",
                            color: "#b91c1c",
                          }}
                        >
                          Overdue
                        </span>
                      )}
                      {task.status === "Completed" && (
                        <span
                          style={{
                            fontSize: "10.5px",
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: "4px",
                            background: "#dcfce7",
                            color: "#15803d",
                          }}
                        >
                          Done
                        </span>
                      )}
                    </div>

                    <div style={{ color: "#334155", fontWeight: 500, marginTop: "4px" }}>
                      {task.summary}
                    </div>

                    {task.outcome && (
                      <div
                        style={{
                          fontSize: "11.5px",
                          color: "#475569",
                          background: "#f1f5f9",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          marginTop: "6px",
                          display: "inline-block",
                        }}
                      >
                        <strong>Outcome:</strong> {task.outcome}
                      </div>
                    )}

                    <div
                      style={{
                        fontSize: "11px",
                        color: "#64748b",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginTop: "6px",
                      }}
                    >
                      <Clock size={12} color="#164e23" />
                      <span>{new Date(task.scheduledAt).toLocaleString()}</span>
                      <span>•</span>
                      <span>Agent: {task.salesEmployeeName || "Sales Team"}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    {task.customerPhone && (
                      <a
                        href={`https://wa.me/${task.customerPhone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          width: "32px",
                          height: "32px",
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
                        <MessageCircle size={16} />
                      </a>
                    )}

                    {task.customerPhone && (
                      <a
                        href={`tel:${task.customerPhone}`}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          background: "#e2e8f0",
                          color: "#334155",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          textDecoration: "none",
                        }}
                        title="Call Customer"
                      >
                        <Phone size={15} />
                      </a>
                    )}

                    {task.status !== "Completed" && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFollowUp(task);
                          setOutcomeNotes("");
                        }}
                        className="admin-btn-primary"
                        style={{
                          padding: "6px 14px",
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <CheckCircle2 size={14} color="#d9eec7" />
                        <span>Log Outcome</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Log Outcome Modal (Signature Mountain Watermark) */}
      {activeFollowUp && (
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
            if (e.target === e.currentTarget) setActiveFollowUp(null);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "480px",
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
                    <FileCheck size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "17.5px", fontWeight: 700, color: "#ffffff" }}>
                      Complete Follow-up Task
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "rgba(255, 255, 255, 0.78)" }}>
                      Record customer response, interaction outcome &amp; next steps
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveFollowUp(null)}
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

            {/* Form */}
            <form onSubmit={handleCompleteFollowUp} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "14px", fontSize: "13px" }}>
              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px", fontSize: "12px" }}>
                  Customer Details:
                </label>
                <div style={{ padding: "10px 12px", borderRadius: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", color: "#334155" }}>
                  <strong>{activeFollowUp.customerName}</strong> • {activeFollowUp.summary}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px", fontSize: "12px" }}>
                  Call / Interaction Outcome Notes *
                </label>
                <textarea
                  rows={3}
                  required
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  placeholder="e.g. Spoke with customer. They confirmed 4 pax for next departure. Moving stage to Qualified."
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", marginTop: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
                <button
                  type="button"
                  onClick={() => setActiveFollowUp(null)}
                  className="admin-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOutcome}
                  className="admin-btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {isSubmittingOutcome && <Loader2 size={14} className="spin-icon" />}
                  <span>Mark Task Completed</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesFollowUps;
