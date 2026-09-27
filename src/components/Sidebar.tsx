import { useNavigate } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();
  return (
    <div
      style={{
        width: "260px",
minWidth: "260px",
        background: "#111827",
        color: "white",
        minHeight: "100vh",
        padding: "30px 20px",
      }}
    >
      <h2 style={{ marginBottom: "40px" }}>Traviska</h2>

      <p style={{ marginBottom: "20px", cursor: "pointer" }}>
        📊 Dashboard
      </p>

      <p style={{ marginBottom: "20px", cursor: "pointer" }}>
        📅 Bookings
      </p>

     <p
  onClick={() => navigate("/admin/add-trip")}
  style={{ marginBottom: "20px", cursor: "pointer" }}
>
  🧳 Trips
</p>

      <p style={{ marginBottom: "20px", cursor: "pointer" }}>
        👥 Customers
      </p>

      <p style={{ marginBottom: "20px", cursor: "pointer" }}>
        ⚙️ Settings
      </p>
    </div>
  );
}