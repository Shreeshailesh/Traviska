import "./Trips.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapPin, Clock3, Compass, ArrowRight, X, Sparkles } from "lucide-react";
import {
  TitleBrush,
  TornPaperEdge,
  PineTreesWatermark,
  MountainPeaksWatermark,
  PalmTreesWatermark,
} from "../components/HomeIllustrations";
import { useTrips } from "../lib/tripsStore";

function Trips() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const { trips, loading, error, retry } = useTrips();

  const filteredTrips = trips.filter((trip) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      trip.title?.toLowerCase().includes(q) ||
      trip.location?.toLowerCase().includes(q) ||
      trip.description?.toLowerCase().includes(q)
    );
  });

  const clearSearch = () => {
    setSearchParams({});
  };

  return (
    <div className="trips-page">
      <div className="trips-header">
        <div className="trips-pill">
          <Sparkles size={14} />
          <span>CURATED EXPEDITIONS</span>
        </div>
        <h1>Explore Our Trips</h1>
        <TitleBrush />
        <p>Handpicked adventures for unforgettable experiences with like-minded travellers.</p>

        {searchQuery && (
          <div className="search-filter-active">
            <span>
              Showing results for: <strong>"{searchQuery}"</strong> ({filteredTrips.length} found)
            </span>
            <button
              type="button"
              onClick={clearSearch}
              className="clear-search-btn"
              title="Clear search filter"
            >
              <X size={14} /> Clear
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="trip-grid" aria-busy="true" aria-label="Loading expeditions">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div className="trip-box trip-skeleton-card" key={`sk-${i}`} aria-hidden="true">
              <div className="trip-box-img-wrap trip-skeleton-media skeleton-shimmer" />
              <div className="trip-info">
                <div className="skeleton-line skeleton-shimmer" style={{ width: "45%" }} />
                <div className="skeleton-line skeleton-line-lg skeleton-shimmer" style={{ width: "80%" }} />
                <div className="trip-card-divider"></div>
                <div className="skeleton-line skeleton-shimmer" style={{ width: "35%" }} />
                <div className="skeleton-btn skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="trips-state-msg">
          <Compass size={48} color="#3b6328" style={{ margin: "0 auto 16px" }} />
          <h3>Couldn't load expeditions</h3>
          <p>Please check your connection and try again.</p>
          <button type="button" onClick={retry} className="reset-filter-btn">
            Try Again
          </button>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="trips-state-msg">
          <Compass size={48} color="#3b6328" style={{ margin: "0 auto 16px" }} />
          <h3>No expeditions found</h3>
          <p>We couldn't find any trips matching your query. Try a different destination!</p>
          {searchQuery && (
            <button type="button" onClick={clearSearch} className="reset-filter-btn">
              View All Trips
            </button>
          )}
        </div>
      ) : (
        <div className="trip-grid">
          {filteredTrips.map((trip, index) => (
            <div
              className="trip-box"
              key={trip._id}
              onClick={() => navigate(`/trip/${trip._id}`)}
            >
              <div className="trip-box-img-wrap">
                {trip.image?.trim() ? (
                  <img
                    src={trip.image}
                    alt={trip.title}
                    // First row is above the fold: load immediately; the rest lazy-load.
                    loading={index < 3 ? "eager" : "lazy"}
                    fetchPriority={index < 3 ? "high" : "auto"}
                    decoding="async"
                  />
                ) : (
                  <div className="trip-box-placeholder">
                    <Compass size={40} color="#3b6328" />
                  </div>
                )}

                <span className="trip-box-duration">
                  <Clock3 size={12} />
                  {trip.duration?.trim() || "2 Days / 1 Night"}
                </span>

                {/* TORN RAGGED PAPER EDGE TRANSITION */}
                <TornPaperEdge />
              </div>

              <div className="trip-info">
                {trip.location && (
                  <div className="trip-info-location">
                    <MapPin size={14} className="location-icon" />
                    <span>{trip.location}</span>
                  </div>
                )}

                <h2>{trip.title}</h2>

                <div className="trip-card-divider"></div>

                <div className="trip-info-footer">
                  <div className="trip-info-price">
                    <span className="price-tag">STARTING FROM</span>
                    <h3>₹{Number(trip.price || 0).toLocaleString("en-IN")}</h3>
                  </div>

                  {/* Watermark Illustration on the right */}
                  <div className="trip-watermark-wrap">
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
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/trip/${trip._id}`);
                  }}
                  className="trip-info-btn"
                >
                  <span>View Details</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Trips;
