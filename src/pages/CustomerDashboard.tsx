import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { signOut, sendEmailVerification } from "firebase/auth";
import { auth } from "../firebase";
import { API_BASE_URL } from "../api";
import {
  User,
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Compass,
  LogOut,
  Edit2,
  Save,
  Loader2,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

type CustomerProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  isEmailVerified?: boolean;
  authProvider?: string;
  photoUrl?: string;
};

type CustomerBooking = {
  _id: string;
  bookingCode?: string;
  trip?: {
    title?: string;
    location?: string;
    duration?: string;
    image?: string;
  };
  date?: string;
  travellers?: number;
  total?: number;
  status?: string;
  paymentStatus?: string;
  pickupLocation?: string;
  createdAt?: string;
};

export default function CustomerDashboard() {
  const navigate = useNavigate();

  // Profile State
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Email verification state
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // Bookings State
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState("");

  const getCustomerToken = () => localStorage.getItem("customerToken");

  // Load Profile
  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const token = getCustomerToken();
        if (!token) return;

        const res = await fetch(`${API_BASE_URL}/customer/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load profile");

        if (!cancelled) {
          const cust = data.customer;
          setProfile(cust);
          setProfileName(cust.name || "");
          setProfileEmail(cust.email || "");
          setProfilePhone(cust.phone || "");
        }
      } catch (err: any) {
        console.error("Profile load error:", err);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load Bookings
  useEffect(() => {
    let cancelled = false;

    const loadBookings = async () => {
      try {
        const token = getCustomerToken();
        if (!token) return;

        const res = await axios.get(`${API_BASE_URL}/customer/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!cancelled) {
          setBookings(res.data.bookings || []);
          setBookingsError("");
        }
      } catch (err: any) {
        console.error("Bookings load error:", err);
        if (!cancelled) {
          setBookingsError("Unable to load your bookings. Please check back shortly.");
        }
      } finally {
        if (!cancelled) setBookingsLoading(false);
      }
    };

    loadBookings();
    return () => {
      cancelled = true;
    };
  }, []);

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);

    const name = profileName.trim();
    const email = profileEmail.trim();
    const phone = profilePhone.trim();

    if (!name) {
      setProfileMessage({ type: "error", text: "Name cannot be empty." });
      setProfileSaving(false);
      return;
    }

    try {
      const token = getCustomerToken();
      const res = await fetch(`${API_BASE_URL}/customer/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email, phone }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update profile");

      setProfile(data.customer);
      setProfileMessage({ type: "success", text: "Profile updated successfully!" });
      setIsEditingProfile(false);

      // Sync local storage
      const saved = localStorage.getItem("customer");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          localStorage.setItem("customer", JSON.stringify({ ...parsed, name: data.customer.name, email: data.customer.email, phone: data.customer.phone }));
        } catch {}
      }
    } catch (err: any) {
      setProfileMessage({ type: "error", text: err?.message || "Failed to save profile." });
    } finally {
      setProfileSaving(false);
    }
  };

  // Resend Email Verification link using Firebase Client SDK
  const handleResendEmailVerification = async () => {
    if (!auth.currentUser) return;
    setResendingVerification(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setVerificationSent(true);
    } catch (err: any) {
      console.error("Verification resend error:", err);
    } finally {
      setResendingVerification(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Signout error:", e);
    }
    localStorage.removeItem("customerToken");
    localStorage.removeItem("customer");
    navigate("/", { replace: true });
  };

  const isEmailVerified = profile?.isEmailVerified || auth.currentUser?.emailVerified;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f7f5",
        color: "#1e293b",
        paddingTop: "90px",
        paddingBottom: "60px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1140px",
          margin: "0 auto",
          padding: "0 20px",
        }}
      >
        {/* Top Welcome Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, #0d2b17 0%, #164e23 60%, #1f6b32 100%)",
            color: "#ffffff",
            borderRadius: "20px",
            padding: "32px 36px",
            marginBottom: "30px",
            boxShadow: "0 10px 30px rgba(13, 43, 23, 0.15)",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          {/* Mountain Graphic Silhouette */}
          <div
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              pointerEvents: "none",
              opacity: 0.12,
              width: "360px",
            }}
          >
            <svg viewBox="0 0 240 80" fill="none">
              <path d="M0 80 L30 45 L70 80 L110 35 L160 80 L200 40 L240 80 Z" fill="#d9eec7" />
            </svg>
          </div>

          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                background: "rgba(217, 238, 199, 0.18)",
                border: "1px solid rgba(217, 238, 199, 0.35)",
                borderRadius: "30px",
                fontSize: "12px",
                fontWeight: 700,
                color: "#d9eec7",
                letterSpacing: "0.5px",
                marginBottom: "10px",
              }}
            >
              <Compass size={13} />
              <span>TRAVELLER DASHBOARD</span>
            </div>

            <h1
              style={{
                fontSize: "28px",
                fontWeight: 800,
                margin: "0 0 6px",
                letterSpacing: "-0.5px",
              }}
            >
              Welcome back, {profile?.name || "Traveller"}!
            </h1>

            <p style={{ margin: 0, fontSize: "14px", color: "#d9eec7", opacity: 0.9 }}>
              Manage your upcoming expeditions, check booking codes, and update your traveller profile.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link
              to="/trips"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                background: "#ffffff",
                color: "#0d2b17",
                borderRadius: "30px",
                textDecoration: "none",
                fontSize: "13.5px",
                fontWeight: 700,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                transition: "all 0.2s ease",
              }}
            >
              <span>Explore Trips</span>
              <ChevronRight size={16} />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 16px",
                background: "rgba(255, 255, 255, 0.12)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                borderRadius: "30px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)")}
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Email Verification Alert Banner (if unverified) */}
        {!isEmailVerified && profile?.email && (
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "14px",
              padding: "14px 20px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <AlertCircle size={20} color="#d97706" style={{ flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#92400e" }}>
                  Email Address Not Verified
                </span>
                <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#b45309" }}>
                  Please verify your email ({profile.email}) to secure your account and receive instant departure updates.
                </p>
              </div>
            </div>

            <div>
              {verificationSent ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "#166534",
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Verification link sent! Check your inbox.</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendEmailVerification}
                  disabled={resendingVerification}
                  style={{
                    padding: "8px 16px",
                    background: "#d97706",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {resendingVerification ? (
                    <>
                      <Loader2 size={14} className="spin-animate" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Resend Verification Email</span>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main 2-Column Grid: Profile on left, Bookings on right */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
            alignItems: "start",
          }}
        >
          {/* Profile Card */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "16px",
                borderBottom: "1px solid #f1f5f9",
                marginBottom: "18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    background: "#eaf3ec",
                    color: "#164e23",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <User size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                    My Profile
                  </h3>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Traveller Contact Information
                  </span>
                </div>
              </div>

              {!isEditingProfile && (
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "6px 12px",
                    background: "#f1f5f2",
                    border: "1px solid #dce4dc",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#164e23",
                    cursor: "pointer",
                  }}
                >
                  <Edit2 size={13} />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {profileMessage && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  marginBottom: "14px",
                  background: profileMessage.type === "success" ? "#f0fdf4" : "#fef2f2",
                  color: profileMessage.type === "success" ? "#166534" : "#b91c1c",
                  border: `1px solid ${profileMessage.type === "success" ? "#bbf7d0" : "#fecaca"}`,
                }}
              >
                {profileMessage.text}
              </div>
            )}

            {profileLoading ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: "#64748b" }}>
                <Loader2 size={20} className="spin-animate" />
                <p style={{ margin: "8px 0 0", fontSize: "13px" }}>Loading profile details...</p>
              </div>
            ) : isEditingProfile ? (
              <form onSubmit={handleSaveProfile}>
                <div style={{ marginBottom: "14px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      color: "#475569",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1.5px solid #dce4dc",
                      borderRadius: "8px",
                      fontSize: "13.5px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                    required
                  />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      color: "#475569",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1.5px solid #dce4dc",
                      borderRadius: "8px",
                      fontSize: "13.5px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      color: "#475569",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1.5px solid #dce4dc",
                      borderRadius: "8px",
                      fontSize: "13.5px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingProfile(false);
                      setProfileName(profile?.name || "");
                      setProfileEmail(profile?.email || "");
                      setProfilePhone(profile?.phone || "");
                    }}
                    style={{
                      flex: 1,
                      padding: "10px",
                      background: "#f1f5f2",
                      border: "1px solid #dce4dc",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#475569",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    style={{
                      flex: 1,
                      padding: "10px",
                      background: "linear-gradient(135deg, #164e23 0%, #227938 100%)",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    {profileSaving ? (
                      <Loader2 size={14} className="spin-animate" />
                    ) : (
                      <>
                        <Save size={14} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
                    Full Name
                  </span>
                  <p style={{ margin: "2px 0 0", fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                    {profile?.name || "Traveller"}
                  </p>
                </div>

                <div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
                    Email Address
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                      {profile?.email || "No email registered"}
                    </p>
                    {isEmailVerified && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "2px 8px",
                          background: "#eaf3ec",
                          color: "#166534",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 700,
                        }}
                      >
                        <ShieldCheck size={12} />
                        Verified
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
                    Phone Number
                  </span>
                  <p style={{ margin: "2px 0 0", fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                    {profile?.phone || "Not linked"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bookings Section ("My Trips") */}
          <div style={{ gridColumn: "span 2" }}>
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: "16px",
                  borderBottom: "1px solid #f1f5f9",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                    My Expeditions &amp; Bookings
                  </h2>
                  <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                    Confirmed departures linked to your account
                  </span>
                </div>

                <span
                  style={{
                    padding: "4px 12px",
                    background: "#f1f5f9",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#475569",
                  }}
                >
                  {bookings.length} {bookings.length === 1 ? "Booking" : "Bookings"}
                </span>
              </div>

              {bookingsLoading ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "#64748b" }}>
                  <Loader2 size={24} className="spin-animate" />
                  <p style={{ margin: "10px 0 0", fontSize: "13.5px" }}>Loading your trip records...</p>
                </div>
              ) : bookingsError ? (
                <div
                  style={{
                    padding: "20px",
                    background: "#fef2f2",
                    borderRadius: "12px",
                    color: "#b91c1c",
                    fontSize: "13.5px",
                  }}
                >
                  {bookingsError}
                </div>
              ) : bookings.length === 0 ? (
                <div style={{ padding: "48px 20px", textAlign: "center" }}>
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      background: "#eef6eb",
                      color: "#164e23",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 16px",
                    }}
                  >
                    <Compass size={28} />
                  </div>
                  <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
                    No bookings found
                  </h3>
                  <p style={{ fontSize: "13.5px", color: "#64748b", margin: "0 0 20px", maxWidth: "420px", marginInline: "auto" }}>
                    You haven't reserved any trips with this account yet. Check out our upcoming departures and embark on your next journey!
                  </p>
                  <Link
                    to="/trips"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "11px 22px",
                      background: "linear-gradient(135deg, #164e23 0%, #206d32 100%)",
                      color: "#ffffff",
                      borderRadius: "30px",
                      fontSize: "13.5px",
                      fontWeight: 700,
                      textDecoration: "none",
                      boxShadow: "0 4px 12px rgba(22, 78, 35, 0.2)",
                    }}
                  >
                    <span>Browse All Trips</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {bookings.map((b) => (
                    <div
                      key={b._id}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        padding: "18px 20px",
                        background: "#fbfdfb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "16px",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: "240px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              background: "#eaf3ec",
                              color: "#166534",
                              borderRadius: "6px",
                              fontSize: "11.5px",
                              fontWeight: 700,
                              letterSpacing: "0.5px",
                            }}
                          >
                            {b.bookingCode || "CONFIRMED"}
                          </span>
                          <span
                            style={{
                              padding: "2px 8px",
                              background: b.paymentStatus === "Paid" ? "#dcfce7" : "#fef3c7",
                              color: b.paymentStatus === "Paid" ? "#166534" : "#92400e",
                              borderRadius: "6px",
                              fontSize: "11.5px",
                              fontWeight: 700,
                            }}
                          >
                            {b.paymentStatus === "Paid" ? "Payment Paid" : b.paymentStatus || "Pending"}
                          </span>
                        </div>

                        <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
                          {b.trip?.title || "Upcoming Expedition"}
                        </h4>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", fontSize: "12.5px", color: "#64748b" }}>
                          {b.trip?.location && (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <MapPin size={13} color="#164e23" />
                              <span>{b.trip.location}</span>
                            </div>
                          )}

                          {b.date && (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <Calendar size={13} color="#164e23" />
                              <span>
                                {new Date(b.date).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          )}

                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <Users size={13} color="#164e23" />
                            <span>{b.travellers} {b.travellers === 1 ? "Traveller" : "Travellers"}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", display: "block" }}>
                          Total Amount
                        </span>
                        <span style={{ fontSize: "18px", fontWeight: 800, color: "#0d2b17" }}>
                          ₹{Number(b.total || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
