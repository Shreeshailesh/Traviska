
import { useEffect, useState } from "react";
import axios from "axios";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { API_BASE_URL } from "../api";

type CustomerProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

type CustomerBooking = {
  _id: string;
  trip?: {
    title?: string;
    location?: string;
  };
  date?: string;
  travellers?: number;
  total?: number;
  status?: string;
  paymentStatus?: string;
};

export default function CustomerDashboard() {
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState("");

  const getCustomerToken = () => {
    return localStorage.getItem("customerToken");
  };

  const updateProfileState = (customer: CustomerProfile) => {
    setProfileName(customer.name || "");
    setProfileEmail(customer.email || "");
    setProfilePhone(customer.phone || "");
  };

  // Load customer profile from MongoDB
  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const token = getCustomerToken();

        if (!token) {
          throw new Error("Please log in to view your profile.");
        }

        const response = await fetch(
          `${API_BASE_URL}/customer/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to load customer profile."
          );
        }

        if (!cancelled) {
          updateProfileState(data.customer);
          setProfileMessage("");
          setProfileError(false);
        }
      } catch (error) {
        console.error("Failed to load customer profile:", error);

        if (!cancelled) {
          setProfileMessage(
            error instanceof Error
              ? error.message
              : "Unable to load your profile."
          );
          setProfileError(true);
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load customer bookings
  useEffect(() => {
    let cancelled = false;

    const loadBookings = async () => {
      try {
        const token = getCustomerToken();

        if (!token) {
          throw new Error("Please log in to view your bookings.");
        }

        const response = await axios.get(
          `${API_BASE_URL}/customer/bookings`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!cancelled) {
          setBookings(response.data.bookings || []);
          setBookingsError("");
        }
      } catch (error) {
        console.error("Failed to load customer bookings:", error);

        if (!cancelled) {
          setBookingsError("Unable to load your bookings.");
        }
      } finally {
        if (!cancelled) {
          setBookingsLoading(false);
        }
      }
    };

    loadBookings();

    return () => {
      cancelled = true;
    };
  }, []);

  // Save updated name and email
  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMessage("");
    setProfileError(false);

    try {
      const token = getCustomerToken();

      if (!token) {
        throw new Error("Please log in again.");
      }

      const name = profileName.trim();
      const email = profileEmail.trim();

      if (!name) {
        throw new Error("Name is required.");
      }

      if (name.length > 100) {
        throw new Error("Name must be 100 characters or fewer.");
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Please enter a valid email address.");
      }

      const response = await fetch(
        `${API_BASE_URL}/customer/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name,
            email,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update profile."
        );
      }

      updateProfileState(data.customer);

      setProfileMessage("Profile updated successfully!");
      setProfileError(false);
      setIsEditingProfile(false);

      // Keep locally stored customer details synchronized
      const savedCustomer = localStorage.getItem("customer");

      if (savedCustomer) {
        try {
          const customer = JSON.parse(savedCustomer);

          localStorage.setItem(
            "customer",
            JSON.stringify({
              ...customer,
              name: data.customer.name,
              email: data.customer.email || "",
              phone: data.customer.phone,
            })
          );
        } catch (error) {
          console.error("Failed to update local customer data:", error);
        }
      }
    } catch (error) {
      console.error("Failed to save customer profile:", error);

      setProfileMessage(
        error instanceof Error
          ? error.message
          : "Failed to update profile."
      );
      setProfileError(true);
    } finally {
      setProfileSaving(false);
    }
  };

  // Edit or cancel editing
  const handleToggleEdit = async () => {
    if (!isEditingProfile) {
      setProfileMessage("");
      setProfileError(false);
      setIsEditingProfile(true);
      return;
    }

    setIsEditingProfile(false);
    setProfileMessage("");
    setProfileError(false);

    try {
      const token = getCustomerToken();

      if (!token) {
        throw new Error("Please log in again.");
      }

      const response = await fetch(
        `${API_BASE_URL}/customer/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to restore profile."
        );
      }

      updateProfileState(data.customer);
    } catch (error) {
      console.error("Failed to restore profile:", error);
      setProfileMessage("Unable to restore profile details.");
      setProfileError(true);
    }
  };

  // Logout customer
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

  // Read fallback phone from local storage
  let storedPhone = "";

  try {
    const savedCustomer = localStorage.getItem("customer");

    if (savedCustomer) {
      const customer = JSON.parse(savedCustomer);
      storedPhone = customer.phone || "";
    }
  } catch {
    storedPhone = "";
  }

  const phone = profilePhone || storedPhone;

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

      {/* CUSTOMER PROFILE */}
      <h2>My Profile</h2>

      {profileMessage && (
        <p
          style={{
            marginTop: "12px",
            marginBottom: "12px",
            color: profileError ? "#ef4444" : "#22c55e",
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
            <strong>Name:</strong>{" "}
            {profileName || "Not provided"}
          </p>

          <p>
            <strong>Email:</strong>{" "}
            {profileEmail || "Not provided"}
          </p>

          <p>
            <strong>Phone:</strong>{" "}
            {phone || "Not available"}
          </p>

          {/* EDITABLE PROFILE FORM */}
          {isEditingProfile && (
            <div style={{ marginTop: "20px" }}>
              <div style={{ marginBottom: "15px" }}>
                <label htmlFor="profile-name">Name</label>

                <input
                  id="profile-name"
                  type="text"
                  value={profileName}
                  maxLength={100}
                  onChange={(e) =>
                    setProfileName(e.target.value)
                  }
                  style={{
                    display: "block",
                    width: "100%",
                    maxWidth: "350px",
                    padding: "10px",
                    marginTop: "6px",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label htmlFor="profile-email">Email</label>

                <input
                  id="profile-email"
                  type="email"
                  value={profileEmail}
                  onChange={(e) =>
                    setProfileEmail(e.target.value)
                  }
                  style={{
                    display: "block",
                    width: "100%",
                    maxWidth: "350px",
                    padding: "10px",
                    marginTop: "6px",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={profileSaving}
                style={{
                  marginTop: "10px",
                  padding: "10px 18px",
                  backgroundColor: "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: profileSaving
                    ? "not-allowed"
                    : "pointer",
                  opacity: profileSaving ? 0.7 : 1,
                }}
              >
                {profileSaving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          )}

          {/* EDIT PROFILE BUTTON */}
          <button
            type="button"
            onClick={handleToggleEdit}
            disabled={profileSaving}
            style={{
              marginTop: "15px",
              padding: "10px 18px",
              backgroundColor: "#ff6b00",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: profileSaving
                ? "not-allowed"
                : "pointer",
              opacity: profileSaving ? 0.7 : 1,
            }}
          >
            {isEditingProfile
              ? "Cancel Editing"
              : "Edit Profile"}
          </button>
        </>
      )}

      {/* MY BOOKINGS */}
      <h2 style={{ marginTop: "35px" }}>
        My Bookings
      </h2>

      {bookingsLoading ? (
        <p>Loading your bookings...</p>
      ) : bookingsError ? (
        <p style={{ color: "#f87171" }}>
          {bookingsError}
        </p>
      ) : bookings.length === 0 ? (
        <p>You have no bookings yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "16px",
          }}
        >
          {bookings.map((booking) => (
            <div
              key={booking._id}
              style={{
                backgroundColor: "#1e293b",
                padding: "20px",
                borderRadius: "12px",
              }}
            >
              <h3>
                {booking.trip?.title || "Trip"}
              </h3>

              <p>
                Destination:{" "}
                {booking.trip?.location ||
                  "Not available"}
              </p>

              <p>
                Travel Date:{" "}
                {booking.date
                  ? new Date(
                      booking.date
                    ).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: "Asia/Kolkata",
                    })
                  : "Not available"}
              </p>

              <p>
                Travellers: {booking.travellers}
              </p>

              <p>
                Total: ₹{booking.total}
              </p>

              <p>
                Booking Status: {booking.status}
              </p>

              <p>
                Payment Status:{" "}
                {booking.paymentStatus}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* LOGOUT */}
      <button
        type="button"
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
