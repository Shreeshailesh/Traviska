import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import "./TripDetails.css";

function TripDetails() {

  const { id } = useParams();

  const navigate = useNavigate();

  const [trip, setTrip] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
 const [photos, setPhotos] = useState<string[]>([]);
const [currentPhoto, setCurrentPhoto] = useState(0);
const [openSection, setOpenSection] = useState("overview");

  const trips: any = {
  "goa-escape": {
    title: "Goa Escape",
    location: "Goa",
    duration: "2 Days • 1 Night",
    price: "₹4999",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
    description:
      "Relax on beautiful beaches, explore local spots, enjoy sunsets and create unforgettable memories."
  },

  "himalayan-adventure": {
    title: "Himalayan Adventure",
    location: "Himalayas",
    duration: "2 Days • 1 Night",
    price: "₹7999",
    image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2",
    description:
      "Experience mountain roads, breathtaking views and an unforgettable adventure."
  },

  "coorg-retreat": {
    title: "Coorg Retreat",
    location: "Coorg",
    duration: "2 Days • 1 Night",
    price: "₹5999",
    image: "https://images.unsplash.com/photo-1524498250077-390f9e378fc0",
    description:
      "Enjoy misty hills, coffee plantations, nature walks and peaceful experiences."
  }
};

useEffect(() => {
  const fetchTrip = async () => {
    try {
      const { data } = await axios.get("http://localhost:5001/trips");

      console.log("URL ID:", id);
console.log("Trips:", data);

     const selectedTrip = data.find((t: any) => t._id === id);

console.log("Selected Trip:", selectedTrip); 

console.log("Selected Trip:", selectedTrip);

      setTrip(selectedTrip);
      setPhotos(selectedTrip?.photos || []);
      
      console.log("GALLERY PHOTOS:", selectedTrip?.photos);

    } catch (err) {
      console.error(err);
    }
  }; 

  fetchTrip();
}, [id]);

useEffect(() => {
  const fetchSlots = async () => {
    if (!id) return;

    try {
      const { data } = await axios.get(
        `http://localhost:5001/trips/${id}/slots`
      );

      setSlots(data);
    } catch (err) {
      console.error(err);
    }
  };

  fetchSlots();
}, [id]);

 if (!trip) {
  return <h1 style={{ color: "white", padding: "40px" }}>Loading...</h1>;
}




  return (
    
  <div className="trip-details">

    <div className="trip-banner">

      <img
        src={trip.image}
        alt={trip.title}
      />

    </div>


    <div className="trip-info">

      <h1>
        {trip.title}
      </h1>


      <p>
        📍 {trip.location} | ⏳ {trip.duration}
      </p>


      <h2>
        Starting {trip.price}
      </h2>


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
    {slots.map((slot: any) => (
      <div
        key={slot._id}
        onClick={(e) => {
          e.stopPropagation();

          if (slot.status !== "Sold Out") {
            setSelectedSlot(slot._id);
          }
        }}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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
            {new Date(slot.date).toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>

          <div
            style={{
              marginTop: "4px",
              fontSize: "14px",
              color: "#777",
            }}
          >
            Available for booking
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
  onClick={() => {
    if (!selectedSlot) {
      alert("Please select a travel date");
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
        selectedDate:
  slots.find((slot: any) => slot._id === selectedSlot)?.date,
      },
    });
  }}
>
  Book Now
</button>

      <h2>
        About This Trip
      </h2>


      <p>
        {trip.description}
      </p>
      <div className="highlights">

  <div className="highlight-card">

    <div className="highlight-icon">
      🌄
    </div>

    <h3>
      Beautiful Locations
    </h3>

    <p>
      Explore amazing places and hidden gems.
    </p>

  </div>



  <div className="highlight-card">

    <div className="highlight-icon">
      🤝
    </div>

    <h3>
      Travel Community
    </h3>

    <p>
      Meet new people and create memories.
    </p>

  </div>



  <div className="highlight-card">

    <div className="highlight-icon">
      🏕️
    </div>

    <h3>
      Adventure
    </h3>

    <p>
      Experience exciting activities.
    </p>

  </div>


</div>


      <h2>
        Itinerary
      </h2>


      <h3>
        Day 1
      </h3>

      <p>
        Arrival, sightseeing and exploring the destination.
      </p>


      <h3>
        Day 2
      </h3>

      <p>
        Adventure activities, experiences and return journey.
      </p>
     <div className="trip-information">

      <div className="trip-tabs">
  <button
    className={openSection === "overview" ? "active" : ""}
    onClick={() => setOpenSection("overview")}
  >
    Overview & Highlights
  </button>

  <button
    className={openSection === "itinerary" ? "active" : ""}
    onClick={() => setOpenSection("itinerary")}
  >
    Itinerary
  </button>

  <button
    className={openSection === "inclusions" ? "active" : ""}
    onClick={() => setOpenSection("inclusions")}
  >
    Inclusions
  </button>

  <button
    className={openSection === "exclusions" ? "active" : ""}
    onClick={() => setOpenSection("exclusions")}
  >
    Exclusions
  </button>

  <button
    className={openSection === "other" ? "active" : ""}
    onClick={() => setOpenSection("other")}
  >
    Other Info
  </button>
</div>
 
 <div className="info-section">
  <h3
    onClick={() =>
      setOpenSection(
        openSection === "overview" ? "" : "overview"
      )
    }
  >
    Overview & Highlights
  </h3>

  {openSection === "overview" && (
    <>
      <p>
        Experience an exciting journey filled with adventure,
        exploration and memorable moments.
      </p>

      <ul>
        <li>Explore beautiful destinations</li>
        <li>Experience local culture and food</li>
        <li>Enjoy exciting activities and adventures</li>
        <li>Travel and connect with new people</li>
      </ul>
    </>
  )}
</div>

 <div className="info-section">
  <h3
    onClick={() =>
      setOpenSection(
        openSection === "itinerary" ? "" : "itinerary"
      )
    }
  >
    Itinerary
  </h3>

  {openSection === "itinerary" && (
    <>
      <h4>Day 1</h4>
      <p>
        Arrival at the destination, sightseeing, exploration and
        experiencing the local surroundings.
      </p>

      <h4>Day 2</h4>
      <p>
        Adventure activities, more experiences and the return journey.
      </p>
    </>
  )}
</div>

 <div className="info-section">
  <h3
    onClick={() =>
      setOpenSection(
        openSection === "inclusions" ? "" : "inclusions"
      )
    }
  >
    Inclusions
  </h3>

  {openSection === "inclusions" && (
    <ul>
      <li>Accommodation as mentioned in the trip details</li>
      <li>Transportation during the trip</li>
      <li>Trip captain / coordinator</li>
      <li>Planned sightseeing and activities</li>
      <li>Basic trip assistance</li>
    </ul>
  )}
</div>

 <div className="info-section">
  <h3
    onClick={() =>
      setOpenSection(
        openSection === "exclusions" ? "" : "exclusions"
      )
    }
  >
    Exclusions
  </h3>

  {openSection === "exclusions" && (
    <ul>
      <li>Personal expenses</li>
      <li>Meals not mentioned in the inclusions</li>
      <li>Entry fees not specifically mentioned</li>
      <li>Personal activities or purchases</li>
      <li>Anything not listed under inclusions</li>
    </ul>
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
      <li>Carry a valid photo ID during the trip.</li>
      <li>Carry comfortable clothes and suitable footwear.</li>
      <li>Follow the trip captain's instructions.</li>
      <li>Trip timings may change depending on local conditions.</li>
      <li>Guests are responsible for their personal belongings.</li>
    </ul>
  )}
</div>
</div>

  <div className="trip-gallery">

   <div
  style={{
    color: "#ff6b00",
    fontSize: "32px",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: "25px",
  }}


  
>
  Moments From The Journey
</div>

  

    <div className="gallery-slider">
      <button
        className="gallery-arrow"
        onClick={() =>
          setCurrentPhoto(
            (currentPhoto - 1 + photos.length) % photos.length
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
       transform: `translateX(calc(-${currentPhoto} * (33.333% + 6px)))`, 
      }}
    />
  ))}
</div>

      <button
        className="gallery-arrow"
        onClick={() =>
          setCurrentPhoto((currentPhoto + 1) % photos.length)
        }
      >
        ›
      </button>
    </div>
  </div>


<div className="booking-box">

  <h2>
    Book Your Trip
  </h2>


  <input
  placeholder="Your Name"
  value={name}
  onChange={(e) => setName(e.target.value)}
/>


  <input
    type="number"
    placeholder="Number of Travellers"
  />


  <input
    type="date"
  />


  <h3>
    Total Price: {trip.price}
  </h3>


<button>
  Book Now
</button>

</div>

    </div>

  </div>
);
}

export default TripDetails;