import React from "react";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  subtitle?: string;
  iconTheme?: "green" | "gold" | "blue" | "default";
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  change,
  isPositive = true,
  subtitle,
  iconTheme = "green",
}) => {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-header">
        <div className={`admin-stat-icon-pill ${iconTheme}`}>{icon}</div>
        {change && (
          <span
            className={`admin-stat-badge ${
              isPositive ? "positive" : "neutral"
            }`}
          >
            {isPositive && !change.startsWith("-") && !change.startsWith("+")
              ? `+${change}`
              : change}
          </span>
        )}
      </div>

      <div className="admin-stat-body">
        <span className="admin-stat-label">{label}</span>
        <span className="admin-stat-value">{value}</span>
        {subtitle && <span className="admin-stat-subtitle">{subtitle}</span>}
      </div>
    </div>
  );
};

export default StatCard;

