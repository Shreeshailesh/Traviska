import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  Activity,
  Leaf,
  Star,
  Mountain,
  Trees,
  Camera,
  Tent,
  User,
  ArrowRight,
  ShieldCheck,
  Info,
} from "lucide-react";
import { API_BASE_URL } from "../api";
import TripDetailSections from "../components/TripDetailSections";
import {
  TitleBrush,
  BannerWaveSeparator,
} from "../components/HomeIllustrations";
import "./TripDetails.css";

// Sample expedition photos matching Image 3 if trip has no photos attached
const FALLBACK_MOMENTS = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop&q=80",
];

function TripDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [travellers, setTravellers] = useState(1);
  const [activeTab, setActiveTab] = useState<
    "overview" | "itinerary" | "inclusions" | "exclusions" | "other"
  >("overview");
  const [carouselPage, setCarouselPage] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [globalSections, setGlobalSections] = useState<any>(null);

  // 1. Fetch Global Detailed Trip Sections (Safety, Cancellation, Terms, Notes)
  useEffect(() => {
    let cancelled = false;
    const fetchGlobal = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/global-trip-sections`);
        if (!cancelled && data) {
          setGlobalSections(data);
        }
      } catch (err) {
        console.error("Failed to load global sections:", err);
      }
    };
    fetchGlobal();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Fetch Trip Details
  useEffect(() => {
    let cancelled = false;
    const fetchTrip = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const { data } = await axios.get(`${API_BASE_URL}/trips/${id}`);
        if (!cancelled) {
          if (data) {
            setTrip(data);
          } else {
            setLoadError("Trip not found.");
          }
        }
      } catch (err) {
        console.error("Failed to load trip:", err);
        if (!cancelled) {
          setLoadError("Unable to load trip details.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchTrip();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // 3. Fetch Trip Slots
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const fetchSlots = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/trips/${id}/slots`);
        if (!cancelled && Array.isArray(data)) {
          setSlots(data);
          // Auto-select first available date if not selected yet
          const firstAvailable = data.find((s: any) => s.status !== "Sold Out");
          if (firstAvailable) {
            setSelectedSlot(firstAvailable._id);
          }
        }
      } catch (err) {
        console.error("Failed to load slots:", err);
      }
    };
    fetchSlots();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Handle Book Now Click
  const handleBooking = () => {
    if (!trip) return;

    if (!selectedSlot) {
      alert("Please select a travel date to continue");
      return;
    }

    const slot = slots.find((item: any) => item._id === selectedSlot);
    if (!slot || slot.status === "Sold Out") {
      alert("This travel date is no longer available");
      return;
    }

    navigate("/booking", {
      state: {
        _id: trip._id,
        title: trip.title,
        image: trip.image,
        location: trip.location,
        duration: trip.duration,
        price: trip.price,
        slotId: selectedSlot,
        selectedDate: slot.date,
        travellers,
      },
    });
  };

  if (loading) {
    return (
      <div className="trip-loading-view">
        <div className="trip-spinner" />
        <p>Loading journey details...</p>
      </div>
    );
  }

  if (loadError || !trip) {
    return (
      <div className="trip-error-view">
        <h2>{loadError || "Trip not found"}</h2>
        <button onClick={() => navigate("/trips")} className="trip-back-btn">
          Back to Trips
        </button>
      </div>
    );
  }

  // Calculate pricing
  const unitPrice = Number(trip.price || 0);
  const totalPrice = unitPrice * travellers;

  // Selected slot details
  const selectedSlotData = slots.find((s) => s._id === selectedSlot);

  // Moments gallery photos
  const momentsPhotos: string[] =
    Array.isArray(trip.photos) && trip.photos.length >= 3
      ? trip.photos
      : FALLBACK_MOMENTS;

  // 3 photos per carousel slide
  const totalSlides = Math.ceil(momentsPhotos.length / 3) || 1;
  const currentSlidePhotos: string[] = momentsPhotos.slice(
    (carouselPage % totalSlides) * 3,
    (carouselPage % totalSlides) * 3 + 3
  );

  const handlePrevSlide = () => {
    setCarouselPage((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const handleNextSlide = () => {
    setCarouselPage((prev) => (prev + 1) % totalSlides);
  };

  return (
    <div className="trip-details-page-wrap">
      {/* ============================================================
          1. HERO BANNER WITH BACK BUTTON, TITLE, LOCATION & STARTING PRICE
          ============================================================ */}
      <section className="trip-hero-banner">
        <img
          src={trip.image || FALLBACK_MOMENTS[0]}
          alt={trip.title}
          className="trip-banner-bg"
        />
        <div className="trip-banner-overlay" />

        <div className="trip-banner-inner">
          <Link to="/trips" className="trip-back-pill">
            <ArrowLeft size={16} />
            <span>Back to Trips</span>
          </Link>

          <div className="trip-banner-header-row">
            <div>
              <h1 className="trip-banner-title">{trip.title}</h1>
              <div className="trip-banner-location">
                <MapPin size={17} className="banner-pin-icon" />
                <span>{trip.location || "Scenic Expedition"}</span>
              </div>
            </div>

            <div className="trip-banner-starting-pill">
              <span>Starting from ₹{unitPrice.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Soft undulating wave separator cutting into warm cream */}
        <BannerWaveSeparator />
      </section>

      {/* ============================================================
          2. MAIN CONTENT (2-COLUMN LAYOUT: CONTENT + STICKY BOOKING)
          ============================================================ */}
      <div className="trip-main-container">
        {/* LEFT COLUMN */}
        <div className="trip-left-column">
          {/* CARD 1: ABOUT THIS TRIP */}
          <div className="trip-card-box">
            <div className="card-box-header">
              <div className="header-icon-circle green">
                <Info size={18} />
              </div>
              <h2 className="card-box-title">About This Trip</h2>
            </div>

            <p className="trip-description-text">
              {trip.description ||
                "Experience the misty hills, lush forests, and serene landscapes, a perfect getaway for nature lovers and adventure seekers."}
            </p>

            {/* Quick 4-item Specs row */}
            <div className="trip-specs-row">
              <div className="trip-spec-item">
                <Calendar size={17} className="spec-icon" />
                <span>{trip.duration || "3 Days / 2 Nights"}</span>
              </div>
              <div className="trip-spec-item">
                <Users size={17} className="spec-icon" />
                <span>
                  {selectedSlotData
                    ? `${selectedSlotData.totalSlots - selectedSlotData.bookedSlots} Seats Available`
                    : "12 Seats"}
                </span>
              </div>
              <div className="trip-spec-item">
                <Activity size={17} className="spec-icon" />
                <span>Moderate</span>
              </div>
              <div className="trip-spec-item">
                <Leaf size={17} className="spec-icon" />
                <span>Nature &amp; Adventure</span>
              </div>
            </div>
          </div>

          {/* CARD 2: SELECT TRAVEL DATE */}
          <div className="trip-card-box">
            <div className="card-box-header">
              <div className="header-icon-circle green">
                <Calendar size={18} />
              </div>
              <h2 className="card-box-title">Select Travel Date</h2>
            </div>

            <div className="dates-selector-grid">
              {slots.length === 0 ? (
                <div className="no-dates-notice">
                  <p>Upcoming travel dates will be announced shortly.</p>
                </div>
              ) : (
                slots.map((slot: any) => {
                  const isSelected = selectedSlot === slot._id;
                  const isSoldOut = slot.status === "Sold Out";
                  const formattedDate = new Date(slot.date).toLocaleDateString(
                    "en-US",
                    {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }
                  );

                  return (
                    <div
                      key={slot._id}
                      className={`date-option-card ${
                        isSelected ? "selected" : ""
                      } ${isSoldOut ? "sold-out" : ""}`}
                      onClick={() => !isSoldOut && setSelectedSlot(slot._id)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="date-option-info">
                        <span className="date-option-title">
                          {formattedDate}
                        </span>
                        <span
                          className={`date-option-status ${
                            isSoldOut ? "sold" : ""
                          }`}
                        >
                          {isSoldOut ? "Sold Out" : "Available for booking"}
                        </span>
                      </div>

                      <div className="date-option-radio">
                        {isSelected && <div className="date-radio-dot" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* CARD 3: TRIP HIGHLIGHTS */}
          <div className="trip-card-box">
            <div className="card-box-header">
              <div className="header-icon-circle green">
                <Star size={18} />
              </div>
              <h2 className="card-box-title">Trip Highlights</h2>
            </div>

            <div className="highlights-pills-grid">
              <div className="highlight-pill">
                <Mountain size={20} className="highlight-pill-icon" />
                <span>Scenic viewpoints</span>
              </div>
              <div className="highlight-pill">
                <Trees size={20} className="highlight-pill-icon" />
                <span>Lush green trails</span>
              </div>
              <div className="highlight-pill">
                <Camera size={20} className="highlight-pill-icon" />
                <span>Waterfalls &amp; nature spots</span>
              </div>
              <div className="highlight-pill">
                <Tent size={20} className="highlight-pill-icon" />
                <span>Campfire &amp; group activities</span>
              </div>
            </div>
          </div>

          {/* CARD 4: TABBED INFORMATION */}
          <div className="trip-card-box">
            <div className="trip-tab-pills-row">
              <button
                type="button"
                className={`trip-tab-btn ${
                  activeTab === "overview" ? "active" : ""
                }`}
                onClick={() => setActiveTab("overview")}
              >
                Overview &amp; Highlights
              </button>
              <button
                type="button"
                className={`trip-tab-btn ${
                  activeTab === "itinerary" ? "active" : ""
                }`}
                onClick={() => setActiveTab("itinerary")}
              >
                Itinerary
              </button>
              <button
                type="button"
                className={`trip-tab-btn ${
                  activeTab === "inclusions" ? "active" : ""
                }`}
                onClick={() => setActiveTab("inclusions")}
              >
                Inclusions
              </button>
              <button
                type="button"
                className={`trip-tab-btn ${
                  activeTab === "exclusions" ? "active" : ""
                }`}
                onClick={() => setActiveTab("exclusions")}
              >
                Exclusions
              </button>
              <button
                type="button"
                className={`trip-tab-btn ${
                  activeTab === "other" ? "active" : ""
                }`}
                onClick={() => setActiveTab("other")}
              >
                Other Info
              </button>
            </div>

            <div className="trip-tab-content-panel">
              {activeTab === "overview" && (
                <div className="tab-pane">
                  <p>
                    {trip.highlights?.trim() ||
                      trip.description ||
                      `A refreshing ${
                        trip.duration || "expedition"
                      } to ${trip.title}, filled with nature, adventure, and unforgettable experiences. Explore hills, waterfalls, and local attractions with like-minded travellers.`}
                  </p>
                </div>
              )}

              {activeTab === "itinerary" && (
                <div className="tab-pane">
                  {trip.itinerary?.trim() ? (
                    <p style={{ whiteSpace: "pre-line" }}>{trip.itinerary}</p>
                  ) : (
                    <p>Detailed day-by-day itinerary will be shared upon booking confirmation.</p>
                  )}
                </div>
              )}

              {activeTab === "inclusions" && (
                <div className="tab-pane">
                  {trip.inclusions?.trim() ? (
                    <ul className="tab-list">
                      {trip.inclusions
                        .split("\n")
                        .filter((s: string) => s.trim())
                        .map((item: string, idx: number) => (
                          <li key={idx}>{item.trim()}</li>
                        ))}
                    </ul>
                  ) : (
                    <ul className="tab-list">
                      <li>Accommodation in eco-lodges / nature campsites</li>
                      <li>Certified outdoor trip captain &amp; local guides</li>
                      <li>Standard meals and refreshment stops as per itinerary</li>
                      <li>Entry permits and local toll fees</li>
                    </ul>
                  )}
                </div>
              )}

              {activeTab === "exclusions" && (
                <div className="tab-pane">
                  {trip.exclusions?.trim() ? (
                    <ul className="tab-list">
                      {trip.exclusions
                        .split("\n")
                        .filter((s: string) => s.trim())
                        .map((item: string, idx: number) => (
                          <li key={idx}>{item.trim()}</li>
                        ))}
                    </ul>
                  ) : (
                    <ul className="tab-list">
                      <li>Personal expenses, laundry, and tips</li>
                      <li>Any activity not explicitly mentioned in inclusions</li>
                      <li>Personal travel insurance</li>
                    </ul>
                  )}
                </div>
              )}

              {activeTab === "other" && (
                <div className="tab-pane">
                  {trip.thingsToCarry?.trim() ? (
                    <ul className="tab-list">
                      {trip.thingsToCarry
                        .split("\n")
                        .filter((s: string) => s.trim())
                        .map((item: string, idx: number) => (
                          <li key={idx}>{item.trim()}</li>
                        ))}
                    </ul>
                  ) : (
                    <ul className="tab-list">
                      <li>Carry a valid government-issued photo ID.</li>
                      <li>Wear comfortable trekking shoes with good grip.</li>
                      <li>Carry personal reusable water bottles and rain protection.</li>
                      <li>Follow all safety protocols and leader guidelines.</li>
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: STICKY BOOKING WIDGET */}
        <div className="trip-right-column">
          <div className="booking-widget-card">
            <h3 className="booking-widget-title">Book Your Trip</h3>
            <p className="booking-widget-subtitle">
              Reserve your seat for this amazing experience.
            </p>

            <div className="booking-widget-price-row">
              <div className="widget-price-info">
                <span className="widget-price-label">Trip Price</span>
                <span className="widget-price-unit">per person</span>
              </div>
              <div className="widget-price-value">
                ₹{unitPrice.toLocaleString("en-IN")}
              </div>
            </div>

            <div className="booking-widget-travellers">
              <div className="travellers-label">
                <User size={16} />
                <span>Select Number of Travellers</span>
              </div>

              <div className="traveller-stepper">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() =>
                    setTravellers((prev) => Math.max(1, prev - 1))
                  }
                  disabled={travellers <= 1}
                  aria-label="Decrease travellers"
                >
                  −
                </button>
                <span className="stepper-count">{travellers}</span>
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setTravellers((prev) => prev + 1)}
                  aria-label="Increase travellers"
                >
                  +
                </button>
              </div>
            </div>

            <div className="booking-widget-divider" />

            <div className="booking-widget-total-row">
              <span className="widget-total-label">Total Price</span>
              <span className="widget-total-value">
                ₹{totalPrice.toLocaleString("en-IN")}
              </span>
            </div>

            <button
              type="button"
              className="booking-submit-btn"
              onClick={handleBooking}
            >
              <span>Book Now</span>
              <ArrowRight size={18} />
            </button>

            <div className="booking-trust-badge">
              <ShieldCheck size={16} className="trust-shield-icon" />
              <span>Secure &amp; hassle-free booking</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          3. TRAVEL POLICIES & GUIDELINES (ACCORDION STACK - IMAGE 1)
          ============================================================ */}
      <TripDetailSections
        safetyInformation={
          globalSections?.safetyInformation || trip?.safetyInformation
        }
        cancellationPolicy={
          globalSections?.cancellationPolicy || trip?.cancellationPolicy
        }
        termsAndConditions={
          globalSections?.termsAndConditions || trip?.termsAndConditions
        }
      />

      {/* ============================================================
          4. MOMENTS FROM THE JOURNEY (CAROUSEL - IMAGE 3)
          ============================================================ */}
      <section className="moments-journey-section">
        <div className="moments-journey-header">
          <div className="moments-badge">
            <Camera size={14} className="moments-badge-icon" />
            <span>Moments From The Journey</span>
          </div>

          <h2 className="moments-title">Moments From The Journey</h2>
          <TitleBrush />
          <p className="moments-subtitle">
            Glimpses of real experiences, happy travellers, and unforgettable moments from our expeditions.
          </p>
        </div>

        <div className="moments-carousel-wrap">
          <button
            type="button"
            className="carousel-arrow prev"
            onClick={handlePrevSlide}
            aria-label="Previous photos"
          >
            ‹
          </button>

          <div className="moments-cards-row">
            {currentSlidePhotos.map((photo: string, index: number) => (
              <div key={index} className="moment-photo-card">
                <img
                  src={photo}
                  alt={`${trip.title} moment ${index + 1}`}
                  loading="lazy"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            className="carousel-arrow next"
            onClick={handleNextSlide}
            aria-label="Next photos"
          >
            ›
          </button>
        </div>

        {/* 3 Pagination dots matching screenshot */}
        <div className="moments-dots">
          {[0, 1, 2].map((idx) => (
            <span
              key={idx}
              className={`moment-dot ${
                carouselPage % 3 === idx ? "active" : ""
              }`}
              onClick={() => setCarouselPage(idx)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default TripDetails;
