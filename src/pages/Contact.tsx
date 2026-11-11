import { Mail, Phone, MessageCircle, Compass } from "lucide-react";

const InstagramIcon = ({ size = 22 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

function Contact() {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "140px 24px 80px",
        background:
          "radial-gradient(circle at 50% 0%, rgba(168, 224, 99, 0.08) 0%, transparent 60%), linear-gradient(180deg, #09140c 0%, #060d08 100%)",
        color: "#ffffff",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(168, 224, 99, 0.1)",
            border: "1px solid rgba(168, 224, 99, 0.25)",
            color: "#a8e063",
            padding: "6px 16px",
            borderRadius: "30px",
            fontSize: "13px",
            fontWeight: "600",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            marginBottom: "16px",
          }}
        >
          <Compass size={14} />
          <span>Get in Touch</span>
        </div>

        <h1
          style={{
            fontSize: "clamp(34px, 5vw, 48px)",
            fontWeight: "800",
            margin: "0 0 16px",
            letterSpacing: "-0.5px",
          }}
        >
          Connect With Traviska
        </h1>
        <p
          style={{
            color: "#94a3b8",
            fontSize: "clamp(15px, 2vw, 17px)",
            lineHeight: "1.6",
            maxWidth: "600px",
            margin: "0 auto 45px",
          }}
        >
          Have questions about an upcoming trip, custom group booking, or just want to say hi? Reach out to our team directly.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "20px",
            textAlign: "left",
          }}
        >
          {/* WHATSAPP */}
          <a
            href="https://wa.me/919902742004"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "16px",
              padding: "24px",
              textDecoration: "none",
              color: "#ffffff",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              transition: "all 0.25s ease",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(168, 224, 99, 0.12)",
                color: "#a8e063",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MessageCircle size={22} />
            </div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>WhatsApp Us</h3>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px" }}>
              Fastest response for queries, slot bookings &amp; itinerary details.
            </p>
            <span style={{ color: "#a8e063", fontWeight: "600", fontSize: "14px", marginTop: "4px" }}>
              +91 99027 42004 →
            </span>
          </a>

          {/* CALL */}
          <a
            href="tel:9902742004"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "16px",
              padding: "24px",
              textDecoration: "none",
              color: "#ffffff",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              transition: "all 0.25s ease",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(168, 224, 99, 0.12)",
                color: "#a8e063",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Phone size={22} />
            </div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>Direct Call</h3>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px" }}>
              Speak with a trip coordinator directly for urgent requirements.
            </p>
            <span style={{ color: "#a8e063", fontWeight: "600", fontSize: "14px", marginTop: "4px" }}>
              +91 99027 42004 →
            </span>
          </a>

          {/* INSTAGRAM */}
          <a
            href="https://www.instagram.com/travelwithtraviska?mdxt=MWJyaXU5MXM4OHY3aQ%3D%3D&utm_source=qr"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "16px",
              padding: "24px",
              textDecoration: "none",
              color: "#ffffff",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              transition: "all 0.25s ease",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(168, 224, 99, 0.12)",
                color: "#a8e063",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <InstagramIcon size={22} />
            </div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>Instagram</h3>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px" }}>
              Follow our latest expedition stories, reels &amp; travel community updates.
            </p>
            <span style={{ color: "#a8e063", fontWeight: "600", fontSize: "14px", marginTop: "4px" }}>
              @travelwithtraviska →
            </span>
          </a>

          {/* EMAIL */}
          <a
            href="mailto:travelwithtraviska@gmail.com"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "16px",
              padding: "24px",
              textDecoration: "none",
              color: "#ffffff",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              transition: "all 0.25s ease",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(168, 224, 99, 0.12)",
                color: "#a8e063",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Mail size={22} />
            </div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>Email Us</h3>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px" }}>
              For partnerships, custom private batches &amp; general inquiries.
            </p>
            <span style={{ color: "#a8e063", fontWeight: "600", fontSize: "14px", marginTop: "4px" }}>
              travelwithtraviska@gmail.com →
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default Contact;
