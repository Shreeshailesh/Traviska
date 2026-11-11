import type { ReactNode } from "react";
import {
  ShieldCheck,
  HeartHandshake,
  CalendarX,
  FileText,
  AlertCircle,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
} from "lucide-react";
import DynamicLucideIcon, { AVAILABLE_SECTION_ICONS } from "./DynamicLucideIcon";

export interface SectionPoint {
  heading: string;
  description: string;
  icon?: string;
}

export interface TripSectionData {
  enabled: boolean;
  items: SectionPoint[];
}

export interface TripSectionsState {
  safetyInformation: TripSectionData;
  whyChooseUs: TripSectionData;
  cancellationPolicy: TripSectionData;
  termsAndConditions: TripSectionData;
  importantNotes: TripSectionData;
}

export const createDefaultSections = (): TripSectionsState => ({
  safetyInformation: { enabled: true, items: [] },
  whyChooseUs: { enabled: true, items: [] },
  cancellationPolicy: { enabled: true, items: [] },
  termsAndConditions: { enabled: true, items: [] },
  importantNotes: { enabled: true, items: [] },
});

export const normalizeSections = (data: any): TripSectionsState => {
  const defaults = createDefaultSections();
  if (!data) return defaults;

  const normalizeOne = (sec: any): TripSectionData => {
    if (!sec) return { enabled: true, items: [] };
    return {
      enabled: typeof sec.enabled === "boolean" ? sec.enabled : true,
      items: Array.isArray(sec.items)
        ? sec.items.map((it: any) => ({
            heading: String(it?.heading || ""),
            description: String(it?.description || ""),
            icon: String(it?.icon || ""),
          }))
        : [],
    };
  };

  return {
    safetyInformation: normalizeOne(data.safetyInformation),
    whyChooseUs: normalizeOne(data.whyChooseUs),
    cancellationPolicy: normalizeOne(data.cancellationPolicy),
    termsAndConditions: normalizeOne(data.termsAndConditions),
    importantNotes: normalizeOne(data.importantNotes),
  };
};

const SECTION_CONFIGS: Array<{
  key: keyof TripSectionsState;
  title: string;
  subtitle: string;
  defaultIcon: string;
  headerIcon: ReactNode;
  accentColor: string;
  headerBg: string;
}> = [
  {
    key: "safetyInformation",
    title: "1. Safety Information",
    subtitle: "Safety guidelines, protocols, and precautions for travelers",
    defaultIcon: "ShieldCheck",
    headerIcon: <ShieldCheck size={20} color="#16a34a" />,
    accentColor: "#16a34a",
    headerBg: "#f0fdf4",
  },
  {
    key: "whyChooseUs",
    title: "2. Why Choose Us",
    subtitle: "Key USPs, captains, community, and curated experiences",
    defaultIcon: "Award",
    headerIcon: <HeartHandshake size={20} color="#d97706" />,
    accentColor: "#d97706",
    headerBg: "#fffbeb",
  },
  {
    key: "cancellationPolicy",
    title: "3. Cancellation Policy",
    subtitle: "Refund timelines, cancellation rules, and terms",
    defaultIcon: "CalendarX",
    headerIcon: <CalendarX size={20} color="#e11d48" />,
    accentColor: "#e11d48",
    headerBg: "#fff1f2",
  },
  {
    key: "termsAndConditions",
    title: "4. Terms & Conditions",
    subtitle: "Booking rules, ID requirements, and participant guidelines",
    defaultIcon: "FileText",
    headerIcon: <FileText size={20} color="#0284c7" />,
    accentColor: "#0284c7",
    headerBg: "#f0f9ff",
  },
  {
    key: "importantNotes",
    title: "5. Important Notes",
    subtitle: "Packing tips, terrain fitness, eco guidelines, and essentials",
    defaultIcon: "Info",
    headerIcon: <AlertCircle size={20} color="#9333ea" />,
    accentColor: "#9333ea",
    headerBg: "#faf5ff",
  },
];

interface AdminTripSectionsEditorProps {
  value: TripSectionsState;
  onChange: (updated: TripSectionsState) => void;
}

export default function AdminTripSectionsEditor({
  value,
  onChange,
}: AdminTripSectionsEditorProps) {
  const currentSections = value || createDefaultSections();

  const handleToggleSection = (sectionKey: keyof TripSectionsState) => {
    const sec = currentSections[sectionKey] || { enabled: true, items: [] };
    onChange({
      ...currentSections,
      [sectionKey]: {
        ...sec,
        enabled: !sec.enabled,
      },
    });
  };

  const handleAddPoint = (sectionKey: keyof TripSectionsState, defaultIcon: string) => {
    const sec = currentSections[sectionKey] || { enabled: true, items: [] };
    const newPoint: SectionPoint = {
      heading: "",
      description: "",
      icon: defaultIcon,
    };
    onChange({
      ...currentSections,
      [sectionKey]: {
        ...sec,
        items: [...sec.items, newPoint],
      },
    });
  };

  const handleUpdatePoint = (
    sectionKey: keyof TripSectionsState,
    index: number,
    field: keyof SectionPoint,
    val: string
  ) => {
    const sec = currentSections[sectionKey] || { enabled: true, items: [] };
    const updatedItems = [...sec.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: val,
    };
    onChange({
      ...currentSections,
      [sectionKey]: {
        ...sec,
        items: updatedItems,
      },
    });
  };

  const handleDeletePoint = (sectionKey: keyof TripSectionsState, index: number) => {
    const sec = currentSections[sectionKey] || { enabled: true, items: [] };
    const updatedItems = sec.items.filter((_, i) => i !== index);
    onChange({
      ...currentSections,
      [sectionKey]: {
        ...sec,
        items: updatedItems,
      },
    });
  };

  const handleMovePoint = (
    sectionKey: keyof TripSectionsState,
    fromIndex: number,
    toIndex: number
  ) => {
    const sec = currentSections[sectionKey] || { enabled: true, items: [] };
    if (toIndex < 0 || toIndex >= sec.items.length) return;
    const updatedItems = [...sec.items];
    const [movedItem] = updatedItems.splice(fromIndex, 1);
    updatedItems.splice(toIndex, 0, movedItem);
    onChange({
      ...currentSections,
      [sectionKey]: {
        ...sec,
        items: updatedItems,
      },
    });
  };

  return (
    <div style={{ marginTop: "30px", marginBottom: "30px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#111827", margin: "0 0 6px" }}>
          Detailed Trip Sections
        </h3>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
          Manage structured pastel feature cards for Safety, Why Choose Us, Policies, Terms, and Notes.
          Each section can be enabled/disabled and individual points can be reordered.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {SECTION_CONFIGS.map((cfg) => {
          const sectionData = currentSections[cfg.key] || { enabled: true, items: [] };
          const isEnabled = sectionData.enabled;
          const items = sectionData.items || [];

          return (
            <div
              key={cfg.key}
              style={{
                border: `1px solid ${isEnabled ? "#e5e7eb" : "#f3f4f6"}`,
                borderRadius: "14px",
                overflow: "hidden",
                background: isEnabled ? "#ffffff" : "#f9fafb",
                boxShadow: isEnabled ? "0 4px 14px rgba(0,0,0,0.03)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              {/* SECTION HEADER & TOGGLE */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  background: isEnabled ? cfg.headerBg : "#f3f4f6",
                  borderBottom: `1px solid ${isEnabled ? "#e5e7eb" : "#e5e7eb"}`,
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                    }}
                  >
                    {cfg.headerIcon}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#1f2937" }}>
                      {cfg.title}
                    </h4>
                    <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#6b7280" }}>
                      {cfg.subtitle} • <strong>{items.length} point{items.length === 1 ? "" : "s"}</strong>
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => handleToggleSection(cfg.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      background: isEnabled ? "#ffffff" : "#e5e7eb",
                      color: isEnabled ? "#1f2937" : "#6b7280",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    }}
                  >
                    {isEnabled ? (
                      <>
                        <Eye size={16} color="#16a34a" /> Enabled
                      </>
                    ) : (
                      <>
                        <EyeOff size={16} color="#9ca3af" /> Hidden
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddPoint(cfg.key, cfg.defaultIcon)}
                    disabled={!isEnabled}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      border: "none",
                      background: isEnabled ? cfg.accentColor : "#d1d5db",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: isEnabled ? "pointer" : "not-allowed",
                      boxShadow: isEnabled ? "0 2px 6px rgba(0,0,0,0.12)" : "none",
                    }}
                  >
                    <Plus size={16} /> Add Point
                  </button>
                </div>
              </div>

              {/* POINTS LIST */}
              {isEnabled && (
                <div style={{ padding: "18px 20px" }}>
                  {items.length === 0 ? (
                    <div
                      style={{
                        padding: "24px",
                        textAlign: "center",
                        border: "1px dashed #d1d5db",
                        borderRadius: "10px",
                        background: "#fafafa",
                      }}
                    >
                      <p style={{ margin: "0 0 10px", fontSize: "14px", color: "#6b7280" }}>
                        No points added to this section yet.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleAddPoint(cfg.key, cfg.defaultIcon)}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #d1d5db",
                          borderRadius: "8px",
                          padding: "6px 14px",
                          fontSize: "13px",
                          fontWeight: "600",
                          color: cfg.accentColor,
                          cursor: "pointer",
                        }}
                      >
                        + Add First Point
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {items.map((pt, idx) => (
                        <div
                          key={idx}
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: "10px",
                            padding: "16px",
                            background: "#fafafa",
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                          }}
                        >
                          {/* Point Action Bar */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              borderBottom: "1px solid #eeeeee",
                              paddingBottom: "10px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span
                                style={{
                                  background: "#e5e7eb",
                                  color: "#374151",
                                  fontWeight: "700",
                                  fontSize: "12px",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                }}
                              >
                                #{idx + 1}
                              </span>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  color: cfg.accentColor,
                                  fontSize: "13px",
                                  fontWeight: "600",
                                }}
                              >
                                <DynamicLucideIcon name={pt.icon} size={18} color={cfg.accentColor} />
                                <span>{pt.icon || "Default Icon"}</span>
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <button
                                type="button"
                                title="Move Up"
                                disabled={idx === 0}
                                onClick={() => handleMovePoint(cfg.key, idx, idx - 1)}
                                style={{
                                  background: "#ffffff",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "6px",
                                  padding: "5px 8px",
                                  cursor: idx === 0 ? "not-allowed" : "pointer",
                                  opacity: idx === 0 ? 0.4 : 1,
                                }}
                              >
                                <ArrowUp size={14} color="#374151" />
                              </button>
                              <button
                                type="button"
                                title="Move Down"
                                disabled={idx === items.length - 1}
                                onClick={() => handleMovePoint(cfg.key, idx, idx + 1)}
                                style={{
                                  background: "#ffffff",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "6px",
                                  padding: "5px 8px",
                                  cursor: idx === items.length - 1 ? "not-allowed" : "pointer",
                                  opacity: idx === items.length - 1 ? 0.4 : 1,
                                }}
                              >
                                <ArrowDown size={14} color="#374151" />
                              </button>
                              <button
                                type="button"
                                title="Delete Point"
                                onClick={() => handleDeletePoint(cfg.key, idx)}
                                style={{
                                  background: "#fee2e2",
                                  border: "1px solid #fca5a5",
                                  borderRadius: "6px",
                                  padding: "5px 8px",
                                  cursor: "pointer",
                                }}
                              >
                                <Trash2 size={14} color="#dc2626" />
                              </button>
                            </div>
                          </div>

                          {/* Point Heading & Icon Selection */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 220px",
                              gap: "12px",
                            }}
                          >
                            <div>
                              <label
                                style={{
                                  display: "block",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: "#374151",
                                  marginBottom: "4px",
                                }}
                              >
                                Heading *
                              </label>
                              <input
                                type="text"
                                value={pt.heading}
                                onChange={(e) =>
                                  handleUpdatePoint(cfg.key, idx, "heading", e.target.value)
                                }
                                placeholder="e.g. Certified Mountain Guides"
                                style={{
                                  width: "100%",
                                  padding: "10px 12px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "8px",
                                  fontSize: "14px",
                                  boxSizing: "border-box",
                                  background: "#ffffff",
                                }}
                              />
                            </div>

                            <div>
                              <label
                                style={{
                                  display: "block",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: "#374151",
                                  marginBottom: "4px",
                                }}
                              >
                                Lucide Icon
                              </label>
                              <select
                                value={pt.icon || cfg.defaultIcon}
                                onChange={(e) =>
                                  handleUpdatePoint(cfg.key, idx, "icon", e.target.value)
                                }
                                style={{
                                  width: "100%",
                                  padding: "10px 12px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "8px",
                                  fontSize: "13px",
                                  boxSizing: "border-box",
                                  background: "#ffffff",
                                  color: "#1f2937",
                                }}
                              >
                                {AVAILABLE_SECTION_ICONS.map((opt) => (
                                  <option key={opt.name} value={opt.name}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Point Description */}
                          <div>
                            <label
                              style={{
                                display: "block",
                                fontSize: "12px",
                                fontWeight: "600",
                                color: "#374151",
                                marginBottom: "4px",
                              }}
                            >
                              Description *
                            </label>
                            <textarea
                              rows={3}
                              value={pt.description}
                              onChange={(e) =>
                                handleUpdatePoint(cfg.key, idx, "description", e.target.value)
                              }
                              placeholder="Provide detailed information or explanation for travelers..."
                              style={{
                                width: "100%",
                                padding: "10px 12px",
                                border: "1px solid #d1d5db",
                                borderRadius: "8px",
                                fontSize: "14px",
                                boxSizing: "border-box",
                                resize: "vertical",
                                background: "#ffffff",
                                fontFamily: "inherit",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
