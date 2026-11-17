import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../api";
import { useSalesAuth } from "./SalesAuthContext";
import { StatCard } from "../admin/ui/StatCard";
import {
  RefreshCw,
  ShieldCheck,
  Database,
  Cloud,
  Sparkles,
  Layers,
  RotateCw,
} from "lucide-react";

export const OdooSyncCenter: React.FC = () => {
  const { token } = useSalesAuth();
  const [odooStatus, setOdooStatus] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/sales/odoo/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setOdooStatus(res.data.odoo);
      }
    } catch (err) {
      console.error("Error fetching Odoo status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchStatus();
  }, [token]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "960px", margin: "0 auto" }}>
      {/* Page Header (Admin Design Standard) */}
      <div className="admin-page-header">
        <div className="admin-page-title-box">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1>Odoo CRM Synchronization Center</h1>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 9px",
                borderRadius: "20px",
                background: "#fef9c3",
                color: "#a16207",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              Standby Mode (Safe)
            </span>
          </div>
          <p>
            Decoupled integration architecture: MongoDB functions as the operational datastore with permanent IDs ready for future Odoo connection.
          </p>
        </div>

        <button
          type="button"
          className="admin-btn-secondary"
          onClick={fetchStatus}
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <RotateCw size={14} className={isLoading ? "spin-icon" : ""} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Mountain Watermark Banner */}
      <div
        style={{
          position: "relative",
          background: "linear-gradient(135deg, #092312 0%, #0d381c 50%, #164e27 100%)",
          borderRadius: "16px",
          padding: "24px 28px",
          color: "#ffffff",
          overflow: "hidden",
          boxShadow: "0 4px 14px rgba(13, 43, 23, 0.15)",
        }}
      >
        <svg
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            height: "100%",
            width: "50%",
            opacity: 0.16,
            pointerEvents: "none",
          }}
          preserveAspectRatio="none"
          viewBox="0 0 400 160"
        >
          <path d="M0 160 L70 80 L140 140 L220 50 L300 130 L370 70 L400 110 L400 160 Z" fill="#ffffff" />
          <path d="M100 160 L180 90 L260 150 L340 85 L400 130 L400 160 Z" fill="#a7f3d0" opacity="0.3" />
        </svg>

        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "3px 10px",
                borderRadius: "6px",
                background: "rgba(255, 255, 255, 0.12)",
                color: "#a7f3d0",
                fontSize: "11px",
                fontWeight: 600,
                marginBottom: "8px",
              }}
            >
              <ShieldCheck size={14} />
              <span>Zero External API Calls Made</span>
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 4px" }}>
              MongoDB Primary Storage Active
            </h2>
            <p style={{ margin: 0, fontSize: "12.5px", color: "rgba(255,255,255,0.8)", maxWidth: "550px" }}>
              Every customer inquiry is assigned a permanent idempotent identifier (e.g.{" "}
              <code style={{ background: "rgba(0,0,0,0.3)", padding: "2px 6px", borderRadius: "4px", color: "#a7f3d0" }}>
                TRV-ENQ-...
              </code>
              ). When your Odoo account is created, leads will synchronize cleanly without duplicate records.
            </p>
          </div>

          <div
            style={{
              padding: "12px 18px",
              borderRadius: "12px",
              background: "rgba(0,0,0,0.25)",
              border: "1px solid rgba(255,255,255,0.12)",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "11px", color: "#a7f3d0", fontWeight: 700, textTransform: "uppercase" }}>
              Current Sync Mode
            </span>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#fef08a", marginTop: "2px" }}>
              Standby (Local)
            </div>
          </div>
        </div>
      </div>

      {/* 3 Metrics Cards (Admin Design Standard) */}
      <div className="admin-stats-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        <StatCard
          icon={<Database size={20} />}
          label="MONGODB ENQUIRIES"
          value={odooStatus?.totalEnquiries || 0}
          change="Local CRM"
          isPositive={true}
          subtitle="All inquiries stored securely in MongoDB"
          iconTheme="blue"
        />

        <StatCard
          icon={<RefreshCw size={20} />}
          label="READY FOR MIGRATION"
          value={odooStatus?.pendingSync || odooStatus?.totalEnquiries || 0}
          change="Queued"
          isPositive={true}
          subtitle="Pre-mapped with idempotent key"
          iconTheme="gold"
        />

        <StatCard
          icon={<Cloud size={20} />}
          label="ODOO LIVE LEADS"
          value={0}
          change="Pending Setup"
          isPositive={false}
          subtitle="Awaiting Odoo account creation"
          iconTheme="default"
        />
      </div>

      {/* Schema Mapping Table (Admin Card Style) */}
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
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Layers size={18} color="#164e23" />
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
            Integration Schema Architecture (Ready for Activation)
          </h3>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12.5px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>
                <th style={{ padding: "10px 14px" }}>Traviska Entity</th>
                <th style={{ padding: "10px 14px" }}>Odoo Model</th>
                <th style={{ padding: "10px 14px" }}>Idempotency Key</th>
                <th style={{ padding: "10px 14px" }}>Target Stage / Strategy</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "12px 14px", fontWeight: 700, color: "#0f172a" }}>Customer Enquiries</td>
                <td style={{ padding: "12px 14px", fontFamily: "monospace", color: "#164e23", fontWeight: 700 }}>crm.lead</td>
                <td style={{ padding: "12px 14px", fontFamily: "monospace", color: "#475569" }}>enquiryId</td>
                <td style={{ padding: "12px 14px", color: "#475569" }}>Creates lead with stage, priority &amp; expected revenue</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "12px 14px", fontWeight: 700, color: "#0f172a" }}>Follow-up Tasks</td>
                <td style={{ padding: "12px 14px", fontFamily: "monospace", color: "#164e23", fontWeight: 700 }}>mail.activity</td>
                <td style={{ padding: "12px 14px", fontFamily: "monospace", color: "#475569" }}>followUpId</td>
                <td style={{ padding: "12px 14px", color: "#475569" }}>Syncs interaction deadline, type &amp; outcome log</td>
              </tr>
              <tr>
                <td style={{ padding: "12px 14px", fontWeight: 700, color: "#0f172a" }}>Customer Contacts</td>
                <td style={{ padding: "12px 14px", fontFamily: "monospace", color: "#164e23", fontWeight: 700 }}>res.partner</td>
                <td style={{ padding: "12px 14px", fontFamily: "monospace", color: "#475569" }}>phone / email</td>
                <td style={{ padding: "12px 14px", color: "#475569" }}>Creates or links partner contact profile</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Activation Steps (Admin Card Style) */}
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
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={18} color="#a16207" />
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
            Activation Roadmap (Once Odoo Account is Created)
          </h3>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12.5px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 14px", borderRadius: "10px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#0d2b17", color: "#d9eec7", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "11px", flexShrink: 0 }}>
              1
            </div>
            <div>
              <strong style={{ color: "#0f172a", display: "block" }}>Create Odoo Online Instance</strong>
              <span style={{ color: "#64748b" }}>Register your Odoo Online CRM instance and ensure external API access is enabled.</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 14px", borderRadius: "10px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#0d2b17", color: "#d9eec7", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "11px", flexShrink: 0 }}>
              2
            </div>
            <div>
              <strong style={{ color: "#0f172a", display: "block" }}>Provide Credentials</strong>
              <span style={{ color: "#64748b" }}>Add <code style={{ color: "#164e23" }}>ODOO_URL</code>, <code style={{ color: "#164e23" }}>ODOO_DB</code>, <code style={{ color: "#164e23" }}>ODOO_USERNAME</code>, and API Key to server configuration.</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 14px", borderRadius: "10px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#0d2b17", color: "#d9eec7", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "11px", flexShrink: 0 }}>
              3
            </div>
            <div>
              <strong style={{ color: "#0f172a", display: "block" }}>One-Click Batch Migration</strong>
              <span style={{ color: "#64748b" }}>Run batch synchronization to export all recorded MongoDB leads into Odoo without any duplicates or UI changes!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OdooSyncCenter;
