import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  Loader2,
  X,
} from "lucide-react";
import logo from "../assets/logo.jpg";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("admin@traviska.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setError(null);

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
      });

      const staffRoles = ["super_admin", "admin", "sales", "sales_lead", "sales_executive", "captain_admin"];
      if (data.success && staffRoles.includes(data.user?.role) && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("isAdmin", data.user.role === "admin" || data.user.role === "super_admin" ? "true" : "false");
        localStorage.setItem("user", JSON.stringify(data.user));

        if (data.user.role === "super_admin") {
          navigate("/super-admin", { replace: true });
        } else if (data.user.role === "sales" || data.user.role === "sales_lead" || data.user.role === "sales_executive") {
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
            fill="#cde8d0"
            opacity="0.65"
          />
        </svg>
      </div>

      {/* Main Admin Card */}
      <div className="admin-login-card">
        {/* Brand Circular Logo */}
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
                placeholder="admin@traviska.com"
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

          {/* Forgot Password */}
          <div className="admin-login-forgot-wrap">
            <button
              type="button"
              className="admin-login-forgot-btn"
              onClick={() => setIsForgotOpen(true)}
            >
              Forgot password?
            </button>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            className="admin-login-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spin-animate" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Secure Sign In</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <hr className="admin-login-divider" />

        {/* Footer Security Notice */}
        <div className="admin-login-footer-notice">
          <ShieldCheck size={16} />
          <span>Authorized Traviska team members only</span>
        </div>
      </div>

      {/* Forgot Password Info Modal */}
      {isForgotOpen && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setIsForgotOpen(false)}
        >
          <div
            className="admin-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="admin-modal-close"
              onClick={() => setIsForgotOpen(false)}
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
              <ShieldCheck size={24} />
            </div>
            <h3
              style={{
                fontSize: "18px",
                fontWeight: 800,
                color: "#0f3d20",
                margin: "0 0 8px",
              }}
            >
              Admin Credential Recovery
            </h3>
            <p
              style={{
                fontSize: "13.5px",
                color: "#576b5d",
                lineHeight: 1.5,
                margin: "0 0 20px",
              }}
            >
              For security compliance, admin password resets are managed
              internally. Please contact your system administrator or the Traviska
              engineering team to securely reset your credentials.
            </p>
            <button
              type="button"
              onClick={() => setIsForgotOpen(false)}
              className="admin-login-submit-btn"
              style={{ height: "44px", fontSize: "14px" }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
