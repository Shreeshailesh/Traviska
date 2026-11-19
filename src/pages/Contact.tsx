import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../api";
import { Mail, Phone, MessageCircle, Compass, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { SEO } from "../components/SEO";

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
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    tripTitle: "",
    departureDate: "",
    numTravelers: 1,
    budget: 0,
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedEnquiryId, setSubmittedEnquiryId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setErrorMsg("Please fill in your name, email, and phone number.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const res = await axios.post(`${API_BASE_URL}/api/enquiries/public`, {
        ...formData,
        source: "Website",
      });

      if (res.data.success) {
        setSubmittedEnquiryId(res.data.enquiryId || "TRV-ENQ");
        setFormData({
          name: "",
          email: "",
          phone: "",
          tripTitle: "",
          departureDate: "",
          numTravelers: 1,
          budget: 0,
          notes: "",
        });
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to submit enquiry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
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
      <SEO
        title="Contact Traviska | Trip Enquiries & Group Bookings"
        description="Connect with Traviska for upcoming trip queries, custom private groups, and corporate getaways. Call or WhatsApp our Bengaluru team at +91 99027 42004."
        canonical="https://traviska.com/contact"
        robots="index, follow"
      />
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

        {/* ======================================================== */}
        {/* INTERACTIVE CUSTOMER ENQUIRY FORM                       */}
        {/* ======================================================== */}
        <div
          style={{
            marginTop: "60px",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(168, 224, 99, 0.2)",
            borderRadius: "24px",
            padding: "40px",
            textAlign: "left",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#ffffff", margin: "0 0 8px" }}>
              Send a Travel Enquiry
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
              Looking for a custom group tour, corporate outing, or have questions about a departure? Drop your details below.
            </p>
          </div>

          {submittedEnquiryId ? (
            <div
              style={{
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "16px",
                padding: "24px",
                textAlign: "center",
              }}
            >
              <CheckCircle2 size={36} color="#34d399" style={{ margin: "0 auto 12px" }} />
              <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#34d399", margin: "0 0 6px" }}>
                Enquiry Received!
              </h3>
              <p style={{ color: "#e2e8f0", fontSize: "14px", margin: "0 0 12px" }}>
                Your reference ID is <strong style={{ color: "#a8e063" }}>#{submittedEnquiryId}</strong>. A Traviska travel specialist will call or WhatsApp you shortly.
              </p>
              <button
                type="button"
                onClick={() => setSubmittedEnquiryId(null)}
                style={{
                  background: "#164e27",
                  border: "none",
                  color: "#ffffff",
                  padding: "8px 20px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                Send Another Enquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {errorMsg && (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#f87171",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#cbd5e1", marginBottom: "6px" }}>
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Full name"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#ffffff",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#cbd5e1", marginBottom: "6px" }}>
                    Phone Number (WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="10-digit mobile number"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#ffffff",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#cbd5e1", marginBottom: "6px" }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@example.com"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#ffffff",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#cbd5e1", marginBottom: "6px" }}>
                    Destination / Trip Package
                  </label>
                  <input
                    type="text"
                    value={formData.tripTitle}
                    onChange={(e) => setFormData({ ...formData, tripTitle: e.target.value })}
                    placeholder="e.g. Coorg, Gokarna, Wayanad"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#ffffff",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#cbd5e1", marginBottom: "6px" }}>
                    Preferred Dates
                  </label>
                  <input
                    type="text"
                    value={formData.departureDate}
                    onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                    placeholder="e.g. Next weekend or flexible"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#ffffff",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#cbd5e1", marginBottom: "6px" }}>
                    Number of Travelers
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.numTravelers}
                    onChange={(e) => setFormData({ ...formData, numTravelers: Number(e.target.value) })}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#ffffff",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#cbd5e1", marginBottom: "6px" }}>
                  Message / Special Requests
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Tell us about your group, preferred activities, budget, or any specific questions..."
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#ffffff",
                    fontSize: "14px",
                    boxSizing: "border-box",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  alignSelf: "flex-end",
                  background: "linear-gradient(135deg, #164e27 0%, #22c55e 100%)",
                  border: "none",
                  color: "#ffffff",
                  padding: "14px 32px",
                  borderRadius: "14px",
                  fontSize: "14px",
                  fontWeight: "800",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 10px 20px rgba(34, 197, 94, 0.25)",
                  opacity: isSubmitting ? 0.6 : 1,
                  marginTop: "8px",
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Submitting Enquiry...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Enquiry</span>
                    <Send size={16} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Contact;
