import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Users,
  UserCheck,
  Mail,
  Zap,
  UserPlus,
  UsersRound,
  History,
  ArrowRight,
  Clock,
  CheckCircle,
  IndianRupee,
  Activity,
  Compass,
  LogIn,
  Shield,
} from "lucide-react";
import { API_BASE_URL } from "../../api";
import { getSuperAdminToken, clearSuperAdminAuth } from "../authHelper";

interface DashboardData {
  metrics: {
    totalUsers: number;
    staffMembers: number;
    emailAccounts: number;
    activeToday: number;
    pendingInvites: number;
    collectedRevenue?: number;
    collectedRevenueFormatted?: string;
  };
  teamOverview: Array<{
    id: string;
    name: string;
    leadName?: string;
    membersCount: number;
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
        const token = getSuperAdminToken();
        const res = await axios.get(`${API_BASE_URL}/api/super-admin/dashboard`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.data.success) {
          setData(res.data);
        }
      } catch (err: any) {
        console.error("Dashboard fetch error:", err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          clearSuperAdminAuth();
          navigate("/super-admin/login", { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  const metrics = data?.metrics || {
    totalUsers: 24,
    staffMembers: 8,
    emailAccounts: 10,
    activeToday: 6,
    pendingInvites: 6,
    collectedRevenue: 0,
    collectedRevenueFormatted: "₹0",
  };

  const activities =
    data?.recentActivity && data.recentActivity.length > 0
      ? data.recentActivity.slice(0, 4)
      : [
          {
            id: "act_1",
            action: "user_added",
            details: "New user added – kartik@traviska.com",
            time: "Today, 05:42 PM",
            date: "Today",
          },
          {
            id: "act_2",
            action: "team_updated",
            details: "Team updated – Sales Team",
            time: "Today, 04:18 PM",
            date: "Today",
          },
          {
            id: "act_3",
            action: "email_created",
            details: "Email account created – operations@traviska.com",
            time: "Today, 01:27 PM",
            date: "Today",
          },
          {
            id: "act_4",
            action: "user_login",
            details: "User login – owner@traviska.com",
            time: "Today, 10:03 AM",
            date: "Today",
          },
        ];

  const teamOverview =
    data?.teamOverview && data.teamOverview.length > 0
      ? data.teamOverview
      : [
          { id: "tm_1", name: "Operations Team", membersCount: 4 },
          { id: "tm_2", name: "Sales Team", membersCount: 3 },
          { id: "tm_3", name: "Trip & Operations", membersCount: 2 },
          { id: "tm_4", name: "Admin Team", membersCount: 2 },
        ];

  const getActivityIcon = (act: string, details: string) => {
    const text = (act + " " + details).toLowerCase();
    if (text.includes("user added") || text.includes("invite") || text.includes("employee")) {
      return <UserPlus size={15} />;
    }
    if (text.includes("team")) {
      return <UsersRound size={15} />;
    }
    if (text.includes("email")) {
      return <Mail size={15} />;
    }
    if (text.includes("login")) {
      return <LogIn size={15} />;
    }
    return <CheckCircle size={15} />;
  };

  return (
    <div>
      {/* 5 Top KPI Cards Matching Design */}
      <div className="sa-kpi-grid" style={{ marginTop: "4px" }}>
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

        {/* Card 2: Staff Members */}
        <div className="sa-card sa-kpi-card">
          <div className="sa-kpi-icon-box" style={{ background: "#fef3c7", color: "#b45309" }}>
            <UserCheck size={22} />
          </div>
          <div className="sa-kpi-info">
            <div className="sa-kpi-label">Staff Members</div>
            <div className="sa-kpi-value-row">
              <span className="sa-kpi-number">{loading ? "8" : metrics.staffMembers || 8}</span>
              <span className="sa-kpi-pill" style={{ background: "#dcfce7", color: "#166534" }}>
                ↑ +33%
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Email Accounts */}
        <div className="sa-card sa-kpi-card">
          <div className="sa-kpi-icon-box" style={{ background: "#e0f2fe", color: "#0369a1" }}>
            <Mail size={22} />
          </div>
          <div className="sa-kpi-info">
            <div className="sa-kpi-label">Email Accounts</div>
            <div className="sa-kpi-value-row">
              <span className="sa-kpi-number">{loading ? "10" : metrics.emailAccounts || 10}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Active Today */}
        <div className="sa-card sa-kpi-card">
          <div className="sa-kpi-icon-box" style={{ background: "#fee2e2", color: "#b91c1c" }}>
            <Activity size={22} />
          </div>
          <div className="sa-kpi-info">
            <div className="sa-kpi-label">Active Today</div>
            <div className="sa-kpi-value-row">
              <span className="sa-kpi-number">{loading ? "6" : metrics.activeToday || 6}</span>
              <span
                style={{
                  display: "inline-block",
                  width: "9px",
                  height: "9px",
                  borderRadius: "50%",
                  background: "#16a34a",
                  marginLeft: "4px",
                }}
                title="Active"
              />
            </div>
          </div>
        </div>

        {/* Card 5: Collected Revenue */}
        <div className="sa-card sa-kpi-card">
          <div className="sa-kpi-icon-box" style={{ background: "#ecfdf5", color: "#047857" }}>
            <IndianRupee size={22} />
          </div>
          <div className="sa-kpi-info">
            <div className="sa-kpi-label">Collected Revenue</div>
            <div className="sa-kpi-value-row">
              <span className="sa-kpi-number" style={{ fontSize: "20px" }}>
                {loading
                  ? "₹0"
                  : metrics.collectedRevenueFormatted || `₹${(metrics.collectedRevenue ?? 0).toLocaleString("en-IN")}`}
              </span>
              <span className="sa-kpi-pill" style={{ background: "#ecfdf5", color: "#047857" }}>
                All Bookings
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Quick Actions (Left) & Traviska Operations Card (Right) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: "20px",
          marginBottom: "24px",
        }}
        className="sa-mid-row"
      >
        {/* Quick Actions Card */}
        <div className="sa-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
            <Zap size={18} style={{ color: "#16a34a" }} />
            <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "#0f172a" }}>
              Quick Actions
            </h3>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "12px",
            }}
          >
            {/* Primary Action: Add User */}
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
              <span>Add User</span>
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

            {/* Add Email Account */}
            <button
              onClick={() => navigate("/super-admin/emails")}
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
              <Mail size={22} style={{ color: "#0284c7" }} />
              <span>Add Email Account</span>
            </button>

            {/* View Activity Logs */}
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
              <span>View Activity Logs</span>
            </button>
          </div>
        </div>

        {/* Traviska Operations Card Matching Image 3 */}
        <div
          className="sa-card"
          style={{
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
            background: "linear-gradient(135deg, #ffffff 0%, #f7fdf9 100%)",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "#dcfce7",
              color: "#166534",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "14px",
              border: "2px solid #bbf7d0",
            }}
          >
            <Compass size={28} />
          </div>

          <h3 style={{ fontSize: "18px", fontWeight: 900, color: "#0f172a", margin: "0 0 6px" }}>
            Traviska Operations
          </h3>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px", fontWeight: 500 }}>
            Users • Teams • Emails • Activity
          </p>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "20px",
              background: "#dcfce7",
              color: "#166534",
              fontSize: "12.5px",
              fontWeight: 800,
              border: "1px solid #bbf7d0",
            }}
          >
            <CheckCircle size={14} />
            <span>All Systems Active</span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Activity (Left) & Team Overview (Right) Matching Image 3 */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "20px" }}
        className="sa-bottom-row"
      >
        {/* Recent Activity Card */}
        <div className="sa-card" style={{ padding: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "18px",
            }}
          >
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
                    {getActivityIcon(a.action, a.details)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#0f172a",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {a.details}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "11.5px",
                    color: "#64748b",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {a.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Team Overview Card Matching Image 3 */}
        <div className="sa-card" style={{ padding: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Users size={18} style={{ color: "#16a34a" }} />
              <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                Team Overview
              </h3>
            </div>
            <Link
              to="/super-admin/teams"
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
              <span>Manage Teams</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {teamOverview.map((team, idx) => (
              <div
                key={team.id || idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  paddingBottom: idx === teamOverview.length - 1 ? 0 : "12px",
                  borderBottom: idx === teamOverview.length - 1 ? "none" : "1px solid #f1f5f9",
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
                    <Shield size={15} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a" }}>
                      {team.name}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#475569",
                    background: "#f1f5f9",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {team.membersCount} Users
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
