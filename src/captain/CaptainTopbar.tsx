import React, { useState, useRef, useEffect } from "react";
import { Search, Bell, LogOut, Menu, User, Wallet, Building2 } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useCaptainAuth } from "./CaptainAuthContext";

interface CaptainTopbarProps {
  onToggleSidebar?: () => void;
}

export const CaptainTopbar: React.FC<CaptainTopbarProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const { captain, logout } = useCaptainAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ⌘K shortcut focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/captain/login", { replace: true });
  };

  const captainName = captain?.name || "Captain Officer";
  const captainRole = captain?.role || "Head Captain";

  const getInitials = (name?: string) => {
    if (!name) return "CP";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="admin-topbar">
      {/* Mobile Toggle Button */}
      <button
        type="button"
        className="admin-topbar-icon-btn mobile-toggle-btn"
        onClick={onToggleSidebar}
        style={{ display: "none" }}
        aria-label="Toggle Navigation"
      >
        <Menu size={20} />
      </button>

      {/* Global Search Bar */}
      <div className="admin-search-wrapper">
        <Search size={16} className="admin-search-icon" />
        <input
          ref={searchInputRef}
          type="text"
          className="admin-search-input"
          placeholder="Search assigned expeditions, travellers, expenses... (⌘ K)"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const query = (e.target as HTMLInputElement).value;
              navigate(`/captain/trips?search=${encodeURIComponent(query)}`);
            }
          }}
        />
        <span className="admin-search-shortcut">⌘ K</span>
      </div>

      {/* Topbar Actions */}
      <div className="admin-topbar-actions">
        {/* Notifications */}
        <button
          type="button"
          className="admin-topbar-icon-btn"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={18} />
          <span className="admin-notification-badge" />
        </button>

        {/* User Pill Dropdown */}
        <div style={{ position: "relative" }} ref={dropdownRef}>
          <button
            type="button"
            className="admin-user-profile-pill"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
          >
            <div
              className="admin-avatar-circle"
              style={{
                background: "#0d2b17",
                color: "#d9eec7",
                fontWeight: 700,
                fontSize: "13px",
              }}
            >
              {getInitials(captainName)}
            </div>
            <div className="admin-user-info">
              <span className="admin-user-name">{captainName}</span>
              <span className="admin-user-role">{captainRole}</span>
            </div>
          </button>

          {dropdownOpen && (
            <div
              className="admin-dropdown-menu"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "240px",
                background: "#ffffff",
                border: "1px solid #e7ecf0",
                borderRadius: "12px",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                padding: "6px",
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  padding: "10px 12px",
                  borderBottom: "1px solid #f1f5f9",
                  marginBottom: "4px",
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                  {captainName}
                </div>
                <div style={{ fontSize: "11px", color: "#164e23", fontWeight: 600 }}>
                  {captainRole} • {captain?.phone || "+91 91234 56789"}
                </div>
              </div>

              <Link
                to="/captain/profile"
                className="admin-dropdown-item"
                onClick={() => setDropdownOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  color: "#334155",
                  borderRadius: "8px",
                  textDecoration: "none",
                }}
              >
                <User size={16} />
                <span>Captain Profile</span>
              </Link>

              <Link
                to="/captain/payout-history"
                className="admin-dropdown-item"
                onClick={() => setDropdownOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  color: "#334155",
                  borderRadius: "8px",
                  textDecoration: "none",
                }}
              >
                <Wallet size={16} />
                <span>Payouts &amp; Ledger</span>
              </Link>

              <Link
                to="/captain/bank-details"
                className="admin-dropdown-item"
                onClick={() => setDropdownOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  color: "#334155",
                  borderRadius: "8px",
                  textDecoration: "none",
                }}
              >
                <Building2 size={16} />
                <span>Bank &amp; UPI Setup</span>
              </Link>

              <div style={{ height: "1px", background: "#f1f5f9", margin: "4px 0" }} />

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  color: "#ef4444",
                  borderRadius: "8px",
                  width: "100%",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default CaptainTopbar;
