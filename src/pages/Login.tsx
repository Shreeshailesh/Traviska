import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../api";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  KeyRound,
  Info,
} from "lucide-react";
import logo from "../assets/logo.jpg";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success message passed from registration or password reset redirect
  const [successNotice, setSuccessNotice] = useState<string | null>(
    (location.state as any)?.message || null
  );

  // Forgot Password Modal State
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotStatus, setForgotStatus] = useState<string>("ACTIVE");
  const [forgotRule, setForgotRule] = useState<number>(4);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setError(null);
    setSuccessNotice(null);

    if (!email.trim() || !password) {
      setError("Please enter both your email address and password.");
      return;
    }

    if (isLoading) return;

    setIsLoading(true);

    try {
      const { data } = await axios.post(`${API_BASE_URL}/login`, {
        email: email.trim().toLowerCase(),
        password: password.trim(),
        portal: "admin",
      });

      // Strict portal separation: Super Admin must NOT log in through the general admin portal
      if (data.user?.role === "super_admin") {
        setError(
          "Access denied. Super Admin (CEO) credentials cannot be used on this portal. Please use the dedicated Super Admin Portal at /super-admin/login."
        );
        return;
      }

      const staffRoles = ["admin", "sales", "sales_lead", "sales_executive", "captain_admin"];
      if (data.success && staffRoles.includes(data.user?.role) && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("isAdmin", data.user.role === "admin" ? "true" : "false");
        localStorage.setItem("user", JSON.stringify(data.user));

        if (data.user.role === "sales" || data.user.role === "sales_lead" || data.user.role === "sales_executive") {
          navigate("/sales", { replace: true });
        } else if (data.user.role === "captain_admin") {
          navigate("/admin/operations", { replace: true });
        } else {
          navigate("/admin", { replace: true });
        }
      } else {
        setError(
          "Access denied. This portal is restricted to authorized Traviska team members."
        );
      }
    } catch (err: any) {
      console.error("Admin login failed:", err);
      const msg =
        err?.response?.data?.message ||
        (err?.message?.includes("Network Error")
          ? "Unable to reach the backend server. Please verify your internet connection or try again shortly."
          : "Invalid email or password. Please verify your credentials.");
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotMessage(null);

    if (!forgotEmail.trim()) {
      setForgotError("Please enter your registered staff email address.");
      return;
    }

    setForgotLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/staff-auth/forgot-password`, {
        email: forgotEmail.trim().toLowerCase(),
      });

      // Show real MongoDB status message
      setForgotMessage(res.data.message);
      setForgotStatus(res.data.status || (res.data.success ? "ACTIVE" : "ERROR"));
      setForgotRule(res.data.rule || (res.data.success ? 4 : 1));
    } catch (err: any) {
      const msg = err.response?.data?.message || "Unable to process request. Please try again shortly.";
      setForgotMessage(msg);
      setForgotStatus(err.response?.data?.status || "ERROR");
      setForgotRule(err.response?.data?.rule || 1);
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setIsForgotOpen(false);
    setForgotEmail("");
    setForgotMessage(null);
    setForgotStatus("ACTIVE");
    setForgotRule(4);
    setForgotError(null);
    setForgotLoading(false);
  };

  return (
    <div className="admin-login-page">
      {/* Return to Website Navigation */}
      <Link to="/" className="admin-login-back-link">
        <ArrowLeft size={16} />
        <span>Return to Website</span>
      </Link>

      {/* Background Soft Hills / Waves */}
      <div className="admin-login-hills" aria-hidden="true">
        <svg viewBox="0 0 1440 280" fill="none" preserveAspectRatio="none">
          <path
            d="M0 160 C 340 260 560 110 880 200 C 1140 270 1320 170 1440 180 L 1440 280 L 0 280 Z"
            fill="#d7edd9"
            opacity="0.55"
          />
          <path
            d="M0 200 C 260 140 580 270 940 180 C 1200 120 1360 220 1440 210 L 1440 280 L 0 280 Z"
            fill="#b8e0bc"
            opacity="0.35"
          />
        </svg>
      </div>

      {/* Main Login Card */}
      <div className="admin-login-card">
        {/* Brand Logo */}
        <div className="admin-login-logo-wrap">
          <img src={logo} alt="Traviska" className="admin-login-logo-img" />
        </div>

        {/* Portal Badge */}
        <div className="admin-login-badge-container">
          <div className="admin-login-badge">
            <ShieldCheck size={16} />
            <span>ADMIN &amp; OPERATIONS PORTAL</span>
          </div>
        </div>

        {/* Heading & Subheading */}
        <h1 className="admin-login-title">Welcome, Team Traviska!</h1>
        <p className="admin-login-subtitle">
          Your workspace to manage journeys and create memorable travel
          experiences.
        </p>

        {/* Success Notice Banner (from Registration or Password Reset) */}
        {successNotice && (
          <div className="admin-login-alert success">
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="admin-login-alert error">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} noValidate>
          {/* Email Field */}
          <div className="admin-login-form-group">
            <label className="admin-login-label" htmlFor="admin-email">
              EMAIL ADDRESS
            </label>
            <div className="admin-login-input-wrap">
              <Mail size={18} className="admin-login-input-icon" />
              <input
                id="admin-email"
                type="email"
                className="admin-login-input"
                placeholder="name@traviska.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="admin-login-form-group">
            <label className="admin-login-label" htmlFor="admin-password">
              PASSWORD
            </label>
            <div className="admin-login-input-wrap">
              <Lock size={18} className="admin-login-input-icon" />
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                className="admin-login-input has-toggle"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="admin-login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Controls: Forgot Password Link */}
          <div className="admin-login-controls">
            <button
              type="button"
              className="admin-login-forgot-btn"
              onClick={() => {
                setError(null);
                setSuccessNotice(null);
                setIsForgotOpen(true);
              }}
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="admin-login-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="admin-spin-icon" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign in to Dashboard</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Security & Access Notice */}
        <div className="admin-login-footer">
          <p className="admin-login-footer-text">
            Protected area. Access is monitored and logged for security compliance.
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotOpen && (
        <div
          className="admin-modal-backdrop"
          onClick={closeForgotModal}
        >
          <div
            className="admin-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="admin-modal-close"
              onClick={closeForgotModal}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#ecf8ed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
                color: "#15803d",
              }}
            >
              <KeyRound size={24} />
            </div>

            <h3
              style={{
                fontSize: "18px",
                fontWeight: 800,
                color: "#0f3d20",
                margin: "0 0 8px",
                textAlign: "center",
              }}
            >
              Reset Your Password
            </h3>

            {/* ERROR ALERT */}
            {forgotError && (
              <div
                className="admin-login-alert error"
                style={{ marginBottom: "14px", padding: "10px 12px", fontSize: "12.5px" }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{forgotError}</span>
              </div>
            )}

            {/* REAL-TIME MONGODB ACCOUNT STATUS DISPLAY */}
            {forgotMessage ? (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div
                  style={{
                    background:
                      forgotStatus === "ACTIVE"
                        ? "#f0fdf4"
                        : forgotRule === 2 || forgotRule === 3
                        ? "#fffbeb"
                        : "#fef2f2",
                    border: `1px solid ${
                      forgotStatus === "ACTIVE"
                        ? "#bbf7d0"
                        : forgotRule === 2 || forgotRule === 3
                        ? "#fde68a"
                        : "#fecaca"
                    }`,
                    borderRadius: "10px",
                    padding: "16px 14px",
                    color:
                      forgotStatus === "ACTIVE"
                        ? "#166534"
                        : forgotRule === 2 || forgotRule === 3
                        ? "#92400e"
                        : "#991b1b",
                    fontSize: "13.5px",
                    lineHeight: 1.5,
                    marginBottom: "20px",
                    fontWeight: 600,
                  }}
                >
                  {forgotStatus === "ACTIVE" ? (
                    <CheckCircle2 size={24} style={{ margin: "0 auto 8px", display: "block", color: "#166534" }} />
                  ) : forgotRule === 2 || forgotRule === 3 ? (
                    <Info size={24} style={{ margin: "0 auto 8px", display: "block", color: "#b45309" }} />
                  ) : (
                    <AlertCircle size={24} style={{ margin: "0 auto 8px", display: "block", color: "#b91c1c" }} />
                  )}
                  {forgotMessage}
                </div>
                <button
                  type="button"
                  onClick={closeForgotModal}
                  className="admin-login-submit-btn"
                  style={{ height: "44px", fontSize: "14px" }}
                >
                  Back to Login
                </button>
              </div>
            ) : (
              /* STATE 3: INITIAL FORGOT PASSWORD FORM */
              <form onSubmit={handleForgotPassword} noValidate>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#576b5d",
                    lineHeight: 1.5,
                    margin: "0 0 18px",
                    textAlign: "center",
                  }}
                >
                  Enter your registered staff email address to receive a secure, single-use password reset link.
                </p>

                <div className="admin-login-form-group">
                  <label className="admin-login-label" htmlFor="forgot-email">
                    REGISTERED EMAIL ADDRESS
                  </label>
                  <div className="admin-login-input-wrap">
                    <Mail size={18} className="admin-login-input-icon" />
                    <input
                      id="forgot-email"
                      type="email"
                      className="admin-login-input"
                      placeholder="name@traviska.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="admin-login-submit-btn"
                  style={{ height: "44px", fontSize: "14px", marginTop: "10px" }}
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 size={16} className="admin-spin-icon" />
                      <span>Checking Status &amp; Sending...</span>
                    </>
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>

                <div style={{ textAlign: "center", marginTop: "16px" }}>
                  <button
                    type="button"
                    onClick={closeForgotModal}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#166534",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: "4px 8px",
                    }}
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
