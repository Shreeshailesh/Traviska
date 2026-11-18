import React, { useState } from "react";
import {
  Settings,
  Shield,
  Mail,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Save,
} from "lucide-react";

export const SuperAdminSettings: React.FC = () => {
  const [sessionTimeout, setSessionTimeout] = useState("24");
  const [require2FA, setRequire2FA] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  return (
    <div style={{ maxWidth: "800px" }}>
      {/* Header */}
      <div className="sa-page-header" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Settings size={20} style={{ color: "#166534" }} />
          <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0, color: "#0f172a" }}>
            Super Admin Settings
          </h1>
        </div>
        <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
          Platform security, session revocation rules, and CEO authorization policies.
        </p>
      </div>

      {savedToast && (
        <div
          style={{
            background: "#dcfce7",
            border: "1px solid #86efac",
            color: "#166534",
            padding: "12px 16px",
            borderRadius: "12px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: 700,
            fontSize: "13px",
          }}
        >
          <CheckCircle2 size={16} />
          <span>Settings saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* CEO Master Identity Card */}
        <div className="sa-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <Shield size={18} style={{ color: "#166534" }} />
            <h3 style={{ fontSize: "15px", fontWeight: 800, margin: 0, color: "#0f172a" }}>
              CEO Identity & Authorization Authority
            </h3>
          </div>

          <div style={{ background: "#f8faf8", border: "1px solid #e2ece5", borderRadius: "12px", padding: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <span style={{ fontSize: "11.5px", color: "#64748b", display: "block" }}>CEO Email</span>
                <strong style={{ fontSize: "13.5px", color: "#0f172a" }}>owner@traviska.com</strong>
              </div>
              <div>
                <span style={{ fontSize: "11.5px", color: "#64748b", display: "block" }}>Platform Role</span>
                <span style={{ display: "inline-block", background: "#fef3c7", color: "#92400e", fontWeight: 800, fontSize: "11.5px", padding: "2px 8px", borderRadius: "6px" }}>
                  👑 SUPER ADMIN
                </span>
              </div>
            </div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "12px 0 0" }}>
              Only the CEO account can authorize new employee emails or modify role boundaries.
            </p>
          </div>
        </div>

        {/* Security & Session Rules */}
        <div className="sa-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <Lock size={18} style={{ color: "#166534" }} />
            <h3 style={{ fontSize: "15px", fontWeight: 800, margin: 0, color: "#0f172a" }}>
              Security & Session Policies
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px", color: "#334155" }}>
                Staff JWT Session Duration (Hours)
              </label>
              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="sa-select"
                style={{ maxWidth: "240px" }}
              >
                <option value="12">12 Hours</option>
                <option value="24">24 Hours (Default)</option>
                <option value="48">48 Hours</option>
                <option value="168">7 Days</option>
              </select>
              <span style={{ fontSize: "11.5px", color: "#64748b", display: "block", marginTop: "4px" }}>
                Active sessions can be immediately invalidated per employee from the User Management directory.
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingTop: "8px" }}>
              <input
                type="checkbox"
                id="twoFactor"
                checked={require2FA}
                onChange={(e) => setRequire2FA(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "#166534" }}
              />
              <label htmlFor="twoFactor" style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>
                Require Email OTP verification on employee registration and password setup
              </label>
            </div>
          </div>
        </div>

        {/* Email & SMTP Status */}
        <div className="sa-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <Mail size={18} style={{ color: "#166534" }} />
            <h3 style={{ fontSize: "15px", fontWeight: 800, margin: 0, color: "#0f172a" }}>
              Email Delivery Service
            </h3>
          </div>

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <AlertTriangle size={18} style={{ color: "#f59e0b" }} />
              <strong style={{ fontSize: "13px", color: "#0f172a" }}>
                Manual Handoff Mode Active
              </strong>
            </div>
            <p style={{ fontSize: "12.5px", color: "#475569", margin: "0 0 10px" }}>
              SMTP credentials are not detected in the environment. Staff invitation links are generated as secure, time-limited single-use handoff links in the portal for the CEO to share directly.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button type="submit" className="sa-action-btn sa-action-btn-primary" style={{ padding: "10px 24px" }}>
            <Save size={16} />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
