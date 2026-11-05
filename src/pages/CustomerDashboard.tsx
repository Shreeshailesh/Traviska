import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useEffect, useState } from "react";
import axios from "axios";
export default function CustomerDashboard() {
    const [profileName, setProfileName] = useState("");
const [profileEmail, setProfileEmail] = useState("");
const [profileLoading, setProfileLoading] = useState(true);
const [profileSaving, setProfileSaving] = useState(false);
const [profileMessage, setProfileMessage] = useState("");
const [isEditingProfile, setIsEditingProfile] = useState(false);
const handleSaveProfile = async () => {
  setProfileSaving(true);
  setProfileMessage("");

  try {
    const token = localStorage.getItem("customerToken");

    if (!token) {
      throw new Error("Please log in again.");
    }

    const response = await fetch(
      "http://localhost:5001/customer/profile",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to update profile.");
    }

    setProfileName(data.customer.name);
    setProfileEmail(data.customer.email || "");
    setProfileMessage("Profile updated successfully!");
    setIsEditingProfile(false);

    const savedCustomer = localStorage.getItem("customer");

    if (savedCustomer) {
      const customer = JSON.parse(savedCustomer);

      localStorage.setItem(
        "customer",
        JSON.stringify({
          ...customer,
          name: data.customer.name,
          email: data.customer.email || "",
        })
      );
    }
  } catch (error) {
    setProfileMessage(
      error instanceof Error ? error.message : "Failed to update profile."
    );
  } finally {
    setProfileSaving(false);
  }
};

useEffect(() => {
  const loadProfile = async () => {
    try {
      const token = localStorage.getItem("customerToken");

      if (!token) {
        setProfileMessage("Please log in to view your profile.");
        return;
      }

      const response = await fetch(
        "http://localhost:5001/customer/profile",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load profile");
      }

      const data = await response.json();

      setProfileName(data.customer.name || "");
      setProfileEmail(data.customer.email || "");
    } catch (error) {
      console.error("Failed to load customer profile:", error);
      setProfileMessage("Unable to load your profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  loadProfile();
}, []);

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

    {profileMessage && (
  <p
    style={{
      marginTop: "12px",
      marginBottom: "12px",
      color: profileMessage.includes("successfully")
        ? "#22c55e"
        : "#ef4444",
      fontWeight: "500",
    }}
  >
    {profileMessage}
  </p>
)}

{profileLoading ? (
  <p>Loading profile...</p>
) : (
  <>
    <p>
      <strong>Name:</strong> {profileName || "Not provided"}
    </p>

    <p>
      <strong>Email:</strong> {profileEmail || "Not provided"}
    </p>

    <p>
      <strong>Phone:</strong> {phone || "Not available"}
    </p>

    {isEditingProfile && (
  <div style={{ marginTop: "20px" }}>
    <div style={{ marginBottom: "15px" }}>
      <label htmlFor="profile-name">Name</label>
      <input
        id="profile-name"
        type="text"
        value={profileName}
        onChange={(e) => setProfileName(e.target.value)}
        style={{
          display: "block",
          width: "100%",
          maxWidth: "350px",
          padding: "10px",
          marginTop: "6px",
          borderRadius: "6px",
        }}
      />
    </div>

    <div>
      <label htmlFor="profile-email">Email</label>
      <input
        id="profile-email"
        type="email"
        value={profileEmail}
        onChange={(e) => setProfileEmail(e.target.value)}
        style={{
          display: "block",
          width: "100%",
          maxWidth: "350px",
          padding: "10px",
          marginTop: "6px",
          borderRadius: "6px",
        }}
      />
    </div>
   <button
  type="button"
  onClick={handleSaveProfile}
  disabled={profileSaving}
  style={{
    marginTop: "18px",
    padding: "10px 18px",
    backgroundColor: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  }}
>
  {profileSaving ? "Saving..." : "Save Changes"}
</button>
  </div>
)}

    {/* Edit Profile Button */}
    <button
      type="button"
      onClick={() => {
  if (isEditingProfile) {
    setIsEditingProfile(false);
    setProfileMessage("");

    const token = localStorage.getItem("customerToken");

    if (token) {
      fetch("http://localhost:5001/customer/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (!response.ok) throw new Error("Failed to reload profile");
          return response.json();
        })
        .then((data) => {
          setProfileName(data.customer.name || "");
          setProfileEmail(data.customer.email || "");
        })
        .catch((error) => {
          console.error("Failed to restore profile:", error);
          setProfileMessage("Unable to restore profile details.");
        });
    }
  } else {
    setProfileMessage("");
    setIsEditingProfile(true);
  }
}}
      style={{
        marginTop: "15px",
        padding: "10px 18px",
        backgroundColor: "#ff6b00",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
      }}
    >
      {isEditingProfile ? "Cancel Editing" : "Edit Profile"}
    </button>
  </>
)}

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