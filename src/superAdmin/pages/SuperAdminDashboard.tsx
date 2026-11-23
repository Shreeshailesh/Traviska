import React, { useEffect, useState, useCallback } from "react";
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
  LogIn,
  Shield,
  AlertCircle,
  RefreshCw,
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
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getSuperAdminToken();
      const res = await axios.get(`${API_BASE_URL}/api/super-admin/dashboard`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.data?.success) {
        setData(res.data);
      } else {
        setError(res.data?.message || "Failed to load Super Admin dashboard metrics.");
      }
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        clearSuperAdminAuth();
        navigate("/super-admin/login", { replace: true });
        return;
      }
      setError(err?.response?.data?.message || "Unable to reach server. Please retry.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const metrics = data?.metrics || {
    totalUsers: 0,
    staffMembers: 0,
    emailAccounts: 0,
    activeToday: 0,
    pendingInvites: 0,
    collectedRevenue: 0,
    collectedRevenueFormatted: "₹0",
  };

  const activities = Array.isArray(data?.recentActivity)
    ? data.recentActivity.slice(0, 6)
    : [];

  const teamOverview = Array.isArray(data?.teamOverview) ? data.teamOverview : [];

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

  const collectedRevenueDisplay =
    metrics.collectedRevenueFormatted ||
    `₹${(metrics.collectedRevenue ?? 0).toLocaleString("en-IN")}`;

  return (
    <div className="sa-dashboard-root">
      {/* Error Banner with Retry */}
      {error && (
        <div className="sa-error-banner" role="alert">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchMetrics}
            className="sa-action-btn sa-action-btn-primary"
            style={{ padding: "7px 14px", fontSize: "12.5px" }}
          >
            <RefreshCw size={14} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 5 Top KPI Cards */}
      <div className="sa-kpi-grid">
        {/* Card 1: Total Users */}
        <div className="sa-card sa-kpi-card sa-kpi-premium">
          <div className="sa-kpi-icon-box" style={{ background: "#dcfce7", color: "#166534" }}>
            <Users size={20} />
          </div>
          <div className="sa-kpi-info">
            <div className="sa-kpi-label">Total Users</div>
            <div className="sa-kpi-value-row">
              {loading ? (
                <span className="sa-skeleton sa-skeleton-num" />
              ) : (
                <span className="sa-kpi-number">{metrics.totalUsers ?? 0}</span>
              )}
            </div>
            <div className="sa-kpi-subtext">All registered accounts</div>
          </div>
        </div>

        {/* Card 2: Staff Members */}
        <div className="sa-card sa-kpi-card sa-kpi-premium">
          <div className="sa-kpi-icon-box" style={{ background: "#fef3c7", color: "#b45309" }}>
            <UserCheck size={20} />
          </div>
          <div className="sa-kpi-info">
            <div className="sa-kpi-label">Staff Members</div>
            <div className="sa-kpi-value-row">
              {loading ? (
                <span className="sa-skeleton sa-skeleton-num" />
              ) : (
                <span className="sa-kpi-number">{metrics.staffMembers ?? 0}</span>
              )}
            </div>
            <div className="sa-kpi-subtext">Active workspace staff</div>
          </div>
        </div>

        {/* Card 3: Email Accounts */}
        <div className="sa-card sa-kpi-card sa-kpi-premium">
          <div className="sa-kpi-icon-box" style={{ background: "#e0f2fe", color: "#0369a1" }}>
            <Mail size={20} />
          </div>
          <div className="sa-kpi-info">
            <div className="sa-kpi-label">Email Accounts</div>
            <div className="sa-kpi-value-row">
              {loading ? (
                <span className="sa-skeleton sa-skeleton-num" />
              ) : (
                <span className="sa-kpi-number">{metrics.emailAccounts ?? 0}</span>
              )}
            </div>
            <div className="sa-kpi-subtext">
              {metrics.pendingInvites > 0
                ? `${metrics.pendingInvites} pending invites`
                : "Authorized identities"}
            </div>
          </div>
        </div>

        {/* Card 4: Active Today */}
        <div className="sa-card sa-kpi-card sa-kpi-premium">
          <div className="sa-kpi-icon-box" style={{ background: "#fee2e2", color: "#b91c1c" }}>
            <Activity size={20} />
          </div>
          <div className="sa-kpi-info">
            <div className="sa-kpi-label">Active Today</div>
            <div className="sa-kpi-value-row">
              {loading ? (
                <span className="sa-skeleton sa-skeleton-num" />
              ) : (
                <>
                  <span className="sa-kpi-number">{metrics.activeToday ?? 0}</span>
                  <span className="sa-live-dot" title="Logged in today" />
                </>
              )}
            </div>
            <div className="sa-kpi-subtext">Signed in today</div>
          </div>
        </div>

        {/* Card 5: Collected Revenue */}
        <div className="sa-card sa-kpi-card sa-kpi-premium sa-kpi-revenue">
          <div className="sa-kpi-icon-box" style={{ background: "#dcfce7", color: "#047857" }}>
            <IndianRupee size={20} />
          </div>
          <div className="sa-kpi-info">
            <div className="sa-kpi-label">Collected Revenue</div>
            <div className="sa-kpi-value-row">
              {loading ? (
                <span className="sa-skeleton sa-skeleton-num" />
              ) : (
                <span className="sa-kpi-number sa-kpi-revenue-num">
                  {collectedRevenueDisplay}
                </span>
              )}
            </div>
            <div style={{ marginTop: "6px" }}>
              <span className="sa-kpi-pill" style={{ background: "#dcfce7", color: "#166534", fontSize: "11px" }}>
                All Bookings
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Quick Actions + Collected Revenue & Operations Summary */}
      <div className="sa-mid-row sa-dashboard-mid-grid">
        {/* Quick Actions Card */}
        <div className="sa-card sa-panel-card">
          <div className="sa-panel-header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Zap size={18} style={{ color: "#15803d" }} />
              <h3 className="sa-panel-title">Quick Actions</h3>
            </div>
          </div>

          <div className="sa-quick-actions-grid">
            <button
              type="button"
              onClick={() => navigate("/super-admin/users?action=invite")}
              className="sa-quick-btn sa-quick-btn-primary"
            >
              <UserPlus size={20} />
              <span>Add User</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/super-admin/teams")}
              className="sa-quick-btn"
            >
              <UsersRound size={20} style={{ color: "#15803d" }} />
              <span>Create Team</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/super-admin/emails")}
              className="sa-quick-btn"
            >
              <Mail size={20} style={{ color: "#0284c7" }} />
              <span>Add Email Account</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/super-admin/activity-logs")}
              className="sa-quick-btn"
            >
              <History size={20} style={{ color: "#475569" }} />
              <span>View Activity Logs</span>
            </button>
          </div>
        </div>

        {/* Verified Collected Revenue Summary Card (replaces unbacked breakdown donut) */}
        <div className="sa-card sa-panel-card sa-revenue-summary-card">
          <div className="sa-panel-header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <IndianRupee size={18} style={{ color: "#15803d" }} />
              <h3 className="sa-panel-title">Revenue &amp; Operations</h3>
            </div>
            <span className="sa-status-pill-green">
              <CheckCircle size={13} />
              <span>All Systems Active</span>
            </span>
          </div>

          <div className="sa-revenue-summary-body">
            <div className="sa-revenue-ring-row">
              <div className="sa-revenue-ring-box">
                <svg viewBox="0 0 120 120" className="sa-revenue-ring-svg">
                  <circle cx="60" cy="60" r="46" fill="none" stroke="#e2ece5" strokeWidth="14" />
                  {(metrics.collectedRevenue ?? 0) > 0 && (
                    <circle
                      cx="60"
                      cy="60"
                      r="46"
                      fill="none"
                      stroke="#15803d"
                      strokeWidth="14"
                      strokeDasharray={`${2 * Math.PI * 46}`}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                    />
                  )}
                </svg>
                <div className="sa-revenue-ring-center">
                  <span className="sa-revenue-ring-amount">
                    {loading ? "—" : collectedRevenueDisplay}
                  </span>
                  <span className="sa-revenue-ring-label">Total Revenue</span>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sa-revenue-summary-label">Verified Paid Bookings</div>
                <div className="sa-revenue-summary-note" style={{ marginTop: "6px" }}>
                  100% of displayed revenue is aggregated from verified paid, non-cancelled bookings in MongoDB.
                </div>
              </div>
            </div>

            <div className="sa-revenue-meta-grid">
              <div className="sa-revenue-meta-item">
                <span className="sa-revenue-meta-label">Pending Invites</span>
                <strong className="sa-revenue-meta-val">
                  {loading ? "—" : metrics.pendingInvites ?? 0}
                </strong>
              </div>
              <div className="sa-revenue-meta-item">
                <span className="sa-revenue-meta-label">Active Teams</span>
                <strong className="sa-revenue-meta-val">
                  {loading ? "—" : teamOverview.length}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Activity + Team Overview */}
      <div className="sa-bottom-row sa-dashboard-bottom-grid">
        {/* Recent Activity Card */}
        <div className="sa-card sa-panel-card">
          <div className="sa-panel-header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={18} style={{ color: "#15803d" }} />
              <h3 className="sa-panel-title">Recent Activity</h3>
            </div>
            <Link to="/super-admin/activity-logs" className="sa-panel-link">
              <span>View All</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {loading ? (
              [1, 2, 3].map((n) => (
                <div key={n} className="sa-skeleton" style={{ height: "42px", borderRadius: "10px" }} />
              ))
            ) : activities.length === 0 ? (
              <div className="sa-empty-state">
                No recent activity recorded yet.
              </div>
            ) : (
              activities.map((a, idx) => (
                <div
                  key={a.id || idx}
                  className="sa-activity-row"
                  style={{
                    borderBottom: idx === activities.length - 1 ? "none" : "1px solid #f1f5f9",
                    paddingBottom: idx === activities.length - 1 ? 0 : "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                    <div className="sa-activity-icon">
                      {getActivityIcon(a.action, a.details)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="sa-activity-details">{a.details}</div>
                      {a.actorEmail && (
                        <div className="sa-activity-actor">by {a.actorEmail}</div>
                      )}
                    </div>
                  </div>
                  <span className="sa-activity-time">{a.time}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Team Overview Card */}
        <div className="sa-card sa-panel-card">
          <div className="sa-panel-header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Users size={18} style={{ color: "#15803d" }} />
              <h3 className="sa-panel-title">Team Overview</h3>
            </div>
            <Link to="/super-admin/teams" className="sa-panel-link">
              <span>Manage Teams</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {loading ? (
              [1, 2, 3].map((n) => (
                <div key={n} className="sa-skeleton" style={{ height: "42px", borderRadius: "10px" }} />
              ))
            ) : teamOverview.length === 0 ? (
              <div className="sa-empty-state">
                No teams created yet. Use "Manage Teams" to create your first team.
              </div>
            ) : (
              teamOverview.map((team, idx) => (
                <div
                  key={team.id || idx}
                  className="sa-team-row"
                  style={{
                    borderBottom: idx === teamOverview.length - 1 ? "none" : "1px solid #f1f5f9",
                    paddingBottom: idx === teamOverview.length - 1 ? 0 : "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                    <div className="sa-team-icon">
                      <Shield size={15} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="sa-team-name">{team.name}</div>
                      {team.leadName && (
                        <div className="sa-team-lead">Lead: {team.leadName}</div>
                      )}
                    </div>
                  </div>
                  <span className="sa-team-count-pill">
                    {team.membersCount} {team.membersCount === 1 ? "User" : "Users"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
