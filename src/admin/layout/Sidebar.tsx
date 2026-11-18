import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../../assets/logo.jpg";
import {
  LayoutDashboard,
  Calendar,
  Mountain,
  Layers,
  Users,
  ChevronDown,
  Shield,
  CalendarCheck,
  MapPin,
  Receipt,
  Wallet,
  History,
  BarChart3,
  Megaphone,
  Settings,
  Kanban,
  X,
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const location = useLocation();
  const path = location.pathname;

  const isOperationsActive = path.startsWith("/admin/operations");
  const [operationsOpen, setOperationsOpen] = useState<boolean>(true);

  const isActive = (targetPath: string) => {
    if (targetPath === "/admin") {
      return path === "/admin";
    }
    return path.startsWith(targetPath);
  };

  return (
    <aside className={`admin-sidebar ${isOpen ? "open" : ""}`}>
      {/* Brand Header */}
      <div className="admin-sidebar-header">
        <Link to="/admin" className="admin-sidebar-brand" onClick={onClose}>
          <div className="admin-brand-icon-wrapper">
            <img src={logo} alt="Traviska Logo" className="admin-sidebar-logo" />
          </div>
          <div className="admin-sidebar-brand-text">
            <span className="admin-sidebar-title">Traviska</span>
            <span className="admin-sidebar-subtitle">
              TRAVEL EXPLORE EXPERIENCE
            </span>
          </div>
        </Link>
        {onClose && (
          <button
            type="button"
            className="admin-sidebar-mobile-close"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Main Nav */}
      <nav className="admin-sidebar-nav">
        <Link
          to="/admin"
          className={`admin-nav-item ${isActive("/admin") ? "active" : ""}`}
          onClick={onClose}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </Link>

        <Link
          to="/admin/bookings"
          className={`admin-nav-item ${isActive("/admin/bookings") ? "active" : ""}`}
          onClick={onClose}
        >
          <Calendar size={18} />
          <span>Bookings</span>
        </Link>

        <Link
          to="/admin/trips"
          className={`admin-nav-item ${isActive("/admin/trips") ? "active" : ""}`}
          onClick={onClose}
        >
          <Mountain size={18} />
          <span>Trips</span>
        </Link>

        <Link
          to="/admin/sections"
          className={`admin-nav-item ${isActive("/admin/sections") ? "active" : ""}`}
          onClick={onClose}
        >
          <Layers size={18} />
          <span>Detailed Sections</span>
        </Link>

        <Link
          to="/admin/customers"
          className={`admin-nav-item ${isActive("/admin/customers") ? "active" : ""}`}
          onClick={onClose}
        >
          <Users size={18} />
          <span>Customers</span>
        </Link>

        <Link
          to="/sales"
          className={`admin-nav-item ${path.startsWith("/sales") ? "active" : ""}`}
          onClick={onClose}
        >
          <Kanban size={18} />
          <span>Sales Portal</span>
        </Link>

        {/* Expandable Group: Trip Operations */}
        <div style={{ marginTop: "4px" }}>
          <button
            type="button"
            className={`admin-nav-item admin-nav-group-header ${
              isOperationsActive ? "active" : ""
            }`}
            onClick={() => setOperationsOpen(!operationsOpen)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Layers size={18} />
              <span>Trip Operations</span>
            </div>
            <ChevronDown
              size={15}
              className={`admin-nav-group-chevron ${
                operationsOpen ? "open" : ""
              }`}
            />
          </button>

          {operationsOpen && (
            <div className="admin-nav-sublist">
              <Link
                to="/admin/operations"
                className={`admin-nav-subitem ${
                  path === "/admin/operations" ? "active" : ""
                }`}
                onClick={onClose}
              >
                <span>Overview</span>
              </Link>
              <Link
                to="/admin/operations/captains"
                className={`admin-nav-subitem ${
                  path.startsWith("/admin/operations/captains") ? "active" : ""
                }`}
                onClick={onClose}
              >
                <Shield size={14} />
                <span>Trip Captains</span>
              </Link>
              <Link
                to="/admin/operations/assignments"
                className={`admin-nav-subitem ${
                  path.startsWith("/admin/operations/assignments") ? "active" : ""
                }`}
                onClick={onClose}
              >
                <CalendarCheck size={14} />
                <span>Assignments</span>
              </Link>
              <Link
                to="/admin/operations/pickups"
                className={`admin-nav-subitem ${
                  path.startsWith("/admin/operations/pickups") ? "active" : ""
                }`}
                onClick={onClose}
              >
                <MapPin size={14} />
                <span>Pickup Locations</span>
              </Link>
              <Link
                to="/admin/operations/expenses"
                className={`admin-nav-subitem ${
                  path.startsWith("/admin/operations/expenses") ? "active" : ""
                }`}
                onClick={onClose}
              >
                <Receipt size={14} />
                <span>Trip Expenses</span>
              </Link>
              <Link
                to="/admin/operations/payouts"
                className={`admin-nav-subitem ${
                  path.startsWith("/admin/operations/payouts") ? "active" : ""
                }`}
                onClick={onClose}
              >
                <Wallet size={14} />
                <span>Payouts & Settlements</span>
              </Link>
              <Link
                to="/admin/operations/history"
                className={`admin-nav-subitem ${
                  path.startsWith("/admin/operations/history") ? "active" : ""
                }`}
                onClick={onClose}
              >
                <History size={14} />
                <span>Captain History</span>
              </Link>
            </div>
          )}
        </div>

        <div className="admin-nav-divider" />

        <Link
          to="/admin/reports"
          className={`admin-nav-item ${isActive("/admin/reports") ? "active" : ""}`}
          onClick={onClose}
        >
          <BarChart3 size={18} />
          <span>Reports</span>
        </Link>

        <Link
          to="/admin/marketing"
          className={`admin-nav-item ${isActive("/admin/marketing") ? "active" : ""}`}
          onClick={onClose}
        >
          <Megaphone size={18} />
          <span>Marketing</span>
        </Link>

        <Link
          to="/admin/settings"
          className={`admin-nav-item ${isActive("/admin/settings") ? "active" : ""}`}
          onClick={onClose}
        >
          <Settings size={18} />
          <span>Settings</span>
        </Link>
      </nav>

      {/* Mountain Silhouettes at bottom */}
      <div className="admin-sidebar-footer-graphic">
        <svg
          viewBox="0 0 240 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "auto" }}
        >
          <path
            d="M0 80 L30 45 L70 80 L110 35 L160 80 L200 40 L240 80 Z"
            fill="#164e23"
            opacity="0.5"
          />
          <path
            d="M20 80 L60 55 L90 80 L140 45 L180 80 L220 50 L240 80 Z"
            fill="#103819"
            opacity="0.8"
          />
          <path
            d="M40 80 L50 65 L60 80 M80 80 L90 60 L100 80 M130 80 L140 62 L150 80 M190 80 L200 64 L210 80"
            stroke="#22c55e"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </aside>
  );
};

export default Sidebar;
