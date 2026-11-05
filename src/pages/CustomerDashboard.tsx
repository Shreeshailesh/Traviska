import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useEffect, useState } from "react";
import axios from "axios";
export default function CustomerDashboard() {
    const [bookings, setBookings] = useState<any[]>([]);
const [bookingsLoading, setBookingsLoading] = useState(true);
const [bookingsError, setBookingsError] = useState("");
useEffect(() => {
  const token = localStorage.getItem("customerToken");

  if (!token) {
    setBookingsError("Please log in to view your bookings.");
    setBookingsLoading(false);
    return;
  }

  axios
    .get("http://localhost:5001/customer/bookings", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((response) => {
      setBookings(response.data.bookings || []);
    })
    .catch((error) => {
      console.error("Failed to load customer bookings:", error);
      setBookingsError("Unable to load your bookings.");
    })
    .finally(() => {
      setBookingsLoading(false);
    });
}, []);

   const handleLogout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Firebase sign-out failed:", error);
  } finally {
    localStorage.removeItem("customerToken");
    localStorage.removeItem("customer");

    window.location.replace("/customer/login");
  }
};
  const savedCustomer = localStorage.getItem("customer");

  let phone = "";

  try {
    if (savedCustomer) {
      const customer = JSON.parse(savedCustomer);
      phone = customer.phone || "";
    }
  } catch {
    phone = "";
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        color: "white",
        padding: "clamp(16px, 4vw, 40px)",
        paddingTop: "80px",
      }}
    >
      <h1>Welcome to Traviska!</h1>

      <p>Your customer dashboard is ready.</p>

      <h2>My Profile</h2>

      <p>
        <strong>Phone:</strong> {phone || "Not available"}
      </p>

    <h2 style={{ marginTop: "35px" }}>My Bookings</h2>

{bookingsLoading ? (
  <p>Loading your bookings...</p>
) : bookingsError ? (
  <p style={{ color: "#f87171" }}>{bookingsError}</p>
) : bookings.length === 0 ? (
  <p>You have no bookings yet.</p>
) : (
  <div style={{ display: "grid", gap: "16px" }}>
    {bookings.map((booking) => (
      <div
        key={booking._id}
        style={{
          backgroundColor: "#1e293b",
          padding: "20px",
          borderRadius: "12px",
        }}
      >
        <h3>{booking.trip?.title || "Trip"}</h3>

        <p>Destination: {booking.trip?.location || "Not available"}</p>
        <p>
  Travel Date:{" "}
  {booking.date
    ? new Date(booking.date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "Not available"}
</p>
        <p>Travellers: {booking.travellers}</p>
        <p>Total: ₹{booking.total}</p>
        <p>Booking Status: {booking.status}</p>
        <p>Payment Status: {booking.paymentStatus}</p>
      </div>
    ))}
  </div>
)}

      <button
  onClick={handleLogout}
  style={{
    marginTop: "30px",
    padding: "12px 24px",
    backgroundColor: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  }}
>
  Logout
</button>
    </div>
  );
}