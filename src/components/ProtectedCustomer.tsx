import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import axios from "axios";

export default function ProtectedCustomer() {
  const [status, setStatus] = useState<
    "checking" | "allowed" | "denied"
  >("checking");

  useEffect(() => {
    const token = localStorage.getItem("customerToken");

    if (!token) {
      setStatus("denied");
      return;
    }

    axios
      .get("http://localhost:5001/customer/verify", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then(() => {
        setStatus("allowed");
      })
      .catch(() => {
        localStorage.removeItem("customerToken");
        localStorage.removeItem("customer");
        setStatus("denied");
      });
  }, []);

  if (status === "checking") {
    return <p>Verifying customer login...</p>;
  }

  if (status === "denied") {
    return <Navigate to="/customer/login" replace />;
  }

  return <Outlet />;
}