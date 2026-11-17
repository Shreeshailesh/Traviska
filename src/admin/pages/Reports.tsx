import React, { useState, useMemo } from "react";
import {
  Download,
  Calendar,
  IndianRupee,
  Users,
  Receipt,
  TrendingUp,
  PieChart,
  BarChart3,
  Sparkles,
  MapPin,
  ArrowUpRight,
} from "lucide-react";
import { TrendChart, DestinationDonut } from "../ui/Charts";
import { StatCard } from "../ui/StatCard";

type DateRange = "7d" | "30d" | "month" | "year";

interface PeriodMetric {
  revenue: string;
  revenueChange: string;
  isRevenuePositive: boolean;
  revenueSubtitle: string;
  seats: string;
  seatsSubtitle: string;
  departures: string;
  departuresSubtitle: string;
  payouts: string;
  payoutsSubtitle: string;
  trend: Array<{ date: string; label: string; revenue: number; bookings: number }>;
  destinationShare: Array<{ name: string; count: number; percentage: number; color?: string }>;
  totalBookings: number;
  topDestination: string;
  topDestinationShare: string;
}

export const ReportsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>("month");

  // Multi-range dynamic data for realistic dashboard interaction
  const metricsData: Record<DateRange, PeriodMetric> = useMemo(
    () => ({
      "7d": {
        revenue: "₹6,48,900",
        revenueChange: "+24.2%",
        isRevenuePositive: true,
        revenueSubtitle: "vs preceding 7-day period",
        seats: "142 Booked",
        seatsSubtitle: "Out of 160 available seats (88.8% occupancy)",
        departures: "6 Departures",
        departuresSubtitle: "100% on-time departure status",
        payouts: "₹32,000",
        payoutsSubtitle: "₹28,500 settled (89.1% cleared)",
        trend: [
          { date: "2026-11-24", label: "24 Nov", revenue: 78000, bookings: 16 },
          { date: "2026-11-25", label: "25 Nov", revenue: 84000, bookings: 18 },
          { date: "2026-11-26", label: "26 Nov", revenue: 92000, bookings: 20 },
          { date: "2026-11-27", label: "27 Nov", revenue: 104000, bookings: 22 },
          { date: "2026-11-28", label: "28 Nov", revenue: 122000, bookings: 26 },
          { date: "2026-11-29", label: "29 Nov", revenue: 138000, bookings: 30 },
          { date: "2026-11-30", label: "30 Nov", revenue: 154900, bookings: 34 },
        ],
        destinationShare: [
          { name: "Coorg", count: 54, percentage: 38, color: "#0d2b17" },
          { name: "Ooty", count: 36, percentage: 25, color: "#1c5e34" },
          { name: "Gokarna", count: 26, percentage: 18, color: "#2f855a" },
          { name: "Wayanad", count: 16, percentage: 11, color: "#68d391" },
          { name: "Rameshwaram", count: 10, percentage: 8, color: "#cbd5e1" },
        ],
        totalBookings: 142,
        topDestination: "Coorg",
        topDestinationShare: "38%",
      },
      "30d": {
        revenue: "₹29,80,000",
        revenueChange: "+15.8%",
        isRevenuePositive: true,
        revenueSubtitle: "vs preceding 30 days",
        seats: "540 Booked",
        seatsSubtitle: "Out of 630 available seats (85.7% occupancy)",
        departures: "24 Departures",
        departuresSubtitle: "100% on-time execution",
        payouts: "₹1,36,000",
        payoutsSubtitle: "₹1,18,000 settled (86.8%)",
        trend: [
          { date: "2026-11-01", label: "1 Nov", revenue: 42000, bookings: 10 },
          { date: "2026-11-06", label: "6 Nov", revenue: 76000, bookings: 16 },
          { date: "2026-11-12", label: "12 Nov", revenue: 142000, bookings: 28 },
          { date: "2026-11-18", label: "18 Nov", revenue: 260000, bookings: 52 },
          { date: "2026-11-24", label: "24 Nov", revenue: 420000, bookings: 86 },
          { date: "2026-11-30", label: "30 Nov", revenue: 648900, bookings: 142 },
        ],
        destinationShare: [
          { name: "Coorg", count: 88, percentage: 37, color: "#0d2b17" },
          { name: "Ooty", count: 58, percentage: 24, color: "#1c5e34" },
          { name: "Gokarna", count: 42, percentage: 18, color: "#2f855a" },
          { name: "Wayanad", count: 32, percentage: 13, color: "#68d391" },
          { name: "Rameshwaram", count: 18, percentage: 8, color: "#cbd5e1" },
        ],
        totalBookings: 238,
        topDestination: "Coorg",
        topDestinationShare: "37%",
      },
      month: {
        revenue: "₹31,52,412",
        revenueChange: "+18.4%",
        isRevenuePositive: true,
        revenueSubtitle: "vs previous monthly cycle",
        seats: "588 Booked",
        seatsSubtitle: "Out of 678 total seats (86.7% occupancy)",
        departures: "26 Departures",
        departuresSubtitle: "100% on-time execution",
        payouts: "₹1,44,000",
        payoutsSubtitle: "₹1,26,000 settled (87.5% cleared)",
        trend: [
          { date: "2026-11-01", label: "1 Nov", revenue: 32000, bookings: 8 },
          { date: "2026-11-05", label: "5 Nov", revenue: 68000, bookings: 15 },
          { date: "2026-11-10", label: "10 Nov", revenue: 114000, bookings: 24 },
          { date: "2026-11-15", label: "15 Nov", revenue: 220000, bookings: 46 },
          { date: "2026-11-20", label: "20 Nov", revenue: 410000, bookings: 88 },
          { date: "2026-11-25", label: "25 Nov", revenue: 540000, bookings: 112 },
          { date: "2026-11-30", label: "30 Nov", revenue: 648900, bookings: 142 },
        ],
        destinationShare: [
          { name: "Coorg", count: 94, percentage: 38, color: "#0d2b17" },
          { name: "Ooty", count: 60, percentage: 24, color: "#1c5e34" },
          { name: "Gokarna", count: 45, percentage: 18, color: "#2f855a" },
          { name: "Wayanad", count: 30, percentage: 12, color: "#68d391" },
          { name: "Rameshwaram", count: 19, percentage: 8, color: "#cbd5e1" },
        ],
        totalBookings: 248,
        topDestination: "Coorg",
        topDestinationShare: "38%",
      },
      year: {
        revenue: "₹1,84,50,000",
        revenueChange: "+42.6%",
        isRevenuePositive: true,
        revenueSubtitle: "vs FY 2025-26 benchmark",
        seats: "3,420 Booked",
        seatsSubtitle: "Out of 3,920 total seats (87.2% annual occupancy)",
        departures: "148 Departures",
        departuresSubtitle: "99.4% on-time schedule fulfillment",
        payouts: "₹8,60,000",
        payoutsSubtitle: "₹8,24,000 settled (95.8% cleared)",
        trend: [
          { date: "2026-01-01", label: "Jan-Feb", revenue: 1850000, bookings: 360 },
          { date: "2026-03-01", label: "Mar-Apr", revenue: 2600000, bookings: 520 },
          { date: "2026-05-01", label: "May-Jun", revenue: 3800000, bookings: 740 },
          { date: "2026-07-01", label: "Jul-Aug", revenue: 2900000, bookings: 580 },
          { date: "2026-09-01", label: "Sep-Oct", revenue: 3450000, bookings: 640 },
          { date: "2026-11-01", label: "Nov-Dec", revenue: 3850000, bookings: 780 },
        ],
        destinationShare: [
          { name: "Coorg", count: 1240, percentage: 36, color: "#0d2b17" },
          { name: "Ooty", count: 880, percentage: 26, color: "#1c5e34" },
          { name: "Gokarna", count: 620, percentage: 18, color: "#2f855a" },
          { name: "Wayanad", count: 420, percentage: 12, color: "#68d391" },
          { name: "Rameshwaram", count: 260, percentage: 8, color: "#cbd5e1" },
        ],
        totalBookings: 3420,
        topDestination: "Coorg",
        topDestinationShare: "36%",
      },
    }),
    []
  );

  const activeMetric = metricsData[dateRange];

  const departurePerformance = [
    {
      trip: "Coorg Weekend Trip",
      tag: "Best Seller",
      departures: 8,
      seatsCapacity: 192,
      bookedSeats: 174,
      occupancy: 90.6,
      grossRevenue: "₹7,82,826",
      grossRaw: 782826,
      captainPayouts: "₹38,000",
      payoutsRaw: 38000,
      netMargin: "₹4,22,500",
      marginPct: "54.0%",
    },
    {
      trip: "Ooty - Coonoor Trip",
      tag: "High Margin",
      departures: 6,
      seatsCapacity: 144,
      bookedSeats: 130,
      occupancy: 90.2,
      grossRevenue: "₹8,44,870",
      grossRaw: 844870,
      captainPayouts: "₹36,000",
      payoutsRaw: 36000,
      netMargin: "₹4,80,200",
      marginPct: "56.8%",
    },
    {
      trip: "Gokarna - Murdeshwara",
      tag: "Coastal Classic",
      departures: 5,
      seatsCapacity: 150,
      bookedSeats: 124,
      occupancy: 82.6,
      grossRevenue: "₹6,81,876",
      grossRaw: 681876,
      captainPayouts: "₹28,000",
      payoutsRaw: 28000,
      netMargin: "₹3,90,400",
      marginPct: "57.3%",
    },
    {
      trip: "Wayanad Explorer",
      tag: "Nature Trail",
      departures: 4,
      seatsCapacity: 96,
      bookedSeats: 82,
      occupancy: 85.4,
      grossRevenue: "₹4,91,918",
      grossRaw: 491918,
      captainPayouts: "₹24,000",
      payoutsRaw: 24000,
      netMargin: "₹2,68,000",
      marginPct: "54.5%",
    },
    {
      trip: "Rameshwaram Spiritual Tour",
      tag: "Heritage",
      departures: 3,
      seatsCapacity: 96,
      bookedSeats: 78,
      occupancy: 81.2,
      grossRevenue: "₹3,50,922",
      grossRaw: 350922,
      captainPayouts: "₹18,000",
      payoutsRaw: 18000,
      netMargin: "₹1,85,000",
      marginPct: "52.7%",
    },
  ];

  const handleExportCSV = () => {
    const headers = [
      "Trip Package",
      "Departures",
      "Seats Capacity",
      "Booked Seats",
      "Occupancy (%)",
      "Gross Revenue (INR)",
      "Captain Payouts (INR)",
      "Estimated Margin (INR)",
      "Margin Ratio (%)",
    ];
    const rows = departurePerformance.map((d) => [
      `"${d.trip}"`,
      d.departures,
      d.seatsCapacity,
      d.bookedSeats,
      d.occupancy,
      d.grossRevenue.replace(/₹|,/g, ""),
      d.captainPayouts.replace(/₹|,/g, ""),
      d.netMargin.replace(/₹|,/g, ""),
      d.marginPct,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `traviska_financial_operations_report_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          TOP HEADER: Standardized Traviska Admin SaaS Header
          ========================================================================= */}
      <div className="admin-page-header">
        <div className="admin-page-title-box">
          <div className="flex items-center gap-2.5">
            <h1>Financial &amp; Operations Reports</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Live Insights
            </span>
          </div>
          <p>
            Executive audit of gross bookings, seat occupancy, captain disbursements, and destination economics.
          </p>
        </div>

        {/* Right Controls: Period Switcher & Export Action */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Period Selector Pills */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "3px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            {(
              [
                { id: "7d", label: "Last 7 Days" },
                { id: "30d", label: "Last 30 Days" },
                { id: "month", label: "This Month" },
                { id: "year", label: "This Year" },
              ] as const
            ).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setDateRange(r.id)}
                style={{
                  padding: "6px 14px",
                  fontSize: "12.5px",
                  fontWeight: dateRange === r.id ? 700 : 500,
                  color: dateRange === r.id ? "#ffffff" : "#475569",
                  background: dateRange === r.id ? "#0d2b17" : "transparent",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 16px",
              background: "#0d2b17",
              color: "#ffffff",
              fontSize: "12.5px",
              fontWeight: 600,
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              transition: "all 0.15s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#164e23")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#0d2b17")}
          >
            <Download size={14} className="text-emerald-300" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: UNIFIED STATCARDS GRID
          ========================================================================= */}
      <div className="admin-stats-grid">
        {/* KPI 1: Gross Bookings Revenue */}
        <StatCard
          icon={<IndianRupee size={18} />}
          label="Gross Bookings Revenue"
          value={activeMetric.revenue}
          change={activeMetric.revenueChange}
          isPositive={activeMetric.isRevenuePositive}
          subtitle={activeMetric.revenueSubtitle}
          iconTheme="green"
        />

        {/* KPI 2: Total Passenger Seats */}
        <StatCard
          icon={<Users size={18} />}
          label="Total Passenger Seats"
          value={activeMetric.seats}
          subtitle={activeMetric.seatsSubtitle}
          iconTheme="blue"
        />

        {/* KPI 3: Departures Conducted */}
        <StatCard
          icon={<Calendar size={18} />}
          label="Departures Conducted"
          value={activeMetric.departures}
          subtitle={activeMetric.departuresSubtitle}
          iconTheme="gold"
        />

        {/* KPI 4: Captain Payouts & Claims */}
        <StatCard
          icon={<Receipt size={18} />}
          label="Captain Payouts & Claims"
          value={activeMetric.payouts}
          subtitle={activeMetric.payoutsSubtitle}
          iconTheme="green"
        />
      </div>

      {/* =========================================================================
          SECTION 2: VISUAL CHARTS GRID (Dual-Axis Trend & Destination Share)
          ========================================================================= */}
      <div className="admin-charts-grid">
        {/* Left: Trend Chart (2/3 width) */}
        <div className="admin-chart-card">
          <div className="admin-chart-header">
            <div>
              <div className="admin-chart-title">
                <TrendingUp size={18} color="#15803d" />
                <span>Cumulative Revenue vs Passenger Volume</span>
              </div>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>
                Gross collections tracking and passenger bookings volume over {dateRange === "7d" ? "the last 7 days" : dateRange === "30d" ? "the last 30 days" : dateRange === "month" ? "this month" : "this year"}.
              </p>
            </div>

            <div className="admin-chart-legend">
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span className="admin-legend-dot" style={{ background: "#0d2b17" }} />
                <span style={{ fontSize: "12px", color: "#334155", fontWeight: 600 }}>Revenue (₹)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span className="admin-legend-dot" style={{ background: "#86efac" }} />
                <span style={{ fontSize: "12px", color: "#334155", fontWeight: 600 }}>Bookings</span>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: "6px" }}>
            <TrendChart data={activeMetric.trend} height={260} />
          </div>
        </div>

        {/* Right: Destination Distribution (1/3 width) */}
        <div className="admin-chart-card" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="admin-chart-header" style={{ marginBottom: "12px" }}>
              <div>
                <div className="admin-chart-title">
                  <PieChart size={18} color="#15803d" />
                  <span>Destination Distribution</span>
                </div>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>
                  Passenger booking share across getaways
                </p>
              </div>
            </div>

            <div style={{ margin: "14px 0" }}>
              <DestinationDonut
                data={activeMetric.destinationShare}
                totalBookings={activeMetric.totalBookings}
              />
            </div>
          </div>

          {/* Bottom Highlights Pill */}
          <div
            style={{
              paddingTop: "12px",
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "12px",
              marginTop: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
              <Sparkles size={14} color="#d97706" />
              <span>
                Top Destination: <strong style={{ color: "#0f172a" }}>{activeMetric.topDestination}</strong>
              </span>
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#166534",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                padding: "2px 8px",
                borderRadius: "20px",
              }}
            >
              {activeMetric.topDestinationShare} of volume
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: DEPARTURE PERFORMANCE BREAKDOWN TABLE
          ========================================================================= */}
      <div className="admin-panel-card">
        {/* Panel Header */}
        <div className="admin-panel-header" style={{ flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#eaf5e9",
                color: "#1b4d24",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BarChart3 size={18} />
            </div>
            <div>
              <div style={{ fontSize: "14.5px", fontWeight: 700, color: "#0f172a" }}>
                Departure Performance Breakdown
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                Unit economics per trip package including gross collections, captain costs and net margins.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#475569",
                background: "#f8fafc",
                padding: "4px 10px",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
              }}
            >
              {departurePerformance.length} Trip Packages
            </span>
          </div>
        </div>

        {/* Panel Table Container */}
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ minWidth: "220px" }}>Trip Package</th>
                <th style={{ textAlign: "center", minWidth: "110px" }}>Departures</th>
                <th style={{ minWidth: "200px" }}>Seats &amp; Occupancy</th>
                <th style={{ textAlign: "center", minWidth: "100px" }}>Occupancy Rate</th>
                <th style={{ textAlign: "right", minWidth: "130px" }}>Gross Revenue</th>
                <th style={{ textAlign: "right", minWidth: "130px" }}>Captain Payouts</th>
                <th style={{ textAlign: "right", minWidth: "140px" }}>Estimated Margin</th>
              </tr>
            </thead>
            <tbody>
              {departurePerformance.map((row, idx) => (
                <tr key={idx}>
                  {/* Trip Package */}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          background: "#f0fdf4",
                          border: "1px solid #dcfce7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#166534",
                          flexShrink: 0,
                        }}
                      >
                        <MapPin size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "13.5px" }}>
                          {row.trip}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                          <span
                            style={{
                              fontSize: "10.5px",
                              fontWeight: 600,
                              color: "#166534",
                              background: "#eaf5e9",
                              padding: "1px 6px",
                              borderRadius: "4px",
                            }}
                          >
                            {row.tag}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Departures */}
                  <td style={{ textAlign: "center" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "3px 10px",
                        borderRadius: "6px",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#334155",
                      }}
                    >
                      {row.departures} runs
                    </span>
                  </td>

                  {/* Capacity & Bookings */}
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                        <span style={{ fontWeight: 600, color: "#0f172a" }}>
                          {row.bookedSeats}{" "}
                          <span style={{ color: "#64748b", fontWeight: 400 }}>/ {row.seatsCapacity} seats</span>
                        </span>
                        <span style={{ fontWeight: 700, color: "#15803d" }}>{row.occupancy}%</span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: "6px",
                          background: "#e2e8f0",
                          borderRadius: "999px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${row.occupancy}%`,
                            height: "100%",
                            background: row.occupancy >= 85 ? "#16a34a" : "#22c55e",
                            borderRadius: "999px",
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Occupancy Rate Badge */}
                  <td style={{ textAlign: "center" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: "20px",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        background: "#dcfce7",
                        color: "#15803d",
                        border: "1px solid #bbf7d0",
                      }}
                    >
                      {row.occupancy}%
                    </span>
                  </td>

                  {/* Gross Revenue */}
                  <td style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>
                      {row.grossRevenue}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      ₹{Math.round(row.grossRaw / row.bookedSeats).toLocaleString("en-IN")}/seat
                    </div>
                  </td>

                  {/* Captain Payouts */}
                  <td style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 600, color: "#475569", fontSize: "13px" }}>
                      {row.captainPayouts}
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                      ₹{Math.round(row.payoutsRaw / row.departures).toLocaleString("en-IN")}/run
                    </div>
                  </td>

                  {/* Net Margin */}
                  <td style={{ textAlign: "right" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                      }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          fontWeight: 700,
                          color: "#15803d",
                          fontSize: "13.5px",
                        }}
                      >
                        {row.netMargin}
                        <ArrowUpRight size={13} />
                      </div>
                      <span style={{ fontSize: "11px", color: "#166534", fontWeight: 600 }}>
                        {row.marginPct} margin
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Table Summary Footer */}
            <tfoot>
              <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                <td style={{ padding: "14px 16px", color: "#0f172a", fontSize: "13px" }}>
                  <strong>Portfolio Total ({departurePerformance.length} Trips)</strong>
                </td>
                <td style={{ textAlign: "center", color: "#0f172a", fontSize: "13px" }}>
                  <strong>26 departures</strong>
                </td>
                <td>
                  <div style={{ fontSize: "12px", color: "#0f172a" }}>
                    <strong>588 / 678 seats (86.7%)</strong>
                  </div>
                </td>
                <td style={{ textAlign: "center" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 10px",
                      borderRadius: "20px",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      background: "#164e23",
                      color: "#ffffff",
                    }}
                  >
                    86.7%
                  </span>
                </td>
                <td style={{ textAlign: "right", color: "#0f172a", fontSize: "14px" }}>
                  <strong>₹31,52,412</strong>
                </td>
                <td style={{ textAlign: "right", color: "#475569", fontSize: "13px" }}>
                  <strong>₹1,44,000</strong>
                </td>
                <td style={{ textAlign: "right", color: "#15803d", fontSize: "14px" }}>
                  <strong>₹17,46,100</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
