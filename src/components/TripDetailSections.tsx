import { useState } from "react";
import {
  CalendarX,
  FileText,
  ShieldAlert,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Shield,
} from "lucide-react";
import { TitleBrush } from "./HomeIllustrations";
import type { TripSectionData } from "./AdminTripSectionsEditor";

interface TripDetailSectionsProps {
  safetyInformation?: TripSectionData;
  whyChooseUs?: TripSectionData;
  cancellationPolicy?: TripSectionData;
  termsAndConditions?: TripSectionData;
  importantNotes?: TripSectionData;
}

// Default policy data matching Image 1 exactly
const DEFAULT_POLICIES = {
  cancellationPolicy: {
    title: "Cancellation Policy",
    subtitle: "Clear, transparent rules and refund timelines for your reservation.",
    iconColor: "#1e7e34",
    iconBg: "#eaf6e5",
    waveFill: "#90c684",
    items: [
      "Free cancellation up to 7 days before the trip – full refund.",
      "Cancellations 3–7 days before the trip – 50% refund.",
      "Cancellations within 3 days – no refund.",
      "In case of trip cancellation by Traviska (weather or other unavoidable reasons), a full refund or reschedule will be offered.",
    ],
  },
  termsAndConditions: {
    title: "Terms & Conditions",
    subtitle: "Essential guidelines, ID requirements, and participant agreements.",
    iconColor: "#0284c7",
    iconBg: "#e5f2fa",
    waveFill: "#93c5fd",
    items: [
      "All travellers must carry a valid government-issued ID.",
      "Participants are expected to follow the trip itinerary and instructions by the trip lead.",
      "Traviska reserves the right to modify the itinerary due to weather, safety, or unforeseen events.",
      "Misconduct or unsafe behavior may lead to removal from the trip without a refund.",
    ],
  },
  safetyInformation: {
    title: "Safety Information",
    subtitle: "Your safety, health, and well-being remain our topmost priority throughout the expedition.",
    iconColor: "#d97706",
    iconBg: "#fef3e2",
    waveFill: "#fcd34d",
    items: [
      "Experienced trip leaders and a support team will accompany every expedition.",
      "Basic first-aid support will be available throughout the trip.",
      "Please inform us in advance about any medical conditions or special requirements.",
      "Follow safety guidelines during activities like trekking, hiking, or camping.",
    ],
  },
};

export default function TripDetailSections({
  safetyInformation,
  cancellationPolicy,
  termsAndConditions,
}: TripDetailSectionsProps) {
  // All 3 accordions open by default as in Image 1
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    cancellationPolicy: true,
    termsAndConditions: true,
    safetyInformation: true,
  });

  const toggleSection = (key: string) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Helper to extract items either from custom admin data or fall back to default
  const getSectionPoints = (
    customData?: TripSectionData,
    defaultList: string[] = []
  ): string[] => {
    if (
      customData &&
      Array.isArray(customData.items) &&
      customData.items.length > 0
    ) {
      const valid = customData.items
        .map((it) => {
          if (it.heading && it.description) {
            return `${it.heading}: ${it.description}`;
          }
          return it.heading || it.description || "";
        })
        .filter((s) => s.trim().length > 0);

      if (valid.length > 0) return valid;
    }
    return defaultList;
  };

  const sections = [
    {
      key: "cancellationPolicy",
      meta: DEFAULT_POLICIES.cancellationPolicy,
      icon: <CalendarX size={22} color="#1e7e34" />,
      points: getSectionPoints(
        cancellationPolicy,
        DEFAULT_POLICIES.cancellationPolicy.items
      ),
    },
    {
      key: "termsAndConditions",
      meta: DEFAULT_POLICIES.termsAndConditions,
      icon: <FileText size={22} color="#0284c7" />,
      points: getSectionPoints(
        termsAndConditions,
        DEFAULT_POLICIES.termsAndConditions.items
      ),
    },
    {
      key: "safetyInformation",
      meta: DEFAULT_POLICIES.safetyInformation,
      icon: <ShieldAlert size={22} color="#d97706" />,
      points: getSectionPoints(
        safetyInformation,
        DEFAULT_POLICIES.safetyInformation.items
      ),
    },
  ];

  return (
    <section className="travel-policies-section">
      {/* SECTION HEADER */}
      <div className="travel-policies-header">
        <div className="policies-badge">
          <Shield size={14} className="policies-badge-icon" />
          <span>Policies &amp; Information</span>
        </div>

        <h2 className="policies-title">Travel Policies &amp; Guidelines</h2>
        <TitleBrush />
        <p className="policies-subtitle">
          Everything you need to know for a safe, smooth, and enjoyable journey with Traviska.
        </p>
      </div>

      {/* ACCORDION CARDS LIST */}
      <div className="policies-cards-stack">
        {sections.map(({ key, meta, icon, points }) => {
          const isOpen = expanded[key] ?? true;

          return (
            <div key={key} className="policy-accordion-card">
              {/* ACCORDION HEADER */}
              <div
                className="policy-card-top"
                onClick={() => toggleSection(key)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    toggleSection(key);
                  }
                }}
              >
                {/* Colored icon box */}
                <div
                  className="policy-icon-box"
                  style={{ backgroundColor: meta.iconBg }}
                >
                  {icon}
                </div>

                {/* Title & Subtitle */}
                <div className="policy-card-text">
                  <h3 className="policy-card-title">{meta.title}</h3>
                  <p className="policy-card-subtitle">{meta.subtitle}</p>
                </div>

                {/* Right toggle button */}
                <button
                  type="button"
                  className="policy-toggle-btn"
                  aria-label={isOpen ? "Collapse section" : "Expand section"}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSection(key);
                  }}
                >
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {/* Subtle mountain / wave backdrop silhouette */}
                <svg
                  className="policy-card-wave"
                  viewBox="0 0 500 50"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0,50 Q120,20 250,38 T500,20 L500,50 Z"
                    fill={meta.waveFill}
                    fillOpacity="0.18"
                  />
                  <path
                    d="M0,50 Q180,30 350,15 T500,35 L500,50 Z"
                    fill={meta.waveFill}
                    fillOpacity="0.25"
                  />
                </svg>
              </div>

              {/* ACCORDION BODY (BULLET POINTS) */}
              {isOpen && (
                <div className="policy-card-body">
                  <div className="policy-card-divider" />
                  <ul className="policy-points-list">
                    {points.map((pt, idx) => (
                      <li key={idx} className="policy-point-item">
                        <CheckCircle2
                          size={18}
                          className="policy-check-icon"
                          fill="#16a34a"
                          color="#ffffff"
                        />
                        <span className="policy-point-text">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
