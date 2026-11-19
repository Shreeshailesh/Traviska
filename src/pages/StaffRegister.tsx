import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Lock,
  Check,
  AlertCircle,
} from "lucide-react";
import { API_BASE_URL } from "../api";
import logo from "../assets/logo.jpg";

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
  } | null>(null);

  // Password fields
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validate Token on Mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setLoading(false);
        setErrorMessage("Invitation token is missing from the URL. Please verify your link.");
        return;
      }

      try {
        const res = await axios.get(`${API_BASE_URL}/api/staff-invitation/validate?token=${token}`);
        if (res.data.valid) {
          setTokenValid(true);
          setInvitationData(res.data);
        }
      } catch (err: any) {
        setTokenValid(false);
        setErrorMessage(
          err.response?.data?.message || "Invalid or expired invitation link. Please contact your CEO to re-issue an invitation."
        );
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  // Password Strength Criteria
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isPasswordStrong = hasMinLength && hasUppercase && hasLowercase && hasNumber && passwordsMatch;

  // Complete Registration & Set Password
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordStrong) return;

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
        // Clear any previous session so the employee logs in cleanly
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("isAdmin");

        // Redirect to /admin/login after displaying confirmation
        setTimeout(() => {
          navigate("/admin/login", {
            replace: true,
            state: { message: "Your account has been activated successfully. Please sign in." },
          });
        }, 2200);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "Registration failed. Please check requirements.");
    } finally {
      setSubmitting(false);
    }
  };

  const formattedRole = invitationData?.role
    ? invitationData.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Staff Member";

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#f8faf8" }}>
        <div style={{ textAlign: "center", color: "#166534" }}>
          <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>Verifying Invitation...</div>
          <div style={{ fontSize: "13px", color: "#64748b" }}>Connecting securely to Traviska...</div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8faf8", padding: "20px" }}>
        <div style={{ maxWidth: "420px", width: "100%", background: "#ffffff", borderRadius: "16px", padding: "32px 24px", textAlign: "center", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.06)", border: "1px solid #fee2e2" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
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
          maxWidth: "460px",
          width: "100%",
          background: "#ffffff",
          borderRadius: "20px",
          padding: "36px 32px",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.08)",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "54px", height: "54px", borderRadius: "14px", overflow: "hidden", marginBottom: "14px", border: "1px solid #e2e8f0" }}>
            <img src={logo} alt="Traviska" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>
            Welcome to Traviska
          </h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
            Your email has been verified. Create your password to activate your account.
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
            <p style={{ fontSize: "13.5px", color: "#166534", fontWeight: 600, marginBottom: "8px" }}>
              Your account has been activated successfully. Please sign in.
            </p>
            <p style={{ fontSize: "12.5px", color: "#64748b" }}>
              Redirecting you to the staff sign-in page...
            </p>
          </div>
        ) : (
          <form onSubmit={handleRegister}>
            {/* Read-Only Verified Email & Role Details */}
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "12px",
                padding: "14px 16px",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#15803d", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                  Verified Email
                </span>
                <span style={{ fontSize: "11px", background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "9999px", fontWeight: 700, border: "1px solid #86efac" }}>
                  Verified ✓
                </span>
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", wordBreak: "break-all" }}>
                {invitationData?.email}
              </div>
              <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px" }}>
                Assigned Role: <strong style={{ color: "#065f46" }}>{formattedRole}</strong> ({invitationData?.department || "Operations"})
              </div>
            </div>

            {errorMessage && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  color: "#b91c1c",
                  fontSize: "12.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "16px",
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Create Password */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                Create Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter strong password"
                  required
                  style={{
                    width: "100%",
                    padding: "11px 40px 11px 14px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                Confirm Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  style={{
                    width: "100%",
                    padding: "11px 40px 11px 14px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Password Strength Checklist */}
            <div
              style={{
                background: "#f8fafc",
                borderRadius: "10px",
                padding: "12px",
                marginBottom: "22px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569", marginBottom: "8px" }}>
                Password Requirements:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11.5px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: hasMinLength ? "#16a34a" : "#94a3b8" }}>
                  <Check size={13} strokeWidth={hasMinLength ? 3 : 2} /> At least 8 characters
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: hasUppercase ? "#16a34a" : "#94a3b8" }}>
                  <Check size={13} strokeWidth={hasUppercase ? 3 : 2} /> Uppercase letter
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: hasLowercase ? "#16a34a" : "#94a3b8" }}>
                  <Check size={13} strokeWidth={hasLowercase ? 3 : 2} /> Lowercase letter
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: hasNumber ? "#16a34a" : "#94a3b8" }}>
                  <Check size={13} strokeWidth={hasNumber ? 3 : 2} /> Number (0-9)
                </div>
                <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: "6px", color: passwordsMatch ? "#16a34a" : "#94a3b8", marginTop: "2px" }}>
                  <Check size={13} strokeWidth={passwordsMatch ? 3 : 2} /> Passwords match
                </div>
              </div>
            </div>

            {/* Set Password & Activate Account Button */}
            <button
              type="submit"
              disabled={!isPasswordStrong || submitting}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: "12px",
                background: isPasswordStrong && !submitting ? "#0e3820" : "#94a3b8",
                color: "#ffffff",
                border: "none",
                fontSize: "14px",
                fontWeight: 700,
                cursor: isPasswordStrong && !submitting ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "background 0.2s ease",
              }}
            >
              <Lock size={16} />
              <span>{submitting ? "Activating Account..." : "Set Password & Activate Account"}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default StaffRegister;
