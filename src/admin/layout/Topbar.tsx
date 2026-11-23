import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Search, Bell, LogOut, Menu } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../api";
import logo from "../../assets/logo.jpg";

interface TopbarProps {
  onToggleSidebar?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCounts, setNotifCounts] = useState<any>({});
  const [recentReqs, setRecentReqs] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Poll live Admin Booking Requests & Refund Alerts every 45s
  useEffect(() => {
    let cancelled = false;
    const fetchAlerts = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const { data } = await axios.get(`${API_BASE_URL}/api/admin/booking-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled && data?.success) {
          setNotifCounts(data.counts || {});
          setRecentReqs((data.requests || []).slice(0, 5));
        }
      } catch {
        // Ignore transient poll failure
      }
    };
    fetchAlerts();
    const timer = setInterval(fetchAlerts, 45000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

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
        <div style={{ position: "relative" }} ref={notifRef}>
          <button
            type="button"
            className="admin-topbar-icon-btn"
            aria-label="Notifications"
            title="Booking Requests & Refund Alerts"
            onClick={() => setNotifOpen(!notifOpen)}
          >
            <Bell size={18} />
            {(notifCounts.unread > 0 ||
              notifCounts.pendingCancellations > 0 ||
              notifCounts.pendingReschedules > 0 ||
              notifCounts.pendingRefunds > 0 ||
              notifCounts.failedNotifications > 0) && (
              <span className="admin-notification-badge" />
            )}
          </button>

          {notifOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "8px",
                width: "300px",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                boxShadow: "0 12px 24px rgba(0,0,0,0.12)",
                padding: "12px",
                zIndex: 70,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <strong style={{ fontSize: "13px", color: "#0e3820" }}>Actionable Alerts</strong>
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen(false);
                    navigate("/admin/booking-requests");
                  }}
                  style={{ border: "none", background: "none", color: "#15803d", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                >
                  View All
                </button>
              </div>
              <div style={{ fontSize: "12px", color: "#334155", display: "grid", gap: "4px", marginBottom: "8px" }}>
                <div>Pending Cancellations: <strong>{notifCounts.pendingCancellations || 0}</strong></div>
                <div>Pending Reschedules: <strong>{notifCounts.pendingReschedules || 0}</strong></div>
                <div>Pending Refunds: <strong>{notifCounts.pendingRefunds || 0}</strong></div>
                <div>Failed Alerts: <strong>{notifCounts.failedNotifications || 0}</strong></div>
              </div>
              {recentReqs.length > 0 && (
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "8px", display: "grid", gap: "6px" }}>
                  {recentReqs.map((r) => (
                    <button
                      key={r._id}
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        navigate("/admin/booking-requests");
                      }}
                      style={{ textAlign: "left", padding: "6px 8px", borderRadius: "6px", border: "none", background: "#f8fafc", cursor: "pointer", fontSize: "12px" }}
                    >
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{r.requestCode} — {r.requestType}</div>
                      <div style={{ color: "#64748b" }}>{r.bookingCode} • {r.status}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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

