import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../api";
import { SuperAdminLayout } from "./SuperAdminLayout";
import { getSuperAdminToken, getSuperAdminUser, clearSuperAdminAuth } from "./authHelper";

export const ProtectedSuperAdmin: React.FC = () => {
  const token = getSuperAdminToken();
  const user = getSuperAdminUser();

  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifySuperAdmin = async () => {
      if (!token || !user) {
        if (isMounted) {
          setIsAuthorized(false);
          setIsVerifying(false);
        }
        return;
      }

      // Quick role check
      if (user.role !== "super_admin") {
        clearSuperAdminAuth();
        if (isMounted) {
          setIsAuthorized(false);
          setIsVerifying(false);
        }
        return;
      }

      try {
        // Authoritative verification with server
        const res = await axios.get(`${API_BASE_URL}/api/super-admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (isMounted) {
          if (res.data?.success) {
            setIsAuthorized(true);
          } else {
            clearSuperAdminAuth();
            setIsAuthorized(false);
          }
        }
      } catch (err: any) {
        // Strictly reject invalid, expired or unauthorized tokens and clear session
        clearSuperAdminAuth();
        if (isMounted) {
          setIsAuthorized(false);
        }
      } finally {
        if (isMounted) {
          setIsVerifying(false);
        }
      }
    };

    verifySuperAdmin();

    return () => {
      isMounted = false;
    };
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
    return <Navigate to="/super-admin/login" replace />;
  }

  return <SuperAdminLayout />;
};
