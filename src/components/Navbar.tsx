
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, ChevronRight } from "lucide-react";
import logo from "../assets/logo.jpg";
import "./Navbar.css";

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

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

  const isHome = location.pathname === "/";

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""} ${isHome && !scrolled ? "navbar-transparent" : ""}`}>
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

      {/* HAMBURGER */}
      <button
        type="button"
        className="menu-toggle"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
        aria-controls="traviska-nav-links"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? "✕" : "☰"}
      </button>

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
