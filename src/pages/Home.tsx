import { Link } from "react-router-dom";
import heroVideo from "../assets/videos/hero.mp4";
import { useEffect, useState } from "react";
import axios from "axios";
import "./Home.css";
import { Globe, Users, Tent, Star } from "lucide-react";

function Home() {

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
    <>
      <section className="hero">
   <video
  className="hero-video"
  autoPlay
  muted
  loop
  playsInline
>
  <source src={heroVideo} type="video/mp4" />
  Your browser does not support the video tag.
</video>

        <div className="overlay"></div>

        <div className="hero-content">

         <p className="tagline">
  TRAVEL • CONNECT • EXPERIENCE
</p>

          <h1>
  Discover India
  <br />
  One Journey at a Time
</h1>

          <p className="description">
  Weekend getaways, road trips, backpacking adventures, and unforgettable experiences with like-minded travellers.
</p>

          <button>
            Explore Trips
          </button>

        </div>

      </section>


      <section className="search-section">

        <div className="search-box">

          <div className="search-item">
            <label>Where</label>
            <input placeholder="Search destination" />
          </div>


          <div className="search-item">
            <label>When</label>
            <input type="date" />
          </div>


          <div className="search-item">
            <label>Travellers</label>
            <input placeholder="No. of people" />
          </div>


          <button className="search-btn">
            Search Trips
          </button>

        </div>

      </section>
      <section className="trips-section">

  <h2>Popular Experiences</h2>

  <p className="section-subtitle">
    Handpicked journeys for unforgettable memories
  </p>


  <div className="trip-cards">

   {trips.map((trip: any) => (
  <div className="trip-card" key={trip._id}>
    <img
      src={trip.image}
      alt={trip.title}
    />

    <div className="card-content">
      <h3>{trip.title}</h3>

      <p>📍 {trip.location}</p>

      <p>⏳ {trip.duration}</p>

      <h4>Starting ₹{trip.price}</h4>

      <Link to={`/trip/${trip._id}`}>
        <button>View Trip</button>
      </Link>
    </div>
  </div>
))} 


  </div>

</section>
<section className="why-section">

  <h2>Why Travel With Traviska?</h2>

  <p className="section-subtitle">
    More than trips, we create stories and connections.
  </p>


  <div className="features">


    <div className="feature-card">
      <div className="icon">
        🌍
      </div>
      <h3>Unique Experiences</h3>
      <p>
        Discover hidden places and local experiences beyond normal tourism.
      </p>
    </div>


    <div className="feature-card">
      <div className="icon">
        🤝
      </div>
      <h3>Travel Community</h3>
      <p>
        Meet like-minded travellers and create memories together.
      </p>
    </div>


    <div className="feature-card">
      <div className="icon">
        🏕️
      </div>
      <h3>Small Group Adventures</h3>
      <p>
        Enjoy safer and more personalised journeys with our groups.
      </p>
    </div>


    <div className="feature-card">
      <div className="icon">
  <Globe size={40} />
</div>
      <h3>Trip Experts</h3>
      <p>
        Travel with experienced captains who know the routes.
      </p>
    </div>


  </div>

</section>
<section className="stories-section">

  <h2>Traveller Stories</h2>

  <p className="section-subtitle">
    Memories shared by our travel community
  </p>


  <div className="stories">


    <div className="story-card">
      <p>
        "Traviska gave me more than a trip.
        I found new friends and unforgettable memories."
      </p>

      <h4>
        — Rahul
      </h4>
    </div>


    <div className="story-card">
      <p>
        "The experience was perfectly planned.
        Every place felt special and meaningful."
      </p>

      <h4>
        — Ananya
      </h4>
    </div>


    <div className="story-card">
      <p>
        "From strangers to friends,
        this journey was something I'll always remember."
      </p>

      <h4>
        — Arjun
      </h4>
    </div>


  </div>

</section>
    </>
  );
}

export default Home;