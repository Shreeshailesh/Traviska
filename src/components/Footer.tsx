import { Link } from "react-router-dom";
import {
  Home as HomeIcon,
  Compass,
  Info,
  Users,
  FileText,
  Calendar,
  ShieldCheck,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Heart,
  ArrowRight,
} from "lucide-react";
import { FooterMountainPanorama } from "./HomeIllustrations";
import "./Footer.css";

// Clean inline SVGs for exact matching social buttons
const InstagramSvg = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d4323" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const YoutubeSvg = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d4323" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <polygon points="10 15 15 12 10 9 10 15" fill="#1d4323" />
  </svg>
);

const WhatsAppSvg = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d4323" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const MailSvg = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d4323" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const MountainLogoIcon = () => (
  <svg width="34" height="28" viewBox="0 0 34 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 24 L13 6 L19 16 L23 10 L31 24 Z" stroke="#3b6328" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M10 18 L13 14 L17 20" stroke="#3b6328" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

function Footer() {

  return (
    <footer className="nature-footer">
      <div className="nature-footer-container">
        {/* COL 1: BRAND */}
        <div className="footer-brand-col">
          <Link to="/" className="footer-brand-logo">
            <MountainLogoIcon />
            <span className="brand-name">TRAVISKA</span>
          </Link>

          <p className="footer-brand-desc">
            Beyond destinations, we create stories, connections, and unforgettable journeys with like-minded travellers.
          </p>

          <div className="footer-social-row">
            <a
              href="https://www.instagram.com/travelwithtraviska?mdxt=MWJyaXU5MXM4OHY3aQ%3D%3D&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="social-circle-btn"
              title="Instagram"
            >
              <InstagramSvg />
            </a>

            <a
              href="https://www.youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="social-circle-btn"
              title="YouTube"
            >
              <YoutubeSvg />
            </a>

            <a
              href="https://wa.me/919902742004"
              target="_blank"
              rel="noopener noreferrer"
              className="social-circle-btn"
              title="WhatsApp"
            >
              <WhatsAppSvg />
            </a>

            <a
              href="mailto:traviskaadventures@gmail.com"
              className="social-circle-btn"
              title="Email"
            >
              <MailSvg />
            </a>
          </div>
        </div>

        {/* COL 2: EXPLORE */}
        <div className="footer-links-col">
          <h4 className="footer-col-heading">
            EXPLORE
            <span className="col-heading-underline"></span>
          </h4>
          <ul className="footer-links-list">
            <li>
              <Link to="/">
                <HomeIcon size={14} className="link-item-icon" />
                <span>Home</span>
              </Link>
            </li>
            <li>
              <Link to="/trips">
                <Compass size={14} className="link-item-icon" />
                <span>Trips</span>
              </Link>
            </li>
            <li>
              <Link to="/about">
                <Info size={14} className="link-item-icon" />
                <span>About Us</span>
              </Link>
            </li>
            <li>
              <Link to="/contact">
                <Users size={14} className="link-item-icon" />
                <span>Contact</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* COL 3: QUICK LINKS */}
        <div className="footer-links-col">
          <h4 className="footer-col-heading">
            QUICK LINKS
            <span className="col-heading-underline"></span>
          </h4>
          <ul className="footer-links-list">
            <li>
              <Link to="/customer/dashboard">
                <Users size={14} className="link-item-icon" />
                <span>My Bookings &amp; Account</span>
              </Link>
            </li>
            <li>
              <Link to="/login">
                <ShieldCheck size={14} className="link-item-icon" />
                <span>Customer Login</span>
              </Link>
            </li>
            <li>
              <Link to="/trips">
                <FileText size={14} className="link-item-icon" />
                <span>All Trips</span>
              </Link>
            </li>
            <li>
              <Link to="/trips">
                <Calendar size={14} className="link-item-icon" />
                <span>Upcoming Trips</span>
              </Link>
            </li>
            <li>
              <Link to="/trips">
                <ShieldCheck size={14} className="link-item-icon" />
                <span>Terms &amp; Conditions</span>
              </Link>
            </li>
            <li>
              <Link to="/trips">
                <ShieldCheck size={14} className="link-item-icon" />
                <span>Cancellation Policy</span>
              </Link>
            </li>
            <li>
              <Link to="/trips">
                <Info size={14} className="link-item-icon" />
                <span>Important Notes</span>
              </Link>
            </li>
            <li>
              <Link to="/trips">
                <ShieldCheck size={14} className="link-item-icon" />
                <span>Safety Information</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* COL 4: CONNECT WITH US */}
        <div className="footer-links-col">
          <h4 className="footer-col-heading">
            CONNECT WITH US
            <span className="col-heading-underline"></span>
          </h4>
          <ul className="footer-links-list">
            <li>
              <a href="tel:9902742004">
                <Phone size={14} className="link-item-icon" />
                <span>+91 99027 42004</span>
              </a>
            </li>
            <li>
              <a href="https://wa.me/919902742004" target="_blank" rel="noopener noreferrer">
                <MessageCircle size={14} className="link-item-icon" />
                <span>+91 99027 42004</span>
              </a>
            </li>
            <li>
              <a href="mailto:travelwithtraviska@gmail.com">
                <Mail size={14} className="link-item-icon" />
                <span>travelwithtraviska@gmail.com</span>
              </a>
            </li>
            <li>
              <span className="footer-address">
                <MapPin size={14} className="link-item-icon" />
                <span>Bengaluru, Karnataka, India</span>
              </span>
            </li>
          </ul>
        </div>

        {/* COL 5: JOIN OUR COMMUNITY */}
        <div className="footer-links-col footer-newsletter-col">
          <h4 className="footer-col-heading">
            JOIN OUR COMMUNITY
            <span className="col-heading-underline"></span>
          </h4>
          <p className="footer-newsletter-text">
            Stay connected with our WhatsApp community for early access to expeditions,
            exclusive deals, and travel stories.
          </p>

          <a
            href="https://whatsapp.com/channel/0029Vb9Ikew0lwgjXgtIM51j"
            target="_blank"
            rel="noopener noreferrer"
            className="whatsapp-community-btn"
            aria-label="Join our WhatsApp community"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
              aria-hidden="true"
              className="whatsapp-icon"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.712 1.456h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413z" />
            </svg>
            <span>Join Our WhatsApp Community</span>
            <ArrowRight size={14} className="community-arrow" />
          </a>
        </div>
      </div>

      {/* MOUNTAIN PANORAMA ILLUSTRATION (Full Width with Hiker on the Right) */}
      <FooterMountainPanorama />

      {/* VERY BOTTOM BAR INSIDE THE DARK GREEN BASE */}
      <div className="nature-footer-bottom-bar">
        <div className="bottom-bar-inner">
          <p className="bottom-copy">
            © 2026 Traviska Adventures. All rights reserved.
          </p>
          <p className="bottom-crafted">
            Crafted for explorers &amp; storytellers <Heart size={14} className="bottom-heart" fill="#a8e063" color="#a8e063" />
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
