import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { API_BASE_URL } from "../api";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Compass,
  ShieldCheck,
  X,
} from "lucide-react";
import logo from "../assets/logo.jpg";
import "./CustomerLogin.css";

// Official Google G SVG
const GoogleIconSvg = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Mode: "signin" | "signup"
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");

  // Form inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forgot password modal
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetStatus, setResetStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Deduplication & concurrency guards for login exchanges
  const authInProgressRef = useRef(false);
  const activeExchangeRef = useRef<Promise<any> | null>(null);

  // Check if already authenticated
  useEffect(() => {
    const existingToken = localStorage.getItem("customerToken");
    if (existingToken) {
      const redirectUrl = searchParams.get("redirect") || "/customer/dashboard";
      navigate(redirectUrl, { replace: true });
    }
  }, [navigate, searchParams]);

  // Keep auth state persistent
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // If manual action is currently in progress, skip duplicate background sync
      if (authInProgressRef.current) return;

      // If Firebase has a user and localStorage has no token, refresh session
      if (firebaseUser && !localStorage.getItem("customerToken")) {
        try {
          const idToken = await firebaseUser.getIdToken();
          await completeBackendLogin(idToken);
        } catch (e) {
          console.warn("Persistent session sync failed:", e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Backend session exchange (deduplicated against concurrent calls)
  const completeBackendLogin = async (idToken: string, fallbackName?: string) => {
    if (activeExchangeRef.current) {
      return activeExchangeRef.current;
    }

    const exchangePromise = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/customer/firebase-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, name: fallbackName }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Login failed on server verification.");
        }

        // Persist verified customer session
        localStorage.setItem("customerToken", data.token);
        localStorage.setItem("customer", JSON.stringify(data.customer));

        return data;
      } finally {
        activeExchangeRef.current = null;
      }
    })();

    activeExchangeRef.current = exchangePromise;
    return exchangePromise;
  };

  // Google Authentication
  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setGoogleLoading(true);
    authInProgressRef.current = true;

    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const idToken = await userCredential.user.getIdToken();

      await completeBackendLogin(idToken, userCredential.user.displayName || "");

      const redirectUrl = searchParams.get("redirect") || "/customer/dashboard";
      navigate(redirectUrl, { replace: true });
    } catch (err: any) {
      console.error("Google sign in error:", err);
      if (err?.code === "auth/popup-closed-by-user") {
        // user closed popup, don't show noisy error
        return;
      }
      setError(err?.message || "Google sign-in was unsuccessful. Please try again.");
    } finally {
      authInProgressRef.current = false;
      setGoogleLoading(false);
    }
  };

  // Email / Password Sign In
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    authInProgressRef.current = true;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const idToken = await userCredential.user.getIdToken();

      const backendData = await completeBackendLogin(idToken);

      // Check if email needs verification
      if (!userCredential.user.emailVerified && !backendData.customer?.isEmailVerified) {
        setSuccessMessage("Signed in! Please remember to verify your email address via the link sent to your inbox.");
      }

      const redirectUrl = searchParams.get("redirect") || "/customer/dashboard";
      navigate(redirectUrl, { replace: true });
    } catch (err: any) {
      console.error("Email sign in error:", err);

      // Seamless Admin Login Fallback:
      // If user typed admin credentials on the traveller login page, authenticate via Admin backend
      try {
        const adminRes = await fetch(`${API_BASE_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            password: password.trim(),
          }),
        });
        const adminData = await adminRes.json();
        if (adminRes.ok && adminData.success && adminData.user?.role === "admin" && adminData.token) {
          localStorage.setItem("token", adminData.token);
          localStorage.setItem("isAdmin", "true");
          navigate("/admin", { replace: true });
          return;
        }
      } catch (adminFallbackErr) {
        // Continue to display standard error if backend admin check also fails
      }

      if (
        err?.code === "auth/invalid-credential" ||
        err?.code === "auth/wrong-password" ||
        err?.code === "auth/user-not-found"
      ) {
        if (cleanEmail.includes("admin")) {
          setError("Invalid admin credentials. Please verify your password or visit the Admin Portal at /admin/login.");
        } else {
          setError("Invalid email or password. Please verify your credentials.");
        }
      } else if (err?.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please wait a moment or reset your password.");
      } else {
        setError(err?.message || "Sign in failed. Please check your connection and try again.");
      }
    } finally {
      authInProgressRef.current = false;
      setLoading(false);
    }
  };

  // Email / Password Sign Up
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      // 1. Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);

      // 2. Update display name
      await updateProfile(userCredential.user, { displayName: cleanName });

      // 3. Send email verification using Firebase Client SDK
      try {
        await sendEmailVerification(userCredential.user);
      } catch (verifyErr) {
        console.warn("Could not dispatch verification email immediately:", verifyErr);
      }

      // 4. Register with backend and get session token
      const idToken = await userCredential.user.getIdToken();
      await completeBackendLogin(idToken, cleanName);

      setSuccessMessage(
        `Account created successfully! We've sent a verification email to ${cleanEmail}. Please check your inbox.`
      );

      // Redirect after brief delay
      setTimeout(() => {
        const redirectUrl = searchParams.get("redirect") || "/customer/dashboard";
        navigate(redirectUrl, { replace: true });
      }, 2000);
    } catch (err: any) {
      console.error("Sign up error:", err);
      if (err?.code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Please sign in instead.");
      } else if (err?.code === "auth/weak-password") {
        setError("Password is too weak. Please use at least 6 characters.");
      } else {
        setError(err?.message || "Account creation failed. Please try again.");
      }
    } finally {
      authInProgressRef.current = false;
      setLoading(false);
    }
  };

  // Forgot Password Reset Email
  const handleSendPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetStatus(null);

    const cleanEmail = resetEmail.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setResetStatus({ success: false, message: "Please enter a valid email address." });
      return;
    }

    setResetLoading(true);

    try {
      // Directly call Firebase client SDK sendPasswordResetEmail()
      await sendPasswordResetEmail(auth, cleanEmail);
      setResetStatus({
        success: true,
        message: `Password reset link sent to ${cleanEmail}. Please check your inbox and spam folder.`,
      });
      setTimeout(() => {
        setIsForgotModalOpen(false);
        setResetStatus(null);
      }, 4000);
    } catch (err: any) {
      console.error("Password reset error:", err);
      if (err?.code === "auth/user-not-found") {
        setResetStatus({
          success: false,
          message: "No account found with this email address.",
        });
      } else {
        setResetStatus({
          success: false,
          message: err?.message || "Failed to send reset email. Please try again.",
        });
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="customer-auth-page">
      {/* Background Mountain Panorama */}
      <div className="customer-auth-bg-watermark">
        <svg
          viewBox="0 0 1440 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "auto", display: "block" }}
        >
          <path
            d="M0 240 L160 130 L340 210 L520 90 L720 190 L920 70 L1140 190 L1320 110 L1440 240 Z"
            fill="#164e23"
          />
        </svg>
      </div>

      {/* Return to website */}
      <Link to="/" className="customer-auth-back-link">
        <ArrowLeft size={16} />
        <span>Return to Website</span>
      </Link>

      {/* Main Authentication Card */}
      <div className="customer-auth-card">
        {/* Header */}
        <div className="customer-auth-header">
          <div className="customer-auth-logo-wrap">
            <img src={logo} alt="Traviska" className="customer-auth-logo-img" />
          </div>

          <div className="customer-auth-tag">
            <Compass size={13} />
            <span>Traveller Account</span>
          </div>

          <h1 className="customer-auth-title">
            {activeTab === "signin" ? "Welcome Back" : "Create Account"}
          </h1>

          <p className="customer-auth-subtitle">
            {activeTab === "signin"
              ? "Sign in to view your booked trips, itineraries, and profile."
              : "Join Traviska to track your adventures and reserve seat slots."}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="customer-auth-tabs">
          <button
            type="button"
            className={`customer-auth-tab-btn ${activeTab === "signin" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("signin");
              setError(null);
              setSuccessMessage(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`customer-auth-tab-btn ${activeTab === "signup" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("signup");
              setError(null);
              setSuccessMessage(null);
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error / Success Alerts */}
        {error && (
          <div className="customer-auth-alert error">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="customer-auth-alert success">
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Continue with Google */}
        <button
          type="button"
          className="customer-google-btn"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
        >
          {googleLoading ? (
            <Loader2 size={18} className="spin-animate" />
          ) : (
            <GoogleIconSvg />
          )}
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="customer-auth-divider">
          <span>or continue with email</span>
        </div>

        {/* Form: Sign In */}
        {activeTab === "signin" ? (
          <form onSubmit={handleEmailSignIn}>
            <div className="customer-form-group">
              <label className="customer-form-label" htmlFor="customer-email">
                Email Address
              </label>
              <div className="customer-input-wrap">
                <Mail size={16} className="customer-input-icon" />
                <input
                  id="customer-email"
                  type="email"
                  className="customer-input-field"
                  placeholder="traveller@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="customer-form-group" style={{ marginBottom: "6px" }}>
              <label className="customer-form-label" htmlFor="customer-password">
                Password
              </label>
              <div className="customer-input-wrap">
                <Lock size={16} className="customer-input-icon" />
                <input
                  id="customer-password"
                  type={showPassword ? "text" : "password"}
                  className="customer-input-field"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="customer-input-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="customer-form-row-between">
              <button
                type="button"
                className="customer-forgot-btn"
                onClick={() => {
                  setResetEmail(email);
                  setIsForgotModalOpen(true);
                  setResetStatus(null);
                }}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="customer-submit-btn"
              disabled={loading || googleLoading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spin-animate" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Form: Create Account */
          <form onSubmit={handleEmailSignUp}>
            <div className="customer-form-group">
              <label className="customer-form-label" htmlFor="signup-name">
                Full Name
              </label>
              <div className="customer-input-wrap">
                <User size={16} className="customer-input-icon" />
                <input
                  id="signup-name"
                  type="text"
                  className="customer-input-field"
                  placeholder="e.g. Aditi Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div className="customer-form-group">
              <label className="customer-form-label" htmlFor="signup-email">
                Email Address
              </label>
              <div className="customer-input-wrap">
                <Mail size={16} className="customer-input-icon" />
                <input
                  id="signup-email"
                  type="email"
                  className="customer-input-field"
                  placeholder="traveller@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="customer-form-group">
              <label className="customer-form-label" htmlFor="signup-password">
                Password
              </label>
              <div className="customer-input-wrap">
                <Lock size={16} className="customer-input-icon" />
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  className="customer-input-field"
                  placeholder="Create a strong password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className="customer-input-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="customer-submit-btn"
              disabled={loading || googleLoading}
              style={{ marginTop: "12px" }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spin-animate" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Trust Badges */}
        <div className="customer-auth-footer">
          <div className="customer-auth-footer-badge">
            <ShieldCheck size={14} color="#164e23" />
            <span>Secure Firebase Auth</span>
          </div>
          <div className="customer-auth-footer-badge">
            <Compass size={14} color="#164e23" />
            <span>Official Traviska Portal</span>
          </div>
        </div>

        {/* Quick Link to Admin Login */}
        <div
          style={{
            marginTop: "16px",
            paddingTop: "14px",
            borderTop: "1px dashed #e2e8f0",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: "12.5px", color: "#64748b" }}>
            Admin or Operations Team?{" "}
          </span>
          <Link
            to="/admin/login"
            style={{
              fontSize: "12.5px",
              fontWeight: 600,
              color: "#164e23",
              textDecoration: "none",
            }}
          >
            Admin Login &rarr;
          </Link>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="customer-modal-overlay">
          <div className="customer-modal-card">
            <button
              type="button"
              className="customer-modal-close-btn"
              onClick={() => setIsForgotModalOpen(false)}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0d2b17", margin: "0 0 6px" }}>
              Reset Your Password
            </h3>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 18px", lineHeight: 1.45 }}>
              Enter your registered email address below. We'll send you a secure link to reset your password.
            </p>

            {resetStatus && (
              <div className={`customer-auth-alert ${resetStatus.success ? "success" : "error"}`}>
                {resetStatus.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{resetStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleSendPasswordReset}>
              <div className="customer-form-group">
                <label className="customer-form-label" htmlFor="reset-email">
                  Email Address
                </label>
                <div className="customer-input-wrap">
                  <Mail size={16} className="customer-input-icon" />
                  <input
                    id="reset-email"
                    type="email"
                    className="customer-input-field"
                    placeholder="traveller@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "#f1f5f2",
                    border: "1px solid #dce4dc",
                    borderRadius: "10px",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    color: "#475569",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="customer-submit-btn"
                  style={{ flex: 1, padding: "10px" }}
                >
                  {resetLoading ? (
                    <Loader2 size={16} className="spin-animate" />
                  ) : (
                    "Send Reset Link"
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
