import React from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/logo.jpg";
import {
  Compass,
  Wallet,
  Building2,
  UserCheck,
  Star,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { useCaptainAuth } from "./CaptainAuthContext";

interface CaptainSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const CaptainSidebar: React.FC<CaptainSidebarProps> = ({
  isOpen = true,
  onClose,
}) => {
  const location = useLocation();
  const path = location.pathname;
  const { captain } = useCaptainAuth();

  const isActive = (targetPath: string) => {
    if (targetPath === "/captain/trips") {
      return path === "/captain" || path === "/captain/trips" || path.startsWith("/captain/trips/");
    }
    return path.startsWith(targetPath);
  };

  const captainName = captain?.name || "Captain Officer";
  const captainRole = captain?.role || "Head Captain";
  const initial = captainName.charAt(0).toUpperCase() || "C";

  return (
    <aside className={`admin-sidebar ${isOpen ? "open" : ""}`}>
      {/* Brand Header */}
      <div className="admin-sidebar-header">
        <Link to="/captain/trips" className="admin-sidebar-brand" onClick={onClose}>
          <div className="admin-brand-icon-wrapper">
            <img src={logo} alt="Traviska Logo" className="admin-sidebar-logo" />
          </div>
          <div className="admin-sidebar-brand-text">
            <span className="admin-sidebar-title">Traviska</span>
            <span className="admin-sidebar-subtitle">
              CAPTAIN OPERATIONS
            </span>
          </div>
        </Link>
      </div>

      {/* Main Nav */}
      <nav className="admin-sidebar-nav">
        <Link
          to="/captain/trips"
          className={`admin-nav-item ${isActive("/captain/trips") ? "active" : ""}`}
          onClick={onClose}
        >
          <Compass size={18} />
          <span>My Expeditions</span>
        </Link>

        <Link
          to="/captain/payout-history"
          className={`admin-nav-item ${isActive("/captain/payout-history") ? "active" : ""}`}
          onClick={onClose}
        >
          <Wallet size={18} />
          <span>Payouts &amp; Ledger</span>
        </Link>

        <Link
          to="/captain/bank-details"
          className={`admin-nav-item ${isActive("/captain/bank-details") ? "active" : ""}`}
          onClick={onClose}
        >
          <Building2 size={18} />
          <span>Bank &amp; UPI Details</span>
        </Link>

        <Link
          to="/captain/profile"
          className={`admin-nav-item ${isActive("/captain/profile") ? "active" : ""}`}
          onClick={onClose}
        >
          <UserCheck size={18} />
          <span>Captain Profile</span>
        </Link>

        <div className="admin-nav-divider" />

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="admin-nav-item"
          style={{ opacity: 0.8 }}
          onClick={onClose}
        >
          <ExternalLink size={18} />
          <span>Traviska Website</span>
        </a>
      </nav>

      {/* Active Captain Status Footer Card */}
      <div style={{ padding: "0 14px 16px 14px", position: "relative", zIndex: 2 }}>
        <div
          style={{
            background: "rgba(255, 255, 255, 0.07)",
            border: "1px solid rgba(217, 238, 199, 0.15)",
            borderRadius: "12px",
            padding: "12px 14px",
            color: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: "#d9eec7",
                color: "#0d2b17",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                flexShrink: 0,
              }}
            >
              {initial}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: "#ffffff",
                }}
              >
                {captainName}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#d9eec7",
                  opacity: 0.9,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <ShieldCheck size={12} />
                <span>{captainRole}</span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "8px",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              fontSize: "11px",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(16, 185, 129, 0.2)",
                color: "#6ee7b7",
                padding: "2px 8px",
                borderRadius: "999px",
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#10b981",
                }}
              />
              Active On Duty
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                color: "#fde047",
                fontWeight: 600,
              }}
            >
              <Star size={12} fill="#fde047" />
              {captain?.rating || "4.9"}
            </span>
          </div>
        </div>
      </div>

      {/* Mountain Watermark Silhouette */}
      <div className="admin-sidebar-footer-graphic">
        <svg
          viewBox="0 0 260 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 120 L40 60 L80 90 L130 30 L180 80 L220 50 L260 120 Z"
            fill="url(#capMtnGrad1)"
            opacity="0.35"
          />
          <path
            d="M-20 120 L50 40 L110 85 L160 20 L210 75 L280 120 Z"
            fill="url(#capMtnGrad2)"
            opacity="0.25"
          />
          <defs>
            <linearGradient id="capMtnGrad1" x1="130" y1="30" x2="130" y2="120" gradientUnits="userSpaceOnUse">
              <stop stopColor="#d9eec7" stopOpacity="0.4" />
              <stop offset="1" stopColor="#0d2b17" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="capMtnGrad2" x1="130" y1="20" x2="130" y2="120" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" stopOpacity="0.3" />
              <stop offset="1" stopColor="#0d2b17" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </aside>
  );
};

export default CaptainSidebar;
