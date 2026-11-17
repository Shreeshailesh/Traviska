import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Kanban,
  CalendarClock,
  TicketCheck,
  RefreshCw,
  PlusCircle,
} from "lucide-react";

interface SalesSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const SalesSidebar: React.FC<SalesSidebarProps> = ({
  isOpen = true,
  onClose,
}) => {
  const location = useLocation();
  const path = location.pathname;

  const isActive = (targetPath: string) => {
    if (targetPath === "/sales") {
      return path === "/sales";
    }
    return path.startsWith(targetPath);
  };

  return (
    <aside className={`admin-sidebar ${isOpen ? "open" : ""}`}>
      {/* Brand Header */}
      <div className="admin-sidebar-header">
        <Link to="/sales" className="admin-sidebar-brand" onClick={onClose}>
          <div className="admin-brand-icon-wrapper">
            <svg
              width="24"
              height="20"
              viewBox="0 0 34 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 24 L13 6 L19 16 L23 10 L31 24 Z"
                stroke="#d9eec7"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M10 18 L13 14 L17 20"
                stroke="#d9eec7"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="admin-sidebar-brand-text">
            <span className="admin-sidebar-title">Traviska</span>
            <span className="admin-sidebar-subtitle">
              SALES &amp; CRM PORTAL
            </span>
          </div>
        </Link>
      </div>

      {/* Main Nav */}
      <nav className="admin-sidebar-nav">
        <Link
          to="/sales"
          className={`admin-nav-item ${isActive("/sales") ? "active" : ""}`}
          onClick={onClose}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </Link>

        <Link
          to="/sales/leads"
          className={`admin-nav-item ${isActive("/sales/leads") ? "active" : ""}`}
          onClick={onClose}
        >
          <Users size={18} />
          <span>Leads &amp; Enquiries</span>
        </Link>

        <Link
          to="/sales/pipeline"
          className={`admin-nav-item ${isActive("/sales/pipeline") ? "active" : ""}`}
          onClick={onClose}
        >
          <Kanban size={18} />
          <span>Pipeline Kanban</span>
        </Link>

        <Link
          to="/sales/follow-ups"
          className={`admin-nav-item ${isActive("/sales/follow-ups") ? "active" : ""}`}
          onClick={onClose}
        >
          <CalendarClock size={18} />
          <span>Follow-ups Agenda</span>
        </Link>

        <Link
          to="/sales/manual-booking"
          className={`admin-nav-item ${isActive("/sales/manual-booking") ? "active" : ""}`}
          onClick={onClose}
        >
          <TicketCheck size={18} />
          <span>Manual Booking</span>
        </Link>

        <Link
          to="/sales/odoo-sync"
          className={`admin-nav-item ${isActive("/sales/odoo-sync") ? "active" : ""}`}
          onClick={onClose}
        >
          <RefreshCw size={18} />
          <span>Odoo Sync Center</span>
        </Link>

        <div className="admin-nav-divider" />

        {/* Quick Actions in Sidebar */}
        <div style={{ padding: "4px 8px" }}>
          <Link
            to="/sales/leads?action=new"
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              borderRadius: "10px",
              background: "rgba(217, 238, 199, 0.12)",
              border: "1px solid rgba(217, 238, 199, 0.25)",
              color: "#d9eec7",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
          >
            <PlusCircle size={16} />
            <span>+ Add Inbound Lead</span>
          </Link>
        </div>
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
            d="M20 80 L60 50 L100 80 L150 40 L190 75 L230 48 L240 60 L240 80 Z"
            fill="#d9eec7"
            opacity="0.2"
          />
        </svg>
      </div>
    </aside>
  );
};

export default SalesSidebar;

