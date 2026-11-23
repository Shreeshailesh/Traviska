import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Send,
  AlertCircle,
  Plus,
} from "lucide-react";
import { API_BASE_URL } from "../../api";
import { getSuperAdminToken, clearSuperAdminAuth } from "../authHelper";
import { useNavigate } from "react-router-dom";

interface EmailItem {
  _id: string;
  email: string;
  name: string;
  role: string;
  teamName: string;
  status: "Active" | "Pending" | "Expired" | "Revoked" | "Suspended";
  verificationStatus: string;
  invitedOn?: string;
  createdAt?: string;
  expiresAt?: string;
  deliveryStatus?: string;
}

export const SuperAdminEmails: React.FC = () => {
  const [tab, setTab] = useState<"authorized" | "pending" | "expired">("authorized");
  const [activeAccounts, setActiveAccounts] = useState<EmailItem[]>([]);
  const [pendingInvites, setPendingInvites] = useState<EmailItem[]>([]);
  const [expiredOrRevoked, setExpiredOrRevoked] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const token = getSuperAdminToken();
      const res = await axios.get(`${API_BASE_URL}/api/super-admin/emails`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.data.success) {
        setActiveAccounts(res.data.activeAccounts || []);
        setPendingInvites(res.data.pendingInvites || []);
        setExpiredOrRevoked(res.data.expiredOrRevoked || []);
      }
    } catch (err: any) {
      console.error("Fetch emails error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        clearSuperAdminAuth();
        navigate("/super-admin/login", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleResend = async (id: string) => {
    try {
      const token = getSuperAdminToken();
      const res = await axios.post(
        `${API_BASE_URL}/api/super-admin/users/${id}/resend-invite`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.data.success) {
        prompt("Invitation reissued. Copy secure link:", res.data.registrationLink);
        fetchEmails();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to resend invite.");
    }
  };

  const handleRevoke = async (id: string, email: string) => {
    if (!window.confirm(`Are you sure you want to revoke authorization for ${email}?`)) return;
    try {
      const token = getSuperAdminToken();
      await axios.post(
        `${API_BASE_URL}/api/super-admin/users/${id}/revoke-invite`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      fetchEmails();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to revoke invitation.");
    }
  };

  const currentList =
    tab === "authorized"
      ? activeAccounts
      : tab === "pending"
      ? pendingInvites
      : expiredOrRevoked;

  return (
    <div>
      {/* Header */}
      <div className="sa-page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0, color: "#0f172a" }}>Email & Accounts</h2>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
            Approve emails, manage invitations and authorized staff identities.
          </p>
        </div>

        <button
          onClick={() => navigate("/super-admin/users?action=invite")}
          className="sa-action-btn sa-action-btn-primary"
        >
          <Plus size={16} />
          <span>Authorize New Email</span>
        </button>
      </div>

      {/* Advisory Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "12px",
          padding: "12px 18px",
          marginBottom: "20px",
          fontSize: "12.5px",
          color: "#166534",
        }}
      >
        <AlertCircle size={16} style={{ flexShrink: 0 }} />
        <span>
          <strong>Platform Notice:</strong> Authorizing an email grants secure login access to the Traviska workspace. It does not provision a third-party mailbox (such as Google Workspace or Outlook).
        </span>
      </div>

      {/* Tabs */}
      <div className="sa-card" style={{ padding: "16px 20px 0", marginBottom: "20px" }}>
        <div className="sa-tabs" style={{ margin: 0, border: "none" }}>
          <button
            onClick={() => setTab("authorized")}
            className={`sa-tab ${tab === "authorized" ? "active" : ""}`}
          >
            <span>Authorized Accounts</span>
            <span style={{ fontSize: "11px", background: "#dcfce7", color: "#166534", padding: "1px 6px", borderRadius: "4px" }}>
              {activeAccounts.length}
            </span>
          </button>
          <button
            onClick={() => setTab("pending")}
            className={`sa-tab ${tab === "pending" ? "active" : ""}`}
          >
            <span>Pending Invitations</span>
            <span style={{ fontSize: "11px", background: "#fef3c7", color: "#b45309", padding: "1px 6px", borderRadius: "4px" }}>
              {pendingInvites.length}
            </span>
          </button>
          <button
            onClick={() => setTab("expired")}
            className={`sa-tab ${tab === "expired" ? "active" : ""}`}
          >
            <span>Expired / Revoked</span>
            <span style={{ fontSize: "11px", background: "#fee2e2", color: "#991b1b", padding: "1px 6px", borderRadius: "4px" }}>
              {expiredOrRevoked.length}
            </span>
          </button>
        </div>
      </div>

      {/* Table (Desktop) & Cards (Mobile) */}
      <div className="sa-card sa-list-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="sa-mobile-cards">
          {loading ? (
            <div style={{ textAlign: "center", padding: "32px", color: "#94a3b8", fontSize: "13px" }}>
              Loading email identities...
            </div>
          ) : currentList.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px", color: "#94a3b8", fontSize: "13px" }}>
              No accounts found in this category.
            </div>
          ) : (
            currentList.map((item) => (
              <div key={`mob-email-${item._id}`} className="sa-mobile-card">
                <div className="sa-mobile-card-top">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 700, color: "#0f172a", wordBreak: "break-all" }}>
                      {item.email}
                    </div>
                    <div style={{ fontSize: "12.5px", color: "#475569", marginTop: "2px" }}>
                      Assigned: <strong>{item.name}</strong>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 700,
                      flexShrink: 0,
                      background: item.role === "super_admin" ? "#fef3c7" : "#dcfce7",
                      color: item.role === "super_admin" ? "#b45309" : "#166534",
                    }}
                  >
                    {item.role === "super_admin"
                      ? "CEO / Super Admin"
                      : item.role === "admin"
                      ? "Admin"
                      : item.role === "sales_lead"
                      ? "Sales Lead"
                      : item.role === "sales_executive"
                      ? "Sales Executive"
                      : item.role}
                  </span>
                </div>

                <div className="sa-mobile-card-meta">
                  {item.status === "Active" ? (
                    <span className="sa-badge-active">● Active</span>
                  ) : item.status === "Pending" ? (
                    <span className="sa-badge-invited">● Pending Invite</span>
                  ) : (
                    <span className="sa-badge-suspended">● {item.status}</span>
                  )}
                  <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                    {item.teamName ? `${item.teamName} • ` : ""}
                    {item.invitedOn
                      ? new Date(item.invitedOn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </span>
                </div>

                {tab === "pending" && (
                  <div className="sa-mobile-card-actions">
                    <button
                      type="button"
                      onClick={() => handleResend(item._id)}
                      className="sa-action-btn"
                      style={{ flex: 1, justifyContent: "center", background: "#f0fdf4", color: "#166534", borderColor: "#bbf7d0" }}
                    >
                      <Send size={12} />
                      <span>Resend</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRevoke(item._id, item.email)}
                      className="sa-action-btn"
                      style={{ flex: 1, justifyContent: "center", background: "#fee2e2", color: "#991b1b", borderColor: "#fecaca" }}
                    >
                      <span>Revoke</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="sa-table-wrapper sa-desktop-table">
          <table className="sa-table">
          <thead>
            <tr>
              <th>Email Address</th>
              <th>Assigned Employee</th>
              <th>Role</th>
              <th>Team</th>
              <th>Status</th>
              <th>Date</th>
              {tab === "pending" && <th style={{ textAlign: "right" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "36px", color: "#94a3b8" }}>
                  Loading email identities...
                </td>
              </tr>
            ) : currentList.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "36px", color: "#94a3b8" }}>
                  No accounts found in this category.
                </td>
              </tr>
            ) : (
              currentList.map((item) => (
                <tr key={item._id}>
                  <td>
                    <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                      {item.email}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "#1e293b" }}>{item.name}</div>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: item.role === "super_admin" ? "#fef3c7" : "#dcfce7",
                        color: item.role === "super_admin" ? "#b45309" : "#166534",
                      }}
                    >
                      {item.role === "super_admin"
                        ? "CEO / Super Admin"
                        : item.role === "admin"
                        ? "Admin"
                        : item.role === "sales_lead"
                        ? "Sales Lead"
                        : item.role === "sales_executive"
                        ? "Sales Executive"
                        : item.role}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: "12px", color: "#475569" }}>{item.teamName}</span>
                  </td>
                  <td>
                    {item.status === "Active" ? (
                      <span className="sa-badge-active">● Active</span>
                    ) : item.status === "Pending" ? (
                      <span className="sa-badge-invited">● Pending Invite</span>
                    ) : (
                      <span className="sa-badge-suspended">● {item.status}</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      {item.invitedOn
                        ? new Date(item.invitedOn).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
                  </td>
                  {tab === "pending" && (
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          onClick={() => handleResend(item._id)}
                          style={{
                            border: "none",
                            background: "#f0fdf4",
                            color: "#166534",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "11.5px",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Send size={12} />
                          <span>Resend</span>
                        </button>
                        <button
                          onClick={() => handleRevoke(item._id, item.email)}
                          style={{
                            border: "none",
                            background: "#fee2e2",
                            color: "#991b1b",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "11.5px",
                            fontWeight: 600,
                          }}
                        >
                          Revoke
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};
