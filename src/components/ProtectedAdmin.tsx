
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import axios from "axios";

import { API_BASE_URL } from "../api";
import AdminLayout from "../admin/layout/AdminLayout";
import Dashboard from "../admin/pages/Dashboard";
import Bookings from "../admin/pages/Bookings";
import Trips from "../admin/pages/Trips";
import EditTrip from "../admin/pages/EditTrip";
import DetailedSections from "../admin/pages/DetailedSections";
import Customers from "../admin/pages/Customers";
import SettingsPage from "../admin/pages/Settings";
import ReportsPage from "../admin/pages/Reports";
import MarketingPage from "../admin/pages/Marketing";
import OperationsOverview from "../admin/pages/TripOperations/OperationsOverview";
import TripCaptains from "../admin/pages/TripOperations/TripCaptains";
import CaptainAssignments from "../admin/pages/TripOperations/CaptainAssignments";
import PickupLocations from "../admin/pages/TripOperations/PickupLocations";
import TripAttendance from "../admin/pages/TripOperations/Attendance";
import TripExpenses from "../admin/pages/TripOperations/TripExpenses";
import CaptainPayouts from "../admin/pages/TripOperations/Payouts";
import CaptainHistory from "../admin/pages/TripOperations/CaptainHistory";

export default function ProtectedAdmin() {
  const location = useLocation();

  const [status, setStatus] = useState<"checking" | "allowed" | "denied">(() => {
    const token = localStorage.getItem("token");
    return token ? "allowed" : "denied";
  });

  useEffect(() => {
    let cancelled = false;

    const verifyAdmin = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        if (!cancelled) setStatus("denied");
        return;
      }

      try {
        await axios.get(`${API_BASE_URL}/admin/verify`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 4000,
        });

        if (!cancelled) {
          setStatus("allowed");
        }
      } catch (error: any) {
        console.error("Admin verification check:", error?.message);
        // Only deny if explicitly unauthorized by server
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("isAdmin");
          if (!cancelled) {
            setStatus("denied");
          }
        }
      }
    };

    verifyAdmin();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "denied") {
    return <Navigate to="/admin/login" replace />;
  }

  if (status === "checking") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f6f8",
          fontFamily: "system-ui, sans-serif",
          color: "#166534",
          fontSize: "15px",
          fontWeight: 600,
        }}
      >
        Loading Traviska Admin...
      </div>
    );
  }

  let content = <Dashboard />;
  const path = location.pathname;

  if (path === "/admin") {
    content = <Dashboard />;
  } else if (path === "/admin/bookings") {
    content = <Bookings />;
  } else if (path === "/admin/trips") {
    content = <Trips />;
  } else if (path === "/admin/add-trip") {
    content = <EditTrip />;
  } else if (path === "/admin/sections") {
    content = <DetailedSections />;
  } else if (path === "/admin/customers") {
    content = <Customers />;
  } else if (path === "/admin/operations" || path === "/admin/operations/overview") {
    content = <OperationsOverview />;
  } else if (path === "/admin/operations/captains") {
    content = <TripCaptains />;
  } else if (path.startsWith("/admin/operations/captains/")) {
    content = <CaptainHistory />;
  } else if (path === "/admin/operations/assignments") {
    content = <CaptainAssignments />;
  } else if (path === "/admin/operations/pickups") {
    content = <PickupLocations />;
  } else if (path === "/admin/operations/attendance") {
    content = <TripAttendance />;
  } else if (path === "/admin/operations/expenses") {
    content = <TripExpenses />;
  } else if (path === "/admin/operations/payouts") {
    content = <CaptainPayouts />;
  } else if (path === "/admin/operations/history") {
    content = <CaptainHistory />;
  } else if (path === "/admin/reports") {
    content = <ReportsPage />;
  } else if (path === "/admin/marketing") {
    content = <MarketingPage />;
  } else if (path === "/admin/settings") {
    content = <SettingsPage />;
  }

  return <AdminLayout>{content}</AdminLayout>;
}
