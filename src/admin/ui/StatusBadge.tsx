import React from "react";

export type BadgeStatus =
  | "Paid"
  | "Pending"
  | "Cancelled"
  | "Upcoming"
  | "Confirmed"
  | "Planning"
  | "Completed"
  | "Active"
  | "Inactive";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = "",
}) => {
  const normalized = (status || "").trim().toLowerCase();

  return (
    <span className={`admin-badge ${normalized} ${className}`}>
      {status}
    </span>
  );
};

export default StatusBadge;

