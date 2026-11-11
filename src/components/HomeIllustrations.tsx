// Organic brush stroke underline under titles
export const TitleBrush = () => (
  <svg
    width="150"
    height="10"
    viewBox="0 0 150 10"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "block", margin: "8px auto 0" }}
  >
    <path
      d="M3 7C45 2.5 105 2.5 147 7"
      stroke="#3b6328"
      strokeWidth="3.5"
      strokeLinecap="round"
      opacity="0.85"
    />
  </svg>
);

// Torn ragged edge overlay for trip cards
export const TornPaperEdge = () => (
  <svg
    viewBox="0 0 500 24"
    preserveAspectRatio="none"
    style={{
      position: "absolute",
      bottom: -1,
      left: 0,
      width: "100%",
      height: "22px",
      zIndex: 2,
      display: "block",
    }}
  >
    <path
      d="M0,24 L0,8 L15,18 L30,6 L45,16 L60,4 L75,15 L90,7 L105,18 L120,6 L135,16 L150,5 L165,17 L180,8 L195,19 L210,6 L225,17 L240,7 L255,18 L270,5 L285,16 L300,7 L315,19 L330,6 L345,17 L360,8 L375,19 L390,6 L405,17 L420,7 L435,18 L450,5 L465,16 L480,8 L495,18 L500,8 L500,24 Z"
      fill="#ffffff"
    />
  </svg>
);

// Pine Trees Watermark (Ooty / Mountains)
export const PineTreesWatermark = () => (
  <svg
    width="80"
    height="50"
    viewBox="0 0 80 50"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ opacity: 0.28 }}
  >
    {/* Left small tree */}
    <path d="M18 42 L18 48 M18 42 L12 42 L18 32 L14 32 L18 24 L15 24 L18 16 L21 24 L18 24 L22 32 L18 32 L24 42 Z" stroke="#3b6328" strokeWidth="1.5" fill="#588147" />
    {/* Center tall tree */}
    <path d="M36 40 L36 48 M36 40 L28 40 L36 26 L30 26 L36 14 L32 14 L36 4 L40 14 L36 14 L42 26 L36 26 L44 40 Z" stroke="#3b6328" strokeWidth="1.8" fill="#588147" />
    {/* Right medium tree */}
    <path d="M54 42 L54 48 M54 42 L48 42 L54 30 L50 30 L54 20 L51 20 L54 12 L57 20 L54 20 L58 30 L54 30 L60 42 Z" stroke="#3b6328" strokeWidth="1.5" fill="#588147" />
  </svg>
);

// Mountain Peaks Watermark (Wayanad)
export const MountainPeaksWatermark = () => (
  <svg
    width="85"
    height="45"
    viewBox="0 0 85 45"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ opacity: 0.28 }}
  >
    <path d="M5 42 L32 12 L48 28 L62 16 L80 42 Z" stroke="#3b6328" strokeWidth="1.6" fill="#84a98c" fillOpacity="0.4" />
    <path d="M25 20 L32 12 L38 22" stroke="#3b6328" strokeWidth="1.6" />
    <path d="M56 22 L62 16 L68 24" stroke="#3b6328" strokeWidth="1.6" />
    <path d="M32 12 L35 42" stroke="#3b6328" strokeWidth="1.2" strokeDasharray="2 2" />
  </svg>
);

// Palm Trees Watermark (Goa / Beaches)
export const PalmTreesWatermark = () => (
  <svg
    width="80"
    height="50"
    viewBox="0 0 80 50"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ opacity: 0.28 }}
  >
    {/* Trunk */}
    <path d="M32 46 C35 34 33 22 28 16" stroke="#3b6328" strokeWidth="2.2" strokeLinecap="round" />
    {/* Leaves */}
    <path d="M28 16 C22 10 12 12 8 16" stroke="#3b6328" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M28 16 C20 6 16 0 18 -4" stroke="#3b6328" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M28 16 C30 8 36 6 42 6" stroke="#3b6328" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M28 16 C34 14 42 16 46 22" stroke="#3b6328" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M28 16 C26 12 28 8 28 4" stroke="#3b6328" strokeWidth="1.5" strokeLinecap="round" />
    {/* Small secondary palm */}
    <path d="M48 46 C50 36 49 28 46 24" stroke="#3b6328" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M46 24 C40 18 34 20 30 22" stroke="#3b6328" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M46 24 C48 18 54 18 58 20" stroke="#3b6328" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M46 24 C44 20 46 16 47 14" stroke="#3b6328" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

// Feature Card 1 Illustration: Mountain Ridges
export const MountainRidgesBg = () => (
  <svg
    viewBox="0 0 320 80"
    preserveAspectRatio="none"
    style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      width: "100%",
      height: "75px",
      pointerEvents: "none",
      zIndex: 1,
    }}
  >
    <path d="M0,80 L0,55 Q50,45 100,60 T200,48 T320,65 L320,80 Z" fill="#dce9d5" fillOpacity="0.5" />
    <path d="M0,80 L0,65 Q60,50 130,68 T260,52 T320,70 L320,80 Z" fill="#b8d4ab" fillOpacity="0.4" />
    {/* Peaks */}
    <path d="M70,80 L115,35 L145,62 L180,45 L220,80 Z" fill="#a4c995" fillOpacity="0.45" />
    <path d="M160,80 L200,42 L230,60 L270,40 L310,80 Z" fill="#93bd83" fillOpacity="0.5" />
  </svg>
);

// Feature Card 2 Illustration: Camping Tent & Fire + Mountains
export const CampingTentBg = () => (
  <svg
    viewBox="0 0 320 80"
    preserveAspectRatio="none"
    style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      width: "100%",
      height: "75px",
      pointerEvents: "none",
      zIndex: 1,
    }}
  >
    {/* Background mountains */}
    <path d="M0,80 L0,60 Q80,45 160,55 T320,62 L320,80 Z" fill="#dce9d5" fillOpacity="0.5" />
    <path d="M40,80 L90,40 L130,65 L170,45 L210,80 Z" fill="#a4c995" fillOpacity="0.4" />
    {/* Pine trees behind tent */}
    <path d="M285,80 L292,55 L299,80 Z M295,80 L303,48 L311,80 Z" fill="#4d7c38" fillOpacity="0.6" />
    {/* Yellow/Green Tent */}
    <path d="M255,80 L275,50 L295,80 Z" fill="#1e3f20" />
    <path d="M260,80 L275,50 L290,80 Z" fill="#e9edc9" />
    <path d="M275,50 L275,80" stroke="#1e3f20" strokeWidth="1.5" />
    <path d="M267,80 L275,60 L283,80 Z" fill="#fef08a" />
    {/* Campfire */}
    <path d="M242,78 L248,68 L254,78 Z" fill="#f59e0b" />
    <path d="M245,78 L248,72 L251,78 Z" fill="#fef08a" />
    <line x1="240" y1="79" x2="256" y2="79" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Feature Card 3 Illustration: Pine Forest + Mountains
export const PineForestBg = () => (
  <svg
    viewBox="0 0 320 80"
    preserveAspectRatio="none"
    style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      width: "100%",
      height: "75px",
      pointerEvents: "none",
      zIndex: 1,
    }}
  >
    {/* Mountain waves */}
    <path d="M0,80 L0,55 Q70,45 140,58 T280,48 T320,62 L320,80 Z" fill="#dce9d5" fillOpacity="0.5" />
    <path d="M20,80 L70,42 L110,65 L150,40 L190,80 Z" fill="#a4c995" fillOpacity="0.45" />
    {/* Cluster of Pine trees on right */}
    <path d="M248,80 L256,58 L264,80 Z" fill="#4d7c38" fillOpacity="0.55" />
    <path d="M260,80 L270,50 L280,80 Z" fill="#3b6328" fillOpacity="0.75" />
    <path d="M276,80 L286,45 L296,80 Z" fill="#2d5024" fillOpacity="0.85" />
    <path d="M292,80 L300,54 L308,80 Z" fill="#3b6328" fillOpacity="0.7" />
  </svg>
);

// Feature Card 4 Illustration: Hiker Standing on Mountain Peak
export const HikerPeakBg = () => (
  <svg
    viewBox="0 0 320 85"
    preserveAspectRatio="none"
    style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      width: "100%",
      height: "80px",
      pointerEvents: "none",
      zIndex: 1,
    }}
  >
    {/* Mountains */}
    <path d="M0,85 L0,60 Q80,50 160,62 T320,68 L320,85 Z" fill="#dce9d5" fillOpacity="0.5" />
    <path d="M60,85 L110,48 L150,70 L200,45 L250,85 Z" fill="#a4c995" fillOpacity="0.45" />
    {/* Foreground summit ridge on right */}
    <path d="M230,85 L285,55 L320,65 L320,85 Z" fill="#7ba36e" fillOpacity="0.75" />
    {/* Hiker silhouette standing on the peak at x=285, y=55 */}
    <g transform="translate(280, 24)" fill="#1e3f20" stroke="#1e3f20">
      {/* Head */}
      <circle cx="8" cy="4" r="3" />
      {/* Body / Backpack */}
      <path d="M6,7 L11,7 L12,18 L6,18 Z" />
      {/* Backpack behind */}
      <rect x="2" y="8" width="4" height="8" rx="2" fill="#1e3f20" />
      {/* Legs */}
      <line x1="7" y1="18" x2="5" y2="28" strokeWidth="2" strokeLinecap="round" />
      <line x1="11" y1="18" x2="13" y2="28" strokeWidth="2" strokeLinecap="round" />
      {/* Trekking Pole */}
      <line x1="15" y1="11" x2="18" y2="30" strokeWidth="1.2" strokeLinecap="round" stroke="#1e3f20" />
    </g>
  </svg>
);

// Airplane with dotted trail in Traveller Stories header
export const FlightTrailDecoration = () => (
  <svg
    width="160"
    height="100"
    viewBox="0 0 160 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      position: "absolute",
      top: 10,
      right: 40,
      pointerEvents: "none",
    }}
    className="stories-flight-trail"
  >
    {/* Looping dashed flight path */}
    <path
      d="M10,85 C50,95 80,70 65,45 C50,20 90,15 130,25"
      stroke="#3b6328"
      strokeWidth="1.8"
      strokeDasharray="4 4"
      fill="none"
      opacity="0.6"
    />
    {/* Airplane silhouette at (135, 25) */}
    <g transform="translate(130, 16) rotate(15)" fill="#2d5024">
      <path d="M12 2 L14 8 L22 11 L14 13 L13 18 L10 16 L8 19 L7 18 L8 13 L2 11 L8 9 Z" />
    </g>
  </svg>
);

// Mountain sketch decoration for top left of Traveller Stories
export const MountainSketchDecoration = () => (
  <svg
    width="180"
    height="75"
    viewBox="0 0 180 75"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      position: "absolute",
      top: 15,
      left: 30,
      opacity: 0.35,
      pointerEvents: "none",
    }}
    className="stories-mountain-sketch"
  >
    <path d="M10 70 L55 20 L75 42 L110 15 L145 52 L170 70" stroke="#3b6328" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M45 32 L55 20 L62 30" stroke="#3b6328" strokeWidth="1.5" />
    <path d="M100 24 L110 15 L118 26" stroke="#3b6328" strokeWidth="1.5" />
    <path d="M55 20 L58 70 M110 15 L112 70" stroke="#3b6328" strokeWidth="1" strokeDasharray="3 3" />
  </svg>
);

// Footer Bottom Layered Mountains with Hiker (Spanning 100% width)
export const FooterMountainPanorama = () => (
  <div
    style={{
      position: "relative",
      width: "100%",
      height: "120px",
      marginTop: "40px",
      marginBottom: "-1px",
      overflow: "hidden",
      display: "block",
    }}
  >
    <svg
      viewBox="0 0 1440 160"
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "block",
      }}
    >
      {/* Lightest background ridge */}
      <path
        d="M0,160 L0,80 Q240,40 480,75 T960,60 T1440,85 L1440,160 Z"
        fill="#9dbf8c"
        fillOpacity="0.45"
      />
      {/* Medium mountain layer */}
      <path
        d="M0,160 L0,100 Q320,60 640,95 T1200,65 T1440,95 L1440,160 Z"
        fill="#5a854a"
        fillOpacity="0.75"
      />
      {/* Darkest foreground mountain layer */}
      <path
        d="M0,160 L0,118 Q200,90 400,125 T800,95 Q1000,75 1200,60 Q1320,95 1440,110 L1440,160 Z"
        fill="#12381b"
      />

      {/* Pine trees on the left */}
      <path d="M8,160 L14,100 L20,160 Z M18,160 L26,85 L34,160 Z M32,160 L40,105 L48,160 Z" fill="#0d2b15" />
      <path d="M60,160 L68,110 L76,160 Z M72,160 L82,90 L92,160 Z" fill="#0d2b15" />

      {/* Pine trees on the right ridge */}
      <path d="M1360,160 L1368,90 L1376,160 Z M1372,160 L1382,75 L1392,160 Z M1388,160 L1398,95 L1408,160 Z" fill="#0d2b15" />

      {/* Trekker standing on the ridge at x=1220, y=60 */}
      <g transform="translate(1212, 18)" fill="#0d2b15" stroke="#0d2b15">
        <circle cx="8" cy="5" r="3.5" />
        <path d="M5,9 L12,9 L13,22 L5,22 Z" />
        <rect x="1" y="10" width="5" height="10" rx="2" />
        <line x1="7" y1="22" x2="4" y2="38" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="11" y1="22" x2="14" y2="38" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="16" y1="14" x2="20" y2="40" strokeWidth="1.8" strokeLinecap="round" stroke="#0d2b15" />
      </g>
    </svg>
  </div>
);

// Gentle undulating wave transition for Trip Details banner into cream content
export const BannerWaveSeparator = () => (
  <div
    style={{
      position: "absolute",
      bottom: -1,
      left: 0,
      width: "100%",
      height: "75px",
      overflow: "hidden",
      zIndex: 3,
      pointerEvents: "none",
    }}
  >
    <svg
      viewBox="0 0 1440 90"
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "block",
      }}
    >
      <path
        d="M0,45 C280,75 520,15 800,45 C1080,75 1320,25 1440,40 L1440,90 L0,90 Z"
        fill="#c8e4be"
        fillOpacity="0.38"
      />
      <path
        d="M0,55 C360,20 680,70 1020,38 C1240,18 1380,55 1440,60 L1440,90 L0,90 Z"
        fill="#daedd4"
        fillOpacity="0.75"
      />
      <path
        d="M0,68 C320,45 640,82 960,60 C1200,45 1360,72 1440,68 L1440,90 L0,90 Z"
        fill="#faf7f0"
      />
    </svg>
  </div>
);
