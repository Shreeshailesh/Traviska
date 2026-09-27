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
import Admin from "./pages/Admin";
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
  <Route
  path="/admin"
  element={
    localStorage.getItem("token") ? (
      <Admin />
    ) : (
      <Navigate to="/login" />
    )
  }
/>
  <Route path="/admin/add-trip" element={<AddTrip />} />
  <Route path="/login" element={<Login />} />
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