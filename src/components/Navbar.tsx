
import { useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, ChevronRight, User, LogOut, LayoutDashboard, ChevronDown, Bell } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import logo from "../assets/logo.jpg";
import "./Navbar.css";

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customer, setCustomer] = useState<{ id?: string; name?: string; phone?: string; photoUrl?: string } | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Sync customer auth state from localStorage on route changes
  useEffect(() => {
    const token = localStorage.getItem("customerToken");
    const stored = localStorage.getItem("customer");
    if (token && stored) {
      try {
        setCustomer(JSON.parse(stored));
      } catch {
        setCustomer({ phone: "Traveller" });
      }
    } else {
      setCustomer(null);
    }
    setMenuOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  // Click outside to close customer dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Firebase signout error:", e);
    }
    localStorage.removeItem("customerToken");
    localStorage.removeItem("customer");
    setCustomer(null);
    setUserDropdownOpen(false);
    setMenuOpen(false);
    navigate("/");
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/trips?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/trips");
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const isTransparent = location.pathname === "/" || location.pathname === "/customer/dashboard";

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""} ${isTransparent && !scrolled ? "navbar-transparent" : ""}`}>
      {/* LOGO */}
      <Link to="/" className="logo-section">
        <img src={logo} alt="Traviska" className="logo-img" />
        <span className="logo-divider" />
        <span className="logo-text">TRAVISKA</span>
      </Link>

      {/* SEARCH BAR - desktop */}
      <div className="nav-search-bar">
        <Search size={18} className="nav-search-icon" />
        <input
          type="text"
          placeholder="Search destinations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="nav-search-input"
        />
        <button
          type="button"
          className="nav-search-btn"
          onClick={handleSearch}
        >
          Search Trips <ChevronRight size={16} />
        </button>
      </div>

      {/* MOBILE ACTIONS & HAMBURGER */}
      <div className="nav-mobile-right-actions">
        {customer && (
          <div className="nav-mobile-bell-wrap" title="Notifications">
            <Bell size={21} color="#ffffff" strokeWidth={2} />
            <span className="nav-bell-dot">1</span>
          </div>
        )}
        <button
          type="button"
          className={`menu-toggle ${customer && !menuOpen ? "menu-toggle-avatar" : ""}`}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="traviska-nav-links"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? (
            "✕"
          ) : customer ? (
            customer.photoUrl ? (
              <img
                src={customer.photoUrl}
                alt=""
                style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <User size={19} color="#ffffff" />
            )
          ) : (
            "☰"
          )}
        </button>
      </div>

      {/* NAV LINKS */}
      <div
        id="traviska-nav-links"
        className={`nav-links ${menuOpen ? "open" : ""}`}
      >
        <Link
          to="/"
          className={location.pathname === "/" ? "nav-active" : ""}
          onClick={() => setMenuOpen(false)}
        >
          Home
        </Link>

        <Link
          to="/trips"
          className={location.pathname === "/trips" ? "nav-active" : ""}
          onClick={() => setMenuOpen(false)}
        >
          Trips
        </Link>

        <Link
          to="/about"
          className={location.pathname === "/about" ? "nav-active" : ""}
          onClick={() => setMenuOpen(false)}
        >
          About
        </Link>

        <Link
          to="/contact"
          className={location.pathname === "/contact" ? "nav-active" : ""}
          onClick={() => setMenuOpen(false)}
        >
          Contact
        </Link>

        {/* CUSTOMER AUTHENTICATION (Desktop) */}
        <div className="nav-desktop-auth">
          {customer ? (
            <div className="nav-customer-menu-wrap" ref={userDropdownRef}>
              <button
                type="button"
                className="nav-customer-pill"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                aria-expanded={userDropdownOpen}
              >
                <div className="nav-customer-avatar">
                  {customer.photoUrl ? (
                    <img
                      src={customer.photoUrl}
                      alt=""
                      style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <User size={15} />
                  )}
                </div>
                <span className="nav-customer-name">
                  {customer.name && customer.name !== "Customer"
                    ? customer.name.split(" ")[0]
                    : customer.phone || "Account"}
                </span>
                <ChevronDown size={14} className={`nav-customer-arrow ${userDropdownOpen ? "open" : ""}`} />
              </button>

              {userDropdownOpen && (
                <div className="nav-customer-dropdown">
                  <div className="nav-dropdown-profile-header">
                    <span className="nav-dropdown-title">
                      {customer.name && customer.name !== "Customer" ? customer.name : "Traveller"}
                    </span>
                    <span className="nav-dropdown-phone">{customer.phone}</span>
                  </div>
                  <Link
                    to="/customer/dashboard"
                    className="nav-dropdown-link"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <LayoutDashboard size={15} />
                    <span>Dashboard &amp; Bookings</span>
                  </Link>
                  <button
                    type="button"
                    className="nav-dropdown-link nav-dropdown-logout"
                    onClick={handleLogout}
                  >
                    <LogOut size={15} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="nav-customer-login-btn"
              onClick={() => setMenuOpen(false)}
            >
              <User size={15} />
              <span>Traveller Login / Register</span>
            </Link>
          )}
        </div>

        {/* CUSTOMER SECTION IN MOBILE MENU */}
        {menuOpen && (
          <div className="nav-mobile-auth-section">
            {customer ? (
              <>
                <div className="mobile-auth-user-info">
                  <User size={16} color="#a8e063" />
                  <span>{customer.name && customer.name !== "Customer" ? customer.name : customer.phone}</span>
                </div>
                <Link
                  to="/customer/dashboard"
                  className="mobile-auth-link"
                  onClick={() => setMenuOpen(false)}
                >
                  <LayoutDashboard size={16} />
                  <span>My Dashboard &amp; Bookings</span>
                </Link>
                <button
                  type="button"
                  className="mobile-auth-link mobile-logout-btn"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="mobile-auth-login-cta"
                onClick={() => setMenuOpen(false)}
              >
                <User size={16} />
                <span>Traveller Login / Register</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* MOBILE SEARCH - visible in mobile menu */}
      {menuOpen && (
        <div className="mobile-search-bar">
          <Search size={18} className="nav-search-icon" />
          <input
            type="text"
            placeholder="Search destinations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="nav-search-input"
          />
          <button
            type="button"
            className="nav-search-btn"
            onClick={handleSearch}
          >
            Search <ChevronRight size={16} />
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
