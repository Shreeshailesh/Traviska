import type { CSSProperties } from "react";
import * as Icons from "lucide-react";
import { Info } from "lucide-react";

export interface IconOption {
  name: string;
  label: string;
}

export const AVAILABLE_SECTION_ICONS: IconOption[] = [
  // Safety
  { name: "ShieldCheck", label: "Shield Check (Safety)" },
  { name: "HeartPulse", label: "Heart Pulse (Health)" },
  { name: "AlertTriangle", label: "Alert Triangle" },
  { name: "LifeBuoy", label: "Life Buoy (Support)" },
  
  // Why Choose Us
  { name: "Award", label: "Award (Quality)" },
  { name: "HeartHandshake", label: "Handshake (Trust)" },
  { name: "Users", label: "Users (Community)" },
  { name: "Compass", label: "Compass (Guidance)" },
  { name: "Sparkles", label: "Sparkles (Experience)" },
  { name: "Star", label: "Star (Excellence)" },

  // Cancellation Policy
  { name: "CalendarX", label: "Calendar X (Cancel)" },
  { name: "RefreshCw", label: "Refresh (Refund)" },
  { name: "Clock", label: "Clock (Timeline)" },
  { name: "Ban", label: "Ban (Restrictions)" },
  { name: "CreditCard", label: "Credit Card (Payment)" },

  // Terms & Conditions
  { name: "FileText", label: "File Text (Document)" },
  { name: "FileCheck", label: "File Check (Agreement)" },
  { name: "Scale", label: "Scale (Legal)" },
  { name: "AlertCircle", label: "Alert Circle" },

  // Important Notes
  { name: "Info", label: "Info (Notice)" },
  { name: "Backpack", label: "Backpack (Gear)" },
  { name: "Footprints", label: "Footprints (Trek)" },
  { name: "Sun", label: "Sun (Weather)" },
  { name: "Flame", label: "Flame (Campfire)" },
  { name: "Trash2", label: "Trash (Eco-friendly)" },
  { name: "PhoneCall", label: "Phone (Emergency)" },
  { name: "HelpCircle", label: "Help Circle" },
];

interface DynamicLucideIconProps {
  name?: string;
  size?: number | string;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

export default function DynamicLucideIcon({
  name,
  size = 20,
  color,
  className,
  style,
}: DynamicLucideIconProps) {
  if (!name) {
    return <Info size={size} color={color} className={className} style={style} />;
  }

  const IconComponent = (Icons as Record<string, any>)[name];

  if (!IconComponent || (typeof IconComponent !== "function" && typeof IconComponent !== "object")) {
    return <Info size={size} color={color} className={className} style={style} />;
  }

  const Component = IconComponent;
  return <Component size={size} color={color} className={className} style={style} />;
}
