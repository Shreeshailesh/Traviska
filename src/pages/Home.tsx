import { Link, useNavigate } from "react-router-dom";
import heroVideo from "../assets/videos/hero.mp4";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  ChevronRight,
  ChevronDown,
  MapPin,
  Camera,
  Users,
  Tent,
  Award,
  Star,
  MessageSquare,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { API_BASE_URL } from "../api";
import {
  TitleBrush,
  TornPaperEdge,
  PineTreesWatermark,
  MountainPeaksWatermark,
  PalmTreesWatermark,
  MountainRidgesBg,
  CampingTentBg,
  PineForestBg,
  HikerPeakBg,
  FlightTrailDecoration,
  MountainSketchDecoration,
} from "../components/HomeIllustrations";
import "./Home.css";

// High-speed CDN URLs so video loads smoothly worldwide on mobile & web
const HERO_VIDEO_URL =
  "https://res.cloudinary.com/clpacmp1/video/upload/q_auto,f_auto/traviska_hero_video.mp4";
const HERO_POSTER_URL =
  "https://res.cloudinary.com/clpacmp1/video/upload/so_0,q_auto,f_auto/traviska_hero_video.jpg";

function Home() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  // Enforce autoplay on mobile & desktop browsers (iOS Safari, Android Chrome, Mac Safari)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.defaultMuted = true;
    video.muted = true;

    const playVideo = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Fallback if autoplay is restricted until first touch
          const handleFirstInteraction = () => {
            video.play().catch(() => {});
            window.removeEventListener("touchstart", handleFirstInteraction);
            window.removeEventListener("click", handleFirstInteraction);
          };
          window.addEventListener("touchstart", handleFirstInteraction, {
            once: true,
            passive: true,
          });
          window.addEventListener("click", handleFirstInteraction, {
            once: true,
          });
        });
      }
    };

    playVideo();
  }, []);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${API_BASE_URL}/trips`);
        setTrips(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch trips:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, []);

  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight - 70,
      behavior: "smooth",
    });
  };

  return (
    <div className="home-page-container">
      {/* ============================================================
          HERO SECTION
          ============================================================ */}
      <section className="hero">
        <video
          ref={videoRef}
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={HERO_POSTER_URL}
        >
          <source src={HERO_VIDEO_URL} type="video/mp4" />
          <source src={heroVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        <div className="overlay"></div>

        <div className="hero-content">
          <p className="tagline">
            TRAVEL &nbsp;•&nbsp; EXPLORE &nbsp;•&nbsp; EXPERIENCE
          </p>

          <h1>
            Stories Worth{" "}
            <span className="hero-highlight">Living.</span>
          </h1>

          <p className="description">
            Weekend getaways, road trips, backpacking adventures, and unforgettable experiences
            with like-minded travellers.
          </p>

          <Link to="/trips">
            <button type="button" className="hero-cta">
              Explore Trips <ChevronRight size={20} />
            </button>
          </Link>
        </div>

        {/* Scroll indicator */}
        <button
          type="button"
          className="scroll-indicator"
          onClick={scrollToContent}
          aria-label="Scroll down"
        >
          <ChevronDown size={22} />
        </button>
      </section>

      {/* ============================================================
          SECTION 1: POPULAR EXPERIENCES (Exact Match to Design)
          ============================================================ */}
      <section className="nature-section popular-section">
        <div className="nature-header">
          <div className="nature-badge">
            <Sparkles size={14} className="badge-icon" />
            <span>FEATURED EXPEDITIONS</span>
          </div>
          <h2 className="nature-title">Popular Experiences</h2>
          <TitleBrush />
          <p className="nature-subtitle">
            Handpicked journeys crafted for thrill, serenity, and lifelong memories.
          </p>
        </div>

        {loading ? (
          <div className="nature-loading">
            <p>Loading handpicked journeys...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="nature-loading">
            <p>Exciting new journeys are being curated right now. Check back soon!</p>
          </div>
        ) : (
          <>
            <div className="popular-cards-grid">
              {trips.slice(0, 6).map((trip: any, index: number) => {
                // Simulated photo count badges matching screenshot: 3, 21, 8
                const photoCount =
                  Array.isArray(trip.photos) && trip.photos.length > 0
                    ? trip.photos.length
                    : index === 0
                    ? 3
                    : index === 1
                    ? 21
                    : 8;

                return (
                  <div
                    className="nature-trip-card"
                    key={trip._id}
                    onClick={() => navigate(`/trip/${trip._id}`)}
                  >
                    {/* CARD IMAGE CONTAINER */}
                    <div className="trip-card-media">
                      {trip.image?.trim() ? (
                        <img
                          src={trip.image}
                          alt={trip.title}
                          className="trip-card-img"
                          loading="lazy"
                        />
                      ) : (
                        <div className="trip-card-no-img">
                          <span>Traviska Expedition</span>
                        </div>
                      )}

                      {/* PHOTO COUNT BADGE IN TOP RIGHT */}
                      <div className="trip-photo-badge">
                        <Camera size={13} />
                        <span>{photoCount}</span>
                      </div>

                      {/* TORN RAGGED PAPER EDGE AT BOTTOM OF PHOTO */}
                      <TornPaperEdge />
                    </div>

                    {/* CARD BODY */}
                    <div className="trip-card-content">
                      <div className="trip-card-location">
                        <MapPin size={14} className="location-pin" />
                        <span>{trip.location || "Scenic Trail"}</span>
                      </div>

                      <h3 className="trip-card-heading">{trip.title}</h3>

                      <div className="trip-card-divider"></div>

                      <div className="trip-card-pricing-row">
                        <div className="pricing-col">
                          <span className="pricing-label">STARTING FROM</span>
                          <div className="pricing-val">
                            ₹{Number(trip.price || 0).toLocaleString("en-IN")}
                          </div>
                        </div>

                        {/* WATERMARK ILLUSTRATION ON RIGHT */}
                        <div className="pricing-watermark">
                          {index % 3 === 0 ? (
                            <PineTreesWatermark />
                          ) : index % 3 === 1 ? (
                            <MountainPeaksWatermark />
                          ) : (
                            <PalmTreesWatermark />
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="nature-card-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/trip/${trip._id}`);
                        }}
                      >
                        <span>View Trip</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VIEW ALL TRIPS BUTTON */}
            <div className="popular-view-all-wrap">
              <button
                type="button"
                className="popular-view-all-btn"
                onClick={() => navigate("/trips")}
              >
                <span>View All Trips</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}
      </section>

      {/* ============================================================
          SECTION 2: WHY TRAVEL WITH TRAVISKA? (Exact Match to Design)
          ============================================================ */}
      <section className="nature-section why-travel-section">
        <div className="nature-header">
          <div className="nature-badge">
            <span>THE TRAVISKA DIFFERENCE</span>
          </div>
          <h2 className="nature-title">Why Travel With Traviska?</h2>
          <TitleBrush />
          <p className="nature-subtitle">
            More than ordinary sightseeing — we craft raw adventures, deep connections, and stories that stay with you forever.
          </p>
        </div>

        <div className="why-cards-grid">
          {/* CARD 1: Hidden & Curated Trails */}
          <div className="why-feature-card">
            <div className="why-card-icon-box">
              <MapPin size={22} color="#ffffff" />
            </div>
            <h3 className="why-card-title">Hidden &amp; Curated Trails</h3>
            <p className="why-card-desc">
              Discover untouched waterfalls, secret camping ridges, and offbeat trails far away from crowded tourist circuits.
            </p>
            <MountainRidgesBg />
          </div>

          {/* CARD 2: Solo & Tribe Community */}
          <div className="why-feature-card">
            <div className="why-card-icon-box">
              <Users size={22} color="#ffffff" />
            </div>
            <h3 className="why-card-title">Solo &amp; Tribe Community</h3>
            <p className="why-card-desc">
              Join solo or with your friends. Bond around campfires and leave with a lifelong family of fellow storytellers.
            </p>
            <CampingTentBg />
          </div>

          {/* CARD 3: Intimate Small Groups */}
          <div className="why-feature-card">
            <div className="why-card-icon-box">
              <Tent size={22} color="#ffffff" />
            </div>
            <h3 className="why-card-title">Intimate Small Groups</h3>
            <p className="why-card-desc">
              Strictly capped group numbers ensure safe, personal, high-energy, and environmentally conscious journeys.
            </p>
            <PineForestBg />
          </div>

          {/* CARD 4: Experienced Trip Captains */}
          <div className="why-feature-card">
            <div className="why-card-icon-box">
              <Award size={22} color="#ffffff" />
            </div>
            <h3 className="why-card-title">Experienced Trip Captains</h3>
            <p className="why-card-desc">
              Guided by certified outdoor captains who know every turn of the terrain and prioritize your safety above all else.
            </p>
            <HikerPeakBg />
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3: TRAVELLER STORIES (Exact Match to Design)
          ============================================================ */}
      <section className="nature-section stories-section">
        {/* Background decorations: sketch on left, airplane trail on right */}
        <MountainSketchDecoration />
        <FlightTrailDecoration />

        <div className="nature-header">
          <div className="nature-badge">
            <MessageSquare size={13} className="badge-icon" />
            <span>TRAVELLER STORIES</span>
          </div>
          <h2 className="nature-title">Traveller Stories</h2>
          <TitleBrush />
          <p className="nature-subtitle">
            Unfiltered memories, friendships, and reviews shared by our travellers.
          </p>
        </div>

        <div className="stories-cards-grid">
          {/* STORY 1: Rahul Sharma */}
          <div className="nature-story-card">
            <div className="story-speech-bubble">
              <span>❝</span>
            </div>

            <div className="story-stars-row">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />
              ))}
            </div>

            <p className="story-body-quote">
              "Traviska gave me so much more than a weekend getaway. Travelling solo for the first time felt effortless. I found an incredible circle of friends and memories I still smile about every day."
            </p>

            <div className="story-card-separator"></div>

            <div className="story-profile-row">
              <div className="story-avatar-circle">R</div>
              <div className="story-profile-info">
                <h4 className="story-name">Rahul Sharma</h4>
                <span className="story-trip-name">Wayanad Expedition</span>
              </div>
            </div>
          </div>

          {/* STORY 2: Ananya Hegde */}
          <div className="nature-story-card">
            <div className="story-speech-bubble">
              <span>❝</span>
            </div>

            <div className="story-stars-row">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />
              ))}
            </div>

            <p className="story-body-quote">
              "The experience was planned to absolute perfection. Hidden sunrise spots, zero hassle, and the trip captain made everyone feel completely at home. You can tell they genuinely care about travel."
            </p>

            <div className="story-card-separator"></div>

            <div className="story-profile-row">
              <div className="story-avatar-circle">A</div>
              <div className="story-profile-info">
                <h4 className="story-name">Ananya Hegde</h4>
                <span className="story-trip-name">Ooty &amp; Coonoor Trail</span>
              </div>
            </div>
          </div>

          {/* STORY 3: Arjun Nair */}
          <div className="nature-story-card">
            <div className="story-speech-bubble">
              <span>❝</span>
            </div>

            <div className="story-stars-row">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />
              ))}
            </div>

            <p className="story-body-quote">
              "From strangers sitting awkwardly in a bus to screaming campfire songs together under starry skies. That transformation is what Traviska creates. Unforgettable!"
            </p>

            <div className="story-card-separator"></div>

            <div className="story-profile-row">
              <div className="story-avatar-circle">A</div>
              <div className="story-profile-info">
                <h4 className="story-name">Arjun Nair</h4>
                <span className="story-trip-name">Gokarna Beach Trek</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Pagination dots matching screenshot */}
        <div className="stories-pagination-dots">
          <span className="dot"></span>
          <span className="dot active"></span>
          <span className="dot"></span>
        </div>
      </section>
    </div>
  );
}

export default Home;
