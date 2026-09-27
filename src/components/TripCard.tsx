import heroImage from "../assets/hero.png";

type Trip = {
  _id: string;
  title: string;
  location: string;
  duration: string;
  price: number;
  image?: string;
  description?: string;
};

type TripCardProps = {
  trip: Trip;
};

function TripCard({ trip }: TripCardProps) {
  return (
    <div className="trip-card">
      <img
  src={heroImage}
  alt={trip.title}
/>

      <h3>TEST CARD - {trip.title}</h3>

      <p>📍 {trip.location}</p>

      <p>⏳ {trip.duration}</p>

      <h4>₹{trip.price}</h4>

      <button>View Details</button>
    </div>
  );
}

export default TripCard;