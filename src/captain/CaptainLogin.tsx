import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { auth } from "../firebase";
import { API_BASE_URL } from "../api";
import { useCaptainAuth } from "./CaptainAuthContext";

export const CaptainLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useCaptainAuth();

  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const getRecaptchaVerifier = () => {
    if ((window as any).recaptchaVerifier) {
      try {
        (window as any).recaptchaVerifier.clear();
      } catch (e) {}
    }
    (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
    });
    return (window as any).recaptchaVerifier;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1. Pre-validate captain status on server before sending SMS
      const res = await fetch(`${API_BASE_URL}/captain/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Captain account not registered or currently inactive.");
        setLoading(false);
        return;
      }

      // 2. Trigger Firebase Phone Auth SMS
      const formattedPhone = cleanPhone.startsWith("91") && cleanPhone.length === 12
        ? `+${cleanPhone}`
        : `+91${cleanPhone.slice(-10)}`;

      const appVerifier = getRecaptchaVerifier();
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
    } catch (err: any) {
      console.error("Firebase send OTP error:", err);
      setError(err?.message || "Failed to send verification SMS. Please verify your phone number.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) {
      setError("Please request an OTP first");
      return;
    }
    if (!otp || otp.trim().length !== 6) {
      setError("Please enter the 6-digit OTP code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Confirm verification code with Firebase Auth
      const userCredential = await confirmationResult.confirm(otp.trim());
      const idToken = await userCredential.user.getIdToken(true);

      // 2. Exchange Firebase Admin ID token with backend
      const res = await fetch(`${API_BASE_URL}/captain/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();

      if (data.success && data.token) {
        login(data.token, data.captain);
        navigate("/captain/trips");
      } else {
        setError(data.message || "Captain authentication failed on server.");
      }
    } catch (err: any) {
      console.error("Firebase verify OTP error:", err);
      setError(err?.message || "Invalid or expired OTP code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #091f10 0%, #06140a 100%)",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Background Mountain Silhouette */}
      <svg
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          width: "100%",
          height: "45%",
          opacity: 0.12,
          pointerEvents: "none",
        }}
        preserveAspectRatio="none"
        viewBox="0 0 1440 400"
      >
        <path d="M0 400 L250 180 L500 320 L800 120 L1150 280 L1440 160 L1440 400 Z" fill="#ffffff" />
        <path d="M100 400 L400 220 L700 350 L1000 190 L1300 320 L1440 240 L1440 400 Z" fill="#a7cca9" opacity="0.3" />
      </svg>

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "420px" }}>
        {/* Brand Crest */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "rgba(217, 238, 199, 0.15)",
              border: "1px solid rgba(217, 238, 199, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "12px",
            }}
          >
            <svg
              width="26"
              height="22"
              viewBox="0 0 34 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 24 L13 6 L19 16 L23 10 L31 24 Z"
                stroke="#d9eec7"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M10 18 L13 14 L17 20"
                stroke="#d9eec7"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1 style={{ fontSize: "24px", fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>
            Traviska
          </h1>
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "1.5px",
              fontWeight: 700,
              color: "#d9eec7",
              marginTop: "4px",
              textTransform: "uppercase",
            }}
          >
            CAPTAIN OPERATIONS PORTAL
          </div>
        </div>

        {/* Login Box */}
        <div
          style={{
            background: "#ffffff",
            color: "#0f172a",
            borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0, color: "#0f172a" }}>
              {!otpSent ? "Captain Verification" : "Enter Verification Code"}
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
              {!otpSent
                ? "Enter your registered mobile number for secure OTP authentication."
                : `Enter the 6-digit OTP code sent to +91 ${phone}`}
            </p>
          </div>

          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                marginBottom: "18px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {!otpSent ? (
            <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#334155",
                    marginBottom: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Registered Mobile Number
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#64748b",
                    }}
                  >
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="9123456789"
                    style={{
                      width: "100%",
                      padding: "12px 14px 12px 52px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "15px",
                      fontWeight: 700,
                      color: "#0f172a",
                      outline: "none",
                      letterSpacing: "1px",
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: "#0d2b17",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "background 0.15s ease",
                  marginTop: "6px",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="spinIconAnim" />
                    <span>Sending OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Send Login OTP</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#334155",
                    marginBottom: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    textAlign: "center",
                  }}
                >
                  One-Time Password (OTP)
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="••••••"
                  style={{
                    width: "100%",
                    textAlign: "center",
                    letterSpacing: "6px",
                    fontSize: "22px",
                    fontWeight: 800,
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    color: "#0d2b17",
                    outline: "none",
                  }}
                />
                <div style={{ textAlign: "center", fontSize: "11px", color: "#64748b", marginTop: "6px", fontWeight: 500 }}>
                  Enter the 6-digit SMS verification code sent to +91 {phone}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: "#0d2b17",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "background 0.15s ease",
                  marginTop: "6px",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="spinIconAnim" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify &amp; Enter Portal</span>
                    <CheckCircle2 size={16} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setOtpSent(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#164e23",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  textDecoration: "underline",
                  textAlign: "center",
                }}
              >
                Change mobile number
              </button>
            </form>
          )}

          <div id="recaptcha-container"></div>

          <div
            style={{
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              fontSize: "11px",
              color: "#64748b",
            }}
          >
            <ShieldCheck size={14} color="#166534" />
            <span>Authorized Captain Access • Traviska Operations</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaptainLogin;
