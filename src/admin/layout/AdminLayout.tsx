import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Layers,
  Menu,
} from "lucide-react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "../admin.css";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const path = location.pathname;

  // Close drawer on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [path]);

  // Escape key & prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (!mobileSidebarOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileSidebarOpen]);

  return (
    <div className="admin-scope">
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="admin-mobile-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      <div className="admin-main-container">
        <Topbar onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)} />
        <main className="admin-content-area">{children}</main>
      </div>

      {/* Mobile Bottom Navigation (<= 768px only) */}
      <nav className="admin-mobile-bottom-nav" aria-label="Mobile Admin Navigation">
        <Link
          to="/admin"
          className={`admin-mobile-bottom-item ${path === "/admin" ? "active" : ""}`}
        >
          <LayoutDashboard size={19} />
          <span>Dashboard</span>
        </Link>
        <Link
          to="/admin/bookings"
          className={`admin-mobile-bottom-item ${path.startsWith("/admin/bookings") ? "active" : ""}`}
        >
          <Calendar size={19} />
          <span>Bookings</span>
        </Link>
        <Link
          to="/admin/customers"
          className={`admin-mobile-bottom-item ${path.startsWith("/admin/customers") ? "active" : ""}`}
        >
          <Users size={19} />
          <span>Customers</span>
        </Link>
        <Link
          to="/admin/operations"
          className={`admin-mobile-bottom-item ${path.startsWith("/admin/operations") ? "active" : ""}`}
        >
          <Layers size={19} />
          <span>Operations</span>
        </Link>
        <button
          type="button"
          className={`admin-mobile-bottom-item ${mobileSidebarOpen ? "active" : ""}`}
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="More Admin Options"
        >
          <Menu size={19} />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
};

export default AdminLayout;
