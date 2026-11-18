import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Filter,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { API_BASE_URL } from "../../api";

interface AuditLogItem {
  _id: string;
  eventId: string;
  action: string;
  details: string;
  actorEmail: string;
  actorRole: string;
  targetEmail: string;
  result: "success" | "failure" | "blocked";
  time: string;
  date: string;
}

export const SuperAdminActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [actionFilter, setActionFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("7days");
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/api/super-admin/activity-logs`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: { action: actionFilter, filter: dateFilter },
      });
      if (res.data.success) {
        setLogs(res.data.logs || []);
      }
    } catch (err) {
      console.error("Fetch activity logs error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, dateFilter]);

  const getActionBadge = (action: string) => {
    if (action.includes("created") || action.includes("activated") || action.includes("added")) {
      return { bg: "#dcfce7", color: "#166534" };
    }
    if (action.includes("suspended") || action.includes("revoked") || action.includes("removed")) {
      return { bg: "#fee2e2", color: "#991b1b" };
    }
    if (action.includes("updated") || action.includes("assigned") || action.includes("resent")) {
      return { bg: "#e0f2fe", color: "#0369a1" };
    }
    return { bg: "#f1f5f9", color: "#475569" };
  };

  return (
    <div>
      {/* Header */}
      <div className="sa-page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0, color: "#0f172a" }}>Activity Logs</h2>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
            Audit trail of invitations, user logins, role updates, team modifications, and security actions.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="sa-card" style={{ padding: "14px 20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Filter size={15} color="#64748b" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                background: "#ffffff",
              }}
            >
              <option value="">All Actions</option>
              <option value="invitation.created">Invitation Created</option>
              <option value="invitation.resent">Invitation Resent</option>
              <option value="invitation.revoked">Invitation Revoked</option>
              <option value="staff.activated">Staff Activated</option>
              <option value="role.updated">Role Updated</option>
              <option value="team.created">Team Created</option>
              <option value="team.updated">Team Updated</option>
              <option value="account.suspended">Account Suspended</option>
              <option value="account.reactivated">Account Reactivated</option>
              <option value="sessions.revoked">Sessions Revoked</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            {[
              { id: "today", label: "Today" },
              { id: "7days", label: "Last 7 Days" },
              { id: "30days", label: "Last 30 Days" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: dateFilter === f.id ? 700 : 500,
                  border: "none",
                  cursor: "pointer",
                  background: dateFilter === f.id ? "#0e3820" : "#f1f5f9",
                  color: dateFilter === f.id ? "#ffffff" : "#475569",
                  transition: "all 0.15s ease",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="sa-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="sa-table-wrapper">
          <table className="sa-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target</th>
              <th>Event Details</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "36px", color: "#94a3b8" }}>
                  Loading activity logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "36px", color: "#94a3b8" }}>
                  No activity records found for this period.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const badge = getActionBadge(log.action);
                return (
                  <tr key={log._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{log.date}</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>{log.time}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: "#1e293b" }}>{log.actorEmail}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>{log.actorRole}</div>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.color,
                          fontFamily: "monospace",
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", color: "#475569", fontFamily: "monospace" }}>
                        {log.targetEmail || "—"}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "12.5px", color: "#1e293b" }}>{log.details}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: log.result === "success" ? "#166534" : "#991b1b",
                        }}
                      >
                        {log.result === "success" ? (
                          <>
                            <CheckCircle2 size={13} color="#166534" />
                            <span>Success</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={13} color="#991b1b" />
                            <span>{log.result}</span>
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};
