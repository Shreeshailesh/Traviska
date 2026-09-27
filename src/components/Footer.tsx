import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">

      <div className="footer-container">

        <div className="footer-brand">
          <h2>Traviska</h2>
          <p>
            Beyond destinations, we create stories,
            connections, and unforgettable journeys.
          </p>
        </div>


        <div className="footer-links">
          <h3>Explore</h3>
          <p>Trips</p>
          <p>About Us</p>
          <p>Contact</p>
        </div>


        <div className="footer-links">
          <h3>Connect</h3>
          <p>Instagram</p>
          <p>WhatsApp</p>
          <p>Email</p>
        </div>


        <div className="footer-newsletter">
          <h3>Join Our Community</h3>
          <input placeholder="Enter your email" />
          <button>
            Subscribe
          </button>
        </div>


      </div>


      <div className="footer-bottom">
        © 2026 Traviska. All rights reserved.
      </div>


    </footer>
  );
}

export default Footer;