import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Users,
  UserCheck,
  Mail,
  Zap,
  TrendingUp,
  UserPlus,
  UsersRound,
  FilePlus,
  Kanban,
  History,
  ArrowRight,
  Sparkles,
  PhoneCall,
  Clock,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { API_BASE_URL } from "../../api";

interface DashboardData {
  metrics: {
    totalUsers: number;
    staffMembers: number;
    emailAccounts: number;
    activeToday: number;
    pendingInvites: number;
    openLeads?: number;
    dealsThisMonth?: string;
  };
  pipelineOverview?: {
    total: number;
    new: number;
    inProgress: number;
    proposal: number;
    confirmed: number;
    lost: number;
  };
  teamOverview: Array<{
    id: string;
    name: string;
    leadName: string;
    membersCount: number;
  }>;
  upcomingFollowUps?: Array<{
    id: string;
    title: string;
    clientName: string;
    phone: string;
    time: string;
    status: string;
  }>;
  recentActivity: Array<{
    id: string;
    eventId?: string;
    action: string;
    details: string;
    actorEmail?: string;
    targetEmail?: string;
    time: string;
    date: string;
  }>;
}

export const SuperAdminDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE_URL}/api/super-admin/dashboard`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.data.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  const metrics = data?.metrics || {
    totalUsers: 24,
    staffMembers: 18,
    emailAccounts: 10,
    activeToday: 6,
    pendingInvites: 6,
    openLeads: 142,
    dealsThisMonth: "₹12,99,000",
  };

  const pipeline = data?.pipelineOverview || {
    total: 142,
    new: 48,
    inProgress: 36,
    proposal: 28,
    confirmed: 20,
    lost: 10,
  };

  const followUps = data?.upcomingFollowUps && data.upcomingFollowUps.length > 0
    ? data.upcomingFollowUps
    : [
        {
          id: "fu_1",
          title: "Kodaikanal Group",
          clientName: "Priya R.",
          phone: "+91 98765 43210",
          time: "Today, 4:30 PM",
          status: "Proposal",
        },
        {
          id: "fu_2",
          title: "Mysore-Ooty Enquiry",
          clientName: "Arjun M.",
          phone: "+91 98765 43211",
          time: "Tomorrow, 11:00 AM",
          status: "In Progress",
        },
        {
          id: "fu_3",
          title: "Corporate Trip",
          clientName: "Zenith Tech",
          phone: "+91 98765 43212",
          time: "Nov 18, 3:00 PM",
          status: "Proposal",
        },
      ];

  const activities = data?.recentActivity && data.recentActivity.length > 0
    ? data.recentActivity.slice(0, 4)
    : [
        {
          id: "act_1",
          action: "Employee invited",
          details: "Employee invited - kartik@traviska.com",
          time: "Today, 05:42 PM",
          date: "Today",
        },
        {
          id: "act_2",
          action: "Deal moved to Confirmed",
          details: "Deal moved to Confirmed - Goa Group Trip",
          time: "Today, 04:18 PM",
          date: "Today",
        },
        {
          id: "act_3",
          action: "Team updated",
          details: "Team updated - Sales Team",
          time: "Today, 01:27 PM",
          date: "Today",
        },
        {
          id: "act_4",
          action: "Email account added",
          details: "Email account added - operations@traviska.com",
          time: "Today, 10:03 AM",
          date: "Today",
        },
      ];

  return (
    <div>
      {/* Page Header */}
      <div className="sa-welcome-box" style={{ marginBottom: "22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "1px", color: "#15803d", textTransform: "uppercase" }}>
            | Super Admin Portal
          </span>
        </div>
        <h1 className="sa-welcome-title">
          Welcome back, <em>Shailesh!</em>
        </h1>
        <p className="sa-welcome-subtitle">
          Manage users, pipeline, emails and operations for Traviska.
        </p>
      </div>

      {/* 5 Top KPI Cards Matching Design */}
      <div className="sa-kpi-grid">
        {/* Card 1: Total Users */}
        <div className="sa-card sa-kpi-card">
          <div className="sa-kpi-icon-box" style={{ background: "#dcfce7", color: "#166534" }}>
            <Users size={22} />
          </div>
          <div className="sa-kpi-info">
            <div className="sa-kpi-label">Total Users</div>
            <div className="sa-kpi-value-row">
              <span className="sa-kpi-number">{loading ? "24" : metrics.totalUsers || 24}</span>
              <span className="sa-kpi-pill" style={{ background: "#dcfce7", color: "#166534" }}>
                ↑ +12%
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Staff */}
        <div className="sa-card sa-kpi-card">
          <div className="sa-kpi-icon-box" style={{ background: "#fef3c7", color: "#b45309" }}>
            <UserCheck size={22} />
          </div>
          <div className="sa-kpi-info">
            <div className="sa-kpi-label">Active Staff</div>
            <div className="sa-kpi-value-row">
              <span className="sa-kpi-number">{loading ? "18" : metrics.staffMembers || 18}</span>
              <span className="sa-kpi-pill" style={{ background: "#dcfce7", color: "#166534" }}>
                ↑ +33%
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Pending Invites */}
        <div className="sa-card sa-kpi-card">
          <div className="sa-kpi-icon-box" style={{ background: "#e0f2fe", color: "#0369a1" }}>
            <Mail size={22} />
          </div>
          <div className="sa-kpi-info">
            <div className="sa-kpi-label">Pending Invites</div>
            <div className="sa-kpi-value-row">
              <span className="sa-kpi-number">{loading ? "6" : metrics.pendingInvites || 6}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Open Leads */}
        <div className="sa-card sa-kpi-card">
          <div className="sa-kpi-icon-box" style={{ background: "#f3e8ff", color: "#7e22ce" }}>
            <Sparkles size={22} />
          </div>
          <div className="sa-kpi-info">
            <div className="sa-kpi-label">Open Leads</div>
            <div className="sa-kpi-value-row">
              <span className="sa-kpi-number">{loading ? "142" : metrics.openLeads || 142}</span>
              <span className="sa-kpi-pill" style={{ background: "#dcfce7", color: "#166534" }}>
                ↑ +18%
              </span>
            </div>
          </div>
        </div>

        {/* Card 5: Deals (This Month) */}
        <div className="sa-card sa-kpi-card">
          <div className="sa-kpi-icon-box" style={{ background: "#ecfdf5", color: "#047857" }}>
            <TrendingUp size={22} />
          </div>
          <div className="sa-kpi-info">
            <div className="sa-kpi-label">Deals (This Month)</div>
            <div className="sa-kpi-value-row">
              <span className="sa-kpi-number" style={{ fontSize: "20px" }}>
                {loading ? "₹12,99,000" : metrics.dealsThisMonth || "₹12,99,000"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Quick Actions (Left) & Pipeline Overview Donut (Right) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px", marginBottom: "24px" }} className="sa-mid-row">
        {/* Quick Actions Card */}
        <div className="sa-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
            <Zap size={18} style={{ color: "#16a34a" }} />
            <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "#0f172a" }}>
              Quick Actions
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
            {/* Primary Action: Invite Employee */}
            <button
              onClick={() => navigate("/super-admin/users?action=invite")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "16px 12px",
                borderRadius: "14px",
                border: "none",
                background: "#0e3820",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "13px",
                boxShadow: "0 4px 14px rgba(14, 56, 32, 0.25)",
                transition: "transform 0.15s ease",
              }}
            >
              <UserPlus size={22} />
              <span>Invite Employee</span>
            </button>

            {/* Create Team */}
            <button
              onClick={() => navigate("/super-admin/teams?action=create")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "16px 12px",
                borderRadius: "14px",
                border: "1px solid #e2ece5",
                background: "#ffffff",
                color: "#334155",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "13px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                transition: "all 0.15s ease",
              }}
            >
              <UsersRound size={22} style={{ color: "#15803d" }} />
              <span>Create Team</span>
            </button>

            {/* Add Lead */}
            <button
              onClick={() => navigate("/super-admin/pipeline?action=add")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "16px 12px",
                borderRadius: "14px",
                border: "1px solid #e2ece5",
                background: "#ffffff",
                color: "#334155",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "13px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                transition: "all 0.15s ease",
              }}
            >
              <FilePlus size={22} style={{ color: "#0284c7" }} />
              <span>Add Lead</span>
            </button>

            {/* View Pipeline */}
            <button
              onClick={() => navigate("/super-admin/pipeline")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "16px 12px",
                borderRadius: "14px",
                border: "1px solid #e2ece5",
                background: "#ffffff",
                color: "#334155",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "13px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                transition: "all 0.15s ease",
              }}
            >
              <Kanban size={22} style={{ color: "#7c3aed" }} />
              <span>View Pipeline</span>
            </button>

            {/* Activity Logs */}
            <button
              onClick={() => navigate("/super-admin/activity-logs")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "16px 12px",
                borderRadius: "14px",
                border: "1px solid #e2ece5",
                background: "#ffffff",
                color: "#334155",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "13px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                transition: "all 0.15s ease",
              }}
            >
              <History size={22} style={{ color: "#475569" }} />
              <span>Activity Logs</span>
            </button>
          </div>
        </div>

        {/* Pipeline Overview Donut Chart Card Matching Image 3 */}
        <div className="sa-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles size={18} style={{ color: "#16a34a" }} />
              <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                Pipeline Overview
              </h3>
            </div>
            <Link to="/super-admin/pipeline" style={{ fontSize: "12px", fontWeight: 700, color: "#15803d", textDecoration: "none" }}>
              Manage →
            </Link>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
            {/* SVG Donut Chart */}
            <div style={{ position: "relative", width: "130px", height: "130px", flexShrink: 0 }}>
              <svg width="130" height="130" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
                {/* Segments: New 48 (33.8%), In Progress 36 (25.3%), Proposal 28 (19.7%), Confirmed 20 (14.1%), Lost 10 (7%) */}
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#10b981" strokeWidth="14" strokeDasharray="80.7 238.7" strokeDashoffset="0" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#3b82f6" strokeWidth="14" strokeDasharray="60.5 238.7" strokeDashoffset="-80.7" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f59e0b" strokeWidth="14" strokeDasharray="47.1 238.7" strokeDashoffset="-141.2" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#8b5cf6" strokeWidth="14" strokeDasharray="33.6 238.7" strokeDashoffset="-188.3" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#64748b" strokeWidth="14" strokeDasharray="16.8 238.7" strokeDashoffset="-221.9" />
              </svg>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                }}
              >
                <span style={{ fontSize: "20px", fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>
                  {pipeline.total}
                </span>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", marginTop: "2px" }}>
                  Leads
                </span>
              </div>
            </div>

            {/* Legend Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", flex: 1, minWidth: "160px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#10b981" }} />
                <span style={{ fontSize: "12px", color: "#475569" }}>New</span>
                <strong style={{ fontSize: "12.5px", color: "#0f172a", marginLeft: "auto" }}>{pipeline.new}</strong>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#3b82f6" }} />
                <span style={{ fontSize: "12px", color: "#475569" }}>In Progress</span>
                <strong style={{ fontSize: "12.5px", color: "#0f172a", marginLeft: "auto" }}>{pipeline.inProgress}</strong>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#f59e0b" }} />
                <span style={{ fontSize: "12px", color: "#475569" }}>Proposal</span>
                <strong style={{ fontSize: "12.5px", color: "#0f172a", marginLeft: "auto" }}>{pipeline.proposal}</strong>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#8b5cf6" }} />
                <span style={{ fontSize: "12px", color: "#475569" }}>Confirmed</span>
                <strong style={{ fontSize: "12.5px", color: "#0f172a", marginLeft: "auto" }}>{pipeline.confirmed}</strong>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#64748b" }} />
                <span style={{ fontSize: "12px", color: "#475569" }}>Lost</span>
                <strong style={{ fontSize: "12.5px", color: "#0f172a", marginLeft: "auto" }}>{pipeline.lost}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Activity (Left) & Upcoming Follow-ups (Right) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "20px" }} className="sa-bottom-row">
        {/* Recent Activity Card */}
        <div className="sa-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={18} style={{ color: "#16a34a" }} />
              <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                Recent Activity
              </h3>
            </div>
            <Link
              to="/super-admin/activity-logs"
              style={{
                fontSize: "12.5px",
                fontWeight: 700,
                color: "#15803d",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>View All</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {activities.map((a, idx) => (
              <div
                key={a.id || idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  paddingBottom: idx === activities.length - 1 ? 0 : "12px",
                  borderBottom: idx === activities.length - 1 ? "none" : "1px solid #f1f5f9",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "10px",
                      background: "#f0fdf4",
                      color: "#166534",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircle size={15} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {a.details}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "11.5px", color: "#64748b", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {a.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Follow-ups Card Matching Image 3 */}
        <div className="sa-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Calendar size={18} style={{ color: "#16a34a" }} />
              <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                Upcoming Follow-ups
              </h3>
            </div>
            <Link
              to="/super-admin/pipeline"
              style={{
                fontSize: "12.5px",
                fontWeight: 700,
                color: "#15803d",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>View All</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {followUps.map((f, idx) => (
              <div
                key={f.id || idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  paddingBottom: idx === followUps.length - 1 ? 0 : "12px",
                  borderBottom: idx === followUps.length - 1 ? "none" : "1px solid #f1f5f9",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "10px",
                      background: "#eff6ff",
                      color: "#1e40af",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <PhoneCall size={15} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                      {f.title} <span style={{ fontWeight: 400, color: "#64748b" }}>– {f.clientName}</span>
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#0369a1", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {f.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
