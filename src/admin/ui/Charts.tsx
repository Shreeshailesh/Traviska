import React, { useState } from "react";

// ============================================================================
// TREND CHART (Dual-Axis: Bookings Bars + Revenue Green Line)
// Matches Reference Mockup #1 & #8
// ============================================================================
interface TrendPoint {
  date: string; // e.g. "2026-11-01"
  label: string; // e.g. "1 Nov"
  bookings: number;
  revenue: number;
}

interface TrendChartProps {
  data: TrendPoint[];
  height?: number;
  showRevenue?: boolean;
}

export const TrendChart: React.FC<TrendChartProps> = ({ data, height = 240, showRevenue = true }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          fontSize: "13px",
        }}
      >
        No booking data available for this range
      </div>
    );
  }

  const maxBookings = Math.max(10, ...data.map((d) => d.bookings));
  const maxRevenue = Math.max(10000, ...data.map((d) => d.revenue));

  const paddingLeft = 45;
  const paddingRight = 45;
  const paddingTop = 20;
  const paddingBottom = 30;
  const svgWidth = 650;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (idx: number) =>
    paddingLeft + (idx / Math.max(1, data.length - 1)) * chartWidth;
  const getBookingsY = (val: number) =>
    paddingTop + chartHeight - (val / maxBookings) * chartHeight;
  const getRevenueY = (val: number) =>
    paddingTop + chartHeight - (val / maxRevenue) * chartHeight;

  // Build SVG path for revenue line
  const linePoints = data.map((d, i) => `${getX(i)},${getRevenueY(d.revenue)}`);
  const pathD =
    data.length > 1
      ? `M ${linePoints.join(" L ")}`
      : `M ${paddingLeft},${getRevenueY(data[0].revenue)} L ${svgWidth - paddingRight},${getRevenueY(data[0].revenue)}`;

  // Bar width
  const barWidth = Math.max(6, Math.min(24, (chartWidth / data.length) * 0.45));

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <svg
        viewBox={`0 0 ${svgWidth} ${height}`}
        style={{ width: "100%", height: "auto", overflow: "visible" }}
      >
        {/* Horizontal Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = paddingTop + chartHeight * (1 - pct);
          const bVal = Math.round(maxBookings * pct);
          const rVal = (maxRevenue * pct) / 1000;
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={svgWidth - paddingRight}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
              {/* Left Y-axis (Bookings) */}
              <text
                x={paddingLeft - 10}
                y={y + 3.5}
                textAnchor="end"
                fontSize="10"
                fill="#94a3b8"
                fontWeight="500"
              >
                {bVal}
              </text>
              {/* Right Y-axis (Revenue in K) */}
              {showRevenue && (
                <text
                  x={svgWidth - paddingRight + 10}
                  y={y + 3.5}
                  textAnchor="start"
                  fontSize="10"
                  fill="#94a3b8"
                  fontWeight="500"
                >
                  ₹{rVal > 0 ? `${rVal.toFixed(0)}K` : "0"}
                </text>
              )}
            </g>
          );
        })}

        {/* Bookings Bars (Soft Green) */}
        {data.map((d, i) => {
          const x = getX(i) - barWidth / 2;
          const y = getBookingsY(d.bookings);
          const barH = paddingTop + chartHeight - y;
          const isHovered = hoveredIdx === i;

          return (
            <rect
              key={`bar-${i}`}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(2, barH)}
              rx={3}
              fill={isHovered ? "#a3e635" : "#bbf7d0"}
              opacity={0.85}
              style={{ transition: "all 0.15s ease", cursor: "pointer" }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          );
        })}

        {/* Revenue Smooth Line (Dark Green) */}
        {showRevenue && (
          <>
            <path
              d={pathD}
              fill="none"
              stroke="#166534"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Line Data Points */}
            {data.map((d, i) => {
              const cx = getX(i);
              const cy = getRevenueY(d.revenue);
              const isHovered = hoveredIdx === i;

              return (
                <circle
                  key={`dot-${i}`}
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 6 : 4}
                  fill="#166534"
                  stroke="#ffffff"
                  strokeWidth="2"
                  style={{ transition: "all 0.15s ease", cursor: "pointer" }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
          </>
        )}

        {/* X-axis labels (sampled so they don't crowd) */}
        {data.map((d, i) => {
          const showLabel =
            data.length <= 10 ||
            i === 0 ||
            i === data.length - 1 ||
            i % Math.ceil(data.length / 6) === 0;

          if (!showLabel) return null;

          return (
            <text
              key={`label-${i}`}
              x={getX(i)}
              y={height - 8}
              textAnchor="middle"
              fontSize="11"
              fill="#64748b"
              fontWeight="500"
            >
              {d.label}
            </text>
          );
        })}
      </svg>

      {/* Hover Tooltip */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#0f172a",
            color: "#ffffff",
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            pointerEvents: "none",
            display: "flex",
            gap: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 10,
          }}
        >
          <span>
            <strong>{data[hoveredIdx].label}</strong>
          </span>
          <span style={{ color: "#86efac" }}>
            Bookings: {data[hoveredIdx].bookings}
          </span>
          {showRevenue && (
            <span style={{ color: "#4ade80" }}>
              Revenue: ₹{data[hoveredIdx].revenue.toLocaleString("en-IN")}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// DONUT CHART (Destination Breakdown)
// Matches Reference Mockup #1 & #8
// ============================================================================
interface DestinationSlice {
  name: string;
  count: number;
  percentage: number;
  color?: string;
}

interface DestinationDonutProps {
  data: DestinationSlice[];
  totalBookings: number;
}

const PALETTE = ["#22c55e", "#10b981", "#3b82f6", "#f59e0b", "#f97316", "#94a3b8"];

export const DestinationDonut: React.FC<DestinationDonutProps> = ({
  data,
  totalBookings,
}) => {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          padding: "30px",
          textAlign: "center",
          color: "#94a3b8",
          fontSize: "13px",
        }}
      >
        No destination bookings recorded yet
      </div>
    );
  }

  // Assign colors
  const slices = data.map((d, i) => ({
    ...d,
    color: d.color || PALETTE[i % PALETTE.length],
  }));

  // Calculate SVG stroke-dasharray arcs
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "24px",
      }}
    >
      {/* SVG Donut */}
      <div style={{ position: "relative", width: "160px", height: "160px", flexShrink: 0 }}>
        <svg
          viewBox="0 0 160 160"
          style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}
        >
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth="24"
          />
          {slices.map((slice, i) => {
            const pct = Number.isFinite(Number(slice.percentage))
              ? Number(slice.percentage)
              : totalBookings > 0
              ? Math.round((slice.count / totalBookings) * 100)
              : 0;
            const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
            accumulatedPercent += pct;

            return (
              <circle
                key={i}
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth="24"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray 0.3s ease" }}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#0f172a",
              lineHeight: 1.1,
            }}
          >
            {totalBookings}
          </span>
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>
            Bookings
          </span>
        </div>
      </div>

      {/* Legend list */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          flex: 1,
          minWidth: 0,
        }}
      >
        {slices.map((slice, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: slice.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  color: "#334155",
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {slice.name} – {slice.percentage}%
              </span>
            </div>
            <span style={{ color: "#64748b", fontWeight: 500, marginLeft: "8px" }}>
              ({slice.count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

