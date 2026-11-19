import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowLeft,
  AlertCircle,
  Loader2,
  X,
  KeyRound,
} from "lucide-react";
import { API_BASE_URL } from "../api";
import { setSuperAdminAuth } from "./authHelper";
import logo from "../assets/logo.jpg";
import "./SuperAdminLogin.css";

export const SuperAdminLogin: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedSuperAdminEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter both your Super Admin email and password.");
      return;
    }

    if (isLoading) return;
    setIsLoading(true);

    try {
      const { data } = await axios.post(`${API_BASE_URL}/login`, {
        email: email.trim().toLowerCase(),
        password: password.trim(),
        portal: "super_admin",
      });

      if (data.success && data.user?.role === "super_admin" && data.token) {
        if (rememberMe) {
          localStorage.setItem("rememberedSuperAdminEmail", email.trim().toLowerCase());
        } else {
          localStorage.removeItem("rememberedSuperAdminEmail");
        }

        setSuperAdminAuth(data.token, data.user);

        navigate("/super-admin", { replace: true });
      } else {
        setError(
          "Access denied. This login portal is strictly reserved for the Super Admin (CEO). Please visit /admin/login."
        );
      }
    } catch (err: any) {
      console.error("Super Admin login error:", err);
      const msg =
        err?.response?.data?.message ||
        (err?.message?.includes("Network Error")
          ? "Unable to reach the backend server. Please verify your connection."
          : "Invalid Super Admin credentials. Please verify your email and password.");
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sa-login-page">
      {/* Return to Website Navigation */}
      <Link to="/" className="sa-login-back-link">
        <ArrowLeft size={16} />
        <span>Return to Website</span>
      </Link>

      {/* Layered Mountain Scenic Background with Trees & Airplane */}
      <div className="sa-login-scenery" aria-hidden="true">
        <svg
          viewBox="0 0 1440 900"
          fill="none"
          preserveAspectRatio="xMidYMax slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Sky Gradient */}
          <rect width="1440" height="900" fill="url(#skyGrad)" />
          
          {/* Distant Misty Mountain Ridge */}
          <path
            d="M-40 480 Q 220 320 540 430 T 1100 360 Q 1320 420 1480 390 L 1480 900 L -40 900 Z"
            fill="#d1e7d8"
            opacity="0.55"
          />

          {/* Airplane in Flight */}
          <g transform="translate(1080, 260) scale(0.95)" fill="#628b70" opacity="0.75">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </g>
          {/* Subtle Vapor Trail behind Airplane */}
          <path
            d="M930 295 Q 1010 280 1080 270"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.6"
          />

          {/* Midground Mountain Ridge */}
          <path
            d="M-40 560 Q 320 420 720 520 T 1360 460 Q 1440 480 1480 470 L 1480 900 L -40 900 Z"
            fill="#aedbb9"
            opacity="0.65"
          />

          {/* Foreground Mountain Slope */}
          <path
            d="M-40 680 Q 260 560 640 640 T 1280 580 Q 1400 620 1480 610 L 1480 900 L -40 900 Z"
            fill="#7dbf8f"
            opacity="0.55"
          />

          {/* Pine Trees Silhouettes along Bottom Edge */}
          <g fill="#438757" opacity="0.65">
            {/* Left Cluster */}
            <path d="M40 900 L60 820 L80 900 Z M65 900 L85 800 L105 900 Z M95 900 L115 830 L135 900 Z M120 900 L140 780 L160 900 Z M150 900 L170 810 L190 900 Z M180 900 L200 840 L220 900 Z M215 900 L235 790 L255 900 Z M250 900 L270 825 L290 900 Z M285 900 L305 850 L325 900 Z M315 900 L335 815 L355 900 Z" />
            {/* Right Cluster */}
            <path d="M1080 900 L1100 820 L1120 900 Z M1115 900 L1135 790 L1155 900 Z M1145 900 L1165 835 L1185 900 Z M1180 900 L1200 785 L1220 900 Z M1210 900 L1230 810 L1250 900 Z M1245 900 L1265 840 L1285 900 Z M1280 900 L1300 775 L1320 900 Z M1315 900 L1335 830 L1355 900 Z M1350 900 L1370 795 L1390 900 Z M1385 900 L1405 835 L1425 900 Z" />
          </g>

          <defs>
            <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f4faf5" />
              <stop offset="60%" stopColor="#e7f4eb" />
              <stop offset="100%" stopColor="#d8ede0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Main Login Card */}
      <div className="sa-login-card">
        {/* Brand Logo */}
        <div className="sa-login-logo-wrap">
          <img src={logo} alt="Traviska" className="sa-login-logo-img" />
        </div>

        {/* Portal Badge: SUPER ADMIN PORTAL */}
        <div className="sa-login-badge-container">
          <div className="sa-login-badge">
            <ShieldCheck size={14} />
            <span>SUPER ADMIN PORTAL</span>
          </div>
        </div>

        {/* Heading & Subheading */}
        <h1 className="sa-login-title">Super Admin Login</h1>
        <p className="sa-login-subtitle">
          Secure access to Traviska's system management and platform administration.
        </p>

        {/* Error Alert */}
        {error && (
          <div className="sa-login-alert error">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} noValidate>
          {/* Email Address */}
          <div className="sa-login-form-group">
            <label className="sa-login-label" htmlFor="sa-email">
              EMAIL ADDRESS
            </label>
            <div className="sa-login-input-wrap">
              <Mail size={18} className="sa-login-input-icon" />
              <input
                id="sa-email"
                type="email"
                className="sa-login-input"
                placeholder="Enter your super admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="sa-login-form-group">
            <label className="sa-login-label" htmlFor="sa-password">
              PASSWORD
            </label>
            <div className="sa-login-input-wrap">
              <Lock size={18} className="sa-login-input-icon" />
              <input
                id="sa-password"
                type={showPassword ? "text" : "password"}
                className="sa-login-input has-toggle"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="sa-login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Options Row: Remember Me & Forgot Password */}
          <div className="sa-login-options">
            <label className="sa-login-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>

            <button
              type="button"
              className="sa-login-forgot"
              onClick={() => setIsForgotOpen(true)}
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="sa-login-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="admin-spin-icon" />
                <span>Authenticating Super Admin...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Sign in to Super Admin &rarr;</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Notice */}
        <div className="sa-login-footer-notice">
          <ShieldCheck size={14} />
          <span>Authorized Traviska Super Admins only</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotOpen && (
        <div className="sa-modal-backdrop" onClick={() => setIsForgotOpen(false)}>
          <div className="sa-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="sa-modal-close"
              onClick={() => setIsForgotOpen(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#f0fdf4",
                color: "#15803d",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <KeyRound size={24} />
            </div>

            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>
              Super Admin Recovery
            </h3>
            <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.6, margin: "0 0 24px" }}>
              For security compliance, Super Admin (CEO) credentials cannot be reset through routine employee self-service. If you need to reset the CEO password, please use the secure server CLI tool (<code>npm run reset-superadmin</code>) or contact Traviska engineering infrastructure.
            </p>

            <button
              type="button"
              onClick={() => setIsForgotOpen(false)}
              className="sa-login-btn"
              style={{ height: "42px", fontSize: "13.5px" }}
            >
              Back to Super Admin Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminLogin;
