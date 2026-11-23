import React, { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSalesAuth } from "./SalesAuthContext";
import SalesSidebar from "./SalesSidebar";
import SalesTopbar from "./SalesTopbar";
import "../admin/admin.css";

export const SalesLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useSalesAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="admin-scope" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ width: "32px", height: "32px", border: "3px solid #164e23", borderTopColor: "transparent", borderRadius: "50%", animation: "spinIconAnim 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/sales/login" replace />;
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

      <SalesSidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      <div className="admin-main-container">
        <SalesTopbar onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
        <main className="admin-content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SalesLayout;
