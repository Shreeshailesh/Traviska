import "./App.css";

import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Trips from "./pages/Trips";
import About from "./pages/About";
import Contact from "./pages/Contact";
import TripDetails from "./pages/TripDetails";
import Booking from "./pages/Booking";
import Login from "./pages/Login";
import CustomerLogin from "./pages/CustomerLogin";
import CustomerDashboard from "./pages/CustomerDashboard";
import ProtectedCustomer from "./components/ProtectedCustomer";
import ProtectedAdmin from "./components/ProtectedAdmin";

import { CaptainAuthProvider } from "./captain/CaptainAuthContext";
import CaptainLayout from "./captain/CaptainLayout";
import CaptainLogin from "./captain/CaptainLogin";
import CaptainTrips from "./captain/CaptainTrips";
import CaptainTripDetails from "./captain/CaptainTripDetails";
import CaptainAttendance from "./captain/CaptainAttendance";
import CaptainUserCheck from "./captain/CaptainUserCheck";
import CaptainTripExpenses from "./captain/CaptainTripExpenses";
import CaptainAddExpense from "./captain/CaptainAddExpense";
import CaptainProfile from "./captain/CaptainProfile";
import CaptainPayoutHistory from "./captain/CaptainPayoutHistory";
import CaptainBankDetails from "./captain/CaptainBankDetails";

import { SalesAuthProvider } from "./sales/SalesAuthContext";
import SalesLayout from "./sales/SalesLayout";
import SalesLogin from "./sales/SalesLogin";
import SalesDashboard from "./sales/SalesDashboard";
import SalesLeads from "./sales/SalesLeads";
import SalesPipeline from "./sales/SalesPipeline";
import SalesFollowUps from "./sales/SalesFollowUps";
import SalesManualBooking from "./sales/SalesManualBooking";
import OdooSyncCenter from "./sales/OdooSyncCenter";

import { ProtectedSuperAdmin } from "./superAdmin/ProtectedSuperAdmin";
import { SuperAdminDashboard } from "./superAdmin/pages/SuperAdminDashboard";
import { SuperAdminUsers } from "./superAdmin/pages/SuperAdminUsers";
import { SuperAdminTeams } from "./superAdmin/pages/SuperAdminTeams";
import { SuperAdminEmails } from "./superAdmin/pages/SuperAdminEmails";
import { SuperAdminPipeline } from "./superAdmin/pages/SuperAdminPipeline";
import { SuperAdminActivityLogs } from "./superAdmin/pages/SuperAdminActivityLogs";
import { SuperAdminSettings } from "./superAdmin/pages/SuperAdminSettings";
import { StaffRegister } from "./pages/StaffRegister";

function AppContent() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const isCaptain = location.pathname.startsWith("/captain");
  const isSales = location.pathname.startsWith("/sales");
  const isSuperAdmin = location.pathname.startsWith("/super-admin");
  const isStaffRegister = location.pathname.startsWith("/staff/register");
  const isLogin =
    location.pathname === "/login" ||
    location.pathname === "/admin/login" ||
    location.pathname === "/customer/login" ||
    location.pathname === "/captain/login" ||
    location.pathname === "/sales/login";

  const hidePublicChrome = isAdmin || isCaptain || isSales || isSuperAdmin || isStaffRegister || isLogin;

  return (
    <>
      {!hidePublicChrome && <Navbar />}

     <Routes>
  <Route path="/" element={<Home />} />
  <Route path="/trips" element={<Trips />} />
  <Route path="/about" element={<About />} />
  <Route path="/contact" element={<Contact />} />
  <Route path="/trip/:id" element={<TripDetails />} />
  <Route path="/booking" element={<Booking />} />
  <Route path="/admin/login" element={<Login />} />
  <Route path="/login" element={<CustomerLogin />} />
  <Route path="/customer/login" element={<CustomerLogin />} />
  <Route element={<ProtectedCustomer />}>
  <Route
    path="/customer/dashboard"
    element={<CustomerDashboard />}
  />
</Route>
  <Route path="/admin" element={<ProtectedAdmin />} />
  <Route path="/admin/bookings" element={<ProtectedAdmin />} />
  <Route path="/admin/trips" element={<ProtectedAdmin />} />
  <Route path="/admin/sections" element={<ProtectedAdmin />} />
  <Route path="/admin/customers" element={<ProtectedAdmin />} />
  <Route path="/admin/operations" element={<ProtectedAdmin />} />
  <Route path="/admin/operations/*" element={<ProtectedAdmin />} />
  <Route path="/admin/reports" element={<ProtectedAdmin />} />
  <Route path="/admin/marketing" element={<ProtectedAdmin />} />
  <Route path="/admin/settings" element={<ProtectedAdmin />} />
  <Route path="/admin/add-trip" element={<ProtectedAdmin />} />

  {/* Sales Portal Routes */}
  <Route
    path="/sales/login"
    element={
      <SalesAuthProvider>
        <SalesLogin />
      </SalesAuthProvider>
    }
  />
  <Route
    path="/sales"
    element={
      <SalesAuthProvider>
        <SalesLayout />
      </SalesAuthProvider>
    }
  >
    <Route index element={<SalesDashboard />} />
    <Route path="leads" element={<SalesLeads />} />
    <Route path="pipeline" element={<SalesPipeline />} />
    <Route path="follow-ups" element={<SalesFollowUps />} />
    <Route path="manual-booking" element={<SalesManualBooking />} />
    <Route path="odoo-sync" element={<OdooSyncCenter />} />
  </Route>

  {/* Captain Portal Routes */}
  <Route
    path="/captain/login"
    element={
      <CaptainAuthProvider>
        <CaptainLogin />
      </CaptainAuthProvider>
    }
  />
  <Route
    path="/captain"
    element={
      <CaptainAuthProvider>
        <CaptainLayout />
      </CaptainAuthProvider>
    }
  >
    <Route index element={<Navigate to="/captain/trips" replace />} />
    <Route path="trips" element={<CaptainTrips />} />
    <Route path="trips/:slotId" element={<CaptainTripDetails />} />
    <Route path="trips/:slotId/attendance" element={<CaptainAttendance />} />
    <Route path="trips/:slotId/user-check" element={<CaptainUserCheck />} />
    <Route path="trips/:slotId/expenses" element={<CaptainTripExpenses />} />
    <Route path="trips/:slotId/expenses/add" element={<CaptainAddExpense />} />
    <Route path="profile" element={<CaptainProfile />} />
    <Route path="payout-history" element={<CaptainPayoutHistory />} />
    <Route path="bank-details" element={<CaptainBankDetails />} />
    
    {/* Legacy redirect aliases */}
    <Route path="expenses" element={<Navigate to="/captain/trips" replace />} />
    <Route path="wallet" element={<Navigate to="/captain/payout-history" replace />} />
    <Route path="attendance" element={<Navigate to="/captain/trips" replace />} />
  </Route>

  {/* Super Admin Portal Routes (CEO) */}
  <Route path="/super-admin" element={<ProtectedSuperAdmin />}>
    <Route index element={<SuperAdminDashboard />} />
    <Route path="dashboard" element={<SuperAdminDashboard />} />
    <Route path="users" element={<SuperAdminUsers />} />
    <Route path="emails" element={<SuperAdminEmails />} />
    <Route path="teams" element={<SuperAdminTeams />} />
    <Route path="pipeline" element={<SuperAdminPipeline />} />
    <Route path="activity-logs" element={<SuperAdminActivityLogs />} />
    <Route path="settings" element={<SuperAdminSettings />} />
  </Route>

  {/* Staff Self-Service Registration */}
  <Route path="/staff/register" element={<StaffRegister />} />

  <Route path="/admin-login" element={<Navigate to="/admin/login" replace />} />
</Routes>

      {!hidePublicChrome && <Footer />}

    </>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}