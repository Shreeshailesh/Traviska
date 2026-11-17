import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Shield,
  Heart,
  Calendar,
  FileText,
  Info,
  CheckCircle2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Smartphone,
  Tablet,
  ExternalLink,
  Save,
} from "lucide-react";

import { API_BASE_URL } from "../../api";

interface SectionPoint {
  heading: string;
  description: string;
  icon?: string;
}

interface SectionData {
  enabled: boolean;
  items: SectionPoint[];
}

interface GlobalSectionsPayload {
  safetyInformation: SectionData;
  whyChooseUs: SectionData;
  cancellationPolicy: SectionData;
  termsAndConditions: SectionData;
  importantNotes: SectionData;
}

const SECTION_CONFIG = [
  {
    key: "safetyInformation",
    label: "Safety Information",
    subtitle: "Safety guidelines and precautions for travellers",
    icon: Shield,
    color: "#166534",
  },
  {
    key: "whyChooseUs",
    label: "Why Choose Us",
    subtitle: "Our USPs and what makes our trips unique",
    icon: Heart,
    color: "#2563eb",
  },
  {
    key: "cancellationPolicy",
    label: "Cancellation Policy",
    subtitle: "Refund timelines and cancellation terms",
    icon: Calendar,
    color: "#d97706",
  },
  {
    key: "termsAndConditions",
    label: "Terms & Conditions",
    subtitle: "General legal terms applicable to all trips",
    icon: FileText,
    color: "#7c3aed",
  },
  {
    key: "importantNotes",
    label: "Important Notes",
    subtitle: "Travel tips, documentation, and key notes",
    icon: Info,
    color: "#059669",
  },
] as const;

export const DetailedSections: React.FC = () => {
  const [activeSectionKey, setActiveSectionKey] = useState<
    | "safetyInformation"
    | "whyChooseUs"
    | "cancellationPolicy"
    | "termsAndConditions"
    | "importantNotes"
  >("safetyInformation");

  const [previewDevice, setPreviewDevice] = useState<"mobile" | "tablet" | "desktop">("mobile");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>("Just now");

  const [sections, setSections] = useState<GlobalSectionsPayload>({
    safetyInformation: {
      enabled: true,
      items: [
        {
          heading: "Experienced Trip Captains",
          description: "All trips are led by trained, verified, and first-aid certified trip captains.",
        },
        {
          heading: "Verified Stays",
          description: "We partner with safe, sanitised, and trusted accommodations.",
        },
        {
          heading: "First Aid & Medical Support",
          description: "Basic first-aid kit is available on all departures.",
        },
        {
          heading: "Emergency Assistance",
          description: "Our operations team is reachable 24/7 throughout your trip.",
        },
      ],
    },
    whyChooseUs: {
      enabled: true,
      items: [
        {
          heading: "Curated Itineraries",
          description: "Thoughtfully planned routes balancing adventure and relaxation.",
        },
        {
          heading: "Like-Minded Travellers",
          description: "Connect with travellers who share your love for exploration.",
        },
        {
          heading: "No Hidden Costs",
          description: "Clear and upfront pricing with no surprise charges.",
        },
      ],
    },
    cancellationPolicy: {
      enabled: true,
      items: [
        {
          heading: "15+ Days Before Departure",
          description: "90% refund or 100% trip credit voucher.",
        },
        {
          heading: "7 to 14 Days Before Departure",
          description: "50% refund or 75% trip credit voucher.",
        },
        {
          heading: "Less than 7 Days",
          description: "No refund available due to advance bookings.",
        },
      ],
    },
    termsAndConditions: {
      enabled: true,
      items: [
        {
          heading: "Valid Government ID",
          description: "Must carry an original Aadhaar card or Passport during the trip.",
        },
        {
          heading: "Itinerary Changes",
          description: "Subject to weather conditions and local authority regulations.",
        },
      ],
    },
    importantNotes: {
      enabled: true,
      items: [
        {
          heading: "Packing Essentials",
          description: "Carry comfortable walking shoes, power bank, and personal medicines.",
        },
        {
          heading: "Reporting Time",
          description: "Arrive at least 15 minutes before scheduled departure time.",
        },
      ],
    },
  });

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/global-trip-sections`);
        if (data) {
          setSections((prev) => ({
            safetyInformation: data.safetyInformation || prev.safetyInformation,
            whyChooseUs: data.whyChooseUs || prev.whyChooseUs,
            cancellationPolicy: data.cancellationPolicy || prev.cancellationPolicy,
            termsAndConditions: data.termsAndConditions || prev.termsAndConditions,
            importantNotes: data.importantNotes || prev.importantNotes,
          }));
          if (data.updatedAt) {
            setLastSaved(new Date(data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
          }
        }
      } catch (e) {
        console.error("Failed to load global sections:", e);
      }
    };
    fetchSections();
  }, []);

  const activeSection = sections[activeSectionKey];
  const activeMeta = SECTION_CONFIG.find((c) => c.key === activeSectionKey)!;

  const handlePointChange = (
    idx: number,
    field: "heading" | "description",
    value: string
  ) => {
    const updatedItems = [...activeSection.items];
    updatedItems[idx] = { ...updatedItems[idx], [field]: value };
    setSections({
      ...sections,
      [activeSectionKey]: {
        ...activeSection,
        items: updatedItems,
      },
    });
  };

  const handleAddPoint = () => {
    setSections({
      ...sections,
      [activeSectionKey]: {
        ...activeSection,
        items: [
          ...activeSection.items,
          { heading: "New Point Heading", description: "Point description details..." },
        ],
      },
    });
  };

  const handleDeletePoint = (idx: number) => {
    const updated = activeSection.items.filter((_, i) => i !== idx);
    setSections({
      ...sections,
      [activeSectionKey]: {
        ...activeSection,
        items: updated,
      },
    });
  };

  const handleMovePoint = (idx: number, direction: "up" | "down") => {
    const items = [...activeSection.items];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const temp = items[idx];
    items[idx] = items[targetIdx];
    items[targetIdx] = temp;
    setSections({
      ...sections,
      [activeSectionKey]: {
        ...activeSection,
        items,
      },
    });
  };

  const handleSavePublish = async () => {
    setSaving(true);
    const token = localStorage.getItem("token");
    try {
      await axios.put(`${API_BASE_URL}/global-trip-sections`, sections, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      alert("Detailed trip sections published successfully! Changes will appear on customer trip pages.");
    } catch (err: any) {
      console.error("Failed to save sections:", err);
      alert(err.response?.data?.message || "Failed to publish trip sections");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-page-title-box">
          <h1>Detailed Sections</h1>
          <p>
            Manage the key content sections that appear across all trip pages on the customer website.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <a
            href="/trips"
            target="_blank"
            rel="noreferrer"
            className="admin-btn admin-btn-secondary"
            style={{ textDecoration: "none" }}
          >
            <ExternalLink size={15} />
            <span>View on Website</span>
          </a>

          <button
            type="button"
            disabled={saving}
            onClick={handleSavePublish}
            className="admin-btn admin-btn-primary"
          >
            <Save size={15} />
            <span>{saving ? "Publishing..." : "Save & Publish"}</span>
          </button>
        </div>
      </div>

      {/* 3-Column Split: Sections Nav + Editor + Live Preview */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px minmax(360px, 1fr) 340px",
          gap: "20px",
          alignItems: "flex-start",
          width: "100%",
        }}
      >
        {/* COL 1: SECTIONS LIST */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e7ecf0",
            borderRadius: "14px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ padding: "0 8px 8px 8px", borderBottom: "1px solid #f1f5f9" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
              Global Sections
            </h3>
            <span style={{ fontSize: "11.5px", color: "#64748b" }}>
              Edit and manage global trip content.
            </span>
          </div>

          {SECTION_CONFIG.map((cfg) => {
            const IconComponent = cfg.icon;
            const isSelected = activeSectionKey === cfg.key;
            return (
              <button
                key={cfg.key}
                type="button"
                onClick={() => setActiveSectionKey(cfg.key as any)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: isSelected ? "1px solid #bbf7d0" : "1px solid transparent",
                  background: isSelected ? "#eaf5e9" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: isSelected ? "#ffffff" : "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isSelected ? "#166534" : "#64748b",
                    flexShrink: 0,
                  }}
                >
                  <IconComponent size={16} />
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: isSelected ? "#166534" : "#0f172a",
                    }}
                  >
                    {cfg.label}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      marginTop: "2px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cfg.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* COL 2: SECTION EDITOR */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e7ecf0",
            borderRadius: "14px",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          {/* Editor Header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "#eaf5e9",
                  color: "#166534",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <activeMeta.icon size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                  {activeMeta.label}
                </h3>
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  Last updated: {lastSaved}
                </span>
              </div>
            </div>

            <span className="admin-badge active">● Published</span>
          </div>

          {/* Points Editor Body */}
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                Section Points & Details ({activeSection.items.length})
              </span>

              <button
                type="button"
                onClick={handleAddPoint}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 12px",
                  background: "#eaf5e9",
                  color: "#166534",
                  border: "1px solid #bbf7d0",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Plus size={14} />
                <span>Add Point</span>
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {activeSection.items.map((pt, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "14px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    background: "#f8fafc",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <CheckCircle2 size={16} color="#166534" />
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>
                        Point {idx + 1}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <button
                        type="button"
                        onClick={() => handleMovePoint(idx, "up")}
                        disabled={idx === 0}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "4px",
                          padding: "3px 6px",
                          cursor: idx === 0 ? "not-allowed" : "pointer",
                          opacity: idx === 0 ? 0.4 : 1,
                        }}
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMovePoint(idx, "down")}
                        disabled={idx === activeSection.items.length - 1}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "4px",
                          padding: "3px 6px",
                          cursor: idx === activeSection.items.length - 1 ? "not-allowed" : "pointer",
                          opacity: idx === activeSection.items.length - 1 ? 0.4 : 1,
                        }}
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePoint(idx)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          padding: "3px 6px",
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={pt.heading}
                    onChange={(e) => handlePointChange(idx, "heading", e.target.value)}
                    placeholder="Heading / Key point"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: 600,
                      background: "#ffffff",
                    }}
                  />

                  <textarea
                    rows={2}
                    value={pt.description}
                    onChange={(e) => handlePointChange(idx, "description", e.target.value)}
                    placeholder="Detailed explanation..."
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      lineHeight: 1.4,
                      background: "#ffffff",
                    }}
                  />
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "12px",
                borderTop: "1px solid #f1f5f9",
                fontSize: "12px",
                color: "#64748b",
              }}
            >
              <span>Points: {activeSection.items.length}</span>
              <span style={{ color: "#166534", fontWeight: 600 }}>✓ All changes staged</span>
            </div>
          </div>
        </div>

        {/* COL 3: CUSTOMER PREVIEW */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e7ecf0",
            borderRadius: "14px",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            position: "sticky",
            top: "88px",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #e2e8f0",
              background: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#166534" }}>
              ✓ Customer Preview
            </span>

            <div style={{ display: "flex", gap: "4px" }}>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                style={{
                  padding: "4px 6px",
                  border: "none",
                  borderRadius: "4px",
                  background: previewDevice === "mobile" ? "#166534" : "#e2e8f0",
                  color: previewDevice === "mobile" ? "#ffffff" : "#64748b",
                  cursor: "pointer",
                }}
              >
                <Smartphone size={13} />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("tablet")}
                style={{
                  padding: "4px 6px",
                  border: "none",
                  borderRadius: "4px",
                  background: previewDevice === "tablet" ? "#166534" : "#e2e8f0",
                  color: previewDevice === "tablet" ? "#ffffff" : "#64748b",
                  cursor: "pointer",
                }}
              >
                <Tablet size={13} />
              </button>
            </div>
          </div>

          {/* Mobile Shell Mock */}
          <div style={{ padding: "16px", background: "#f1f5f9" }}>
            <div
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                border: "1px solid #cbd5e1",
                overflow: "hidden",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              {/* Header Image */}
              <div style={{ position: "relative", height: "100px", background: "#0d2b17" }}>
                <img
                  src="https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?w=400"
                  alt="Mountain Header"
                  style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: "10px",
                    left: "14px",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  {activeMeta.label}
                </div>
              </div>

              {/* Points */}
              <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>
                  {activeMeta.subtitle}
                </p>

                {activeSection.items.map((pt, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <CheckCircle2 size={14} color="#166534" style={{ marginTop: "2px", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0f172a" }}>
                        {pt.heading}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", lineHeight: 1.3 }}>
                        {pt.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedSections;
