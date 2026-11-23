import React from "react";

interface Props {
  children: React.ReactNode;
  title?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class RouteErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || "An unexpected error occurred while loading this page.",
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("RouteErrorBoundary caught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "#f8fafc",
            color: "#0f172a",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: "460px",
              width: "100%",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "24px",
              boxShadow: "0 4px 16px rgba(15, 23, 42, 0.06)",
            }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "#991b1b" }}>
              {this.props.title || "Unable to open this page"}
            </h2>
            <p style={{ margin: "0 0 16px", fontSize: "13.5px", color: "#475569", lineHeight: 1.5 }}>
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: "9px 18px",
                background: "#0d2b17",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;

