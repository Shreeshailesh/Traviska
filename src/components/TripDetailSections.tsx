import DynamicLucideIcon from "./DynamicLucideIcon";
import type { TripSectionData } from "./AdminTripSectionsEditor";

interface TripDetailSectionsProps {
  safetyInformation?: TripSectionData;
  whyChooseUs?: TripSectionData;
  cancellationPolicy?: TripSectionData;
  termsAndConditions?: TripSectionData;
  importantNotes?: TripSectionData;
}

interface SectionTheme {
  title: string;
  subtitle: string;
  bgPastel: string;
  borderColor: string;
  hoverBorder: string;
  badgeBg: string;
  iconColor: string;
  titleColor: string;
  defaultIcon: string;
}

const SECTION_THEMES: Record<string, SectionTheme> = {
  safetyInformation: {
    title: "Safety Information",
    subtitle: "Your safety, health, and well-being remain our topmost priority throughout the expedition.",
    bgPastel: "#f0fdf4",
    borderColor: "#bbf7d0",
    hoverBorder: "#86efac",
    badgeBg: "#dcfce7",
    iconColor: "#15803d",
    titleColor: "#166534",
    defaultIcon: "ShieldCheck",
  },
  whyChooseUs: {
    title: "Why Choose Us",
    subtitle: "What sets Traviska adventures apart from ordinary travel.",
    bgPastel: "#fffbeb",
    borderColor: "#fde68a",
    hoverBorder: "#fcd34d",
    badgeBg: "#fef3c7",
    iconColor: "#b45309",
    titleColor: "#92400e",
    defaultIcon: "Award",
  },
  cancellationPolicy: {
    title: "Cancellation Policy",
    subtitle: "Clear, transparent rules and refund timelines for your reservation.",
    bgPastel: "#fff1f2",
    borderColor: "#fecdd3",
    hoverBorder: "#fda4af",
    badgeBg: "#ffe4e6",
    iconColor: "#be123c",
    titleColor: "#9f1239",
    defaultIcon: "CalendarX",
  },
  termsAndConditions: {
    title: "Terms & Conditions",
    subtitle: "Essential guidelines, ID requirements, and participant agreements.",
    bgPastel: "#f0f9ff",
    borderColor: "#bae6fd",
    hoverBorder: "#7dd3fc",
    badgeBg: "#e0f2fe",
    iconColor: "#0369a1",
    titleColor: "#075985",
    defaultIcon: "FileText",
  },
  importantNotes: {
    title: "Important Notes",
    subtitle: "Packing essentials, terrain expectations, and eco-friendly practices.",
    bgPastel: "#faf5ff",
    borderColor: "#e9d5ff",
    hoverBorder: "#d8b4fe",
    badgeBg: "#f3e8ff",
    iconColor: "#7e22ce",
    titleColor: "#6b21a8",
    defaultIcon: "Info",
  },
};

export default function TripDetailSections({
  safetyInformation,
  whyChooseUs,
  cancellationPolicy,
  termsAndConditions,
  importantNotes,
}: TripDetailSectionsProps) {
  const sectionsToRender: Array<{
    key: string;
    data: TripSectionData;
    theme: SectionTheme;
  }> = [];

  const checkAndAdd = (key: string, data?: TripSectionData) => {
    if (
      data &&
      data.enabled &&
      Array.isArray(data.items) &&
      data.items.some((it) => it.heading?.trim() || it.description?.trim())
    ) {
      sectionsToRender.push({
        key,
        data,
        theme: SECTION_THEMES[key],
      });
    }
  };

  checkAndAdd("safetyInformation", safetyInformation);
  checkAndAdd("whyChooseUs", whyChooseUs);
  checkAndAdd("cancellationPolicy", cancellationPolicy);
  checkAndAdd("termsAndConditions", termsAndConditions);
  checkAndAdd("importantNotes", importantNotes);

  if (sectionsToRender.length === 0) {
    return null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "36px", marginTop: "40px" }}>
      {sectionsToRender.map(({ key, data, theme }) => {
        const validItems = data.items.filter(
          (it) => it.heading?.trim() || it.description?.trim()
        );

        return (
          <section
            key={key}
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "28px 24px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 18px rgba(0,0,0,0.03)",
            }}
          >
            {/* Section Header */}
            <div style={{ marginBottom: "22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: theme.badgeBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <DynamicLucideIcon
                    name={theme.defaultIcon}
                    size={20}
                    color={theme.iconColor}
                  />
                </div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "clamp(20px, 3.5vw, 24px)",
                    fontWeight: "700",
                    color: "#111827",
                  }}
                >
                  {theme.title}
                </h2>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  color: "#6b7280",
                  lineHeight: "1.5",
                }}
              >
                {theme.subtitle}
              </p>
            </div>

            {/* Pastel Feature Cards Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "18px",
              }}
            >
              {validItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: theme.bgPastel,
                    border: `1px solid ${theme.borderColor}`,
                    borderRadius: "14px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "10px",
                        background: "#ffffff",
                        border: `1px solid ${theme.borderColor}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: "0 2px 5px rgba(0,0,0,0.04)",
                      }}
                    >
                      <DynamicLucideIcon
                        name={item.icon || theme.defaultIcon}
                        size={22}
                        color={theme.iconColor}
                      />
                    </div>
                    {item.heading && (
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "16px",
                          fontWeight: "700",
                          color: "#1f2937",
                          lineHeight: "1.3",
                        }}
                      >
                        {item.heading}
                      </h3>
                    )}
                  </div>

                  {item.description && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        lineHeight: "1.6",
                        color: "#4b5563",
                        whiteSpace: "pre-line",
                      }}
                    >
                      {item.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
