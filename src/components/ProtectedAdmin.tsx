
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import axios from "axios";

import { API_BASE_URL } from "../api";
import Admin from "../pages/Admin";
import AddTrip from "../pages/AddTrip";

export default function ProtectedAdmin() {
  const location = useLocation();

  const [status, setStatus] = useState<
    "checking" | "allowed" | "denied"
  >("checking");

  useEffect(() => {
    let cancelled = false;

    const verifyAdmin = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        if (!cancelled) {
          setStatus("denied");
        }
        return;
      }

      try {
        await axios.get(`${API_BASE_URL}/admin/verify`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!cancelled) {
          setStatus("allowed");
        }
      } catch (error) {
        console.error("Admin verification failed:", error);

        if (!cancelled) {
          setStatus("denied");
        }
      }
    };

    verifyAdmin();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") {
    return <p>Verifying admin access...</p>;
  }

  if (status === "denied") {
    return <Navigate to="/login" replace />;
  }

  return location.pathname === "/admin/add-trip" ? (
    <AddTrip />
  ) : (
    <Admin />
  );
}
