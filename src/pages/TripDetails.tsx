
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../api";
import "./TripDetails.css";
import TripDetailSections from "../components/TripDetailSections";

function TripDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  
  const [photos, setPhotos] = useState<string[]>([]);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [openSection, setOpenSection] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [globalSections, setGlobalSections] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchGlobalSections = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/global-trip-sections`);
        if (!cancelled && data) {
          setGlobalSections(data);
        }
      } catch (err) {
        console.error("Failed to load global sections:", err);
      }
    };

    fetchGlobalSections();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchTrip = async () => {
      setLoading(true);
      setLoadError("");
      setTrip(null);
      setPhotos([]);
      setCurrentPhoto(0);
      setSelectedSlot(null);

      try {
        const { data } = await axios.get(
          `${API_BASE_URL}/trips/${id}`
        );

        if (!cancelled) {
          if (data) {
            setTrip(data);
            setPhotos(
              Array.isArray(data.photos)
                ? data.photos
                : []
            );
          } else {
            setLoadError("Trip not found.");
          }
        }
      } catch (error) {
        console.error("Failed to load trip:", error);

        if (!cancelled) {
          setLoadError("Unable to load trip details.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchTrip();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    const fetchSlots = async () => {
      setSlots([]);

      try {
        const { data } = await axios.get(
          `${API_BASE_URL}/trips/${id}/slots`
        );

        if (!cancelled) {
          setSlots(data);
        }
      } catch (error) {
        console.error("Failed to load slots:", error);
      }
    };

    fetchSlots();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleBooking = () => {
    if (!selectedSlot) {
      alert("Please select a travel date");
      return;
    }

    const slot = slots.find(
      (item: any) => item._id === selectedSlot
    );

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
      },
    });
  };

  if (loading) {
    return (
      <h1 style={{ color: "white", padding: "40px" }}>
        Loading...
      </h1>
    );
  }

  if (loadError || !trip) {
    return (
      <div
        style={{
          color: "white",
          padding: "120px 40px",
        }}
      >
        <h1>{loadError || "Trip not found."}</h1>
        <button onClick={() => navigate("/trips")}>
          Back to Trips
        </button>
      </div>
    );
  }

  return (
    <div className="trip-details">
      <div className="trip-banner">
        <img src={trip.image} alt={trip.title} />
      </div>

      <div className="trip-info">
        <h1>{trip.title}</h1>

        <p>
          📍 {trip.location} | ⏳ {trip.duration}
        </p>

        
<h2>
  Starting ₹
  {Number(trip.price).toLocaleString("en-IN")}
</h2>


        {/* AVAILABLE TRAVEL DATES */}
        <div
          style={{
            marginTop: "25px",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "14px",
            padding: "22px",
          }}
        >
          <h3
            style={{
              margin: "0 0 18px",
              fontSize: "22px",
              color: "#222",
            }}
          >
            Available Dates
          </h3>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {slots.length === 0 && (
              <p style={{ color: "#777" }}>
                No travel dates are currently available.
              </p>
            )}

            {slots.map((slot: any) => (
              <div
                key={slot._id}
                onClick={(event) => {
                  event.stopPropagation();

                  if (slot.status !== "Sold Out") {
                    setSelectedSlot(slot._id);
                  }
                }}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  padding: "16px 18px",
                  border:
                    selectedSlot === slot._id
                      ? "2px solid #ff6b00"
                      : "1px solid #e5e7eb",
                  borderRadius: "10px",
                  background:
                    selectedSlot === slot._id
                      ? "#fff7f0"
                      : "#fafafa",
                  cursor:
                    slot.status === "Sold Out"
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      color: "#222",
                    }}
                  >
                    {new Date(slot.date).toLocaleDateString(
                      "en-IN",
                      {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: "4px",
                      fontSize: "14px",
                      color: "#777",
                    }}
                  >
                    {slot.status === "Sold Out"
                      ? "Not available for booking"
                      : "Available for booking"}
                  </div>
                </div>

                <span
                  style={{
                    fontWeight: "600",
                    fontSize: "14px",
                    color:
                      slot.status === "Sold Out"
                        ? "#ef4444"
                        : slot.status === "Filling Fast"
                        ? "#f59e0b"
                        : "#22c55e",
                  }}
                >
                  {slot.status}
                </span>
              </div>
            ))}
          </div>
        </div>

       
<button
  onClick={handleBooking}
  disabled={!slots.some((slot: any) => slot.status !== "Sold Out")}
  style={{
    background: slots.some((slot: any) => slot.status !== "Sold Out")
      ? "#ff6b00"
      : "#9ca3af",
    color: "#ffffff",
    padding: "14px 24px",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: slots.some((slot: any) => slot.status !== "Sold Out")
      ? "pointer"
      : "not-allowed",
    width: "100%",
    marginTop: "20px",
  }}
>
  {slots.length === 0
    ? "Dates Coming Soon"
    : slots.every((slot: any) => slot.status === "Sold Out")
    ? "Sold Out"
    : "Book Now"}
</button>


       {/* ABOUT THE TRIP */}
<h2 style={{ marginTop: "32px", marginBottom: "16px" }}>
  About This Trip
</h2> 

        <p style={{ whiteSpace: "pre-line" }}>
  {trip.description}
</p>

       
      

        {/* INFORMATION TABS */}
        <div className="trip-information">
          <div className="trip-tabs">
            <button
              className={
                openSection === "overview" ? "active" : ""
              }
              onClick={() => setOpenSection("overview")}
            >
              Overview & Highlights
            </button>

            <button
              className={
                openSection === "itinerary" ? "active" : ""
              }
              onClick={() => setOpenSection("itinerary")}
            >
              Itinerary
            </button>

            <button
              className={
                openSection === "inclusions" ? "active" : ""
              }
              onClick={() => setOpenSection("inclusions")}
            >
              Inclusions
            </button>

            <button
              className={
                openSection === "exclusions" ? "active" : ""
              }
              onClick={() => setOpenSection("exclusions")}
            >
              Exclusions
            </button>

            <button
              className={
                openSection === "other" ? "active" : ""
              }
              onClick={() => setOpenSection("other")}
            >
              Other Info
            </button>
          </div>

          <div className="info-section">
            <h3
              onClick={() =>
                setOpenSection(
                  openSection === "overview"
                    ? ""
                    : "overview"
                )
              }
            >
              Overview & Highlights
            </h3>

            {openSection === "overview" && (
              <>
                {trip.highlights?.trim() ? (
  <p style={{ whiteSpace: "pre-line" }}>
    {trip.highlights}
  </p>
) : (
  <p>Overview & Highlights will be updated soon.</p>
)}
              </>
            )}
          </div>

          <div className="info-section">
            <h3
              onClick={() =>
                setOpenSection(
                  openSection === "itinerary"
                    ? ""
                    : "itinerary"
                )
              }
            >
              Itinerary
            </h3>

            {openSection === "itinerary" && (
             <p style={{ whiteSpace: "pre-line" }}>
  {trip.itinerary?.trim()
    ? trip.itinerary
    : "Itinerary details will be updated soon."}
</p>
            )}
          </div>

          <div className="info-section">
            <h3
              onClick={() =>
                setOpenSection(
                  openSection === "inclusions"
                    ? ""
                    : "inclusions"
                )
              }
            >
              Inclusions
            </h3>

            {openSection === "inclusions" && (
  trip.inclusions?.trim() ? (
    <ul>
      {trip.inclusions
        .split("\n")
        .filter((item: string) => item.trim())
        .map((item: string, index: number) => (
          <li key={index}>{item.trim()}</li>
        ))}
    </ul>
  ) : (
    <p>Inclusions will be updated soon.</p>
  )
)}
          </div>

          <div className="info-section">
            <h3
              onClick={() =>
                setOpenSection(
                  openSection === "exclusions"
                    ? ""
                    : "exclusions"
                )
              }
            >
              Exclusions
            </h3>

           {openSection === "exclusions" && (
  trip.exclusions?.trim() ? (
    <ul>
      {trip.exclusions
        .split("\n")
        .filter((item: string) => item.trim())
        .map((item: string, index: number) => (
          <li key={index}>{item.trim()}</li>
        ))}
    </ul>
  ) : (
    <p>Exclusions will be updated soon.</p>
  )
)}
          </div>

          <div className="info-section">
  <h3>Things to Carry</h3>

  {trip.thingsToCarry?.trim() ? (
    <ul>
      {trip.thingsToCarry
        .split("\n")
        .filter((item: string) => item.trim())
        .map((item: string, index: number) => (
          <li key={index}>{item.trim()}</li>
        ))}
    </ul>
  ) : (
    <p>Things to Carry will be updated soon.</p>
  )}
</div>

          <div className="info-section">
            <h3
              onClick={() =>
                setOpenSection(
                  openSection === "other" ? "" : "other"
                )
              }
            >
              Other Info
            </h3>

            {openSection === "other" && (
              <ul>
                <li>
                  Carry a valid photo ID during the trip.
                </li>
                <li>
                  Carry comfortable clothes and suitable
                  footwear.
                </li>
                <li>
                  Follow the trip captain's instructions.
                </li>
                <li>
                  Trip timings may change depending on local
                  conditions.
                </li>
                <li>
                  Guests are responsible for their personal
                  belongings.
                </li>
              </ul>
            )}
          </div>
        </div>

        {/* DYNAMIC 5 SECTIONS (SAFETY, WHY CHOOSE US, CANCELLATION, TERMS, IMPORTANT NOTES) */}
        <TripDetailSections
          safetyInformation={
            globalSections?.safetyInformation || trip?.safetyInformation
          }
          whyChooseUs={
            globalSections?.whyChooseUs || trip?.whyChooseUs
          }
          cancellationPolicy={
            globalSections?.cancellationPolicy || trip?.cancellationPolicy
          }
          termsAndConditions={
            globalSections?.termsAndConditions || trip?.termsAndConditions
          }
          importantNotes={
            globalSections?.importantNotes || trip?.importantNotes
          }
        />

        {/* PHOTO GALLERY */}
        <div className="trip-gallery">
          <div
            style={{
              color: "#ff6b00",
              fontSize: "clamp(22px, 5vw, 32px)",
              fontWeight: "700",
              textAlign: "center",
             marginBottom: "12px",
            }}
          >
            Moments From The Journey
          </div>

          {photos.length > 0 ? (
            <div className="gallery-slider">
              <button
                className="gallery-arrow"
                onClick={() =>
                  setCurrentPhoto(
                    (currentPhoto - 1 + photos.length) %
                      photos.length
                  )
                }
              >
                ‹
              </button>

              <div className="gallery-track">
                {photos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`${trip.title} photo ${index + 1}`}
                    className="gallery-item"
                    style={{
                      transform:
                        `translateX(calc(-${currentPhoto} * ` +
                        `(33.333% + 6px)))`,
                    }}
                  />
                ))}
              </div>

              <button
                className="gallery-arrow"
                onClick={() =>
                  setCurrentPhoto(
                    (currentPhoto + 1) % photos.length
                  )
                }
              >
                ›
              </button>
            </div>
          ) : (
            <p style={{ textAlign: "center" }}>
              More trip photos coming soon.
            </p>
          )}
        </div>

       
      </div>
    </div>
  );
}

export default TripDetails;
