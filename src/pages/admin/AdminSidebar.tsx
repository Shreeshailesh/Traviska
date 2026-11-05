import { NavLink } from "react-router-dom";

export default function AdminSidebar() {
  const menuItems = [
    { name: "📊 Dashboard", path: "/admin" },
    { name: "📅 Bookings", path: "/admin/bookings" },
    { name: "🧳 Trips", path: "/admin/trips" },
    { name: "👥 Customers", path: "/admin/customers" },
    { name: "⚙️ Settings", path: "/admin/settings" },
  ];

  return (
    <aside
      style={{
        width: "240px",
        minHeight: "100vh",
        background: "#172554",
        color: "white",
        padding: "24px 16px",
      }}
    >
      <h2 style={{ marginBottom: "32px" }}>
        Traviska Admin
      </h2>

      <nav style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/admin"}
            style={({ isActive }) => ({
              display: "block",
              padding: "12px",
              borderRadius: "8px",
              color: "white",
              textDecoration: "none",
              background: isActive ? "#2563eb" : "transparent",
            })}
          >
            {item.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}