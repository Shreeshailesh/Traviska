import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Send,
} from "lucide-react";
import { API_BASE_URL } from "../api";

export const StaffRegister: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [invitationData, setInvitationData] = useState<{
    name: string;
    email: string;
    role: string;
    department: string;
    teamName: string;
    isEmailOwnershipVerified: boolean;
  } | null>(null);

  // OTP Verification state
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // Password fields
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validate Token on Mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setLoading(false);
        setErrorMessage("Invitation token is missing from the URL.");
        return;
      }

      try {
        const res = await axios.get(`${API_BASE_URL}/api/staff-invitation/validate?token=${token}`);
        if (res.data.valid) {
          setTokenValid(true);
          setInvitationData(res.data);
          setIsVerified(Boolean(res.data.isEmailOwnershipVerified));
        }
      } catch (err: any) {
        setTokenValid(false);
        setErrorMessage(
          err.response?.data?.message || "Invalid or expired invitation link. Please contact your CEO."
        );
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  // Send Verification OTP
  const handleSendOtp = async () => {
    if (!token) return;
    setOtpError("");
    try {
      const res = await axios.post(`${API_BASE_URL}/api/staff-invitation/send-verification-otp`, { token });
      if (res.data.success) {
        setOtpSent(true);
        if (res.data.devVerificationCode) {
          setDevOtpHint(res.data.devVerificationCode);
        }
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.message || "Failed to send verification code.");
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !otpCode) return;
    setOtpVerifying(true);
    setOtpError("");
    try {
      const res = await axios.post(`${API_BASE_URL}/api/staff-invitation/verify-otp`, {
        token,
        code: otpCode,
      });
      if (res.data.success) {
        setIsVerified(true);
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.message || "Verification code is invalid or has expired.");
    } finally {
      setOtpVerifying(false);
    }
  };

  // Password Strength Criteria
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isPasswordStrong = hasMinLength && hasUppercase && hasLowercase && hasNumber && passwordsMatch;

  // Complete Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordStrong || !isVerified) return;

    setSubmitting(true);
    setErrorMessage("");

    try {
      const res = await axios.post(`${API_BASE_URL}/api/staff-invitation/complete-registration`, {
        token,
        password,
        confirmPassword,
      });

      if (res.data.success) {
        setSuccess(true);
        // Store JWT token and user info
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));

        // Auto-redirect to appropriate workspace after 2.5 seconds
        setTimeout(() => {
          if (res.data.user.role === "super_admin") {
            navigate("/super-admin");
          } else if (res.data.user.role === "sales" || res.data.user.role === "sales_lead") {
            navigate("/sales");
          } else {
            navigate("/admin");
          }
        }, 2200);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "Registration failed. Please check requirements.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#f8faf8" }}>
        <div style={{ textAlign: "center", color: "#166534" }}>
          <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>Validating Invitation...</div>
          <div style={{ fontSize: "12px", color: "#64748b" }}>Please wait while we verify your authorized token.</div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#f8faf8", padding: "20px" }}>
        <div
          style={{
            maxWidth: "440px",
            width: "100%",
            background: "#ffffff",
            border: "1px solid #fee2e2",
            borderRadius: "20px",
            padding: "36px 30px",
            textAlign: "center",
            boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "#fee2e2",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <XCircle size={32} />
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>
            Invalid or Expired Link
          </h2>
          <p style={{ fontSize: "13.5px", color: "#64748b", lineHeight: "1.6", margin: "0 0 24px" }}>
            {errorMessage}
          </p>
          <button
            onClick={() => navigate("/admin/login")}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              background: "#0e3820",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Go to Staff Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8faf8",
        backgroundImage: "radial-gradient(at 0% 0%, rgba(200, 235, 210, 0.4) 0px, transparent 50%)",
        padding: "30px 20px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          background: "#ffffff",
          border: "1px solid #e2ece5",
          borderRadius: "22px",
          padding: "36px 32px",
          boxShadow: "0 15px 35px -5px rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "26px" }}>
          <div
            style={{
              display: "inline-block",
              background: "#092816",
              color: "#ffffff",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 800,
              letterSpacing: "1px",
              marginBottom: "12px",
            }}
          >
            TRAVISKA
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>
            Welcome to Team Traviska!
          </h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
            Set up your account to access your Traviska workspace.
          </p>
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "#dcfce7",
                color: "#166534",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>
              Account Activated!
            </h3>
            <p style={{ fontSize: "13px", color: "#64748b" }}>
              Your password has been securely configured. Redirecting you to your authorized workspace...
            </p>
          </div>
        ) : !isVerified ? (
          /* Step 1: Email Ownership Verification */
          <div>
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "12px",
                padding: "14px",
                marginBottom: "20px",
                fontSize: "13px",
                color: "#166534",
              }}
            >
              <div>
                Approved Email: <strong>{invitationData?.email}</strong>
              </div>
              <div style={{ fontSize: "11.5px", marginTop: "2px" }}>
                Role: <strong>{invitationData?.role}</strong> • Team:{" "}
                <strong>{invitationData?.teamName || "General"}</strong>
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "#475569", lineHeight: "1.6", marginBottom: "16px" }}>
              Before setting your password, please confirm ownership of your approved email by requesting a one-time verification code.
            </p>

            {!otpSent ? (
              <button
                type="button"
                onClick={handleSendOtp}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  background: "#0e3820",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <Send size={15} />
                <span>Send Verification Code</span>
              </button>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                {devOtpHint && (
                  <div
                    style={{
                      background: "#fef3c7",
                      border: "1px solid #fde68a",
                      color: "#92400e",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      marginBottom: "14px",
                    }}
                  >
                    <strong>Verification Code:</strong> {devOtpHint} (Enter below)
                  </div>
                )}

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "16px",
                      letterSpacing: "4px",
                      textAlign: "center",
                      fontFamily: "monospace",
                    }}
                  />
                </div>

                {otpError && (
                  <div style={{ color: "#dc2626", fontSize: "12px", marginBottom: "12px" }}>{otpError}</div>
                )}

                <button
                  type="submit"
                  disabled={otpVerifying || otpCode.length < 6}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "10px",
                    background: "#0e3820",
                    color: "#ffffff",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    opacity: otpCode.length < 6 ? 0.6 : 1,
                  }}
                >
                  {otpVerifying ? "Verifying..." : "Verify & Continue"}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* Step 2: Set Password */
          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "5px" }}>
                Full Name
              </label>
              <input
                type="text"
                readOnly
                value={invitationData?.name}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #e2ece5",
                  background: "#f8faf8",
                  fontSize: "13px",
                  color: "#64748b",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "5px" }}>
                Approved Email
              </label>
              <input
                type="email"
                readOnly
                value={invitationData?.email}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #e2ece5",
                  background: "#f8faf8",
                  fontSize: "13px",
                  color: "#64748b",
                  fontFamily: "monospace",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                Create Password *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Create your secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 40px 10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                Confirm Password *
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                }}
              />
            </div>

            {/* Password Validation Checklist */}
            <div style={{ background: "#f8faf8", borderRadius: "10px", padding: "12px 14px", fontSize: "11.5px" }}>
              <div style={{ fontWeight: 700, color: "#475569", marginBottom: "6px" }}>Password Requirements:</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                <div style={{ color: hasMinLength ? "#166534" : "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>{hasMinLength ? "✓" : "○"} At least 8 characters</span>
                </div>
                <div style={{ color: hasUppercase ? "#166534" : "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>{hasUppercase ? "✓" : "○"} 1 uppercase letter</span>
                </div>
                <div style={{ color: hasLowercase ? "#166534" : "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>{hasLowercase ? "✓" : "○"} 1 lowercase letter</span>
                </div>
                <div style={{ color: hasNumber ? "#166534" : "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>{hasNumber ? "✓" : "○"} 1 number</span>
                </div>
              </div>
              {confirmPassword.length > 0 && (
                <div style={{ marginTop: "6px", color: passwordsMatch ? "#166534" : "#dc2626" }}>
                  {passwordsMatch ? "✓ Passwords match" : "✕ Passwords do not match"}
                </div>
              )}
            </div>

            {errorMessage && (
              <div style={{ color: "#dc2626", fontSize: "12px" }}>{errorMessage}</div>
            )}

            <button
              type="submit"
              disabled={submitting || !isPasswordStrong}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                background: "#0e3820",
                color: "#ffffff",
                border: "none",
                fontSize: "13.5px",
                fontWeight: 700,
                cursor: isPasswordStrong ? "pointer" : "not-allowed",
                opacity: isPasswordStrong ? 1 : 0.6,
                marginTop: "4px",
              }}
            >
              {submitting ? "Activating Account..." : "Create Account & Enter Workspace"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
