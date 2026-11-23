import React, { useState, useRef, useEffect } from "react";
import { Search, Bell, LogOut, Menu } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../assets/logo.jpg";

interface TopbarProps {
  onToggleSidebar?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
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
    localStorage.removeItem("token");
    localStorage.removeItem("isAdmin");
    navigate("/admin/login", { replace: true });
  };

  return (
    <header className="admin-topbar">
      {/* Mobile Toggle Button */}
      <button
        type="button"
        className="admin-topbar-icon-btn mobile-toggle-btn"
        onClick={onToggleSidebar}
        aria-label="Toggle Navigation"
      >
        <Menu size={20} />
      </button>

      {/* Mobile Compact Brand (hidden on desktop) */}
      <Link to="/admin" className="admin-mobile-brand">
        <img src={logo} alt="Traviska" className="admin-mobile-brand-logo" />
        <span className="admin-mobile-brand-title">Traviska</span>
      </Link>

      {/* Global Search Bar */}
      <div className="admin-search-wrapper">
        <Search size={16} className="admin-search-icon" />
        <input
          ref={searchInputRef}
          type="text"
          className="admin-search-input"
          placeholder="Search bookings, trips, captains, customers..."
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
            <div className="admin-user-avatar">SK</div>
            <div className="admin-user-info">
              <span className="admin-user-name">Shailesh K.</span>
              <span className="admin-user-role">Super Admin</span>
            </div>
          </div>

          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "8px",
                width: "180px",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                padding: "6px",
                zIndex: 60,
              }}
            >
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 12px",
                  border: "none",
                  background: "transparent",
                  color: "#b91c1c",
                  fontSize: "13px",
                  fontWeight: 500,
                  borderRadius: "6px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#fee2e2")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;

