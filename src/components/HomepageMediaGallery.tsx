import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { Camera, Film, ZoomIn, X, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { API_BASE_URL } from "../api";
import { getOptimizedMediaUrl } from "../lib/mediaUrl";
import { TitleBrush } from "./HomeIllustrations";
import "./HomepageMediaGallery.css";

export { getOptimizedMediaUrl };

const GALLERY_CACHE_KEY = "traviska:gallery:v1";

export interface GalleryMediaItem {
  _id?: string;
  id?: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  cloudinaryPublicId?: string;
  thumbnailUrl?: string;
  row: "top" | "bottom";
  order?: number;
  title?: string;
  isVisible?: boolean;
}

// Media Optimization Helper re-exported from ../lib/mediaUrl above

// Video Poster Helper: Generates lightweight poster thumbnail
export const getVideoPosterUrl = (item: GalleryMediaItem): string => {
  if (item.thumbnailUrl) {
    return getOptimizedMediaUrl(item.thumbnailUrl, 640);
  }
  if (item.mediaUrl && item.mediaUrl.includes("res.cloudinary.com")) {
    const jpgUrl = item.mediaUrl.replace(/\.[^/.]+$/, ".jpg");
    return getOptimizedMediaUrl(jpgUrl, 640);
  }
  return "";
};

// Curated high-aesthetic fallback in case database is empty or offline
const FALLBACK_TOP_ITEMS: GalleryMediaItem[] = [
  {
    id: "fb_top_1",
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=640&q=80",
    row: "top",
    title: "Misty Sunrise over Wayanad Tea Hills",
  },
  {
    id: "fb_top_2",
    mediaType: "video",
    mediaUrl: "https://assets.mixkit.co/videos/preview/mixkit-flying-over-a-foggy-pine-forest-42407-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=640&q=80",
    row: "top",
    title: "Floating Through Alpine Pine Forest",
  },
  {
    id: "fb_top_3",
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=640&q=80",
    row: "top",
    title: "Golden Hour Shores of South Goa",
  },
  {
    id: "fb_top_4",
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=640&q=80",
    row: "top",
    title: "Serene Mountain Lake Crossing",
  },
  {
    id: "fb_top_5",
    mediaType: "video",
    mediaUrl: "https://assets.mixkit.co/videos/preview/mixkit-gentle-waves-crashing-on-a-sandy-beach-42352-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=640&q=80",
    row: "top",
    title: "Coastal Waves at Sunset",
  },
  {
    id: "fb_top_6",
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&w=640&q=80",
    row: "top",
    title: "Summit Celebrations & Mountain Bonds",
  },
];

const FALLBACK_BOTTOM_ITEMS: GalleryMediaItem[] = [
  {
    id: "fb_bot_1",
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=640&q=80",
    row: "bottom",
    title: "Canoeing through Glacial Waters",
  },
  {
    id: "fb_bot_2",
    mediaType: "video",
    mediaUrl: "https://assets.mixkit.co/videos/preview/mixkit-campers-talking-around-a-campfire-at-night-42403-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=640&q=80",
    row: "bottom",
    title: "Campfire Stories Under Starry Skies",
  },
  {
    id: "fb_bot_3",
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=640&q=80",
    row: "bottom",
    title: "Open Highway into the Western Ghats",
  },
  {
    id: "fb_bot_4",
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=640&q=80",
    row: "bottom",
    title: "Stairways of Ancient Coastal Forts",
  },
  {
    id: "fb_bot_5",
    mediaType: "video",
    mediaUrl: "https://assets.mixkit.co/videos/preview/mixkit-waterfall-in-forest-2213-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=640&q=80",
    row: "bottom",
    title: "Secret Rainforest Waterfall",
  },
  {
    id: "fb_bot_6",
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=640&q=80",
    row: "bottom",
    title: "Golden Morning in Karnataka Coffee Groves",
  },
];

// Memoized Media Card: Prevents any re-rendering or layout recalculation while tracks are animating
interface MediaCardProps {
  item: GalleryMediaItem;
  isDuplicate: boolean;
  isSectionVisible: boolean;
  onOpenLightbox: (item: GalleryMediaItem) => void;
}

const MediaCard: React.FC<MediaCardProps> = React.memo(
  ({ item, isDuplicate, isSectionVisible, onOpenLightbox }) => {
    const isVideo = item.mediaType === "video";
    const videoRef = useRef<HTMLVideoElement>(null);

    const optimizedImageUrl = useMemo(
      () => getOptimizedMediaUrl(item.thumbnailUrl || item.mediaUrl, 640),
      [item.thumbnailUrl, item.mediaUrl]
    );
    const optimizedVideoUrl = useMemo(
      () => getOptimizedMediaUrl(item.mediaUrl, 480, "video"),
      [item.mediaUrl]
    );

    const posterUrl = useMemo(() => getVideoPosterUrl(item), [item]);

    // Handle video playback without blocking GPU compositor
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !isVideo) return;

      if (!isSectionVisible) {
        video.pause();
        return;
      }

      // Primary group plays muted smoothly, while duplicate group stays poster-only
      if (!isDuplicate) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Autoplay policy fallback
          });
        }
      }
    }, [isSectionVisible, isDuplicate, isVideo]);

    const handleMouseEnter = () => {
      if (videoRef.current && isVideo) {
        videoRef.current.play().catch(() => {});
      }
    };

    const handleMouseLeave = () => {
      if (videoRef.current && isVideo && isDuplicate) {
        videoRef.current.pause();
      }
    };

    return (
      <div
        className="gallery-media-card"
        onClick={() => onOpenLightbox(item)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onOpenLightbox(item)}
        aria-label={item.title || (isVideo ? "Travel Video" : "Traviska Photo")}
      >
        {/* Render optimized media */}
        {isVideo && !isDuplicate ? (
          <video
            ref={videoRef}
            src={isSectionVisible ? optimizedVideoUrl : undefined}
            poster={posterUrl || optimizedImageUrl}
            className="gallery-card-media-element"
            muted
            loop
            playsInline
            preload={isSectionVisible ? "metadata" : "none"}
          />
        ) : (
          <img
            src={isVideo ? posterUrl || optimizedImageUrl : optimizedImageUrl}
            alt={item.title || "Traviska Moment"}
            className="gallery-card-media-element"
            loading="lazy"
            decoding="async"
            width={320}
            height={215}
          />
        )}

        {/* Card Overlay with Badges & Action */}
        <div className="gallery-card-overlay">
          <div className="gallery-card-top-bar">
            <span className="gallery-card-type-badge">
              {isVideo ? <Film size={11} /> : <Camera size={11} />}
              {isVideo ? "Video" : "Photo"}
            </span>
          </div>
          <div className="gallery-card-bottom-bar">
            <span className="gallery-card-caption">
              {item.title || (isVideo ? "Travel Video" : "Traviska Memory")}
            </span>
            <div className="gallery-card-zoom-icon">
              {isVideo ? <Play size={13} fill="currentColor" /> : <ZoomIn size={13} />}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

MediaCard.displayName = "MediaCard";

export const HomepageMediaGallery: React.FC = () => {
  const [topItems, setTopItems] = useState<GalleryMediaItem[]>([]);
  const [bottomItems, setBottomItems] = useState<GalleryMediaItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isSectionVisible, setIsSectionVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Fetch gallery items from backend with localStorage SWR cache
  useEffect(() => {
    let isMounted = true;
    try {
      const cachedRaw = localStorage.getItem(GALLERY_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        const isFresh = typeof cached?.ts === "number" && Date.now() - cached.ts < 10 * 60 * 1000;
        if (isFresh) {
          if (Array.isArray(cached?.top) && cached.top.length > 0) setTopItems(cached.top);
          if (Array.isArray(cached?.bottom) && cached.bottom.length > 0) setBottomItems(cached.bottom);
        } else {
          localStorage.removeItem(GALLERY_CACHE_KEY);
        }
      }
    } catch {
      // Ignore corrupt cache
    }

    const fetchGallery = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/gallery`);
        if (isMounted && res.data.success) {
          const fetchedTop = (res.data.top || []).filter((i: GalleryMediaItem) => i.isVisible !== false);
          const fetchedBottom = (res.data.bottom || []).filter((i: GalleryMediaItem) => i.isVisible !== false);

          const finalTop = fetchedTop.length > 0 ? fetchedTop : FALLBACK_TOP_ITEMS;
          const finalBottom = fetchedBottom.length > 0 ? fetchedBottom : FALLBACK_BOTTOM_ITEMS;
          setTopItems(finalTop);
          setBottomItems(finalBottom);
          try {
            localStorage.setItem(
              GALLERY_CACHE_KEY,
              JSON.stringify({ top: finalTop, bottom: finalBottom, ts: Date.now() })
            );
          } catch {
            // Ignore quota errors
          }
        }
      } catch (err) {
        console.warn("Using fallback gallery media due to network or server response:", err);
        if (isMounted) {
          setTopItems(FALLBACK_TOP_ITEMS);
          setBottomItems(FALLBACK_BOTTOM_ITEMS);
        }
      }
    };

    fetchGallery();
    return () => {
      isMounted = false;
    };
  }, []);

  // Ensure each group has enough items to comfortably exceed ultra-wide viewports (>= 5 items)
  const buildGroupItems = (items: GalleryMediaItem[]) => {
    if (!items || items.length === 0) return [];
    let group = [...items];
    while (group.length < 5) {
      group = [...group, ...items];
    }
    return group;
  };

  const topGroupItems = useMemo(() => buildGroupItems(topItems), [topItems]);
  const bottomGroupItems = useMemo(() => buildGroupItems(bottomItems), [bottomItems]);

  // Combined flat list of unique items for lightbox navigation
  const allUniqueItems = useMemo(() => {
    const combined = [...topItems, ...bottomItems];
    const seen = new Set<string>();
    return combined.filter((item) => {
      const key = item._id || item.id || item.mediaUrl;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [topItems, bottomItems]);

  // Observer to pause videos when outside viewport
  useEffect(() => {
    const sectionEl = sectionRef.current;
    if (!sectionEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsSectionVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.05 }
    );

    observer.observe(sectionEl);
    return () => {
      observer.disconnect();
    };
  }, []);

  const openLightboxForItem = useCallback(
    (item: GalleryMediaItem) => {
      const idx = allUniqueItems.findIndex(
        (u) => (u._id && u._id === item._id) || (u.id && u.id === item.id) || u.mediaUrl === item.mediaUrl
      );
      setLightboxIndex(idx !== -1 ? idx : 0);
    },
    [allUniqueItems]
  );

  // Lightbox keyboard shortcuts (ESC, Left, Right)
  useEffect(() => {
    if (lightboxIndex === null) return;

    // Lock body scroll while lightbox is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxIndex(null);
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) =>
          prev !== null ? (prev > 0 ? prev - 1 : allUniqueItems.length - 1) : null
        );
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((prev) =>
          prev !== null ? (prev < allUniqueItems.length - 1 ? prev + 1 : 0) : null
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxIndex, allUniqueItems.length]);

  const activeLightboxItem = lightboxIndex !== null ? allUniqueItems[lightboxIndex] : null;

  return (
    <section className="homepage-media-gallery-section" ref={sectionRef}>
      {/* Header Matching Existing Traviska Aesthetic */}
      <div className="gallery-header-container">
        <div className="gallery-badge">
          <Camera size={13} className="gallery-badge-icon" />
          <span>MOMENTS WITH TRAVISKA</span>
        </div>
        <h2 className="gallery-main-title">The Journey, In Frames.</h2>
        <div className="gallery-brush-wrapper">
          <TitleBrush />
        </div>
        <p className="gallery-main-subtitle">
          Real places. Real people. Unforgettable memories.
        </p>
      </div>

      {/* Dual Row Seamless Marquee Container */}
      <div className="gallery-rows-wrapper">
        {/* ROW 1: Moves Left to Right */}
        <div className="gallery-row-container top-row-wrapper" title="Hover to pause">
          <div className="gallery-marquee-track track-move-right">
            {/* Primary Group */}
            <div className="gallery-marquee-group">
              {topGroupItems.map((item, index) => (
                <MediaCard
                  key={`top-g1-${item._id || item.id || index}-${index}`}
                  item={item}
                  isDuplicate={false}
                  isSectionVisible={isSectionVisible}
                  onOpenLightbox={openLightboxForItem}
                />
              ))}
            </div>
            {/* Duplicate Group for Seamless -50% to 0% GPU Loop */}
            <div className="gallery-marquee-group" aria-hidden="true">
              {topGroupItems.map((item, index) => (
                <MediaCard
                  key={`top-g2-${item._id || item.id || index}-${index}`}
                  item={item}
                  isDuplicate={true}
                  isSectionVisible={isSectionVisible}
                  onOpenLightbox={openLightboxForItem}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ROW 2: Moves Right to Left */}
        <div className="gallery-row-container bottom-row-wrapper" title="Hover to pause">
          <div className="gallery-marquee-track track-move-left">
            {/* Primary Group */}
            <div className="gallery-marquee-group">
              {bottomGroupItems.map((item, index) => (
                <MediaCard
                  key={`bot-g1-${item._id || item.id || index}-${index}`}
                  item={item}
                  isDuplicate={false}
                  isSectionVisible={isSectionVisible}
                  onOpenLightbox={openLightboxForItem}
                />
              ))}
            </div>
            {/* Duplicate Group for Seamless 0% to -50% GPU Loop */}
            <div className="gallery-marquee-group" aria-hidden="true">
              {bottomGroupItems.map((item, index) => (
                <MediaCard
                  key={`bot-g2-${item._id || item.id || index}-${index}`}
                  item={item}
                  isDuplicate={true}
                  isSectionVisible={isSectionVisible}
                  onOpenLightbox={openLightboxForItem}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Lightbox Modal */}
      {activeLightboxItem && lightboxIndex !== null && (
        <div
          className="gallery-lightbox-backdrop"
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="gallery-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="gallery-lightbox-close-btn"
              onClick={() => setLightboxIndex(null)}
              aria-label="Close Lightbox"
            >
              <X size={20} />
            </button>

            {/* Previous Button */}
            {allUniqueItems.length > 1 && (
              <button
                className="gallery-lightbox-nav-btn prev-btn"
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev !== null ? (prev > 0 ? prev - 1 : allUniqueItems.length - 1) : 0
                  )
                }
                aria-label="Previous Media"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {/* Media Player / Image Container */}
            <div className="gallery-lightbox-media-container">
              {activeLightboxItem.mediaType === "video" ? (
                <video
                  src={activeLightboxItem.mediaUrl}
                  className="gallery-lightbox-video"
                  controls
                  autoPlay
                  playsInline
                />
              ) : (
                <img
                  src={activeLightboxItem.mediaUrl}
                  alt={activeLightboxItem.title || "Traviska Moment"}
                  className="gallery-lightbox-image"
                />
              )}
            </div>

            {/* Next Button */}
            {allUniqueItems.length > 1 && (
              <button
                className="gallery-lightbox-nav-btn next-btn"
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev !== null ? (prev < allUniqueItems.length - 1 ? prev + 1 : 0) : 0
                  )
                }
                aria-label="Next Media"
              >
                <ChevronRight size={24} />
              </button>
            )}

            {/* Caption & Counter */}
            <div className="gallery-lightbox-footer">
              <span className="gallery-lightbox-title">
                {activeLightboxItem.title || "Traviska Moments"}
              </span>
              <span className="gallery-lightbox-counter">
                {lightboxIndex + 1} / {allUniqueItems.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
