import { useState, useEffect, useMemo } from "react";
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
  MapPin,
  Clock,
  ExternalLink,
  AlertCircle,
  Compass,
  CheckCircle2,
  Sparkles,
  Check,
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

interface CustomerPickupLocation {
  _id: string;
  name: string;
  address?: string;
  landmark?: string;
  pickupTime: string;
  effectivePickupTime?: string;
  googleMapsUrl?: string;
  isActive: boolean;
  order?: number;
  dateOverrides?: {
    slotId?: string;
    date?: string;
    pickupTime?: string;
  }[];
}

interface AppliedCouponInfo {
  code: string;
  discountType: "flat" | "percentage";
  value: number;
  discountAmount: number;
  finalPayable: number;
  message?: string;
}

interface AvailableOffer {
  id: string;
  code: string;
  discountType: string;
  value: number;
  minBookingAmount: number;
  validUntil: string;
  applicableTrips: string;
  estimatedDiscount: number;
  isAmountEligible: boolean;
  shortDescription: string;
}

const loadRazorpayScript = (): Promise<boolean> => {
  if (typeof window !== "undefined" && (window as any).Razorpay) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

function Booking() {
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve trip from state or fallback to sessionStorage so refresh doesn't lose data
  const trip = useMemo(() => {
    if (location.state && (location.state._id || location.state.id || location.state.title)) {
      try {
        sessionStorage.setItem("traviska_booking_trip", JSON.stringify(location.state));
      } catch (e) {}
      return location.state;
    }
    try {
      const stored = sessionStorage.getItem("traviska_booking_trip");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return null;
  }, [location.state]);

  const tripId = trip?._id || trip?.id || trip?.tripId || "";

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

  const [name, setName] = useState(() => {
    try {
      const saved = localStorage.getItem("customer");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name && parsed.name !== "Customer") return parsed.name;
      }
    } catch {}
    return "";
  });
  const [email, setEmail] = useState(() => {
    try {
      const saved = localStorage.getItem("customer");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.email) return parsed.email;
      }
    } catch {}
    return "";
  });
  const [phone, setPhone] = useState(() => {
    try {
      const saved = localStorage.getItem("customer");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.phone) return String(parsed.phone).replace(/^\+91/, "");
      }
    } catch {}
    return "";
  });

  const [availableSlots, setAvailableSlots] = useState<any[]>(() => {
    if (Array.isArray(trip?.slots)) {
      return trip.slots.filter((s: any) => !s.isClosed && s.status !== "Closed");
    }
    return [];
  });
  const [selectedSlotId, setSelectedSlotId] = useState<string>(
    trip?.slotId || (trip?.slots && trip.slots[0]?._id) || ""
  );

  const [requests, setRequests] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pickup Locations State (initialized immediately from trip.pickupLocations if available)
  const [pickupLocations, setPickupLocations] = useState<CustomerPickupLocation[]>(() => {
    if (Array.isArray(trip?.pickupLocations) && trip.pickupLocations.length > 0) {
      return trip.pickupLocations.filter((p: any) => p.isActive !== false);
    }
    return [];
  });
  const [selectedPickupId, setSelectedPickupId] = useState<string>(() => {
    if (Array.isArray(trip?.pickupLocations) && trip.pickupLocations.length === 1) {
      return trip.pickupLocations[0]._id || "";
    }
    return "";
  });
  const [loadingPickups, setLoadingPickups] = useState<boolean>(() => {
    return !(Array.isArray(trip?.pickupLocations) && trip.pickupLocations.length > 0);
  });
  const [pickupError, setPickupError] = useState<string>("");

  // Coupon & Promotional Offers State
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCouponInfo | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [showAvailableOffers, setShowAvailableOffers] = useState(false);
  const [availableOffers, setAvailableOffers] = useState<AvailableOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);

  // Preload Razorpay SDK only when the customer enters the Booking page
  useEffect(() => {
    loadRazorpayScript();
  }, []);

  // Fetch pickup locations for selected trip and recalculate times on departure date change
  useEffect(() => {
    if (!tripId) {
      setLoadingPickups(false);
      return;
    }

    const currentSlot = availableSlots.find((s) => s._id === selectedSlotId);
    const dateParam = currentSlot?.date || trip?.selectedDate || "";

    setLoadingPickups(true);
    axios
      .get(`${API_BASE_URL}/trips/${tripId}/pickups`, {
        params: {
          slotId: selectedSlotId || undefined,
          date: dateParam || undefined,
        },
      })
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.pickupLocations)) {
          // Filter out inactive pickup points
          const activeOnly: CustomerPickupLocation[] = res.data.pickupLocations.filter(
            (p: CustomerPickupLocation) => p.isActive !== false
          );
          setPickupLocations(activeOnly);

          // If current selection is invalid or no longer active, clear it
          setSelectedPickupId((prev) => {
            if (prev && activeOnly.some((p) => p._id === prev)) {
              return prev;
            }
            // Auto-select if there's only 1 pickup point configured
            return activeOnly.length === 1 ? activeOnly[0]._id : "";
          });
        }
      })
      .catch((err) => {
        console.warn("Could not load pickup locations:", err);
      })
      .finally(() => {
        setLoadingPickups(false);
      });
  }, [tripId, selectedSlotId]);

  // Fetch slots if not passed in location.state
  useEffect(() => {
    if (tripId && availableSlots.length === 0) {
      axios
        .get(`${API_BASE_URL}/trips/${tripId}/slots`)
        .then((res) => {
          if (Array.isArray(res.data)) {
            const openSlots = res.data.filter((s: any) => !s.isClosed && s.status !== "Closed");
            setAvailableSlots(openSlots);
            if (!selectedSlotId && openSlots.length > 0) {
              setSelectedSlotId(openSlots[0]._id);
            }
          }
        })
        .catch((err) => {
          console.error("Failed to fetch slots for booking:", err);
        });
    }
  }, [tripId]);

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
  const originalTotal = unitPrice * travellers;
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalPayable = Math.max(0, originalTotal - discountAmount);

  // Fetch available offers for this trip and booking amount
  const fetchAvailableOffers = async () => {
    setLoadingOffers(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/coupons/available`, {
        params: {
          tripId: trip?._id,
          amount: originalTotal,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
        },
      });
      if (res.data.success && Array.isArray(res.data.offers)) {
        setAvailableOffers(res.data.offers);
      }
    } catch (e) {
      console.warn("Could not load available offers:", e);
    } finally {
      setLoadingOffers(false);
    }
  };

  useEffect(() => {
    fetchAvailableOffers();
  }, [trip?._id, originalTotal, phone, email]);

  // Re-validate applied coupon if booking total changes
  useEffect(() => {
    if (appliedCoupon) {
      axios
        .post(`${API_BASE_URL}/coupons/validate`, {
          code: appliedCoupon.code,
          tripId: trip?._id,
          tripTitle: trip?.title,
          amount: originalTotal,
          phone,
          email,
        })
        .then((res) => {
          if (res.data.success && res.data.coupon) {
            setAppliedCoupon({
              code: res.data.coupon.code,
              discountType: res.data.coupon.discountType,
              value: res.data.coupon.value,
              discountAmount: res.data.coupon.discountAmount,
              finalPayable: res.data.coupon.finalPayable,
              message: res.data.message,
            });
            setCouponError(null);
          }
        })
        .catch((err) => {
          setCouponError(
            err.response?.data?.message ||
              `Coupon "${appliedCoupon.code}" is no longer applicable for the updated booking amount.`
          );
          setAppliedCoupon(null);
          setCouponSuccess(null);
        });
    }
  }, [originalTotal, trip?._id, trip?.title]);

  const handleApplyCoupon = async (codeToApply?: string) => {
    const targetCode = (codeToApply || couponInput).trim().toUpperCase();
    if (!targetCode) {
      setCouponError("Please enter a coupon code.");
      return;
    }

    setCouponLoading(true);
    setCouponError(null);
    setCouponSuccess(null);

    try {
      const res = await axios.post(`${API_BASE_URL}/coupons/validate`, {
        code: targetCode,
        tripId: trip?._id,
        tripTitle: trip?.title,
        amount: originalTotal,
        phone,
        email,
      });

      if (res.data.success && res.data.coupon) {
        setAppliedCoupon({
          code: res.data.coupon.code,
          discountType: res.data.coupon.discountType,
          value: res.data.coupon.value,
          discountAmount: res.data.coupon.discountAmount,
          finalPayable: res.data.coupon.finalPayable,
          message: res.data.message,
        });
        setCouponSuccess(res.data.message || `Coupon "${res.data.coupon.code}" applied successfully!`);
        setCouponInput(res.data.coupon.code);
      } else {
        setCouponError(res.data.message || "Invalid coupon code.");
      }
    } catch (err: any) {
      setCouponError(err.response?.data?.message || "Invalid or ineligible coupon code.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponSuccess(null);
    setCouponError(null);
    setCouponInput("");
  };

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

    if (pickupLocations.length > 0 && !selectedPickupId) {
      setPickupError("Please select a pickup location for your trip to continue");
      const pickupEl = document.getElementById("booking-pickup-section");
      if (pickupEl) {
        pickupEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      alert("Please select a pickup location to continue your booking");
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

    const razorpayReady = await loadRazorpayScript();
    if (!razorpayReady || !(window as any).Razorpay) {
      alert("Payment gateway could not load. Please check your connection and try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Create a Razorpay order on backend
      const orderResponse = await axios.post(`${API_BASE_URL}/create-order`, {
        tripId: trip._id,
        slotId: selectedSlotId,
        travellers,
        pickupLocationId: selectedPickupId || undefined,
        couponCode: appliedCoupon?.code || undefined,
        phone,
        email,
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
                  couponCode: appliedCoupon?.code || undefined,
                  pickupLocationId: selectedPickupId || undefined,
                  pickupLocation: (() => {
                    const matched = pickupLocations.find((p) => p._id === selectedPickupId);
                    if (!matched) return "";
                    const time = matched.effectivePickupTime || matched.pickupTime;
                    return `${matched.name}${time ? ` (${time})` : ""}`;
                  })(),
                  name,
                  email,
                  phone,
                  requests: combinedRequests,
                  whatsappOptIn,
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
              navigate("/customer/dashboard");
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
              SECTION: PICKUP DETAILS
              ============================================================ */}
          <div className="booking-sec" id="booking-pickup-section">
            <div className="booking-sec-title">
              <MapPin size={20} className="sec-icon" />
              <span>Pickup Details</span>
              {pickupLocations.length > 0 && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#166534",
                    background: "#eaf5e9",
                    padding: "3px 8px",
                    borderRadius: "10px",
                    marginLeft: "auto",
                    letterSpacing: "0.3px",
                  }}
                >
                  * Mandatory
                </span>
              )}
            </div>

            {pickupError && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  color: "#b91c1c",
                  fontSize: "13px",
                  marginBottom: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{pickupError}</span>
              </div>
            )}

            {loadingPickups ? (
              <div
                style={{
                  padding: "16px",
                  background: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  fontSize: "13px",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <Clock size={16} color="#166534" />
                <span>Checking available boarding points for this departure...</span>
              </div>
            ) : pickupLocations.length === 0 ? (
              <div
                style={{
                  padding: "16px",
                  background: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  fontSize: "13px",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <Compass size={18} color="#166534" style={{ flexShrink: 0 }} />
                <span>
                  Standard pickup details for this trip package will be coordinated by our trip captain prior to departure.
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#475569" }}>
                  Select one boarding point for your group:
                </p>

                {pickupLocations.map((loc) => {
                  const isSelected = selectedPickupId === loc._id;
                  const displayTime = loc.effectivePickupTime || loc.pickupTime || "Standard Time";

                  return (
                    <div
                      key={loc._id}
                      onClick={() => {
                        setSelectedPickupId(loc._id);
                        setPickupError("");
                      }}
                      style={{
                        padding: "14px 16px",
                        borderRadius: "12px",
                        border: isSelected ? "2px solid #166534" : "1.5px solid #e2e8f0",
                        background: isSelected ? "#f0fdf4" : "#ffffff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "14px",
                        transition: "all 0.15s ease",
                        boxShadow: isSelected ? "0 2px 8px rgba(22, 101, 52, 0.08)" : "none",
                      }}
                    >
                      {/* Radio indicator */}
                      <div
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          border: isSelected ? "5px solid #166534" : "2px solid #cbd5e1",
                          background: "#ffffff",
                          marginTop: "2px",
                          flexShrink: 0,
                          boxSizing: "border-box",
                        }}
                      />

                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                          <span style={{ fontSize: "14.5px", fontWeight: 700, color: "#0f172a" }}>
                            {loc.name}
                          </span>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "12px",
                              fontWeight: 700,
                              color: isSelected ? "#166534" : "#0f172a",
                              background: isSelected ? "#dcfce7" : "#f1f5f9",
                              padding: "3px 8px",
                              borderRadius: "6px",
                            }}
                          >
                            <Clock size={12} /> {displayTime}
                          </span>
                        </div>

                        {loc.address && (
                          <div style={{ fontSize: "12.5px", color: "#475569", display: "flex", alignItems: "center", gap: "5px" }}>
                            <MapPin size={13} color="#64748b" style={{ flexShrink: 0 }} />
                            <span>{loc.address}</span>
                          </div>
                        )}

                        {loc.landmark && (
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            Landmark: <strong>{loc.landmark}</strong>
                          </div>
                        )}

                        {loc.googleMapsUrl && (
                          <div style={{ marginTop: "4px" }}>
                            <a
                              href={loc.googleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#2563eb",
                                textDecoration: "none",
                              }}
                            >
                              <ExternalLink size={12} /> View on Google Maps
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
              SECTION 5: OFFERS & COUPONS
              ============================================================ */}
          <div className="booking-sec" id="booking-coupons-section">
            <div className="booking-sec-title">
              <Tag size={20} className="sec-icon" />
              <span>Offers &amp; Coupons</span>
            </div>

            {/* Manual Coupon Input Box */}
            <div className="coupon-input-wrap">
              <div className="coupon-input-group">
                <input
                  type="text"
                  className="coupon-text-input"
                  placeholder="Enter coupon code (e.g. EXPLORE500)"
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value.toUpperCase());
                    if (couponError) setCouponError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleApplyCoupon();
                    }
                  }}
                  disabled={Boolean(appliedCoupon) || couponLoading}
                />
                {appliedCoupon ? (
                  <button
                    type="button"
                    className="coupon-remove-btn"
                    onClick={handleRemoveCoupon}
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    className="coupon-apply-btn"
                    onClick={() => handleApplyCoupon()}
                    disabled={couponLoading || !couponInput.trim()}
                  >
                    {couponLoading ? "Checking..." : "Apply"}
                  </button>
                )}
              </div>

              {/* Status Messages */}
              {couponSuccess && (
                <div className="coupon-status-msg success">
                  <CheckCircle2 size={16} />
                  <span>{couponSuccess}</span>
                </div>
              )}
              {couponError && (
                <div className="coupon-status-msg error">
                  <AlertCircle size={16} />
                  <span>{couponError}</span>
                </div>
              )}
            </div>

            {/* View Available Offers Accordion Toggle */}
            <div className="available-offers-container">
              <button
                type="button"
                className="available-offers-toggle"
                onClick={() => setShowAvailableOffers(!showAvailableOffers)}
              >
                <div className="offers-toggle-left">
                  <Sparkles size={16} style={{ color: "#166534" }} />
                  <span>View Available Offers ({availableOffers.length})</span>
                </div>
                <ChevronDown
                  size={16}
                  style={{
                    transform: showAvailableOffers ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                />
              </button>

              {showAvailableOffers && (
                <div className="available-offers-list">
                  {loadingOffers ? (
                    <div className="offers-loading">Loading applicable offers...</div>
                  ) : availableOffers.length === 0 ? (
                    <div className="offers-empty">No offers currently available for this trip.</div>
                  ) : (
                    availableOffers.map((offer) => (
                      <div
                        key={offer.id}
                        className={`offer-card ${appliedCoupon?.code === offer.code ? "applied" : ""}`}
                      >
                        <div className="offer-card-main">
                          <div className="offer-card-badge">{offer.code}</div>
                          <div className="offer-card-desc">
                            <strong>{offer.shortDescription}</strong>
                            {offer.minBookingAmount > 0 && (
                              <span> • Min order ₹{offer.minBookingAmount.toLocaleString("en-IN")}</span>
                            )}
                          </div>
                          <div className="offer-card-validity">
                            Valid until {offer.validUntil} • {offer.applicableTrips}
                          </div>
                        </div>

                        <div className="offer-card-action">
                          {appliedCoupon?.code === offer.code ? (
                            <span className="offer-applied-tag">
                              <Check size={12} /> Applied
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="offer-apply-pill"
                              onClick={() => handleApplyCoupon(offer.code)}
                              disabled={couponLoading}
                            >
                              Apply
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ============================================================
              WHATSAPP NOTIFICATION CONSENT
              ============================================================ */}
          <div
            style={{
              padding: "12px 16px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              marginBottom: "14px",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}
          >
            <input
              id="whatsapp-opt-in-checkbox"
              type="checkbox"
              checked={whatsappOptIn}
              onChange={(e) => setWhatsappOptIn(e.target.checked)}
              style={{ marginTop: "3px", width: "16px", height: "16px", accentColor: "#166534", cursor: "pointer" }}
            />
            <label
              htmlFor="whatsapp-opt-in-checkbox"
              style={{ fontSize: "13px", color: "#334155", lineHeight: 1.45, cursor: "pointer" }}
            >
              Send my booking confirmation, PDF invoice, and trip updates via <strong>WhatsApp</strong> on my provided mobile number.
            </label>
          </div>

          {/* ============================================================
              6. BOTTOM BAR (TOTAL & CONFIRM BOOKING BUTTON)
              ============================================================ */}
          <div className="booking-bottom-row">
            <div className="booking-total-display">
              {appliedCoupon ? (
                <div className="total-pricing-breakdown">
                  <div className="total-breakdown-row original">
                    <span className="breakdown-label">Original Total:</span>
                    <span className="breakdown-value strikethrough">₹{originalTotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="total-breakdown-row discount">
                    <span className="breakdown-label">Coupon ({appliedCoupon.code}):</span>
                    <span className="breakdown-value discount-green">-₹{discountAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="total-breakdown-row final">
                    <span className="total-label">Payable Total: </span>
                    <span className="total-amount">₹{finalPayable.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              ) : (
                <>
                  <span className="total-label">Total: </span>
                  <span className="total-amount">
                    ₹{originalTotal.toLocaleString("en-IN")}
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              className="booking-confirm-btn"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              <span>
                {isSubmitting ? "Processing..." : `Confirm Booking • ₹${finalPayable.toLocaleString("en-IN")}`}
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
