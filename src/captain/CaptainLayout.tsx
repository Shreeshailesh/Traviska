import React, { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useCaptainAuth } from "./CaptainAuthContext";
import CaptainSidebar from "./CaptainSidebar";
import CaptainTopbar from "./CaptainTopbar";
import "../admin/admin.css";

class CaptainErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Captain Portal Error Boundary Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="admin-card"
          style={{
            padding: "36px 20px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "14px",
            maxWidth: "480px",
            margin: "40px auto",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#fee2e2",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              fontWeight: 800,
            }}
          >
            !
          </div>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: "0 0 6px 0" }}>
              Something went wrong loading this view
            </h3>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
              An unexpected error occurred while rendering this page. You can reload or return to expeditions.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: "8px 16px",
                background: "#164e23",
                color: "#ffffff",
                borderRadius: "8px",
                border: "none",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/captain/trips";
              }}
              style={{
                padding: "8px 16px",
                background: "#f1f5f9",
                color: "#334155",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              All Expeditions
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const CaptainLayout: React.FC = () => {
  const { token, loading } = useCaptainAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div
        className="admin-scope"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#f4f6f8",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            border: "3px solid #164e23",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spinIconAnim 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/captain/login" replace />;
  }

  return (
    <div className="admin-scope">
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="admin-mobile-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <CaptainSidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      <div className="admin-main-container">
        <CaptainTopbar onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
        <main className="admin-content-area">
          <CaptainErrorBoundary>
            <Outlet />
          </CaptainErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default CaptainLayout;
