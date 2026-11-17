// Curated Traveller & Adventure Avatar Presets
// Crisp, lightweight vector SVGs encoded as data URIs that work offline and scale smoothly.

export interface AvatarPreset {
  id: string;
  name: string;
  category: string;
  url: string;
}

const encodeSvg = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: "minimal-traveller",
    name: "Classic Traveller",
    category: "Classic",
    url: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="g-min" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#1b4332"/>
            <stop offset="100%" stop-color="#081c15"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#g-min)"/>
        <circle cx="50" cy="50" r="45" fill="none" stroke="#52b788" stroke-width="1.5" opacity="0.5"/>
        <circle cx="50" cy="38" r="14" fill="#d8f3dc"/>
        <path d="M22 80 C22 64 34 58 50 58 C66 58 78 64 78 80 Z" fill="#d8f3dc"/>
      </svg>
    `.trim()),
  },
  {
    id: "hiker-sunrise",
    name: "Sunrise Trekker",
    category: "Mountain",
    url: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="g-sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ea580c"/>
            <stop offset="45%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#fef3c7"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#g-sun)"/>
        <circle cx="36" cy="42" r="13" fill="#ffffff" opacity="0.9"/>
        <polygon points="0,100 0,65 30,48 55,68 80,45 100,60 100,100" fill="#78350f" opacity="0.4"/>
        <polygon points="0,100 0,76 25,60 50,78 75,55 100,72 100,100" fill="#14532d"/>
        <circle cx="68" cy="48" r="4.5" fill="#0f172a"/>
        <path d="M64 54 C64 52 66 50 69 50 C72 50 74 52 74 54 L76 68 L62 68 Z" fill="#0f172a"/>
        <rect x="58" y="53" width="6" height="11" rx="2" fill="#334155"/>
      </svg>
    `.trim()),
  },
  {
    id: "alpine-summit",
    name: "Alpine Summit",
    category: "Mountain",
    url: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="g-alp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0284c7"/>
            <stop offset="60%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#bae6fd"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#g-alp)"/>
        <polygon points="50,15 15,90 85,90" fill="#334155"/>
        <polygon points="50,15 50,90 85,90" fill="#1e293b"/>
        <polygon points="50,15 36,45 44,40 50,47 57,40 64,45" fill="#f8fafc"/>
        <polygon points="50,15 50,47 57,40 64,45" fill="#e2e8f0"/>
        <polygon points="20,95 24,80 28,95" fill="#064e3b"/>
        <polygon points="72,95 76,82 80,95" fill="#064e3b"/>
        <polygon points="28,100 33,85 38,100" fill="#047857"/>
        <polygon points="63,100 68,84 73,100" fill="#047857"/>
      </svg>
    `.trim()),
  },
  {
    id: "evergreen-forest",
    name: "Evergreen Forest",
    category: "Nature",
    url: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="g-for" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#064e3b"/>
            <stop offset="100%" stop-color="#10b981"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#g-for)"/>
        <circle cx="72" cy="28" r="9" fill="#fef08a" opacity="0.85"/>
        <path d="M0 60 Q 30 50 60 62 T 100 58 L 100 100 L 0 100 Z" fill="#065f46" opacity="0.7"/>
        <polygon points="18,85 24,55 30,85" fill="#022c22"/>
        <polygon points="70,85 76,55 82,85" fill="#022c22"/>
        <polygon points="40,95 50,48 60,95" fill="#064e3b"/>
        <polygon points="32,100 42,60 52,100" fill="#047857"/>
        <polygon points="58,100 68,62 78,100" fill="#047857"/>
      </svg>
    `.trim()),
  },
  {
    id: "campfire-stars",
    name: "Campfire Nomad",
    category: "Camp",
    url: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="g-camp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#1e1b4b"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#g-camp)"/>
        <circle cx="20" cy="22" r="1.2" fill="#ffffff"/>
        <circle cx="36" cy="16" r="1.5" fill="#ffffff"/>
        <circle cx="75" cy="18" r="1.2" fill="#ffffff"/>
        <circle cx="85" cy="30" r="1" fill="#ffffff"/>
        <circle cx="15" cy="42" r="1" fill="#ffffff"/>
        <path d="M76 22 A 7 7 0 0 0 84 31 A 8 8 0 0 1 76 22 Z" fill="#fef3c7"/>
        <ellipse cx="50" cy="92" rx="48" ry="16" fill="#090d16"/>
        <polygon points="32,88 20,60 44,60" fill="#ea580c"/>
        <polygon points="44,60 32,88 56,88" fill="#c2410c"/>
        <polygon points="32,88 38,72 44,88" fill="#1e293b"/>
        <polygon points="68,88 74,70 80,88" fill="#f59e0b"/>
        <polygon points="71,88 74,74 77,88" fill="#ef4444"/>
        <line x1="66" y1="88" x2="82" y2="84" stroke="#78350f" stroke-width="2"/>
        <line x1="66" y1="84" x2="82" y2="88" stroke="#78350f" stroke-width="2"/>
      </svg>
    `.trim()),
  },
  {
    id: "compass-navigator",
    name: "Compass Voyager",
    category: "Classic",
    url: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="g-comp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#14532d"/>
            <stop offset="100%" stop-color="#052e16"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#g-comp)"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#86efac" stroke-width="2"/>
        <circle cx="50" cy="50" r="34" fill="none" stroke="#4ade80" stroke-width="1" stroke-dasharray="2 3"/>
        <polygon points="50,18 54,46 50,50" fill="#ef4444"/>
        <polygon points="50,18 46,46 50,50" fill="#f87171"/>
        <polygon points="50,82 54,54 50,50" fill="#cbd5e1"/>
        <polygon points="50,82 46,54 50,50" fill="#94a3b8"/>
        <polygon points="18,50 46,54 50,50" fill="#94a3b8"/>
        <polygon points="82,50 54,54 50,50" fill="#cbd5e1"/>
        <circle cx="50" cy="50" r="4" fill="#ffffff"/>
        <circle cx="50" cy="50" r="2" fill="#0f172a"/>
      </svg>
    `.trim()),
  },
  {
    id: "desert-nomad",
    name: "Desert Nomad",
    category: "Desert",
    url: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="g-des" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fb923c"/>
            <stop offset="60%" stop-color="#fdba74"/>
            <stop offset="100%" stop-color="#fed7aa"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#g-des)"/>
        <circle cx="50" cy="38" r="16" fill="#fff7ed"/>
        <path d="M0 65 Q 40 50 70 70 T 100 62 L 100 100 L 0 100 Z" fill="#ea580c"/>
        <path d="M0 78 Q 30 65 65 80 T 100 74 L 100 100 L 0 100 Z" fill="#c2410c"/>
        <path d="M0 88 Q 50 75 80 90 T 100 85 L 100 100 L 0 100 Z" fill="#9a3412"/>
      </svg>
    `.trim()),
  },
  {
    id: "coastal-voyage",
    name: "Coastal Voyager",
    category: "Ocean",
    url: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="g-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0284c7"/>
            <stop offset="60%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#e0f2fe"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#g-sea)"/>
        <circle cx="28" cy="40" r="10" fill="#fef08a"/>
        <path d="M0 65 C 20 60, 30 70, 50 65 C 70 60, 80 70, 100 65 L 100 100 L 0 100 Z" fill="#0369a1"/>
        <path d="M0 76 C 25 70, 35 82, 60 76 C 80 72, 90 80, 100 76 L 100 100 L 0 100 Z" fill="#075985"/>
        <path d="M0 86 C 20 82, 40 92, 70 86 C 85 82, 95 90, 100 86 L 100 100 L 0 100 Z" fill="#0c4a6e"/>
        <polygon points="75,55 75,42 85,55" fill="#ffffff"/>
        <line x1="75" y1="40" x2="75" y2="58" stroke="#1e293b" stroke-width="1.5"/>
        <polygon points="70,58 80,58 78,61 72,61" fill="#78350f"/>
      </svg>
    `.trim()),
  },
];

