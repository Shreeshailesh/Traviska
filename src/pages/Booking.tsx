import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import {
  Calendar,
  User,
  Users,
  Mail,
  Phone,
  Tag,
  MessageSquare,
  ArrowRight,
  Plus,
  ChevronDown,
} from "lucide-react";
import { API_BASE_URL } from "../api";
import { TitleBrush } from "../components/HomeIllustrations";
import "./Booking.css";

interface TravellerDetail {
  name: string;
  phone?: string;
  gender: "Male" | "Female" | "Other";
  age: string;
}

function Booking() {
  const location = useLocation();
  const navigate = useNavigate();
  const trip = location.state;

  const initialTravellers = trip?.travellers ? Number(trip.travellers) : 1;
  const [travellers, setTravellers] = useState<number>(initialTravellers);

  // Array of individual traveller details (Name, Phone, Gender, Age)
  const [travellerDetails, setTravellerDetails] = useState<TravellerDetail[]>(() =>
    Array.from({ length: initialTravellers }, () => ({
      name: "",
      phone: "",
      gender: "Male",
      age: "",
    }))
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [availableSlots, setAvailableSlots] = useState<any[]>(
    Array.isArray(trip?.slots) ? trip.slots : []
  );
  const [selectedSlotId, setSelectedSlotId] = useState<string>(
    trip?.slotId || (trip?.slots && trip.slots[0]?._id) || ""
  );

  const [requests, setRequests] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch slots if not passed in location.state
  useEffect(() => {
    if (trip?._id && availableSlots.length === 0) {
      axios
        .get(`${API_BASE_URL}/trips/${trip._id}/slots`)
        .then((res) => {
          if (Array.isArray(res.data)) {
            setAvailableSlots(res.data);
            if (!selectedSlotId && res.data.length > 0) {
              setSelectedSlotId(res.data[0]._id);
            }
          }
        })
        .catch((err) => {
          console.error("Failed to fetch slots for booking:", err);
        });
    }
  }, [trip?._id]);

  // Synchronize travellers count with travellerDetails list
  const updateTravellersCount = (newCount: number) => {
    const count = Math.max(1, newCount);
    setTravellers(count);
    setTravellerDetails((prev) => {
      if (prev.length === count) return prev;
      if (prev.length < count) {
        const added: TravellerDetail[] = Array.from(
          { length: count - prev.length },
          () => ({ name: "", phone: "", gender: "Male", age: "" })
        );
        return [...prev, ...added];
      }
      return prev.slice(0, count);
    });
  };

  const handleAddTraveller = () => {
    updateTravellersCount(travellers + 1);
  };

  const handleRemoveTraveller = (idxToRemove: number) => {
    if (travellers <= 1) return;
    setTravellers((prev) => prev - 1);
    setTravellerDetails((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handlePrimaryNameChange = (val: string) => {
    setName(val);
    setTravellerDetails((prev) => {
      const copy = [...prev];
      if (copy[0]) {
        copy[0] = { ...copy[0], name: val };
      }
      return copy;
    });
  };

  const handlePrimaryPhoneChange = (val: string) => {
    setPhone(val);
    setTravellerDetails((prev) => {
      const copy = [...prev];
      if (copy[0] && !copy[0].phone) {
        copy[0] = { ...copy[0], phone: val };
      }
      return copy;
    });
  };

  const handleTravellerNameChange = (index: number, travName: string) => {
    setTravellerDetails((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], name: travName };
      }
      return copy;
    });
    if (index === 0) {
      setName(travName);
    }
  };

  const handleTravellerPhoneChange = (index: number, travPhone: string) => {
    setTravellerDetails((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], phone: travPhone };
      }
      return copy;
    });
    if (index === 0) {
      setPhone(travPhone);
    }
  };

  const handleGenderChange = (
    index: number,
    gender: "Male" | "Female" | "Other"
  ) => {
    setTravellerDetails((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], gender };
      }
      return copy;
    });
  };

  const handleAgeChange = (index: number, age: string) => {
    setTravellerDetails((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], age };
      }
      return copy;
    });
  };

  const unitPrice =
    Number(trip?.price?.toString().replace(/[₹,]/g, "")) || 0;
  const total = unitPrice * travellers;

  const currentSlot =
    availableSlots.find((s) => s._id === selectedSlotId) ||
    (trip?.selectedDate ? { _id: trip.slotId, date: trip.selectedDate } : null);

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return "28 Oct, 2026";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateDropdown = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!name.trim() || !email.trim() || !phone.trim()) {
      alert("Please fill all required personal details");
      return;
    }

    if (!trip?._id || !selectedSlotId) {
      alert("Please select a valid trip and travel date");
      return;
    }

    // Validate traveller details
    for (let i = 0; i < travellerDetails.length; i++) {
      const t = travellerDetails[i];
      const travName = (i === 0 ? t.name || name : t.name)?.trim();
      if (!travName) {
        alert(`Please enter full name for Traveller ${i + 1}`);
        return;
      }
      if (!t.age || !t.age.trim() || isNaN(Number(t.age)) || Number(t.age) < 1) {
        alert(`Please enter a valid age for Traveller ${i + 1}`);
        return;
      }
    }

    if (!(window as any).Razorpay) {
      alert("Payment gateway could not load. Please refresh the page.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Create a Razorpay order on backend
      const orderResponse = await axios.post(`${API_BASE_URL}/create-order`, {
        tripId: trip._id,
        slotId: selectedSlotId,
        travellers,
      });

      const order = orderResponse.data.order;
      if (!orderResponse.data.success || !order?.id) {
        throw new Error("Could not create payment order");
      }

      // Format combined requests string with traveller breakdowns for admin display
      const travellerBreakdown = travellerDetails
        .map((t, idx) => {
          const travName = (idx === 0 ? t.name || name : t.name).trim();
          const phonePart = (idx === 0 ? t.phone || phone : t.phone)?.trim()
            ? `, Phone: ${(idx === 0 ? t.phone || phone : t.phone)?.trim()}`
            : "";
          return `Traveller ${idx + 1}: ${travName} (${t.gender}, Age ${t.age}${phonePart})`;
        })
        .join(" | ");

      const combinedRequests = requests.trim()
        ? `${requests.trim()}\n[Traveller Details: ${travellerBreakdown}]`
        : `[Traveller Details: ${travellerBreakdown}]`;

      // Step 2: Open Razorpay Checkout modal
      const razorpay = new (window as any).Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        name: "Traviska",
        description: trip.title,
        order_id: order.id,
        prefill: {
          name,
          email,
          contact: phone,
        },
        theme: {
          color: "#164321",
        },
        // Step 3: Verify payment on backend
        handler: async (paymentResponse: any) => {
          try {
            const customerToken = localStorage.getItem("customerToken");

            const verification = await axios.post(
              `${API_BASE_URL}/verify-payment`,
              {
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                bookingDetails: {
                  tripId: trip._id,
                  slotId: selectedSlotId,
                  travellers,
                  name,
                  email,
                  phone,
                  requests: combinedRequests,
                  travellerDetails: travellerDetails.map((t, idx) => ({
                    name: (idx === 0 ? t.name || name : t.name).trim(),
                    phone: (idx === 0 ? t.phone || phone : t.phone)?.trim() || "",
                    gender: t.gender,
                    age: t.age,
                  })),
                },
              },
              {
                headers: customerToken
                  ? { Authorization: `Bearer ${customerToken}` }
                  : {},
              }
            );

            if (
              verification.data.success &&
              verification.data.bookingConfirmed
            ) {
              alert("Payment successful! Your booking is confirmed.");
              navigate("/profile");
            } else {
              alert(
                "Payment received, but booking confirmation is pending. " +
                  `Contact support with order ID: ${order.id}`
              );
            }
          } catch (verificationError) {
            console.error("Payment verification error:", verificationError);
            alert(
              "Your payment may have been received, but we could not " +
                "confirm your booking. Do not pay again. " +
                `Contact support with order ID: ${order.id}`
            );
          }
        },
      });

      razorpay.on("payment.failed", (response: any) => {
        console.error("Razorpay payment failed:", response.error);
        alert(
          "Payment was not completed. Please check your payment details or balance before retrying."
        );
      });

      razorpay.open();
    } catch (error) {
      console.error("Payment order creation failed:", error);
      alert(
        import.meta.env.PROD
          ? "Online payments are temporarily unavailable. Please contact Traviska for booking assistance."
          : "Could not start payment. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="booking-page-wrap">
      {/* Decorative Mountains & Pines matching design */}
      <div className="booking-bg-mountains">
        <svg
          viewBox="0 0 1440 130"
          preserveAspectRatio="none"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <path
            d="M0,0 L0,70 Q240,40 500,75 T1000,55 T1440,80 L1440,0 Z"
            fill="#dbeed4"
            fillOpacity="0.45"
          />
          <path
            d="M0,0 L0,90 Q340,55 720,85 T1440,65 L1440,0 Z"
            fill="#c7e3bd"
            fillOpacity="0.35"
          />
        </svg>
      </div>

      <div className="booking-bg-pines-left">
        <svg
          viewBox="0 0 140 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <path
            d="M10 160 L24 85 L38 160 Z M30 160 L48 65 L66 160 Z M58 160 L74 95 L90 160 Z"
            fill="#1b4b24"
            fillOpacity="0.85"
          />
          <path
            d="M0 160 L14 110 L28 160 Z M82 160 L96 115 L110 160 Z"
            fill="#2e6224"
            fillOpacity="0.75"
          />
        </svg>
      </div>

      <div className="booking-bg-pines-right">
        <svg
          viewBox="0 0 140 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <path
            d="M102 160 L116 85 L130 160 Z M74 160 L92 65 L110 160 Z M50 160 L66 95 L82 160 Z"
            fill="#1b4b24"
            fillOpacity="0.85"
          />
          <path
            d="M112 160 L126 110 L140 160 Z M30 160 L44 115 L58 160 Z"
            fill="#2e6224"
            fillOpacity="0.75"
          />
        </svg>
      </div>

      <div className="booking-content-container">
        {/* ============================================================
            1. PAGE HEADER (BADGE, TITLE, TITLE BRUSH, SUBTITLE)
            ============================================================ */}
        <div className="booking-header">
          <div className="booking-badge">
            <Calendar size={13} className="booking-badge-icon" />
            <span>Book Your Trip</span>
          </div>

          <h1 className="booking-title">Book Your Adventure</h1>
          <TitleBrush />
          <p className="booking-subtitle">
            Reserve your spot for an unforgettable Traviska experience.
          </p>
        </div>

        {/* Fallback prompt if no trip selected */}
        {!trip && (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              background: "#ffffff",
              borderRadius: "16px",
              marginBottom: "20px",
              border: "1px solid #dce8d5",
            }}
          >
            <p style={{ margin: "0 0 12px", color: "#4b5563" }}>
              Please select a trip before booking.
            </p>
            <Link
              to="/trips"
              style={{
                color: "#164321",
                fontWeight: 700,
                textDecoration: "underline",
              }}
            >
              Browse all trips →
            </Link>
          </div>
        )}

        {/* ============================================================
            2. MAIN BOOKING CARD (Pixel-perfect to reference image)
            ============================================================ */}
        <div className="booking-card">
          {/* Top Quick Specs Bar */}
          <div className="booking-specs-bar">
            {/* Price per person */}
            <div className="booking-spec-item">
              <div className="spec-icon-box">
                <Tag size={19} />
              </div>
              <div className="spec-text-col">
                <span className="spec-value">
                  ₹{unitPrice.toLocaleString("en-IN")}
                </span>
                <span className="spec-label">per person</span>
              </div>
            </div>

            {/* Min traveller */}
            <div className="booking-spec-item">
              <div className="spec-icon-box">
                <Users size={19} />
              </div>
              <div className="spec-text-col">
                <span className="spec-value">Min. 1</span>
                <span className="spec-label">traveller</span>
              </div>
            </div>

            {/* Next available date */}
            <div className="booking-spec-item">
              <div className="spec-icon-box">
                <Calendar size={19} />
              </div>
              <div className="spec-text-col">
                <span className="spec-value">
                  {formatDateDisplay(currentSlot?.date)}
                </span>
                <span className="spec-label">next available</span>
              </div>
            </div>
          </div>

          {/* ============================================================
              SECTION 1: PERSONAL DETAILS
              ============================================================ */}
          <div className="booking-sec">
            <div className="booking-sec-title">
              <User size={20} className="sec-icon" />
              <span>Personal Details</span>
            </div>

            <div className="booking-field-group">
              <label className="booking-field-label">
                Full Name <span className="req">*</span>
              </label>
              <div className="input-with-icon">
                <User size={17} className="field-icon" />
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => handlePrimaryNameChange(e.target.value)}
                />
              </div>
            </div>

            <div className="booking-form-grid-2">
              <div className="booking-field-group">
                <label className="booking-field-label">
                  Email Address <span className="req">*</span>
                </label>
                <div className="input-with-icon">
                  <Mail size={17} className="field-icon" />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="booking-field-group">
                <label className="booking-field-label">
                  Phone Number <span className="req">*</span>
                </label>
                <div className="input-with-icon">
                  <Phone size={17} className="field-icon" />
                  <input
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => handlePrimaryPhoneChange(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================
              SECTION 2: TRAVELLER DETAILS (DYNAMIC FOR N TRAVELLERS)
              ============================================================ */}
          <div className="booking-sec">
            <div className="booking-sec-title">
              <Users size={20} className="sec-icon" />
              <span>Traveller Details</span>
            </div>

            <div className="travellers-cards-stack">
              {travellerDetails.map((traveller, index) => (
                <div key={index} className="traveller-card">
                  <div className="traveller-card-top">
                    <span className="traveller-badge">
                      Traveller {index + 1}
                      {index === 0 ? " (Primary Contact)" : ""}
                    </span>
                    {travellers > 1 && (
                      <button
                        type="button"
                        className="remove-traveller-btn"
                        onClick={() => handleRemoveTraveller(index)}
                        title="Remove traveller"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  {/* Name and Phone Inputs for Traveller */}
                  <div className="traveller-inputs-grid">
                    <div className="booking-field-group">
                      <label className="booking-field-label">
                        Full Name <span className="req">*</span>
                      </label>
                      <div className="input-with-icon">
                        <User size={17} className="field-icon" />
                        <input
                          type="text"
                          placeholder={
                            index === 0
                              ? "Traveller 1 full name"
                              : `Traveller ${index + 1} full name`
                          }
                          value={index === 0 ? traveller.name || name : traveller.name}
                          onChange={(e) =>
                            handleTravellerNameChange(index, e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="booking-field-group">
                      <label className="booking-field-label">
                        Phone Number{" "}
                        <span className="opt-label">(Optional)</span>
                      </label>
                      <div className="input-with-icon">
                        <Phone size={17} className="field-icon" />
                        <input
                          type="tel"
                          placeholder="Phone number (optional)"
                          value={index === 0 ? traveller.phone || phone : traveller.phone || ""}
                          onChange={(e) =>
                            handleTravellerPhoneChange(index, e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="traveller-fields-row">
                    {/* Gender Selection Pills */}
                    <div className="booking-field-group">
                      <label className="booking-field-label">
                        Gender <span className="req">*</span>
                      </label>
                      <div className="gender-pills-group">
                        {(["Male", "Female", "Other"] as const).map((g) => (
                          <label
                            key={g}
                            className={`gender-pill-option ${
                              traveller.gender === g ? "active" : ""
                            }`}
                          >
                            <input
                              type="radio"
                              name={`gender-${index}`}
                              value={g}
                              checked={traveller.gender === g}
                              onChange={() => handleGenderChange(index, g)}
                            />
                            <span className="gender-radio-dot" />
                            <span className="gender-symbol">
                              {g === "Male" ? "♂" : g === "Female" ? "♀" : "○"}
                            </span>
                            <span>{g}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Age Input */}
                    <div className="booking-field-group">
                      <label className="booking-field-label">
                        Age <span className="req">*</span>
                      </label>
                      <div className="input-with-icon">
                        <Calendar size={17} className="field-icon" />
                        <input
                          type="number"
                          min="1"
                          max="120"
                          placeholder="Enter age"
                          value={traveller.age}
                          onChange={(e) =>
                            handleAgeChange(index, e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* + Add Another Traveller button */}
            <div className="add-traveller-wrap">
              <button
                type="button"
                className="add-traveller-btn"
                onClick={handleAddTraveller}
              >
                <Plus size={16} />
                <span>Add Another Traveller</span>
              </button>
            </div>
          </div>

          {/* ============================================================
              SECTION 3: TRIP DETAILS (TRAVEL DATE & NUMBER OF TRAVELLERS)
              ============================================================ */}
          <div className="booking-sec">
            <div className="booking-sec-title">
              <Calendar size={20} className="sec-icon" />
              <span>Trip Details</span>
            </div>

            <div className="booking-form-grid-2">
              {/* Travel Date */}
              <div className="booking-field-group">
                <label className="booking-field-label">
                  Travel Date <span className="req">*</span>
                </label>
                <div className="select-with-icon">
                  <Calendar size={17} className="field-icon" />
                  <select
                    value={selectedSlotId}
                    onChange={(e) => setSelectedSlotId(e.target.value)}
                  >
                    {availableSlots.length > 0 ? (
                      availableSlots.map((s) => (
                        <option key={s._id} value={s._id}>
                          {formatDateDropdown(s.date)}
                        </option>
                      ))
                    ) : (
                      <option value="">
                        {formatDateDropdown(trip?.selectedDate) || "28/10/2026"}
                      </option>
                    )}
                  </select>
                  <ChevronDown size={17} className="select-arrow-icon" />
                </div>
              </div>

              {/* Number of Travellers dropdown */}
              <div className="booking-field-group">
                <label className="booking-field-label">
                  Number of Travellers <span className="req">*</span>
                </label>
                <div className="select-with-icon">
                  <Users size={17} className="field-icon" />
                  <select
                    value={travellers}
                    onChange={(e) =>
                      updateTravellersCount(Number(e.target.value))
                    }
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                      <option key={num} value={num}>
                        {num}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={17} className="select-arrow-icon" />
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================
              SECTION 4: SPECIAL REQUESTS (OPTIONAL)
              ============================================================ */}
          <div className="booking-sec">
            <div className="booking-sec-title">
              <MessageSquare size={20} className="sec-icon" />
              <span>Special Requests (Optional)</span>
            </div>

            <textarea
              className="booking-textarea"
              placeholder="Let us know any specific needs, preferences, or requests..."
              value={requests}
              onChange={(e) => setRequests(e.target.value)}
            />
          </div>

          {/* ============================================================
              5. BOTTOM BAR (TOTAL & CONFIRM BOOKING BUTTON)
              ============================================================ */}
          <div className="booking-bottom-row">
            <div className="booking-total-display">
              <span className="total-label">Total: </span>
              <span className="total-amount">
                ₹{total.toLocaleString("en-IN")}
              </span>
            </div>

            <button
              type="button"
              className="booking-confirm-btn"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              <span>
                {isSubmitting ? "Processing..." : "Confirm Booking"}
              </span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Booking;
