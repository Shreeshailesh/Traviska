import React, { useState, useRef, useEffect } from "react";
import { Search, Bell, LogOut, Menu, ArrowUpRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useSalesAuth } from "./SalesAuthContext";

interface SalesTopbarProps {
  onToggleSidebar?: () => void;
}

export const SalesTopbar: React.FC<SalesTopbarProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const { user, logout } = useSalesAuth();
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
    navigate("/sales/login", { replace: true });
  };

  const getInitials = (name?: string) => {
    if (!name) return "SK";
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
          placeholder="Search leads, customer phone, enquiries, trips..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const query = (e.target as HTMLInputElement).value;
              navigate(`/sales/leads?search=${encodeURIComponent(query)}`);
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

        {/* User Profile Pill */}
        <div style={{ position: "relative" }} ref={dropdownRef}>
          <div
            className="admin-user-profile-pill"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div className="admin-user-avatar">
              {getInitials(user?.name)}
            </div>
            <div className="admin-user-info">
              <span className="admin-user-name">
                {user?.name || "Shailesh K."}
              </span>
              <span className="admin-user-role">
                {user?.role === "admin"
                  ? "Super Admin"
                  : user?.role === "sales_lead"
                  ? "Sales Lead"
                  : "Sales Specialist"}
              </span>
            </div>
          </div>

          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "8px",
                width: "200px",
                background: "#ffffff",
                borderRadius: "10px",
                boxShadow:
                  "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                border: "1px solid #e2e8f0",
                zIndex: 100,
                padding: "6px",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              <div
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid #f1f5f9",
                  marginBottom: "4px",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>
                  {user?.name || "Shailesh K."}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>
                  {user?.email || "admin@traviska.com"}
                </div>
              </div>

              {user?.role === "admin" && (
                <Link
                  to="/admin"
                  onClick={() => setDropdownOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#0f172a",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span>Admin Dashboard</span>
                  <ArrowUpRight size={14} color="#64748b" />
                </Link>
              )}

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  color: "#dc2626",
                  background: "transparent",
                  border: "none",
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default SalesTopbar;

