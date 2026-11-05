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
import AddTrip from "./pages/AddTrip";


function AppContent() {
  const location = useLocation();

  return (
    <>
      {location.pathname !== "/admin" &&
 location.pathname !== "/login" && <Navbar />}

     <Routes>
  <Route path="/" element={<Home />} />
  <Route path="/trips" element={<Trips />} />
  <Route path="/about" element={<About />} />
  <Route path="/contact" element={<Contact />} />
  <Route path="/trip/:id" element={<TripDetails />} />
  <Route path="/booking" element={<Booking />} />
  <Route path="/admin/login" element={<Login />} />
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
<Route path="/admin/customers" element={<ProtectedAdmin />} />
<Route path="/admin/settings" element={<ProtectedAdmin />} />
  <Route path="/admin/add-trip" element={<ProtectedAdmin />} />
  <Route path="/login" element={<Login />} />
  <Route path="/admin-login" element={<Navigate to="/login" replace />} />
</Routes>

      {location.pathname !== "/admin" &&
 location.pathname !== "/login" && <Footer />}

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