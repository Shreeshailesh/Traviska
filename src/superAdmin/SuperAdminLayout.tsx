import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/logo.jpg";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Mail,
  History,
  Bell,
  Menu,
  X,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { getSuperAdminUser, clearSuperAdminAuth } from "./authHelper";
import "./superAdmin.css";

export const SuperAdminLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [mobileMenuOpen]);

  const user = getSuperAdminUser();
  const userName = user?.name || "Shailesh";
  const userEmail = user?.email || "owner@traviska.com";

  const handleLogout = () => {
    clearSuperAdminAuth();
    navigate("/super-admin/login");
  };

  const navItems = [
    { to: "/super-admin", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/super-admin/users", icon: Users, label: "User Management" },
    { to: "/super-admin/teams", icon: Briefcase, label: "Staff & Teams" },
    { to: "/super-admin/emails", icon: Mail, label: "Email & Accounts" },
    { to: "/super-admin/activity-logs", icon: History, label: "Activity Logs" },
  ];

  return (
    <div className="sa-container">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="sa-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`sa-sidebar ${mobileMenuOpen ? "open" : ""}`}>
        <div className="sa-logo-box">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
            <img src={logo} alt="Traviska Logo" className="sa-logo-img" />
            <div>
              <div className="sa-logo-text">TRAVISKA</div>
              <div className="sa-badge">SUPER ADMIN</div>
            </div>
          </div>
          <button
            type="button"
            className="sa-sidebar-mobile-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sa-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `sa-nav-item ${isActive ? "active" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div style={{ padding: "16px 14px", borderTop: "1px solid rgba(255,255,255,0.08)", position: "relative", zIndex: 2 }}>
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: "10px 14px",
              borderRadius: "10px",
              background: "rgba(239, 68, 68, 0.12)",
              color: "#f87171",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="sa-main">
        {/* Topbar */}
        <header className="sa-topbar sa-topbar-with-mountains">
          <svg
            className="sa-topbar-mountain-bg"
            viewBox="0 0 1200 180"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="saMountGrad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#166534" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#166534" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="saMountGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0e3820" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#0e3820" stopOpacity="0.03" />
              </linearGradient>
            </defs>
            <path d="M520 180 L680 78 L810 132 L960 42 L1110 112 L1200 68 L1200 180 Z" fill="url(#saMountGrad1)" />
            <path d="M640 180 L790 96 L920 144 L1065 62 L1200 128 L1200 180 Z" fill="url(#saMountGrad2)" />
          </svg>
          <div className="sa-topbar-mobile-left">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sa-bell-btn sa-mobile-toggle-btn"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="sa-mobile-brand">
              <img src={logo} alt="Traviska" className="sa-mobile-brand-logo" />
              <span className="sa-mobile-brand-text">TRAVISKA</span>
            </div>
          </div>

          <div className="sa-topbar-desktop-title">
            <div className="sa-title-bar-label">SUPER ADMIN PORTAL</div>
            <h1 className="sa-welcome-title">
              Welcome back, <em>{userName}</em>!
            </h1>
            <p className="sa-welcome-subtitle">
              Manage users, teams, emails and platform activity for Traviska.
            </p>
          </div>

          <div className="sa-topbar-right">

            {/* Notification Bell */}
            <button className="sa-bell-btn" title="System Notifications">
              <Bell size={18} />
              <span className="sa-bell-badge" />
            </button>

            {/* User Profile Pill */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="sa-user-pill"
                style={{ border: "none", cursor: "pointer" }}
              >
                <div className="sa-user-avatar">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="sa-user-email-text">{userEmail}</span>
                <ChevronDown size={14} />
              </button>

              {userDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "8px",
                    background: "#ffffff",
                    border: "1px solid #e2ece5",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                    width: "220px",
                    padding: "8px 0",
                    zIndex: 200,
                  }}
                >
                  <div style={{ padding: "8px 16px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{userName}</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>CEO / Super Admin</div>
                  </div>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      navigate("/admin");
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "9px 16px",
                      background: "transparent",
                      border: "none",
                      fontSize: "13px",
                      color: "#334155",
                      cursor: "pointer",
                    }}
                  >
                    Switch to Admin Portal
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "9px 16px",
                      background: "transparent",
                      border: "none",
                      fontSize: "13px",
                      color: "#dc2626",
                      cursor: "pointer",
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="sa-content">
          <Outlet />
        </main>
      </div>
      {/* Mobile Bottom Navigation (<= 768px only) */}
      <nav className="sa-mobile-bottom-nav" aria-label="Super Admin Mobile Navigation">
        <NavLink
          to="/super-admin"
          end
          className={({ isActive }) => `sa-mobile-bottom-item ${isActive ? "active" : ""}`}
        >
          <LayoutDashboard size={19} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink
          to="/super-admin/users"
          className={({ isActive }) => `sa-mobile-bottom-item ${isActive ? "active" : ""}`}
        >
          <Users size={19} />
          <span>Users</span>
        </NavLink>
        <NavLink
          to="/super-admin/teams"
          className={({ isActive }) => `sa-mobile-bottom-item ${isActive ? "active" : ""}`}
        >
          <Briefcase size={19} />
          <span>Teams</span>
        </NavLink>
        <NavLink
          to="/super-admin/emails"
          className={({ isActive }) => `sa-mobile-bottom-item ${isActive ? "active" : ""}`}
        >
          <Mail size={19} />
          <span>Emails</span>
        </NavLink>
        <button
          type="button"
          className={`sa-mobile-bottom-item ${mobileMenuOpen ? "active" : ""}`}
          onClick={() => setMobileMenuOpen(true)}
          aria-label="More Super Admin Options"
        >
          <Menu size={19} />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
};

