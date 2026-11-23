import "./App.css";

import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { SEO } from "./components/SEO";

// Keep Home in the main bundle for instant initial landing; lazy-load secondary routes.
import Home from "./pages/Home";
const Trips = lazyWithRetry(() => import("./pages/Trips"));
const About = lazyWithRetry(() => import("./pages/About"));
const Contact = lazyWithRetry(() => import("./pages/Contact"));
const TripDetails = lazyWithRetry(() => import("./pages/TripDetails"));
const Booking = lazyWithRetry(() => import("./pages/Booking"));
const Login = lazyWithRetry(() => import("./pages/Login"));
const CustomerLogin = lazyWithRetry(() => import("./pages/CustomerLogin"));
const CustomerDashboard = lazyWithRetry(() => import("./pages/CustomerDashboard"));
const ProtectedCustomer = lazyWithRetry(() => import("./components/ProtectedCustomer"));
import RouteErrorBoundary from "./components/RouteErrorBoundary";

const CaptainAuthProvider = lazyWithRetry(() =>
  import("./captain/CaptainAuthContext").then((m) => ({ default: m.CaptainAuthProvider }))
);
const SalesAuthProvider = lazyWithRetry(() =>
  import("./sales/SalesAuthContext").then((m) => ({ default: m.SalesAuthProvider }))
);

// Auto-reload once if a lazy chunk fails to fetch after a new deployment
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const storageKey = "traviska_chunk_reload_attempted";
    try {
      const mod = await factory();
      sessionStorage.removeItem(storageKey);
      return mod;
    } catch (err) {
      const alreadyReloaded = sessionStorage.getItem(storageKey) === "1";
      if (!alreadyReloaded) {
        sessionStorage.setItem(storageKey, "1");
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}

// Staff portals (admin, captain, sales, super admin) are code-split so public
// visitors don't download them before the home page / trips can load.
const named = <T extends Record<string, any>>(
  loader: () => Promise<T>,
  key: keyof T
) => lazyWithRetry(() => loader().then((m) => ({ default: m[key] })));

const ProtectedAdmin = lazyWithRetry(() => import("./components/ProtectedAdmin"));

const CaptainLayout = lazy(() => import("./captain/CaptainLayout"));
const CaptainLogin = lazy(() => import("./captain/CaptainLogin"));
const CaptainTrips = lazy(() => import("./captain/CaptainTrips"));
const CaptainTripDetails = lazy(() => import("./captain/CaptainTripDetails"));
const CaptainAttendance = lazy(() => import("./captain/CaptainAttendance"));
const CaptainUserCheck = lazy(() => import("./captain/CaptainUserCheck"));
const CaptainTripExpenses = lazy(() => import("./captain/CaptainTripExpenses"));
const CaptainAddExpense = lazy(() => import("./captain/CaptainAddExpense"));
const CaptainProfile = lazy(() => import("./captain/CaptainProfile"));
const CaptainPayoutHistory = lazy(() => import("./captain/CaptainPayoutHistory"));
const CaptainBankDetails = lazy(() => import("./captain/CaptainBankDetails"));

const SalesLayout = lazy(() => import("./sales/SalesLayout"));
const SalesLogin = lazy(() => import("./sales/SalesLogin"));
const SalesDashboard = lazy(() => import("./sales/SalesDashboard"));
const SalesLeads = lazy(() => import("./sales/SalesLeads"));
const SalesPipeline = lazy(() => import("./sales/SalesPipeline"));
const SalesFollowUps = lazy(() => import("./sales/SalesFollowUps"));
const SalesManualBooking = lazy(() => import("./sales/SalesManualBooking"));
const OdooSyncCenter = lazy(() => import("./sales/OdooSyncCenter"));

const ProtectedSuperAdmin = named(() => import("./superAdmin/ProtectedSuperAdmin"), "ProtectedSuperAdmin");
const SuperAdminDashboard = named(() => import("./superAdmin/pages/SuperAdminDashboard"), "SuperAdminDashboard");
const SuperAdminUsers = named(() => import("./superAdmin/pages/SuperAdminUsers"), "SuperAdminUsers");
const SuperAdminTeams = named(() => import("./superAdmin/pages/SuperAdminTeams"), "SuperAdminTeams");
const SuperAdminEmails = named(() => import("./superAdmin/pages/SuperAdminEmails"), "SuperAdminEmails");
const SuperAdminPipeline = named(() => import("./superAdmin/pages/SuperAdminPipeline"), "SuperAdminPipeline");
const SuperAdminActivityLogs = named(() => import("./superAdmin/pages/SuperAdminActivityLogs"), "SuperAdminActivityLogs");
const SuperAdminSettings = named(() => import("./superAdmin/pages/SuperAdminSettings"), "SuperAdminSettings");
const SuperAdminLogin = named(() => import("./superAdmin/SuperAdminLogin"), "SuperAdminLogin");
const StaffRegister = named(() => import("./pages/StaffRegister"), "StaffRegister");
const StaffResetPassword = named(() => import("./pages/StaffResetPassword"), "StaffResetPassword");

function AppContent() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const isCaptain = location.pathname.startsWith("/captain");
  const isSales = location.pathname.startsWith("/sales");
  const isSuperAdmin =
    location.pathname.startsWith("/super-admin") ||
    location.pathname.startsWith("/superadmin") ||
    location.pathname.startsWith("/super_admin");
  const isStaffRegister = location.pathname.startsWith("/staff/register");
  const isStaffResetPassword = location.pathname.startsWith("/staff/reset-password") || location.pathname.startsWith("/admin/reset-password");
  const isCustomer = location.pathname.startsWith("/customer");
  const isBooking = location.pathname === "/booking";
  const isLogin =
    location.pathname === "/login" ||
    location.pathname === "/admin/login" ||
    location.pathname === "/super-admin/login" ||
    location.pathname === "/customer/login" ||
    location.pathname === "/captain/login" ||
    location.pathname === "/sales/login" ||
    location.pathname === "/admin-login";

  const isPrivateOrAuth =
    isAdmin ||
    isCaptain ||
    isSales ||
    isSuperAdmin ||
    isStaffRegister ||
    isStaffResetPassword ||
    isCustomer ||
    isBooking ||
    isLogin;

  const hidePublicChrome = isAdmin || isCaptain || isSales || isSuperAdmin || isStaffRegister || isStaffResetPassword || isLogin;

  return (
    <>
      {isPrivateOrAuth && (
        <SEO
          title="Traviska | Secure Portal"
          description="Traviska secure user and management portal."
          robots="noindex, nofollow"
        />
      )}
      {!hidePublicChrome && <Navbar />}

     <RouteErrorBoundary>
     <Suspense
       fallback={
         <div
           style={{
             minHeight: "100vh",
             display: "flex",
             alignItems: "center",
             justifyContent: "center",
             background: "#f4f6f8",
             color: "#166534",
             fontFamily: "system-ui, sans-serif",
             fontSize: "14px",
             fontWeight: 600,
           }}
         >
           Loading Traviska...
         </div>
       }
     >
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
  <Route path="/admin/invoices" element={<ProtectedAdmin />} />
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

  {/* Super Admin Dedicated Login */}
  <Route path="/super-admin/login" element={<SuperAdminLogin />} />
  <Route path="/superadmin/login" element={<Navigate to="/super-admin/login" replace />} />
  <Route path="/super_admin/login" element={<Navigate to="/super-admin/login" replace />} />
  <Route path="/superadmin" element={<Navigate to="/super-admin" replace />} />
  <Route path="/super_admin" element={<Navigate to="/super-admin" replace />} />

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

  {/* Staff Self-Service Registration & Password Reset */}
  <Route path="/staff/register" element={<StaffRegister />} />
  <Route path="/staff/reset-password" element={<StaffResetPassword />} />
  <Route path="/admin/reset-password" element={<StaffResetPassword />} />

  <Route path="/admin-login" element={<Navigate to="/admin/login" replace />} />
</Routes>
     </Suspense>
     </RouteErrorBoundary>

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