import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../api";
import { useSalesAuth } from "./SalesAuthContext";
import { StatCard } from "../admin/ui/StatCard";
import {
  Users,
  Kanban,
  CheckCircle2,
  CalendarClock,
  IndianRupee,
  MessageCircle,
  PlusCircle,
  ArrowRight,
  TicketCheck,
  AlertCircle,
  Clock,
  RotateCw,
  Phone,
} from "lucide-react";

interface DashboardStats {
  totalEnquiries: number;
  newLeads: number;
  activePipeline: number;
  wonLeads: number;
  lostLeads: number;
  conversionRate: string;
  todayFollowUpsCount: number;
  overdueFollowUpsCount: number;
  totalSalesRevenue: number;
  stages: {
    New: number;
    Contacted: number;
    Qualified: number;
    "Proposal Sent": number;
    Negotiation: number;
    Won: number;
    Lost: number;
  };
}

export const SalesDashboard: React.FC = () => {
  const { token } = useSalesAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"7d" | "30d" | "month" | "year">("month");

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await axios.get(`${API_BASE_URL}/api/sales/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setStats(res.data.stats);
        setRecentLeads(res.data.recentLeads || []);
        setUpcomingFollowUps(res.data.upcomingFollowUps || []);
      }
    } catch (err: any) {
      console.error("Failed to load sales stats:", err);
      setError("Unable to load sales analytics. Please check server connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const handleMarkFollowUpDone = async (id: string) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/api/sales/follow-ups/${id}`,
        { status: "Completed", outcome: "Completed via sales dashboard" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchDashboardData();
    } catch (err) {
      console.error("Error completing follow up:", err);
    }
  };

  const stageList = useMemo(() => [
    { label: "New Leads", key: "New", count: stats?.stages?.New || 0, badgeClass: "info" },
    { label: "Contacted", key: "Contacted", count: stats?.stages?.Contacted || 0, badgeClass: "neutral" },
    { label: "Qualified", key: "Qualified", count: stats?.stages?.Qualified || 0, badgeClass: "neutral" },
    { label: "Proposal Sent", key: "Proposal Sent", count: stats?.stages?.["Proposal Sent"] || 0, badgeClass: "warning" },
    { label: "Negotiation", key: "Negotiation", count: stats?.stages?.Negotiation || 0, badgeClass: "warning" },
    { label: "Won (Booked)", key: "Won", count: stats?.stages?.Won || 0, badgeClass: "success" },
    { label: "Lost", key: "Lost", count: stats?.stages?.Lost || 0, badgeClass: "danger" },
  ], [stats]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page Header (Admin Design Standard) */}
      <div className="admin-page-header">
        <div className="admin-page-title-box">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1>Sales &amp; CRM Dashboard</h1>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 9px",
                borderRadius: "20px",
                background: "#eaf5e9",
                color: "#164e23",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#164e23" }} />
              Live Pipeline
            </span>
          </div>
          <p>
            Monitor inbound customer enquiries, track sales stages, today's call agenda &amp; issue manual bookings.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Period Selector Pills */}
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
            {(["7d", "30d", "month", "year"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                style={{
                  border: "none",
                  background: period === p ? "#0d2b17" : "transparent",
                  color: period === p ? "#ffffff" : "#64748b",
                  padding: "6px 12px",
                  borderRadius: "7px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {p === "7d" ? "Last 7 Days" : p === "30d" ? "Last 30 Days" : p === "month" ? "This Month" : "This Year"}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="admin-btn-secondary"
            onClick={fetchDashboardData}
            title="Refresh Data"
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

          <Link
            to="/sales/manual-booking"
            className="admin-btn-secondary"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <TicketCheck size={15} />
            <span>Issue Booking</span>
          </Link>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            background: "#fee2e2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Stat Cards Grid (Admin Design Standard) */}
      <div className="admin-stats-grid">
        <StatCard
          icon={<Users size={20} />}
          label="TOTAL INBOUND LEADS"
          value={stats?.totalEnquiries || 0}
          change={`+${stats?.newLeads || 0} New`}
          isPositive={true}
          subtitle="Enquiries across website, WhatsApp & calls"
          iconTheme="blue"
        />

        <StatCard
          icon={<Kanban size={20} />}
          label="ACTIVE PIPELINE"
          value={stats?.activePipeline || 0}
          change="In Pipeline"
          isPositive={true}
          subtitle="Contacted, qualified & proposals sent"
          iconTheme="gold"
        />

        <StatCard
          icon={<CheckCircle2 size={20} />}
          label="WON &amp; CONVERTED"
          value={stats?.wonLeads || 0}
          change={`${stats?.conversionRate || "0.0"}% Win`}
          isPositive={true}
          subtitle="Lead to confirmed departure conversion"
          iconTheme="green"
        />

        <StatCard
          icon={<IndianRupee size={20} />}
          label="SALES REVENUE"
          value={`₹${(stats?.totalSalesRevenue || 0).toLocaleString("en-IN")}`}
          change="Direct Sales"
          isPositive={true}
          subtitle="Total gross value from sales conversions"
          iconTheme="green"
        />
      </div>

      {/* Sales Pipeline Funnel Ledger (Admin Card Style) */}
      <div
        className="admin-card"
        style={{
          background: "#ffffff",
          border: "1px solid #e7ecf0",
          borderRadius: "14px",
          padding: "20px 24px",
          boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              Sales Conversion Pipeline Funnel
            </h3>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
              Active lead volume distributed by stage across the qualification lifecycle
            </p>
          </div>
          <Link
            to="/sales/pipeline"
            style={{
              fontSize: "12.5px",
              fontWeight: 600,
              color: "#164e23",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>Open Pipeline Kanban</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "12px",
          }}
        >
          {stageList.map((stg) => (
            <div
              key={stg.key}
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "#64748b",
                  display: "block",
                }}
              >
                {stg.label}
              </span>
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  color: stg.key === "Won" ? "#164e23" : "#0f172a",
                  display: "block",
                  marginTop: "4px",
                }}
              >
                {stg.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout: Follow-ups Agenda + Recent Leads */}
      <div className="admin-charts-grid" style={{ gridTemplateColumns: "1.2fr 1fr", gap: "20px" }}>
        {/* Left: Today's Follow-up Agenda */}
        <div
          className="admin-card"
          style={{
            background: "#ffffff",
            border: "1px solid #e7ecf0",
            borderRadius: "14px",
            padding: "20px 24px",
            boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "#fef9c3",
                  color: "#a16207",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CalendarClock size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  Today's Scheduled Follow-ups
                </h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Calls, WhatsApp reminders &amp; customer meetings
                </span>
              </div>
            </div>

            <Link
              to="/sales/follow-ups"
              style={{
                fontSize: "12.5px",
                fontWeight: 600,
                color: "#164e23",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>View All ({stats?.todayFollowUpsCount || 0})</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {upcomingFollowUps.length === 0 ? (
            <div
              style={{
                padding: "36px 20px",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: "13px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
              }}
            >
              <CheckCircle2 size={36} color="#16a34a" style={{ opacity: 0.5, marginBottom: "8px" }} />
              <span>All clear! No pending follow-ups scheduled for today.</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {upcomingFollowUps.map((task) => (
                <div
                  key={task._id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                        {task.customerName}
                      </span>
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "#e2e8f0",
                          color: "#334155",
                        }}
                      >
                        {task.type}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#475569",
                        marginTop: "2px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {task.summary}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#b45309",
                        fontWeight: 600,
                        marginTop: "3px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Clock size={11} />
                      <span>{new Date(task.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                    {task.customerPhone && (
                      <a
                        href={`https://wa.me/${task.customerPhone.replace(/\D/g, "")}`}
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
                        title="Open WhatsApp"
                      >
                        <MessageCircle size={15} />
                      </a>
                    )}
                    {task.customerPhone && (
                      <a
                        href={`tel:${task.customerPhone}`}
                        style={{
                          width: "30px",
                          height: "30px",
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
                        <Phone size={14} />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleMarkFollowUpDone(task._id)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "8px",
                        background: "#164e23",
                        color: "#ffffff",
                        border: "none",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Recent Inbound Customer Enquiries */}
        <div
          className="admin-card"
          style={{
            background: "#ffffff",
            border: "1px solid #e7ecf0",
            borderRadius: "14px",
            padding: "20px 24px",
            boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "#e0f2fe",
                  color: "#0369a1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Users size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  Recent Customer Leads
                </h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Fresh inbound inquiries ready for qualification
                </span>
              </div>
            </div>

            <Link
              to="/sales/leads"
              style={{
                fontSize: "12.5px",
                fontWeight: 600,
                color: "#164e23",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>View Table</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {recentLeads.length === 0 ? (
            <div
              style={{
                padding: "36px 20px",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: "13px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
              }}
            >
              <Users size={36} color="#94a3b8" style={{ opacity: 0.4, marginBottom: "8px" }} />
              <span>No inbound enquiries recorded yet. Click "+ Add Inbound Lead" to create one.</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {recentLeads.map((lead) => (
                <div
                  key={lead._id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                        {lead.name}
                      </span>
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: "4px",
                          background: lead.status === "Won" ? "#dcfce7" : lead.status === "New" ? "#e0f2fe" : "#fef3c7",
                          color: lead.status === "Won" ? "#15803d" : lead.status === "New" ? "#0369a1" : "#b45309",
                        }}
                      >
                        {lead.status}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#475569",
                        marginTop: "2px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {lead.tripTitle || "Custom Tour"} • Budget: ₹{(lead.budget || 0).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
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
                    <Link
                      to={`/sales/leads?id=${lead._id}`}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "8px",
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        color: "#0f172a",
                        fontSize: "11px",
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;
