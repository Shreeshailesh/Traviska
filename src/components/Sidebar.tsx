import { useNavigate, useLocation } from "react-router-dom";
import "./Sidebar.css";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: "📊 Dashboard", path: "/admin" },
    { label: "📅 Bookings", path: "/admin/bookings" },
    { label: "🧳 Trips", path: "/admin/trips" },
    { label: "📑 Detailed Sections", path: "/admin/sections" },
    { label: "👥 Customers", path: "/admin/customers" },
    { label: "⚙️ Settings", path: "/admin/settings" },
  ];

  const handleItemClick = (path: string) => {
    navigate(path);
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop for mobile off-canvas drawer */}
      {isOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`admin-sidebar ${isOpen ? "open" : ""}`}>
        <div className="admin-sidebar-header">
          <h2 className="admin-sidebar-title">Traviska</h2>
          <button
            type="button"
            className="admin-sidebar-close-btn"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        <nav className="admin-sidebar-nav">
          {navItems.map((item) => {
            const isActive =
              item.path === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(item.path);

            return (
              <p
                key={item.path}
                onClick={() => handleItemClick(item.path)}
                className={`admin-sidebar-item ${isActive ? "active" : ""}`}
              >
                {item.label}
              </p>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
