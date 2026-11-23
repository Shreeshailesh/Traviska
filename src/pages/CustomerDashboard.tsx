import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "../firebase";
import { API_BASE_URL } from "../api";
import {
  User,
  Calendar,
  Check,
  AlertCircle,
  Compass,
  Edit2,
  Save,
  Loader2,
  ArrowRight,
  Mail,
  Phone,
  Luggage,
  Pencil,
  Mountain,
  CalendarCheck,
  UserCheck,
  Bell,
  Percent,
  X,
  CheckCircle2,
} from "lucide-react";
import bottomDrawingImg from "../assets/dashboard-bottom-drawing.jpg";
import { AVATAR_PRESETS } from "../assets/avatarPresets";
import "./CustomerDashboard.css";

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
  // Profile State
  const [profile, setProfile] = useState<CustomerProfile | null>(() => {
    const saved = localStorage.getItem("customer");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const storedAvatar = localStorage.getItem("customerAvatar");
        return { ...parsed, photoUrl: parsed.photoUrl || storedAvatar || "" };
      } catch {}
    }
    return null;
  });
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string>(() => {
    const saved = localStorage.getItem("customer");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.photoUrl) return parsed.photoUrl;
      } catch {}
    }
    return localStorage.getItem("customerAvatar") || "";
  });

  const [profileSaving, setProfileSaving] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Email verification state
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // Auto-dismiss notification after 4 seconds
  useEffect(() => {
    if (!profileMessage) return;
    const timer = setTimeout(() => {
      setProfileMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [profileMessage]);

  // Bookings State
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
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
          const storedAvatar = localStorage.getItem("customerAvatar") || "";
          const activePhoto = cust.photoUrl || storedAvatar || "";
          setProfile({ ...cust, photoUrl: activePhoto });
          setProfileName(cust.name || "");
          setProfileEmail(cust.email || "");
          setProfilePhone(cust.phone || "");
          setSelectedAvatar(activePhoto);
        }
      } catch (err: any) {
        console.error("Profile load error:", err);
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

        const [res, invRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/customer/bookings`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios
            .get(`${API_BASE_URL}/api/customer/invoices`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: { invoices: [] } })),
        ]);

        if (!cancelled) {
          setBookings(res.data.bookings || []);
          setCustomerInvoices(invRes.data?.invoices || []);
          setBookingsError("");
        }
      } catch (err: any) {
        console.error("Bookings load error:", err);
        if (!cancelled) {
          setBookingsError(
            "Unable to load your bookings. Please check back shortly."
          );
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

  const handleOpenEditProfile = () => {
    const currentAvatar = profile?.photoUrl || localStorage.getItem("customerAvatar") || "";
    setSelectedAvatar(currentAvatar);
    setIsEditingProfile(true);
  };

  const handleSelectAvatar = (url: string) => {
    setSelectedAvatar(url);
    // Instant live update in state and Card 1
    setProfile((prev) => (prev ? { ...prev, photoUrl: url } : prev));
    if (url) {
      localStorage.setItem("customerAvatar", url);
    } else {
      localStorage.removeItem("customerAvatar");
    }
    const saved = localStorage.getItem("customer");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        localStorage.setItem("customer", JSON.stringify({ ...parsed, photoUrl: url }));
      } catch {}
    }
    window.dispatchEvent(new Event("traviska-avatar-updated"));
  };

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);

    const name = profileName.trim();
    const email = profileEmail.trim();
    const phone = profilePhone.trim();
    const photoUrl = selectedAvatar;

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
        body: JSON.stringify({ name, email, phone, photoUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update profile");

      const finalPhotoUrl = data.customer?.photoUrl || photoUrl;
      setProfile({
        ...data.customer,
        photoUrl: finalPhotoUrl,
      });
      if (finalPhotoUrl) {
        localStorage.setItem("customerAvatar", finalPhotoUrl);
      } else {
        localStorage.removeItem("customerAvatar");
      }
      setProfileMessage({
        type: "success",
        text: "Profile updated successfully!",
      });
      setIsEditingProfile(false);

      // Sync local storage
      const saved = localStorage.getItem("customer");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          localStorage.setItem(
            "customer",
            JSON.stringify({
              ...parsed,
              name: data.customer.name,
              email: data.customer.email,
              phone: data.customer.phone,
              photoUrl: finalPhotoUrl,
            })
          );
        } catch {}
      }
    } catch (err: any) {
      setProfileMessage({
        type: "error",
        text: err?.message || "Failed to save profile.",
      });
    } finally {
      setProfileSaving(false);
    }
  };

  // Resend Email Verification link
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

  const isEmailVerified =
    profile?.isEmailVerified || auth.currentUser?.emailVerified;

  // Display Name logic
  const displayName =
    profile?.name && profile.name !== "Customer"
      ? profile.name
      : profile?.email
      ? profile.email.split("@")[0]
      : "Shaileshkatharki";

  return (
    <div className="customer-dashboard-page">
      {/* ===========================
          HERO BANNER
          =========================== */}
      <section className="dashboard-hero">
        {/* Airplane flight path graphic */}
        <div className="dash-flight-path" aria-hidden="true">
          <svg viewBox="0 0 400 90" fill="none">
            <path
              d="M 10 70 Q 180 10 360 45"
              stroke="rgba(255, 255, 255, 0.45)"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
            <g transform="translate(360, 44) rotate(18)">
              <path
                d="M 0 -8 L 4 0 L 12 3 L 4 5 L 3 10 L 0 8 L -2 10 L -1 5 L -8 3 L 0 0 Z"
                fill="#ffffff"
              />
            </g>
          </svg>
        </div>

        <div className="dash-hero-container">
          {/* Header Tag */}
          <div className="dash-hero-tag">
            <span className="dash-hero-tag-bar"></span>
            <span>TRAVELLER DASHBOARD</span>
          </div>

          {/* Heading */}
          <h1 className="dash-hero-title">
            Welcome back,
            <br />
            <span className="dash-hero-name">
              {displayName}!
              <svg
                className="dash-name-brush"
                viewBox="0 0 240 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 10 C 60 4, 180 4, 236 12 C 180 7, 70 7, 8 14"
                  stroke="#a8e063"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          {/* Subtitle */}
          <p className="dash-hero-subtitle">
            Manage your travels, bookings and profile – all in one place.
          </p>

          {/* CTAs */}
          <div className="dash-hero-actions">
            <Link to="/trips" className="dash-btn-explore">
              <Compass size={18} />
              <span>Explore Trips</span>
              <ArrowRight size={16} />
            </Link>
            <a href="#my-bookings" className="dash-btn-bookings">
              <Calendar size={16} />
              <span>My Bookings</span>
            </a>
          </div>
        </div>

        {/* Wavy transition into main content */}
        <div className="dash-wave-divider" aria-hidden="true">
          <svg viewBox="0 0 1440 70" fill="none" preserveAspectRatio="none">
            <path
              d="M0 70 L0 25 Q 360 65 720 30 T 1440 35 L 1440 70 Z"
              fill="#f5f9f6"
              opacity="0.6"
            />
            <path
              d="M0 70 L0 38 Q 420 75 880 25 T 1440 48 L 1440 70 Z"
              fill="#fbfdfb"
            />
          </svg>
        </div>
      </section>

      {/* ===========================
          MAIN CONTENT CARDS
          =========================== */}
      <main className="dash-main-content">
        {/* Profile Alert */}
        {profileMessage && (
          <div className={`dash-alert ${profileMessage.type}`} role="alert">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
              {profileMessage.type === "success" ? (
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              ) : (
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
              )}
              <span>{profileMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setProfileMessage(null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                color: "inherit",
                opacity: 0.7,
              }}
              title="Dismiss"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="dash-grid">
          {/* =========================================================
              CARD 1: USER BADGE (LEFT)
              Deep forest green with topography, pine trees, & avatar
             ========================================================= */}
          <div className="dash-card-user">
            {/* Avatar Container */}
            <div className="dash-avatar-container">
              {profile?.photoUrl ? (
                <img
                  src={profile.photoUrl}
                  alt={displayName}
                  className="dash-avatar-img"
                />
              ) : (
                <div className="dash-avatar-fallback">
                  <User size={34} color="#d4f8a6" />
                </div>
              )}
              <button
                type="button"
                className="dash-avatar-edit-btn"
                onClick={handleOpenEditProfile}
                title="Change avatar & edit profile"
                aria-label="Change avatar & edit profile"
              >
                <Pencil size={13} />
              </button>
            </div>

            {/* Name */}
            <h3 className="dash-user-name">{displayName}</h3>

            {/* Role Badge */}
            <div className="dash-role-pill">
              <Compass size={13} color="#bbf2a3" />
              <span>Traveller</span>
            </div>
          </div>

          {/* =========================================================
              CARD 2: MY PROFILE (CENTER)
              Contact info, verified email badge, and link phone
             ========================================================= */}
          <div className="dash-card-profile">
            <div className="dash-card-header">
              <div className="dash-card-header-left">
                <div className="dash-card-header-icon">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="dash-card-title">My Profile</h3>
                  <p className="dash-card-subtitle">
                    Traveller Contact Information
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="dash-btn-edit-profile"
                onClick={handleOpenEditProfile}
              >
                <Edit2 size={13} />
                <span>Edit Profile</span>
              </button>
            </div>

            <div className="dash-profile-rows">
              {/* Full Name */}
              <div className="dash-profile-row">
                <div className="dash-row-left">
                  <div className="dash-row-icon">
                    <User size={16} />
                  </div>
                  <div className="dash-row-info">
                    <div className="dash-row-label">Full Name</div>
                    <div className="dash-row-value">{displayName}</div>
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div className="dash-profile-row dash-profile-row-email">
                <div className="dash-row-left">
                  <div className="dash-row-icon">
                    <Mail size={16} />
                  </div>
                  <div className="dash-row-info">
                    <div className="dash-row-label-row">
                      <span className="dash-row-label">Email Address</span>
                      {isEmailVerified && (
                        <span className="dash-verified-badge dash-verified-badge-label">
                          <Check size={11} strokeWidth={3} />
                          <span>Verified</span>
                        </span>
                      )}
                    </div>
                    <div className="dash-row-value dash-row-value-email">
                      {profile?.email || "shaileshkatharki@gmail.com"}
                    </div>
                  </div>
                </div>
                {!isEmailVerified && (
                  <button
                    type="button"
                    className="dash-btn-action-pill"
                    onClick={handleResendEmailVerification}
                    disabled={resendingVerification || verificationSent}
                  >
                    {verificationSent
                      ? "Link Sent!"
                      : resendingVerification
                      ? "Sending..."
                      : "Verify Now"}
                  </button>
                )}
              </div>

              {/* Phone Number */}
              <div className="dash-profile-row">
                <div className="dash-row-left">
                  <div className="dash-row-icon">
                    <Phone size={16} />
                  </div>
                  <div className="dash-row-info">
                    <div className="dash-row-label">Phone Number</div>
                    <div className="dash-row-value">
                      {profile?.phone || "Not linked"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="dash-btn-action-pill"
                  onClick={handleOpenEditProfile}
                >
                  {profile?.phone ? "Change" : "Link Now"}
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================
              CARD 3: MY EXPEDITIONS & BOOKINGS (RIGHT)
              Detailed camping illustration & empty/populated bookings
             ========================================================= */}
          <div id="my-bookings" className="dash-card-bookings">
            <div className="dash-card-header">
              <div className="dash-card-header-left">
                <div className="dash-card-header-icon">
                  <Luggage size={20} />
                </div>
                <div>
                  <h3 className="dash-card-title">My Expeditions &amp; Bookings</h3>
                  <p className="dash-card-subtitle">
                    Confirmed departures linked to your account
                  </p>
                </div>
              </div>
            </div>

            {bookingsError && (
              <div className="dash-alert error" style={{ margin: "10px 14px" }}>
                <AlertCircle size={15} />
                <span>{bookingsError}</span>
              </div>
            )}

            {bookingsLoading ? (
              <div className="dash-empty-bookings">
                <Loader2 size={24} className="spin-animate" color="#166534" />
                <p style={{ marginTop: "10px", fontSize: "13px", color: "#647568" }}>
                  Loading your expeditions...
                </p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="dash-empty-bookings">
                {/* =========================================================
                    EXACT CAMPING TENT & MOUNTAIN SCENE ILLUSTRATION
                    Layered peaks, 3 pines left, 3 pines right, glowing A-frame tent
                   ========================================================= */}
                <svg
                  viewBox="0 0 200 96"
                  fill="none"
                  className="dash-tent-scene"
                  aria-hidden="true"
                >
                  {/* Subtle Rising Sun Glow */}
                  <circle cx="152" cy="30" r="14" fill="#fde68a" opacity="0.7" />
                  <circle cx="152" cy="30" r="22" fill="#fef08a" opacity="0.3" />

                  {/* Distant Mountain Peak (Left) */}
                  <polygon points="18,84 62,32 108,84" fill="#a7d8ba" opacity="0.45" />

                  {/* Main Mountain Peak (Center-Back) */}
                  <polygon points="50,84 100,16 150,84" fill="#88c49e" opacity="0.65" />
                  {/* Mountain Snow Peak Tip */}
                  <polygon points="90,32 100,16 110,32 105,30 100,34 95,29" fill="#ffffff" opacity="0.85" />

                  {/* Distant Mountain Peak (Right) */}
                  <polygon points="112,84 154,34 194,84" fill="#9cd2b0" opacity="0.5" />

                  {/* Rolling Grassy Hill Mound */}
                  <ellipse cx="100" cy="85" rx="88" ry="14" fill="#cbe6ce" />

                  {/* --- 3 TIERED PINE TREES (LEFT) --- */}
                  {/* Tree 1 (Back, Tall) */}
                  <polygon points="34,84 41,52 48,84" fill="#144e23" />
                  <polygon points="36,68 41,52 46,68" fill="#1b5e2b" />
                  {/* Tree 2 (Middle) */}
                  <polygon points="46,84 53,44 60,84" fill="#0d3b19" />
                  <polygon points="48,64 53,44 58,64" fill="#165625" />
                  {/* Tree 3 (Front, Shorter) */}
                  <polygon points="58,84 64,56 70,84" fill="#1f7134" />
                  <polygon points="60,72 64,56 68,72" fill="#298a41" />

                  {/* --- 3 TIERED PINE TREES (RIGHT) --- */}
                  {/* Tree 4 (Front) */}
                  <polygon points="130,84 136,54 142,84" fill="#1f7134" />
                  <polygon points="132,70 136,54 140,70" fill="#298a41" />
                  {/* Tree 5 (Middle) */}
                  <polygon points="140,84 147,42 154,84" fill="#0d3b19" />
                  <polygon points="142,62 147,42 152,62" fill="#165625" />
                  {/* Tree 6 (Back, Tall) */}
                  <polygon points="152,84 159,50 166,84" fill="#144e23" />
                  <polygon points="154,66 159,50 164,66" fill="#1b5e2b" />

                  {/* --- CLASSIC A-FRAME CAMPING TENT (CENTER) --- */}
                  {/* Tent Shadow on Ground */}
                  <ellipse cx="100" cy="85" rx="28" ry="4" fill="#9bbd9e" opacity="0.6" />

                  {/* Tent Left Flap (Bright Warm Orange) */}
                  <polygon points="76,84 100,42 100,84" fill="#f97316" />
                  {/* Tent Right Flap (Rich Sunset Rust Orange) */}
                  <polygon points="100,42 124,84 100,84" fill="#ea580c" />
                  {/* Tent Side Wall / Roof Angle */}
                  <polygon points="100,42 124,84 114,84 94,42" fill="#c2410c" opacity="0.3" />

                  {/* Tent Front Triangular Opening (Luminous Warm Glow) */}
                  <polygon points="86,84 100,56 114,84" fill="#fef08a" />
                  {/* Tent Inner Dark Depth */}
                  <polygon points="94,84 100,66 106,84" fill="#78350f" opacity="0.75" />

                  {/* Front Crossed Tent Poles (Charcoal) */}
                  <line x1="82" y1="84" x2="103" y2="38" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="118" y1="84" x2="97" y2="38" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />
                </svg>

                <h4 className="dash-empty-title">No bookings found</h4>
                <p className="dash-empty-desc">
                  You haven't reserved any trips with this account yet.
                </p>
                <Link to="/trips" className="dash-btn-browse">
                  <span>Browse All Trips</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            ) : (
              <div className="dash-bookings-list">
                {bookings.map((b) => {
                  const matchedInvoice = customerInvoices.find(
                    (inv) =>
                      (inv.bookingId && String(inv.bookingId) === String(b._id)) ||
                      (b.bookingCode && inv.bookingCode === b.bookingCode)
                  );
                  const handleDownloadCustomerInvoice = async () => {
                    if (!matchedInvoice) return;
                    try {
                      const token = getCustomerToken();
                      const res = await axios.get(
                        `${API_BASE_URL}/api/customer/invoices/${matchedInvoice._id}/pdf`,
                        {
                          headers: { Authorization: `Bearer ${token}` },
                          responseType: "blob",
                        }
                      );
                      const blob = new Blob([res.data], { type: "application/pdf" });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${String(matchedInvoice.invoiceNumber).replace(/\//g, "-")}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      window.URL.revokeObjectURL(url);
                    } catch {
                      alert("Unable to download invoice right now.");
                    }
                  };
                  const handleViewCustomerInvoice = async () => {
                    if (!matchedInvoice) return;
                    try {
                      const token = getCustomerToken();
                      const res = await axios.get(
                        `${API_BASE_URL}/api/customer/invoices/${matchedInvoice._id}/html`,
                        { headers: { Authorization: `Bearer ${token}` } }
                      );
                      const win = window.open("", "_blank");
                      if (win) {
                        win.document.open();
                        win.document.write(res.data);
                        win.document.close();
                      }
                    } catch {
                      alert("Unable to preview invoice right now.");
                    }
                  };

                  return (
                  <div key={b._id} className="dash-booking-item">
                    <div className="dash-booking-item-left">
                      {b.trip?.image && (
                        <img
                          src={b.trip.image}
                          alt={b.trip.title || "Trip"}
                          className="dash-booking-thumb"
                        />
                      )}
                      <div>
                        <h5 className="dash-booking-trip-title">
                          {b.trip?.title || "Upcoming Expedition"}
                        </h5>
                        <div className="dash-booking-meta">
                          {b.bookingCode && (
                            <>
                              <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{b.bookingCode}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>{b.date || "Date TBA"}</span>
                          <span>•</span>
                          <span>{b.travellers || 1} Traveller(s)</span>
                          {b.total !== undefined && (
                            <>
                              <span>•</span>
                              <span>₹{Number(b.total).toLocaleString("en-IN")}</span>
                            </>
                          )}
                          {b.paymentStatus && (
                            <>
                              <span>•</span>
                              <span>{b.paymentStatus}</span>
                            </>
                          )}
                        </div>
                        {matchedInvoice && (
                          <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ fontSize: "11px", color: "#475569", fontWeight: 600 }}>
                              {matchedInvoice.invoiceNumber}
                            </span>
                            <button
                              type="button"
                              onClick={handleViewCustomerInvoice}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                background: "#ffffff",
                                color: "#0e3820",
                                fontSize: "11.5px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              View Invoice
                            </button>
                            <button
                              type="button"
                              onClick={handleDownloadCustomerInvoice}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                border: "none",
                                background: "#0e3820",
                                color: "#ffffff",
                                fontSize: "11.5px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Download Invoice
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <span
                      className={`dash-status-pill ${
                        b.status === "confirmed"
                          ? "dash-status-confirmed"
                          : "dash-status-pending"
                      }`}
                    >
                      {b.status || "confirmed"}
                    </span>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* =========================================================
            FEATURE HIGHLIGHTS RIBBON BAR
            Exact pill shape, 5 features, dividers, and right map pin
           ========================================================= */}
        <section className="dash-ribbon" aria-label="Dashboard Features">
          {/* 1. Discover */}
          <div className="dash-ribbon-item">
            <Mountain size={22} className="dash-ribbon-icon" />
            <div className="dash-ribbon-text">
              <span className="dash-ribbon-label-top">Discover</span>
              <span className="dash-ribbon-label-bottom">Curated Trips</span>
            </div>
          </div>

          <div className="dash-ribbon-divider" aria-hidden="true" />

          {/* 2. Manage */}
          <div className="dash-ribbon-item">
            <CalendarCheck size={22} className="dash-ribbon-icon" />
            <div className="dash-ribbon-text">
              <span className="dash-ribbon-label-top">Manage</span>
              <span className="dash-ribbon-label-bottom">Your Bookings</span>
            </div>
          </div>

          <div className="dash-ribbon-divider" aria-hidden="true" />

          {/* 3. Update */}
          <div className="dash-ribbon-item">
            <UserCheck size={22} className="dash-ribbon-icon" />
            <div className="dash-ribbon-text">
              <span className="dash-ribbon-label-top">Update</span>
              <span className="dash-ribbon-label-bottom">Your Profile</span>
            </div>
          </div>

          <div className="dash-ribbon-divider" aria-hidden="true" />

          {/* 4. Get */}
          <div className="dash-ribbon-item">
            <Bell size={22} className="dash-ribbon-icon" />
            <div className="dash-ribbon-text">
              <span className="dash-ribbon-label-top">Get</span>
              <span className="dash-ribbon-label-bottom">Trip Updates</span>
            </div>
          </div>

          <div className="dash-ribbon-divider" aria-hidden="true" />

          {/* 5. Exclusive */}
          <div className="dash-ribbon-item">
            <Percent size={22} className="dash-ribbon-icon" />
            <div className="dash-ribbon-text">
              <span className="dash-ribbon-label-top">Exclusive</span>
              <span className="dash-ribbon-label-bottom">Traveller Offers</span>
            </div>
          </div>

          {/* Far Right Green Destination Pin */}
          <svg
            className="dash-ribbon-pin"
            width="22"
            height="26"
            viewBox="0 0 24 28"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 0 C5.37 0 0 5.37 0 12 C0 19.5 10.5 27.2 11.2 27.7 C11.6 28 12.4 28 12.8 27.7 C13.5 27.2 24 19.5 24 12 C24 5.37 18.63 0 12 0 Z"
              fill="#166534"
            />
            <circle cx="12" cy="11" r="4.5" fill="#ffffff" />
          </svg>
        </section>
      </main>

      {/* =========================================================
          BOTTOM LANDSCAPE DRAWING (EDGE-TO-EDGE)
          Exact user-provided drawing extending 100% full width
         ========================================================= */}
      <div className="dash-bottom-decor-edge-to-edge" aria-hidden="true">
        <img
          src={bottomDrawingImg}
          alt=""
          className="dash-bottom-decor-img"
        />
      </div>

      {/* ===========================
          EDIT PROFILE MODAL
          =========================== */}
      {isEditingProfile && (
        <div
          className="dash-modal-backdrop"
          onClick={() => setIsEditingProfile(false)}
        >
          <div className="dash-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="dash-modal-close"
              onClick={() => setIsEditingProfile(false)}
              aria-label="Close edit profile modal"
            >
              <X size={18} />
            </button>

            <h3
              style={{
                fontSize: "18px",
                fontWeight: 800,
                color: "#162d1c",
                margin: "0 0 4px",
              }}
            >
              Edit Traveller Profile
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "#647568",
                margin: "0 0 20px",
              }}
            >
              Update your contact details to receive departure &amp; booking
              updates.
            </p>

            <form onSubmit={handleSaveProfile}>
              {/* CHOOSE AVATAR */}
              <div className="dash-form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label className="dash-form-label" style={{ margin: 0 }}>
                    Choose Avatar
                  </label>
                  {selectedAvatar && (
                    <button
                      type="button"
                      className="dash-btn-clear-avatar"
                      onClick={() => handleSelectAvatar("")}
                    >
                      Reset to default
                    </button>
                  )}
                </div>

                {/* LIVE PREVIEW OF SELECTED AVATAR */}
                <div className="dash-modal-avatar-preview-box">
                  <div className="dash-modal-preview-circle">
                    {selectedAvatar ? (
                      <img src={selectedAvatar} alt="Selected Avatar" className="dash-avatar-img" />
                    ) : (
                      <div className="dash-avatar-fallback">
                        <User size={28} color="#d4f8a6" />
                      </div>
                    )}
                  </div>
                  <div className="dash-modal-preview-text">
                    <span className="dash-modal-preview-title">
                      {AVATAR_PRESETS.find((a) => a.url === selectedAvatar)?.name || "Default Silhouette"}
                    </span>
                    <span className="dash-modal-preview-sub">
                      Selected Avatar (Live Preview)
                    </span>
                  </div>
                </div>

                <div className="dash-avatar-picker-grid">
                  {AVATAR_PRESETS.map((av) => {
                    const isSelected = selectedAvatar === av.url;
                    return (
                      <button
                        type="button"
                        key={av.id}
                        className={`dash-avatar-option-btn ${isSelected ? "selected" : ""}`}
                        onClick={() => handleSelectAvatar(av.url)}
                        title={av.name}
                        aria-label={`Select ${av.name} avatar`}
                      >
                        <img
                          src={av.url}
                          alt={av.name}
                          className="dash-avatar-option-img"
                        />
                        {isSelected && (
                          <span className="dash-avatar-check-badge">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="dash-form-group">
                <label className="dash-form-label" htmlFor="edit-name">
                  Full Name
                </label>
                <input
                  id="edit-name"
                  type="text"
                  className="dash-input"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g. Shailesh Katharki"
                  required
                />
              </div>

              <div className="dash-form-group">
                <label className="dash-form-label" htmlFor="edit-email">
                  Email Address
                </label>
                <input
                  id="edit-email"
                  type="email"
                  className="dash-input"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  placeholder="e.g. traveller@example.com"
                  required
                />
              </div>

              <div className="dash-form-group">
                <label className="dash-form-label" htmlFor="edit-phone">
                  Phone Number
                </label>
                <input
                  id="edit-phone"
                  type="tel"
                  className="dash-input"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="+91 9876543210"
                />
              </div>

              <div className="dash-modal-actions">
                <button
                  type="button"
                  className="dash-btn-cancel"
                  onClick={() => setIsEditingProfile(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="dash-btn-save"
                  disabled={profileSaving}
                >
                  {profileSaving ? (
                    <>
                      <Loader2 size={16} className="spin-animate" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
