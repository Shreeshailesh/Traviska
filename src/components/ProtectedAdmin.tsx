import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";

import Admin from "../pages/Admin";
import { useLocation } from "react-router-dom";
import AddTrip from "../pages/AddTrip";

export default function ProtectedAdmin() {
    const location = useLocation();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">(
    "checking"
  );

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setStatus("denied");
      return;
    }

    axios
      .get("http://localhost:5001/admin/verify", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then(() => setStatus("allowed"))
      .catch(() => setStatus("denied"));
  }, []);

  if (status === "checking") {
    return <p>Verifying admin access...</p>;
  }

  if (status === "denied") {
    return <Navigate to="/login" replace />;
  }

  return location.pathname === "/admin/add-trip" ? <AddTrip /> : <Admin />;
}