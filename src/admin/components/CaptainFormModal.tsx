import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Phone,
  Mail,
  Award,
  Star,
  Tag,
  UserPlus,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { API_BASE_URL } from "../../api";

export interface CaptainFormData {
  _id?: string;
  name: string;
  phone: string;
  email?: string;
  role: "Head Captain" | "Main Captain" | "Trainee Captain" | string;
  status: "Active" | "Inactive" | "Unavailable" | string;
  rating?: number;
  specialities?: string[] | string;
  specialties?: string[] | string;
  bio?: string;
  defaultTripFee?: number;
}

interface CaptainFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  captain?: CaptainFormData | null;
  onSuccess: (savedCaptain: any) => void;
}

export const CaptainFormModal: React.FC<CaptainFormModalProps> = ({
  isOpen,
  onClose,
  captain,
  onSuccess,
}) => {
  const isEdit = Boolean(captain && captain._id);

  const [name, setName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Head Captain");
  const [status, setStatus] = useState("Active");
  const [rating, setRating] = useState<string>("");
  const [specialities, setSpecialities] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      setIsSubmitting(false);
      return;
    }

    if (captain) {
      setName(captain.name || "");
      // Extract 10 digits from phone if present
      const rawDigits = String(captain.phone || "")
        .replace(/[^\d]/g, "")
        .slice(-10);
      setPhoneDigits(rawDigits);
      setEmail(captain.email || "");

      const r = (captain.role || "Main Captain").toLowerCase();
      if (r.includes("head") || r.includes("lead")) {
        setRole("Head Captain");
      } else if (r.includes("trainee")) {
        setRole("Trainee Captain");
      } else {
        setRole("Main Captain");
      }

      setStatus(captain.status === "Inactive" ? "Inactive" : "Active");
      setRating(captain.rating ? String(captain.rating) : "");

      const specs = captain.specialities || captain.specialties;
      if (Array.isArray(specs)) {
        setSpecialities(specs.join(", "));
      } else if (typeof specs === "string") {
        setSpecialities(specs);
      } else {
        setSpecialities("Trekking, Camping, First Aid");
      }
    } else {
      // Add mode default
      setName("");
      setPhoneDigits("");
      setEmail("");
      setRole("Head Captain");
      setStatus("Active");
      setRating("");
      setSpecialities("Trekking, Camping, First Aid, Wildlife");
    }
    setErrorMsg(null);
    setIsSubmitting(false);
  }, [isOpen, captain]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (!name.trim()) {
      setErrorMsg("Full name is required.");
      return;
    }

    const cleanDigits = phoneDigits.replace(/[^\d]/g, "");
    if (cleanDigits.length !== 10 || !/^[6-9]\d{9}$/.test(cleanDigits)) {
      setErrorMsg("Please enter a valid 10-digit Indian phone number (starting with 6, 7, 8, or 9).");
      return;
    }

    const fullPhone = `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`;
    const parsedRating = rating !== "" && !isNaN(Number(rating)) ? Number(rating) : isEdit ? (captain?.rating || 0) : 0;

    const payload = {
      name: name.trim(),
      phone: fullPhone,
      email: email.trim(),
      role,
      status,
      rating: parsedRating,
      specialities: specialities
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const url = isEdit
        ? `${API_BASE_URL}/admin/operations/captains/${captain!._id}`
        : `${API_BASE_URL}/admin/operations/captains`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || `Failed to ${isEdit ? "update" : "create"} captain.`);
      }

      onSuccess(data.captain || payload);
      onClose();
    } catch (err: any) {
      console.error("Captain save error:", err);
      setErrorMsg(err.message || "An unexpected error occurred while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundColor: "rgba(10, 25, 15, 0.65)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          background: "#ffffff",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
          display: "flex",
          flexDirection: "column",
          animation: "modalFadeIn 0.2s ease-out",
        }}
      >
        {/* Header strictly styled as per Reference Image (media_1794590273552_dd57ffa5.jpg) */}
        <div
          style={{
            position: "relative",
            background: "linear-gradient(135deg, #092312 0%, #0d381c 50%, #164e27 100%)",
            padding: "22px 24px",
            color: "#ffffff",
            overflow: "hidden",
          }}
        >
          {/* Mountain Silhouette Watermark */}
          <svg
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              height: "100%",
              width: "55%",
              opacity: 0.18,
              pointerEvents: "none",
            }}
            preserveAspectRatio="none"
            viewBox="0 0 400 160"
          >
            <path
              d="M0 160 L70 80 L140 140 L220 50 L300 130 L370 70 L400 110 L400 160 Z"
              fill="#ffffff"
            />
            <path
              d="M100 160 L180 90 L260 150 L340 85 L400 130 L400 160 Z"
              fill="#a7f3d0"
              opacity="0.3"
            />
          </svg>

          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.12)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#a7f3d0",
                  flexShrink: 0,
                }}
              >
                {isEdit ? <Award size={22} /> : <UserPlus size={22} />}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 700, letterSpacing: "-0.01em", color: "#ffffff" }}>
                  {isEdit ? "Edit Captain" : "Add New Captain"}
                </h2>
                <p style={{ margin: "3px 0 0 0", fontSize: "12.5px", color: "rgba(255, 255, 255, 0.78)" }}>
                  {isEdit ? "Update captain information and role" : "Register a new trip captain to your team"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                border: "none",
                color: "#ffffff",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)")}
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Form Body strictly matching Reference Image layout */}
        <form onSubmit={handleSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
          {errorMsg && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                borderRadius: "8px",
                background: "#fef2f2",
                border: "1px solid #fee2e2",
                color: "#b91c1c",
                fontSize: "13px",
              }}
            >
              <AlertCircle size={17} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 2-Column Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px 20px",
            }}
          >
            {/* Full Name */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#1e293b",
                  marginBottom: "6px",
                }}
              >
                Full Name *
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <User
                  size={16}
                  style={{ position: "absolute", left: "12px", color: "#94a3b8", pointerEvents: "none" }}
                />
                <input
                  type="text"
                  required
                  placeholder="Enter captain's full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px 9px 38px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13.5px",
                    color: "#0f172a",
                    outline: "none",
                    background: "#ffffff",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#0d2b17";
                    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(13, 43, 23, 0.12)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Phone Number (WhatsApp) */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#1e293b",
                  marginBottom: "6px",
                }}
              >
                Phone Number (WhatsApp) *
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    position: "absolute",
                    left: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "#0f172a",
                    fontWeight: 600,
                    fontSize: "13px",
                    pointerEvents: "none",
                  }}
                >
                  <Phone size={15} style={{ color: "#94a3b8" }} />
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  required
                  placeholder="Enter phone number"
                  maxLength={10}
                  value={phoneDigits}
                  onChange={(e) => setPhoneDigits(e.target.value.replace(/[^\d]/g, ""))}
                  style={{
                    width: "100%",
                    padding: "9px 12px 9px 66px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13.5px",
                    color: "#0f172a",
                    outline: "none",
                    background: "#ffffff",
                    letterSpacing: "0.02em",
                    fontFamily: "inherit",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#0d2b17";
                    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(13, 43, 23, 0.12)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#1e293b",
                  marginBottom: "6px",
                }}
              >
                Email Address
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <Mail
                  size={16}
                  style={{ position: "absolute", left: "12px", color: "#94a3b8", pointerEvents: "none" }}
                />
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px 9px 38px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13.5px",
                    color: "#0f172a",
                    outline: "none",
                    background: "#ffffff",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#0d2b17";
                    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(13, 43, 23, 0.12)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Captain Hierarchy Rank & Role */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#1e293b",
                  marginBottom: "6px",
                }}
              >
                Captain Hierarchy Rank & Role *
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <Award
                  size={16}
                  style={{ position: "absolute", left: "12px", color: "#94a3b8", pointerEvents: "none" }}
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px 9px 38px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13.5px",
                    color: "#0f172a",
                    fontWeight: 500,
                    outline: "none",
                    background: "#ffffff",
                    cursor: "pointer",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#0d2b17";
                    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(13, 43, 23, 0.12)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value="Head Captain">👑 1. Head Captain (Highest Authority — Leader)</option>
                  <option value="Main Captain">⭐ 2. Main Captain (Second-in-Command — Support)</option>
                  <option value="Trainee Captain">🌱 3. Trainee Captain (Supporting Role — Trainee)</option>
                </select>
              </div>
            </div>

            {/* Active Status */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#1e293b",
                  marginBottom: "6px",
                }}
              >
                Active Status *
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    position: "absolute",
                    left: "13px",
                    width: "9px",
                    height: "9px",
                    borderRadius: "50%",
                    background: status === "Active" ? "#16a34a" : "#94a3b8",
                    pointerEvents: "none",
                  }}
                />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px 9px 34px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13.5px",
                    color: "#0f172a",
                    outline: "none",
                    background: "#ffffff",
                    cursor: "pointer",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#0d2b17";
                    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(13, 43, 23, 0.12)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value="Active">Active (Available for trips)</option>
                  <option value="Inactive">Inactive (On Leave / Unavailable)</option>
                </select>
              </div>
            </div>

            {/* Rating */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#1e293b",
                  marginBottom: "6px",
                }}
              >
                Rating
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <Star
                  size={16}
                  style={{
                    position: "absolute",
                    left: "12px",
                    color: rating ? "#f59e0b" : "#94a3b8",
                    fill: rating ? "#f59e0b" : "none",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  placeholder={isEdit ? "0.0 - 5.0" : "0.0 – 5.0 (Default 0.0)"}
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px 9px 38px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13.5px",
                    color: "#0f172a",
                    outline: "none",
                    background: "#ffffff",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#0d2b17";
                    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(13, 43, 23, 0.12)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>
          </div>

          {/* Specialities (Full Width) */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12.5px",
                fontWeight: 600,
                color: "#1e293b",
                marginBottom: "6px",
              }}
            >
              Specialities (Comma Separated)
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Tag
                size={16}
                style={{ position: "absolute", left: "12px", color: "#94a3b8", pointerEvents: "none" }}
              />
              <input
                type="text"
                placeholder="e.g., Trekking, Wildlife, Camping, First Aid"
                value={specialities}
                onChange={(e) => setSpecialities(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 38px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  color: "#0f172a",
                  outline: "none",
                  background: "#ffffff",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#0d2b17";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(13, 43, 23, 0.12)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#cbd5e1";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "12px",
              paddingTop: "16px",
              borderTop: "1px solid #f1f5f9",
              marginTop: "8px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: "9px 20px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontSize: "13.5px",
                fontWeight: 600,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) e.currentTarget.style.background = "#f8fafc";
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) e.currentTarget.style.background = "#ffffff";
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 24px",
                borderRadius: "8px",
                border: "none",
                background: isSubmitting ? "#34583e" : "#0d2b17",
                color: "#ffffff",
                fontSize: "13.5px",
                fontWeight: 600,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) e.currentTarget.style.background = "#143e22";
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) e.currentTarget.style.background = "#0d2b17";
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : isEdit ? (
                <>
                  <Check size={16} />
                  <span>Save Changes</span>
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>Add Captain</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

