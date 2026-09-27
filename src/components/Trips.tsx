import { useEffect, useState } from "react";
import axios from "axios";
import TripCard from "./TripCard";

function Trips() {
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
    <section className="trips">
      <h2>Popular Trips</h2>

      <p>Handpicked adventures loved by our travelers.</p>

      <div className="trip-cards">
        {trips.map((trip) => (
          <TripCard key={trip._id} trip={trip} />
        ))}
      </div>
    </section>
  );
}

export default Trips;