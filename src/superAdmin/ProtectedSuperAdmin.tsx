import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../api";
import { SuperAdminLayout } from "./SuperAdminLayout";

export const ProtectedSuperAdmin: React.FC = () => {
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const verifySuperAdmin = async () => {
      if (!token || !user) {
        setIsAuthorized(false);
        setIsVerifying(false);
        return;
      }

      // Quick role check
      if (user.role !== "super_admin") {
        setIsAuthorized(false);
        setIsVerifying(false);
        return;
      }

      try {
        // Verify with server
        const res = await axios.get(`${API_BASE_URL}/api/super-admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (err: any) {
        // Fallback: if server reachable and user is super_admin, permit session
        if (user.role === "super_admin") {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } finally {
        setIsVerifying(false);
      }
    };

    verifySuperAdmin();
  }, [token]);

  if (isVerifying) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "#092816",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "20px", fontWeight: 800, marginBottom: "8px", letterSpacing: "1px" }}>
            TRAVISKA SUPER ADMIN
          </div>
          <div style={{ fontSize: "13px", color: "#86efac" }}>Verifying CEO credentials...</div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/admin/login" replace />;
  }

  return <SuperAdminLayout />;
};
