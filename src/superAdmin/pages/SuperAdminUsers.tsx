import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Search,
  Plus,
  Edit2,
  Copy,
  Check,
  Send,
  Lock,
  UserX,
  UserCheck,
  Key,
  Shield,
  Users,
  ExternalLink,
} from "lucide-react";
import { API_BASE_URL } from "../../api";
import { Modal } from "../../admin/ui/Modal";
import { getSuperAdminToken, clearSuperAdminAuth } from "../authHelper";

interface StaffUser {
  _id: string;
  type: "user" | "invitation";
  name: string;
  email: string;
  role: string;
  department: string;
  team: string;
  teamId?: string | null;
  status:
    | "Active"
    | "Invited"
    | "Pending Verification"
    | "Verified — Password Pending"
    | "Suspended"
    | "Inactive"
    | "Revoked"
    | "Invitation Revoked"
    | string;
  lastLogin: string;
  isSuspended: boolean;
  deliveryStatus?: string;
}

interface CustomerUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  authProvider: string;
  isEmailVerified: boolean;
  status: "Active" | "Inactive" | "Suspended";
  isSuspended: boolean;
  bookingsCount: number;
  createdAt: string;
  lastLogin: string;
}

interface TeamItem {
  _id: string;
  name: string;
}

export const SuperAdminUsers: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Primary Section: Staff & Admin Accounts VS Customer Accounts
  const initialSection = searchParams.get("section");
  const [section, setSection] = useState<"staff" | "customers">(
    initialSection === "customers" ? "customers" : "staff"
  );

  // Filter Tabs
  const [staffTab, setStaffTab] = useState<"all" | "active" | "invited" | "suspended">("all");
  const [customerTab, setCustomerTab] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");

  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [customerUsers, setCustomerUsers] = useState<CustomerUser[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);

  const [staffCounts, setStaffCounts] = useState({ total: 0, active: 0, invited: 0, suspended: 0 });
  const [customerCounts, setCustomerCounts] = useState({ total: 0, active: 0, inactive: 0 });
  const [sectionCounts, setSectionCounts] = useState({ staff: 0, customers: 0 });
  const [loading, setLoading] = useState(true);

  // Add Authorized Email Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    department: "Operations",
    teamId: "",
    role: "admin",
    notes: "",
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    message: string;
    registrationLink?: string;
  } | null>(null);

  // Edit Role & Team Modal
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [editRole, setEditRole] = useState("admin");
  const [editTeamId, setEditTeamId] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Copied toast state
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = getSuperAdminToken();
      const res = await axios.get(`${API_BASE_URL}/api/super-admin/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: { section, tab: "all", search },
      });

      if (res.data.success) {
        const STAFF_ROLE_LIST = ["super_admin", "admin", "sales", "sales_lead", "sales_executive", "captain_admin"];
        const rawUsers: any[] = Array.isArray(res.data.users) ? res.data.users : [];

        // 1. Staff & Admin: strictly staff roles only
        const staffList: StaffUser[] = rawUsers.filter((u) => STAFF_ROLE_LIST.includes(u.role));

        // 2. Customers: server customer list + any customer-role accounts that came in the users array
        const fromServer: CustomerUser[] = Array.isArray(res.data.customers) ? res.data.customers : [];
        const customerMap = new Map<string, CustomerUser>();
        for (const c of fromServer) {
          const key = (c.email && c.email !== "—" ? c.email.toLowerCase() : "") || String(c._id);
          customerMap.set(key, c);
        }
        for (const u of rawUsers) {
          if (STAFF_ROLE_LIST.includes(u.role)) continue;
          const key = (u.email ? String(u.email).toLowerCase() : "") || String(u._id);
          if (customerMap.has(key)) continue;
          customerMap.set(key, {
            _id: String(u._id),
            name: u.name || "Customer",
            email: u.email || "—",
            phone: u.phone || "—",
            authProvider: u.authProvider || "Customer Portal",
            isEmailVerified: Boolean(u.isEmailVerified),
            status: u.isSuspended || u.status === "Suspended" ? "Suspended" : u.status === "Inactive" ? "Inactive" : "Active",
            isSuspended: Boolean(u.isSuspended),
            bookingsCount: u.bookingsCount || 0,
            createdAt: u.createdAt
              ? new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
              : "—",
            lastLogin: u.lastLogin || "—",
          });
        }
        const customerList = Array.from(customerMap.values());

        setStaffUsers(staffList);
        setCustomerUsers(customerList);

        // 3. Counts are always computed from the separated lists so they stay accurate
        if (res.data.counts?.staff) {
          setStaffCounts(res.data.counts.staff);
        } else {
          setStaffCounts({
            total: staffList.length,
            active: staffList.filter((u) => !u.isSuspended && u.status === "Active").length,
            invited: staffList.filter((u) => u.type === "invitation" || u.status === "Invited" || u.status === "Pending Verification" || u.status === "Verified — Password Pending").length,
            suspended: staffList.filter((u) => u.isSuspended || u.status === "Suspended").length,
          });
        }
        if (res.data.counts?.customers) {
          setCustomerCounts(res.data.counts.customers);
        } else {
          setCustomerCounts({
            total: customerList.length,
            active: customerList.filter((c) => c.status === "Active").length,
            inactive: customerList.filter((c) => c.status !== "Active").length,
          });
        }
        setSectionCounts({ staff: staffList.length, customers: customerList.length });
      }
    } catch (err: any) {
      console.error("Fetch users error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        clearSuperAdminAuth();
        navigate("/super-admin/login", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const token = getSuperAdminToken();
      const res = await axios.get(`${API_BASE_URL}/api/super-admin/teams`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.data.success) {
        setTeams(res.data.teams);
      }
    } catch (err) {
      console.error("Fetch teams error:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [section, staffTab, customerTab, search]);

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (searchParams.get("action") === "invite") {
      setSection("staff");
      setShowInviteModal(true);
    }
  }, [searchParams]);

  // Handle Authorize Email Submission
  const handleAuthorizeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteResult(null);

    try {
      const token = getSuperAdminToken();
      const res = await axios.post(
        `${API_BASE_URL}/api/super-admin/users/authorize-email`,
        inviteForm,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (res.data.success) {
        setInviteResult({
          message: res.data.message,
          registrationLink: res.data.registrationLink,
        });
        fetchUsers();
      }
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        clearSuperAdminAuth();
        alert(err.response?.data?.message || "Session expired or unauthorized. Please log in again as Super Admin.");
        navigate("/super-admin/login", { replace: true });
        return;
      }
      alert(err.response?.data?.message || "Failed to authorize employee.");
    } finally {
      setInviteLoading(false);
    }
  };

  // Handle Role & Team Update
  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setEditLoading(true);
    try {
      const token = getSuperAdminToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      await axios.put(
        `${API_BASE_URL}/api/super-admin/users/${editingUser._id}/role`,
        { role: editRole },
        { headers }
      );

      await axios.put(
        `${API_BASE_URL}/api/super-admin/users/${editingUser._id}/team`,
        { teamId: editTeamId },
        { headers }
      );

      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update user.");
    } finally {
      setEditLoading(false);
    }
  };

  // Suspend / Reactivate Staff
  const handleToggleSuspend = async (user: StaffUser) => {
    const isBlocked = user.isSuspended || user.status === "Suspended" || user.status === "Inactive";
    const action = isBlocked ? "reactivate" : "suspend";
    const confirmPrompt = isBlocked
      ? `Are you sure you want to reactivate access for ${user.email}?`
      : `Are you sure you want to suspend ${user.email}? Their active sessions will be terminated immediately.`;

    if (!window.confirm(confirmPrompt)) return;

    try {
      const token = getSuperAdminToken();
      const res = await axios.post(
        `${API_BASE_URL}/api/super-admin/users/${user._id}/${action}`,
        { reason: "Suspended by CEO via User Management" },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.data.success) {
        fetchUsers();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to ${action} user.`);
    }
  };

  // Toggle Customer Active Status
  const handleToggleCustomerStatus = async (customer: CustomerUser) => {
    const nextState = customer.status === "Active" ? "deactivate" : "activate";
    if (!window.confirm(`Are you sure you want to ${nextState} customer ${customer.name || customer.email}?`))
      return;

    try {
      const token = getSuperAdminToken();
      const res = await axios.post(
        `${API_BASE_URL}/api/super-admin/customers/${customer._id}/toggle-status`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.data.success) {
        fetchUsers();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update customer status.");
    }
  };

  // Revoke Sessions
  const handleRevokeSessions = async (user: StaffUser) => {
    if (!window.confirm(`Revoke all active sessions for ${user.email}? The user will be required to sign in again.`))
      return;

    try {
      const token = getSuperAdminToken();
      const res = await axios.post(
        `${API_BASE_URL}/api/super-admin/users/${user._id}/revoke-sessions`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.data.success) {
        alert(res.data.message);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to revoke sessions.");
    }
  };

  // Initiate Password Reset
  const handleInitiatePasswordReset = async (user: StaffUser) => {
    try {
      const token = getSuperAdminToken();
      const res = await axios.post(
        `${API_BASE_URL}/api/super-admin/users/${user._id}/initiate-password-reset`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.data.success) {
        prompt(
          `Self-Service Password Reset link generated. Copy and provide this link to ${user.email}:`,
          res.data.resetLink
        );
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to generate reset link.");
    }
  };

  // Resend or Revoke Staff Invitation
  const handleResendInvite = async (invitationId: string) => {
    try {
      const token = getSuperAdminToken();
      const res = await axios.post(
        `${API_BASE_URL}/api/super-admin/users/${invitationId}/resend-invite`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.data.success) {
        setInviteResult({
          message: res.data.message || "Invitation reissued with 24 hours validity.",
          registrationLink: res.data.registrationLink,
        });
        setShowInviteModal(true);
        fetchUsers();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to resend invitation.");
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    if (!window.confirm("Are you sure you want to revoke this pending authorization?")) return;
    try {
      const token = getSuperAdminToken();
      const res = await axios.post(
        `${API_BASE_URL}/api/super-admin/users/${invitationId}/revoke-invite`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.data.success) {
        fetchUsers();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to revoke invitation.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Filter displayed data based on active tabs & search
  const STAFF_ROLES = ["super_admin", "admin", "sales", "sales_lead", "sales_executive", "captain_admin"];
  const displayedStaff = staffUsers.filter((u) => {
    // Strict guard: only staff/admin roles ever appear in the Staff & Admin section
    if (!STAFF_ROLES.includes(u.role)) return false;
    if (staffTab === "active") return !u.isSuspended && u.status === "Active";
    if (staffTab === "invited") return u.type === "invitation" || u.status === "Invited" || u.status === "Pending Verification" || u.status === "Verified — Password Pending";
    if (staffTab === "suspended") return u.isSuspended || u.status === "Suspended" || u.status === "Inactive";
    return true;
  });

  const displayedCustomers = customerUsers.filter((c) => {
    if (customerTab === "active") return c.status === "Active";
    if (customerTab === "inactive") return c.status === "Inactive" || c.status === "Suspended";
    return true;
  });

  return (
    <div>
      {/* Top Segmented Bar: Staff & Admin Accounts VS Customer Accounts */}
      <div
        className="sa-segmented-bar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "#ffffff",
          border: "1px solid #e2ece5",
          borderRadius: "14px",
          padding: "6px",
          marginBottom: "24px",
          width: "fit-content",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setSection("staff");
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 20px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            transition: "all 0.15s ease",
            background: section === "staff" ? "#0e3820" : "transparent",
            color: section === "staff" ? "#ffffff" : "#475569",
            boxShadow: section === "staff" ? "0 4px 12px rgba(14, 56, 32, 0.2)" : "none",
          }}
        >
          <Shield size={16} />
          <span>Staff & Admin Accounts</span>
          <span
            style={{
              fontSize: "11px",
              padding: "2px 7px",
              borderRadius: "10px",
              background: section === "staff" ? "rgba(255,255,255,0.2)" : "#f1f5f9",
              color: section === "staff" ? "#ffffff" : "#475569",
              fontWeight: 700,
            }}
          >
            {sectionCounts.staff}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSection("customers");
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 20px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            transition: "all 0.15s ease",
            background: section === "customers" ? "#0e3820" : "transparent",
            color: section === "customers" ? "#ffffff" : "#475569",
            boxShadow: section === "customers" ? "0 4px 12px rgba(14, 56, 32, 0.2)" : "none",
          }}
        >
          <Users size={16} />
          <span>Customer Accounts</span>
          <span
            style={{
              fontSize: "11px",
              padding: "2px 7px",
              borderRadius: "10px",
              background: section === "customers" ? "rgba(255,255,255,0.2)" : "#f1f5f9",
              color: section === "customers" ? "#ffffff" : "#475569",
              fontWeight: 700,
            }}
          >
            {sectionCounts.customers}
          </span>
        </button>
      </div>

      {/* SECTION 1: STAFF & ADMIN ACCOUNTS */}
      {section === "staff" && (
        <div style={{ marginBottom: "36px" }}>
          <div className="sa-page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Shield size={18} style={{ color: "#166534" }} />
                <h2 style={{ fontSize: "19px", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                  Staff & Admin Accounts
                </h2>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "20px",
                    background: "#dcfce7",
                    color: "#166534",
                  }}
                >
                  {staffCounts.total} Staff
                </span>
              </div>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
                Manage CEO, Admin, Sales, Operations and Captain Admin permissions.
              </p>
            </div>

            <button
              onClick={() => {
                setInviteResult(null);
                setInviteForm({
                  name: "",
                  email: "",
                  department: "Operations",
                  teamId: teams[0]?._id || "",
                  role: "admin",
                  notes: "",
                });
                setShowInviteModal(true);
              }}
              className="sa-action-btn sa-action-btn-primary"
            >
              <Plus size={16} />
              <span>Add Authorized Email</span>
            </button>
          </div>

          {/* Staff Filter Tabs & Search Filter */}
          <div className="sa-card" style={{ padding: "14px 20px 0", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
              <div className="sa-tabs" style={{ margin: 0, border: "none" }}>
                <button
                  onClick={() => setStaffTab("all")}
                  className={`sa-tab ${staffTab === "all" ? "active" : ""}`}
                >
                  <span>All Staff</span>
                  <span style={{ fontSize: "11px", background: "#f1f5f9", padding: "1px 6px", borderRadius: "4px" }}>
                    {staffCounts.total}
                  </span>
                </button>
                <button
                  onClick={() => setStaffTab("active")}
                  className={`sa-tab ${staffTab === "active" ? "active" : ""}`}
                >
                  <span>Active</span>
                  <span style={{ fontSize: "11px", background: "#dcfce7", color: "#166534", padding: "1px 6px", borderRadius: "4px" }}>
                    {staffCounts.active}
                  </span>
                </button>
                <button
                  onClick={() => setStaffTab("invited")}
                  className={`sa-tab ${staffTab === "invited" ? "active" : ""}`}
                >
                  <span>Invited</span>
                  <span style={{ fontSize: "11px", background: "#fef3c7", color: "#b45309", padding: "1px 6px", borderRadius: "4px" }}>
                    {staffCounts.invited}
                  </span>
                </button>
                <button
                  onClick={() => setStaffTab("suspended")}
                  className={`sa-tab ${staffTab === "suspended" ? "active" : ""}`}
                >
                  <span>Suspended</span>
                  <span style={{ fontSize: "11px", background: "#fee2e2", color: "#991b1b", padding: "1px 6px", borderRadius: "4px" }}>
                    {staffCounts.suspended}
                  </span>
                </button>
              </div>

              <div style={{ position: "relative", minWidth: "260px" }}>
                <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  type="text"
                  placeholder="Search staff by name or email..."
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

          {/* Staff Table Card (Desktop) & Cards (Mobile) */}
          <div className="sa-card sa-list-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="sa-mobile-cards">
            {loading ? (
              <div style={{ textAlign: "center", padding: "32px", color: "#94a3b8", fontSize: "13px" }}>
                Loading staff directory...
              </div>
            ) : displayedStaff.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px", color: "#94a3b8", fontSize: "13px" }}>
                No staff accounts found matching your filters.
              </div>
            ) : (
              displayedStaff.map((u) => (
                <div key={`mob-${u._id}`} className="sa-mobile-card">
                  <div className="sa-mobile-card-top">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                      <div className="sa-mobile-avatar">
                        {(u.name || u.email).charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px", wordBreak: "break-word" }}>
                          {u.name}
                        </div>
                        <div style={{ fontFamily: "monospace", fontSize: "12px", color: "#475569", wordBreak: "break-all" }}>
                          {u.email}
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        flexShrink: 0,
                        background:
                          u.role === "super_admin"
                            ? "#fef3c7"
                            : u.role === "admin"
                            ? "#dcfce7"
                            : "#e0f2fe",
                        color:
                          u.role === "super_admin"
                            ? "#b45309"
                            : u.role === "admin"
                            ? "#166534"
                            : "#0369a1",
                      }}
                    >
                      {u.role === "super_admin"
                        ? "CEO / Super Admin"
                        : u.role === "admin"
                        ? "Admin"
                        : u.role === "sales_lead"
                        ? "Sales Lead"
                        : u.role === "sales_executive"
                        ? "Sales Executive"
                        : u.role}
                    </span>
                  </div>

                  <div className="sa-mobile-card-meta">
                    {u.status === "Active" ? (
                      <span className="sa-badge-active">● Active</span>
                    ) : u.status === "Invited" ? (
                      <span className="sa-badge-invited">● Invited</span>
                    ) : u.status === "Pending Verification" ? (
                      <span className="sa-badge-invited" style={{ background: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe" }}>● Pending Verification</span>
                    ) : u.status === "Verified — Password Pending" ? (
                      <span className="sa-badge-invited" style={{ background: "#fef3c7", color: "#b45309", borderColor: "#fde68a" }}>● Verified — Password Pending</span>
                    ) : u.status === "Revoked" || u.status === "Invitation Revoked" ? (
                      <span className="sa-badge-suspended" style={{ background: "#f1f5f9", color: "#64748b", borderColor: "#cbd5e1" }}>● Revoked</span>
                    ) : u.status === "Inactive" ? (
                      <span className="sa-badge-suspended" style={{ background: "#fef3c7", color: "#92400e", borderColor: "#fde68a" }}>● Inactive</span>
                    ) : (
                      <span className="sa-badge-suspended">● Suspended</span>
                    )}
                    <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                      {u.team ? `${u.team} • ` : ""}{u.lastLogin || "—"}
                    </span>
                  </div>

                  <div className="sa-mobile-card-actions">
                    {u.type === "invitation" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleResendInvite(u._id)}
                          className="sa-action-btn"
                          style={{ flex: 1, justifyContent: "center", background: "#f0fdf4", color: "#166534", borderColor: "#bbf7d0" }}
                        >
                          <Send size={13} />
                          <span>Resend</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevokeInvite(u._id)}
                          className="sa-action-btn"
                          style={{ flex: 1, justifyContent: "center", background: "#fee2e2", color: "#991b1b", borderColor: "#fecaca" }}
                        >
                          <span>Revoke</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUser(u);
                            setEditRole(u.role);
                            setEditTeamId(u.teamId || "");
                          }}
                          className="sa-action-btn"
                          style={{ flex: 1, justifyContent: "center" }}
                        >
                          <Edit2 size={13} />
                          <span>Edit Role</span>
                        </button>
                        {u.role !== "super_admin" && (
                          <button
                            type="button"
                            onClick={() => handleToggleSuspend(u)}
                            className="sa-action-btn"
                            style={{
                              flex: 1,
                              justifyContent: "center",
                              color: u.isSuspended || u.status === "Suspended" || u.status === "Inactive" ? "#166534" : "#b91c1c",
                            }}
                          >
                            {u.isSuspended || u.status === "Suspended" || u.status === "Inactive" ? (
                              <>
                                <UserCheck size={13} />
                                <span>Activate</span>
                              </>
                            ) : (
                              <>
                                <UserX size={13} />
                                <span>Suspend</span>
                              </>
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="sa-table-wrapper sa-desktop-table">
            <table className="sa-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Team</th>
                <th>Status</th>
                <th>Last Login</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "36px", color: "#94a3b8" }}>
                    Loading staff directory...
                  </td>
                </tr>
              ) : displayedStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "36px", color: "#94a3b8" }}>
                    No staff accounts found matching your filters.
                  </td>
                </tr>
              ) : (
                displayedStaff.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>{u.name}</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>{u.department}</div>
                    </td>
                    <td>
                      <span style={{ fontFamily: "monospace", fontSize: "12.5px" }}>{u.email}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background:
                            u.role === "super_admin"
                              ? "#fef3c7"
                              : u.role === "admin"
                              ? "#dcfce7"
                              : "#e0f2fe",
                          color:
                            u.role === "super_admin"
                              ? "#b45309"
                              : u.role === "admin"
                              ? "#166534"
                              : "#0369a1",
                        }}
                      >
                        {u.role === "super_admin"
                          ? "CEO / Super Admin"
                          : u.role === "admin"
                          ? "Admin"
                          : u.role === "sales_lead"
                          ? "Sales Lead"
                          : u.role === "sales_executive"
                          ? "Sales Executive"
                          : u.role}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", color: "#475569" }}>{u.team}</span>
                    </td>
                    <td>
                      {u.status === "Active" ? (
                        <span className="sa-badge-active">● Active</span>
                      ) : u.status === "Invited" ? (
                        <span className="sa-badge-invited">● Invited</span>
                      ) : u.status === "Pending Verification" ? (
                        <span className="sa-badge-invited" style={{ background: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe" }}>● Pending Verification</span>
                      ) : u.status === "Verified — Password Pending" ? (
                        <span className="sa-badge-invited" style={{ background: "#fef3c7", color: "#b45309", borderColor: "#fde68a" }}>● Verified — Password Pending</span>
                      ) : u.status === "Revoked" || u.status === "Invitation Revoked" ? (
                        <span className="sa-badge-suspended" style={{ background: "#f1f5f9", color: "#64748b", borderColor: "#cbd5e1" }}>● Revoked</span>
                      ) : u.status === "Inactive" ? (
                        <span className="sa-badge-suspended" style={{ background: "#fef3c7", color: "#92400e", borderColor: "#fde68a" }}>● Inactive</span>
                      ) : (
                        <span className="sa-badge-suspended">● Suspended</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>{u.lastLogin}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        {u.type === "invitation" ? (
                          <>
                            <button
                              onClick={() => handleResendInvite(u._id)}
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
                              title="Resend invitation token"
                            >
                              <Send size={12} />
                              <span>Resend</span>
                            </button>
                            <button
                              onClick={() => handleRevokeInvite(u._id)}
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
                              title="Revoke authorization"
                            >
                              Revoke
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setEditRole(u.role);
                                setEditTeamId(u.teamId || "");
                              }}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: "#475569",
                                padding: "5px",
                                cursor: "pointer",
                              }}
                              title="Edit Role & Team"
                            >
                              <Edit2 size={15} />
                            </button>

                            {u.role !== "super_admin" && (
                              <>
                                {(() => {
                                  const isBlocked = u.isSuspended || u.status === "Suspended" || u.status === "Inactive";
                                  return (
                                    <button
                                      onClick={() => handleToggleSuspend(u)}
                                      style={{
                                        border: "none",
                                        background: "transparent",
                                        color: isBlocked ? "#15803d" : "#ef4444",
                                        padding: "5px",
                                        cursor: "pointer",
                                      }}
                                      title={isBlocked ? "Reactivate Account" : "Suspend Account"}
                                    >
                                      {isBlocked ? <UserCheck size={16} /> : <UserX size={16} />}
                                    </button>
                                  );
                                })()}

                                <button
                                  onClick={() => handleRevokeSessions(u)}
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    color: "#b45309",
                                    padding: "5px",
                                    cursor: "pointer",
                                  }}
                                  title="Revoke Active Sessions"
                                >
                                  <Lock size={15} />
                                </button>

                                <button
                                  onClick={() => handleInitiatePasswordReset(u)}
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    color: "#0369a1",
                                    padding: "5px",
                                    cursor: "pointer",
                                  }}
                                  title="Issue Self-Service Password Reset"
                                >
                                  <Key size={15} />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
        </div>
      )}

      {/* SECTION 2: CUSTOMER ACCOUNTS & TRAVELLERS */}
      {section === "customers" && (
        <div style={{ marginBottom: "36px" }}>
          <div className="sa-page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Users size={18} style={{ color: "#0369a1" }} />
                <h2 style={{ fontSize: "19px", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                  Customer Accounts & Travellers
                </h2>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "20px",
                    background: "#e0f2fe",
                    color: "#0369a1",
                  }}
                >
                  {customerCounts.total} Registered Customers
                </span>
              </div>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
                Registered customer logins, verified email accounts, authentication providers, and order activity.
              </p>
            </div>
          </div>

          {/* Customer Filter Tabs & Search */}
          <div className="sa-card" style={{ padding: "14px 20px 0", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
              <div className="sa-tabs" style={{ margin: 0, border: "none" }}>
                <button
                  onClick={() => setCustomerTab("all")}
                  className={`sa-tab ${customerTab === "all" ? "active" : ""}`}
                >
                  <span>All Customers</span>
                  <span style={{ fontSize: "11px", background: "#f1f5f9", padding: "1px 6px", borderRadius: "4px" }}>
                    {customerCounts.total}
                  </span>
                </button>
                <button
                  onClick={() => setCustomerTab("active")}
                  className={`sa-tab ${customerTab === "active" ? "active" : ""}`}
                >
                  <span>Active</span>
                  <span style={{ fontSize: "11px", background: "#dcfce7", color: "#166534", padding: "1px 6px", borderRadius: "4px" }}>
                    {customerCounts.active}
                  </span>
                </button>
                <button
                  onClick={() => setCustomerTab("inactive")}
                  className={`sa-tab ${customerTab === "inactive" ? "active" : ""}`}
                >
                  <span>Inactive</span>
                  <span style={{ fontSize: "11px", background: "#fee2e2", color: "#991b1b", padding: "1px 6px", borderRadius: "4px" }}>
                    {customerCounts.inactive}
                  </span>
                </button>
              </div>

              <div style={{ position: "relative", minWidth: "260px" }}>
                <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  type="text"
                  placeholder="Search customers by name, phone or email..."
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

          <div className="sa-card sa-list-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="sa-mobile-cards">
              {loading ? (
                <div style={{ textAlign: "center", padding: "32px", color: "#94a3b8", fontSize: "13px" }}>
                  Loading customer accounts...
                </div>
              ) : displayedCustomers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px", color: "#94a3b8", fontSize: "13px" }}>
                  No customer accounts found matching your filters.
                </div>
              ) : (
                displayedCustomers.map((c) => (
                  <div key={`mob-cust-${c._id}`} className="sa-mobile-card">
                    <div className="sa-mobile-card-top">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                        <div className="sa-mobile-avatar">
                          {(c.name || c.email).charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px", wordBreak: "break-word" }}>
                            {c.name}
                          </div>
                          <div style={{ fontFamily: "monospace", fontSize: "12px", color: "#475569", wordBreak: "break-all" }}>
                            {c.email}
                          </div>
                          {c.phone && (
                            <div style={{ fontSize: "12px", color: "#64748b" }}>{c.phone}</div>
                          )}
                        </div>
                      </div>
                      {c.status === "Active" ? (
                        <span className="sa-badge-active">● Active</span>
                      ) : (
                        <span className="sa-badge-suspended">● Inactive</span>
                      )}
                    </div>

                    <div className="sa-mobile-card-meta">
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#166534" }}>
                        {c.bookingsCount} {c.bookingsCount === 1 ? "Booking" : "Bookings"}
                      </span>
                      <span style={{ fontSize: "11.5px", color: "#64748b", textTransform: "capitalize" }}>
                        {c.authProvider} • {c.createdAt}
                      </span>
                    </div>

                    <div className="sa-mobile-card-actions">
                      <button
                        type="button"
                        onClick={() => handleToggleCustomerStatus(c)}
                        className="sa-action-btn"
                        style={{
                          flex: 1,
                          justifyContent: "center",
                          color: c.status === "Active" ? "#b91c1c" : "#15803d",
                        }}
                      >
                        {c.status === "Active" ? <UserX size={13} /> : <UserCheck size={13} />}
                        <span>{c.status === "Active" ? "Deactivate" : "Activate"}</span>
                      </button>
                      {c.bookingsCount > 0 && (
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/bookings?search=${encodeURIComponent(c.email || c.phone)}`)}
                          className="sa-action-btn"
                          style={{ flex: 1, justifyContent: "center", color: "#0369a1" }}
                          title="View Customer Bookings"
                        >
                          <ExternalLink size={13} />
                          <span>View Bookings</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="sa-table-wrapper sa-desktop-table">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Email Address</th>
                    <th>Mobile Number</th>
                    <th>Auth Provider</th>
                    <th>Total Bookings</th>
                    <th>Registered Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "36px", color: "#94a3b8" }}>
                        Loading customer accounts...
                      </td>
                    </tr>
                  ) : displayedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "36px", color: "#94a3b8" }}>
                        No customer accounts found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    displayedCustomers.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>{c.name}</div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "12.5px" }}>{c.email}</span>
                        {c.isEmailVerified && (
                          <span title="Email Verified" style={{ color: "#16a34a", fontSize: "11px", fontWeight: 700 }}>
                            ✓
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "12.5px", color: "#334155" }}>{c.phone}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background:
                            c.authProvider === "google"
                              ? "#fee2e2"
                              : c.authProvider === "firebase"
                              ? "#fef3c7"
                              : "#e0f2fe",
                          color:
                            c.authProvider === "google"
                              ? "#991b1b"
                              : c.authProvider === "firebase"
                              ? "#92400e"
                              : "#0369a1",
                          textTransform: "capitalize",
                        }}
                      >
                        {c.authProvider}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          background: c.bookingsCount > 0 ? "#dcfce7" : "#f1f5f9",
                          color: c.bookingsCount > 0 ? "#166534" : "#64748b",
                        }}
                      >
                        {c.bookingsCount} {c.bookingsCount === 1 ? "Booking" : "Bookings"}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>{c.createdAt}</span>
                    </td>
                    <td>
                      {c.status === "Active" ? (
                        <span className="sa-badge-active">● Active</span>
                      ) : (
                        <span className="sa-badge-suspended">● Inactive</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <button
                          onClick={() => handleToggleCustomerStatus(c)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: c.status === "Active" ? "#ef4444" : "#15803d",
                            padding: "5px",
                            cursor: "pointer",
                          }}
                          title={c.status === "Active" ? "Deactivate Customer" : "Activate Customer"}
                        >
                          {c.status === "Active" ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button
                          onClick={() => navigate(`/admin/bookings?search=${encodeURIComponent(c.email || c.phone)}`)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#0369a1",
                            padding: "5px",
                            cursor: "pointer",
                          }}
                          title="View Customer Bookings"
                        >
                          <ExternalLink size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
        </div>
      )}

      {/* Add Authorized Email Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Authorize Employee Email"
      >
        {inviteResult ? (
          <div style={{ padding: "10px 0" }}>
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#166534", fontWeight: 700, marginBottom: "6px" }}>
                <span>✓ Authorization Created</span>
              </div>
              <p style={{ fontSize: "13px", color: "#166534", margin: 0 }}>
                {inviteResult.message}
              </p>
            </div>

            {inviteResult.registrationLink && (
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                  Single-Use Employee Registration Link (Valid 24 Hours)
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    readOnly
                    value={inviteResult.registrationLink}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                      fontFamily: "monospace",
                      background: "#f8faf8",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(inviteResult.registrationLink!)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: copiedLink ? "#15803d" : "#0e3820",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "0 16px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedLink ? "Copied" : "Copy Link"}</span>
                  </button>
                </div>
                <p style={{ fontSize: "11.5px", color: "#64748b", marginTop: "6px" }}>
                  Hand this link directly to the employee if email delivery is not configured. The employee will verify their account and choose their own secure password.
                </p>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="sa-action-btn sa-action-btn-primary"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAuthorizeEmail} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                Employee Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                Approved Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="employee@traviska.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                }}
              />
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                Only this exact email address will be permitted to complete registration.
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                  Assigned Role *
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                  }}
                >
                  <option value="admin">Admin</option>
                  <option value="sales_lead">Sales Lead</option>
                  <option value="sales_executive">Sales Executive</option>
                  <option value="captain_admin">Captain Operations Admin</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                  Assigned Team
                </label>
                <select
                  value={inviteForm.teamId}
                  onChange={(e) => setInviteForm({ ...inviteForm, teamId: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                  }}
                >
                  <option value="">-- No Team (Direct) --</option>
                  {teams.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                Department
              </label>
              <input
                type="text"
                placeholder="Operations / Sales / Field"
                value={inviteForm.department}
                onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                Internal Notes (Optional)
              </label>
              <textarea
                placeholder="Notes for executive record..."
                rows={2}
                value={inviteForm.notes}
                onChange={(e) => setInviteForm({ ...inviteForm, notes: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="sa-action-btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviteLoading}
                className="sa-action-btn sa-action-btn-primary"
              >
                {inviteLoading ? "Authorizing..." : "Authorize Employee"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Role & Team Modal */}
      {editingUser && (
        <Modal
          isOpen={Boolean(editingUser)}
          onClose={() => setEditingUser(null)}
          title={`Edit Role & Team — ${editingUser.name}`}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                Assigned Role
              </label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                }}
              >
                <option value="super_admin">CEO / Super Admin</option>
                <option value="admin">Admin</option>
                <option value="sales_lead">Sales Lead</option>
                <option value="sales_executive">Sales Executive</option>
                <option value="captain_admin">Captain Operations Admin</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                Assigned Team
              </label>
              <select
                value={editTeamId}
                onChange={(e) => setEditTeamId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                }}
              >
                <option value="">-- No Team (Direct) --</option>
                {teams.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="sa-action-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={editLoading}
                onClick={handleSaveEdit}
                className="sa-action-btn sa-action-btn-primary"
              >
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
