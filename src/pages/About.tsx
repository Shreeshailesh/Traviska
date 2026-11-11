import { Compass, Users, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

function About() {
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
      <div style={{ maxWidth: "860px", margin: "0 auto", textAlign: "center" }}>
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
          <span>Our Story</span>
        </div>

        <h1
          style={{
            fontSize: "clamp(34px, 5vw, 52px)",
            fontWeight: "800",
            margin: "0 0 20px",
            letterSpacing: "-0.5px",
          }}
        >
          Stories Worth <span style={{ color: "#a8e063", fontStyle: "italic" }}>Living.</span>
        </h1>

        <p
          style={{
            color: "#cbd5e1",
            fontSize: "clamp(16px, 2.2vw, 19px)",
            lineHeight: "1.75",
            maxWidth: "760px",
            margin: "0 auto 40px",
          }}
        >
          Traviska was born from a simple belief: travel shouldn't just be about checking destinations off a list. It should be about genuine human connection, unscripted adventures, and the raw thrill of being out in nature with people who share your spirit.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "24px",
            textAlign: "left",
            marginTop: "50px",
          }}
        >
          <div
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "28px",
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
                marginBottom: "14px",
              }}
            >
              <Users size={22} />
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: "#ffffff" }}>
              A Community-First Tribe
            </h3>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px", lineHeight: "1.6" }}>
              Most of our travellers join solo. By the end of the trip, strangers become friends for life.
            </p>
          </div>

          <div
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "28px",
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
                marginBottom: "14px",
              }}
            >
              <Compass size={22} />
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: "#ffffff" }}>
              Carefully Curated
            </h3>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px", lineHeight: "1.6" }}>
              Every trail, homestay, sunrise point, and campfire spot is personally scouted and vetted.
            </p>
          </div>

          <div
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "28px",
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
                marginBottom: "14px",
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: "#ffffff" }}>
              Safety &amp; Responsibility
            </h3>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px", lineHeight: "1.6" }}>
              First-aid certified captains, reliable transport, eco-friendly leave-no-trace protocols.
            </p>
          </div>
        </div>

        <div style={{ marginTop: "50px" }}>
          <Link
            to="/trips"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "#14351a",
              border: "1.5px solid rgba(168, 224, 99, 0.4)",
              color: "#ffffff",
              padding: "14px 34px",
              borderRadius: "30px",
              fontSize: "15px",
              fontWeight: "600",
              textDecoration: "none",
              transition: "all 0.3s ease",
            }}
          >
            <span>Explore All Journeys →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default About;
