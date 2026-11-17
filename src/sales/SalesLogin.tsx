import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSalesAuth } from "./SalesAuthContext";
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";

export const SalesLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useSalesAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      navigate("/sales", { replace: true });
    } else {
      setErrorMsg(result.message || "Failed to log in. Please check your credentials.");
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
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              border: "1.5px solid rgba(255, 255, 255, 0.25)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255, 255, 255, 0.05)",
              marginBottom: "12px",
            }}
          >
            <svg
              width="28"
              height="24"
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
          <h1 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 4px", letterSpacing: "0.5px" }}>
            Traviska Sales Portal
          </h1>
          <p style={{ fontSize: "12.5px", color: "#a7cca9", margin: 0, letterSpacing: "0.5px" }}>
            TRAVEL EXPLORE EXPERIENCE • SALES &amp; CRM
          </p>
        </div>

        {/* Login Card */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
            color: "#0f172a",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 4px", color: "#0f172a" }}>
              Sign In to Your Workspace
            </h2>
            <p style={{ fontSize: "12.5px", color: "#64748b", margin: 0 }}>
              Access customer inquiries, conversion pipelines &amp; booking management.
            </p>
          </div>

          {errorMsg && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                background: "#fee2e2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                fontSize: "12.5px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                Email Address
              </label>
              <div style={{ position: "relative" }}>
                <Mail size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sales@traviska.com"
                  style={{
                    width: "100%",
                    padding: "10px 14px 10px 38px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    color: "#0f172a",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: "100%",
                    padding: "10px 14px 10px 38px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    color: "#0f172a",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                marginTop: "4px",
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "none",
                background: "#0d2b17",
                color: "#ffffff",
                fontSize: "13.5px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: isLoading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(13, 43, 23, 0.25)",
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="spin-icon" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Sales Portal</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div
            style={{
              marginTop: "20px",
              paddingTop: "16px",
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "11px",
              color: "#64748b",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#164e23", fontWeight: 600 }}>
              <ShieldCheck size={14} />
              <span>SaaS Security Active</span>
            </div>
            <Link to="/login" style={{ color: "#64748b", textDecoration: "none" }}>
              Admin Sign In →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesLogin;
