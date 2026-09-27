import "./Trips.css";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import TripCard from "../components/TripCard";
import heroImage from "../assets/hero.png";

function Trips() {

  const navigate = useNavigate();

 const [trips, setTrips] = useState<any[]>([]);
 useEffect(() => {
  const fetchTrips = async () => {
    try {
      const { data } = await axios.get("http://localhost:5001/trips");
      setTrips(data);
    } catch (err) {
      console.error("Failed to fetch trips:", err);
    }
  };

  fetchTrips();
}, []);


  return (

    <div className="trips-page">

      <div className="trips-header">

        <h1>
          Explore Our Trips
        </h1>

        <p>
          Handpicked adventures for unforgettable experiences.
        </p>

      </div>


      <div className="trip-grid">

        {trips.map((trip, index) => (

          <div className="trip-box" key={index}>

            <img
  src={trip.image}
  alt={trip.title}
/>

            <div className="trip-info">

              <h2>
  {trip.title}
</h2>

              <p>
                📍 {trip.location}
              </p>

              <p>
                ⏳ {trip.duration}
              </p>

              <h3>
  ₹{trip.price}
</h3>


             <button
  onClick={() => navigate(`/trip/${trip._id}`)}
>
  View Details
</button>

            </div>

          </div>

        ))}

      </div>

    </div>

  );
}

export default Trips;