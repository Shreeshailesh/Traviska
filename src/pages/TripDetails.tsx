import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import { SEO } from "../components/SEO";
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
  MessageCircle,
  X,
  Send,
  CheckCircle2,
  Loader2,
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
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&auto=format&fit=crop&q=80",
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
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [globalSections, setGlobalSections] = useState<any>(null);

  // Enquiry Modal State
  const [isEnquireModalOpen, setIsEnquireModalOpen] = useState(false);
  const [enquireForm, setEnquireForm] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [isSubmittingEnquiry, setIsSubmittingEnquiry] = useState(false);
  const [enquirySuccessId, setEnquirySuccessId] = useState<string | null>(null);

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquireForm.name.trim() || !enquireForm.email.trim() || !enquireForm.phone.trim()) {
      alert("Please provide your name, email, and mobile number.");
      return;
    }

    try {
      setIsSubmittingEnquiry(true);
      const matchedSlot = trip?.slots?.find((s: any) => s._id === selectedSlot);
      const res = await axios.post(`${API_BASE_URL}/api/enquiries/public`, {
        name: enquireForm.name,
        email: enquireForm.email,
        phone: enquireForm.phone,
        tripId: trip?._id,
        tripTitle: trip?.title,
        slotId: selectedSlot || undefined,
        departureDate: matchedSlot?.date || "",
        numTravelers: travellers,
        budget: totalPrice,
        notes: enquireForm.notes,
        source: "Website",
      });

      if (res.data.success) {
        setEnquirySuccessId(res.data.enquiryId);
        setEnquireForm({ name: "", email: "", phone: "", notes: "" });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to submit enquiry. Please try again.");
    } finally {
      setIsSubmittingEnquiry(false);
    }
  };

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
          // Closed slots must completely disappear from customer view
          const activeSlots = data.filter((s: any) => !s.isClosed && s.status !== "Closed");
          setSlots(activeSlots);
          // Auto-select first available date if not selected yet
          const firstAvailable = activeSlots.find((s: any) => s.status !== "Sold Out");
          if (firstAvailable) {
            setSelectedSlot(firstAvailable._id);
          } else if (activeSlots.length > 0) {
            setSelectedSlot(activeSlots[0]._id);
          } else {
            setSelectedSlot("");
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
        id: trip._id,
        title: trip.title,
        image: trip.image,
        location: trip.location,
        duration: trip.duration,
        price: trip.price,
        slotId: selectedSlot,
        selectedDate: slot.date,
        travellers,
        slots,
        pickupLocations: trip.pickupLocations,
      },
    });
  };

  // Moments gallery photos: combine trip.photos with FALLBACK_MOMENTS so we always have 9 photos across 3 slides
  const allMoments: string[] = useMemo(() => {
    const rawPhotos = Array.isArray(trip?.photos)
      ? trip.photos.filter((p: any) => typeof p === "string" && p.trim().length > 0)
      : [];
    const list: string[] = [...rawPhotos];
    for (const f of FALLBACK_MOMENTS) {
      if (!list.includes(f)) {
        list.push(f);
      }
    }
    while (list.length < 9) {
      list.push(...FALLBACK_MOMENTS);
    }
    return list.slice(0, 9);
  }, [trip?.photos]);

  const pages = useMemo(() => {
    return [
      allMoments.slice(0, 3),
      allMoments.slice(3, 6),
      allMoments.slice(6, 9),
    ];
  }, [allMoments]);

  // Clone page 0 at the end to create seamless forward infinite looping
  const displayPages = useMemo(() => {
    return [...pages, pages[0]];
  }, [pages]);

  // Auto-scroll to the right every 3.5 seconds
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setIsTransitioning(true);
      setCarouselIndex((prev) => prev + 1);
    }, 3500);

    return () => clearInterval(timer);
  }, [isPaused]);

  // Reset seamless loop when clone page reaches the end
  const handleTransitionEnd = () => {
    if (carouselIndex >= pages.length) {
      setIsTransitioning(false);
      setCarouselIndex(0);
    }
  };

  const handlePrevSlide = () => {
    setIsTransitioning(true);
    setCarouselIndex((prev) => {
      if (prev <= 0) return pages.length - 1;
      return prev - 1;
    });
  };

  const handleNextSlide = () => {
    setIsTransitioning(true);
    setCarouselIndex((prev) => {
      if (prev >= pages.length) return 1;
      return prev + 1;
    });
  };

  const handleDotClick = (idx: number) => {
    setIsTransitioning(true);
    setCarouselIndex(idx);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNextSlide();
      } else {
        handlePrevSlide();
      }
    }
    touchStartX.current = null;
  };

  const activeDot = carouselIndex % pages.length;

  if (loading) {
    return (
      <div className="trip-loading-view">
        <SEO
          title="Loading Journey... | Traviska"
          description="Curated group trip with Traviska. View itinerary, inclusions, and book your journey."
          robots="noindex, follow"
        />
        <div className="trip-spinner" />
        <p>Loading journey details...</p>
      </div>
    );
  }

  if (loadError || !trip) {
    return (
      <div className="trip-error-view">
        <SEO
          title="Trip Not Found | Traviska"
          description="The requested trip package could not be found or is no longer available. Explore our upcoming weekend trips and getaways from Bangalore."
          robots="noindex, follow"
        />
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

  // Dynamic SEO metadata based on actual MongoDB trip data
  const tripTitle = (() => {
    if (!trip?.title) return "Trip Details | Traviska";
    const parts: string[] = [trip.title.trim()];
    if (trip.duration?.trim()) {
      parts.push(trip.duration.trim());
    } else if (
      trip.location?.trim() &&
      !trip.title.toLowerCase().includes(trip.location.toLowerCase())
    ) {
      parts.push(trip.location.trim());
    }
    return `${parts.join(" - ")} | Traviska`;
  })();

  const tripDescription = (() => {
    if (!trip) {
      return "Curated group trip with Traviska. Explore destinations, view itineraries, and book your journey.";
    }
    if (trip.description && trip.description.trim().length > 30) {
      const cleanDesc = trip.description.replace(/\s+/g, " ").trim();
      if (cleanDesc.length <= 155) return cleanDesc;
      return cleanDesc.slice(0, 152) + "...";
    }
    const durationText = trip.duration ? ` ${trip.duration} journey` : " trip";
    const locText = trip.location ? ` in ${trip.location}` : "";
    const priceText = trip.price ? ` starting from ₹${Number(trip.price).toLocaleString("en-IN")}` : "";
    return `Explore ${trip.title}, a curated${durationText}${locText} with Traviska${priceText}. View full itinerary, guidelines, and book your slot.`;
  })();

  const canonicalUrl = trip?._id ? `https://traviska.com/trip/${trip._id}` : undefined;
  const ogImage = trip?.image || (allMoments.length > 0 ? allMoments[0] : "https://traviska.com/favicon-512x512.png");

  return (
    <div className="trip-details-page-wrap">
      <SEO
        title={tripTitle}
        description={tripDescription}
        canonical={canonicalUrl}
        robots="index, follow"
        ogType="website"
        ogImage={ogImage}
        twitterCard="summary_large_image"
      />
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

            <button
              type="button"
              onClick={() => {
                setEnquirySuccessId(null);
                setIsEnquireModalOpen(true);
              }}
              style={{
                width: "100%",
                marginTop: "10px",
                padding: "11px 16px",
                background: "rgba(168, 224, 99, 0.08)",
                border: "1px solid rgba(168, 224, 99, 0.3)",
                borderRadius: "14px",
                color: "#a8e063",
                fontSize: "13.5px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(168, 224, 99, 0.16)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(168, 224, 99, 0.08)")}
            >
              <MessageCircle size={16} />
              <span>Ask Questions / Custom Dates</span>
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

        <div
          className="moments-carousel-wrap"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button
            type="button"
            className="carousel-arrow prev"
            onClick={handlePrevSlide}
            aria-label="Previous photos"
          >
            ‹
          </button>

          <div className="moments-viewport">
            <div
              className="moments-track"
              onTransitionEnd={handleTransitionEnd}
              style={{
                transform: `translate3d(-${carouselIndex * 100}%, 0, 0)`,
                transition: isTransitioning
                  ? "transform 0.65s cubic-bezier(0.25, 1, 0.5, 1)"
                  : "none",
              }}
            >
              {displayPages.map((pagePhotos, pageIdx) => (
                <div key={pageIdx} className="moments-page">
                  {pagePhotos.map((photo: string, photoIdx: number) => (
                    <div key={photoIdx} className="moment-photo-card">
                      <img
                        src={photo}
                        alt={`${trip.title} moment ${pageIdx * 3 + photoIdx + 1}`}
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
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
          {pages.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`moment-dot ${activeDot === idx ? "active" : ""}`}
              onClick={() => handleDotClick(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ============================================================
          CUSTOMER TRIP ENQUIRY MODAL (Direct to Sales Portal)
          ============================================================ */}
      {isEnquireModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEnquireModalOpen(false);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "500px",
              background: "#0d1b11",
              border: "1px solid rgba(168, 224, 99, 0.3)",
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
              color: "#ffffff",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px",
                background: "linear-gradient(135deg, #092312 0%, #164e27 100%)",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#ffffff" }}>
                  Enquire About {trip?.title}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#a8e063" }}>
                  Ask about custom group batches, departure dates or itinerary details
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEnquireModalOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: "50%",
                  width: "30px",
                  height: "30px",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px" }}>
              {enquirySuccessId ? (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <CheckCircle2 size={42} color="#34d399" style={{ margin: "0 auto 12px" }} />
                  <h4 style={{ fontSize: "18px", fontWeight: "700", color: "#34d399", margin: "0 0 6px" }}>
                    Enquiry Submitted!
                  </h4>
                  <p style={{ fontSize: "13px", color: "#cbd5e1", margin: "0 0 16px" }}>
                    Reference ID: <strong style={{ color: "#a8e063" }}>#{enquirySuccessId}</strong>. A Traviska travel consultant will reach out via WhatsApp / phone shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsEnquireModalOpen(false)}
                    style={{
                      background: "#164e27",
                      border: "none",
                      color: "#ffffff",
                      padding: "10px 24px",
                      borderRadius: "10px",
                      fontSize: "13px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleEnquirySubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#cbd5e1", marginBottom: "4px" }}>
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={enquireForm.name}
                      onChange={(e) => setEnquireForm({ ...enquireForm, name: e.target.value })}
                      placeholder="e.g. Ananya Sen"
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        background: "rgba(0,0,0,0.4)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "#ffffff",
                        fontSize: "13px",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#cbd5e1", marginBottom: "4px" }}>
                        Phone / WhatsApp *
                      </label>
                      <input
                        type="tel"
                        required
                        value={enquireForm.phone}
                        onChange={(e) => setEnquireForm({ ...enquireForm, phone: e.target.value })}
                        placeholder="Mobile number"
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          background: "rgba(0,0,0,0.4)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          color: "#ffffff",
                          fontSize: "13px",
                          boxSizing: "border-box",
                          outline: "none",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#cbd5e1", marginBottom: "4px" }}>
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={enquireForm.email}
                        onChange={(e) => setEnquireForm({ ...enquireForm, email: e.target.value })}
                        placeholder="Email"
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          background: "rgba(0,0,0,0.4)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          color: "#ffffff",
                          fontSize: "13px",
                          boxSizing: "border-box",
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#cbd5e1", marginBottom: "4px" }}>
                      Questions / Custom Requirements
                    </label>
                    <textarea
                      rows={3}
                      value={enquireForm.notes}
                      onChange={(e) => setEnquireForm({ ...enquireForm, notes: e.target.value })}
                      placeholder="e.g. Can we customize the pickup point? We have a group of 6..."
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        background: "rgba(0,0,0,0.4)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "#ffffff",
                        fontSize: "13px",
                        boxSizing: "border-box",
                        outline: "none",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setIsEnquireModalOpen(false)}
                      style={{
                        padding: "10px 18px",
                        borderRadius: "10px",
                        border: "1px solid rgba(255,255,255,0.2)",
                        background: "transparent",
                        color: "#cbd5e1",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingEnquiry}
                      style={{
                        padding: "10px 22px",
                        borderRadius: "10px",
                        border: "none",
                        background: "linear-gradient(135deg, #164e27 0%, #22c55e 100%)",
                        color: "#ffffff",
                        fontSize: "13px",
                        fontWeight: "700",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: isSubmittingEnquiry ? "not-allowed" : "pointer",
                        opacity: isSubmittingEnquiry ? 0.6 : 1,
                      }}
                    >
                      {isSubmittingEnquiry ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>Submit Request</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TripDetails;
