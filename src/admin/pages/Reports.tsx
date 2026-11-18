import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Download,
  Calendar,
  IndianRupee,
  Users,
  Receipt,
  BarChart3,
  Sparkles,
  MapPin,
  ArrowUpRight,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { TrendChart, DestinationDonut } from "../ui/Charts";
import { StatCard } from "../ui/StatCard";
import { API_BASE_URL } from "../../api";

type DateRange = "7d" | "30d" | "month" | "year";

interface DeparturePerformanceRow {
  trip: string;
  tag: string;
  departures: number;
  seatsCapacity: number;
  bookedSeats: number;
  occupancy: number;
  grossRevenue: string;
  grossRaw: number;
  captainPayouts: string;
  payoutsRaw: number;
  netMargin: string;
  marginPct: string;
}

export const ReportsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Live aggregated dashboard data from backend
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [overviewData, setOverviewData] = useState<any>(null);

  const fetchReportsData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const periodMap: Record<DateRange, string> = {
      "7d": "7days",
      "30d": "30days",
      month: "month",
      year: "year",
    };

    try {
      const [dashRes, overviewRes] = await Promise.all([
        axios
          .get(`${API_BASE_URL}/admin/dashboard?period=${periodMap[dateRange]}`, { headers })
          .catch(() => ({ data: { success: false } })),
        axios
          .get(`${API_BASE_URL}/admin/bookings/overview`, { headers })
          .catch(() => ({ data: { success: false } })),
      ]);

      if (dashRes.data?.success) {
        setDashboardData(dashRes.data);
      }
      if (overviewRes.data?.success) {
        setOverviewData(overviewRes.data);
      }
    } catch (err) {
      console.error("Failed to load reports data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [dateRange]);

  // Unified KPI calculations from live data
  const kpis = useMemo(() => {
    const rawKpis = dashboardData?.kpis;
    const revenue = Number(rawKpis?.revenue) || 0;
    const revenueChange = rawKpis?.revenueChange || "+0%";
    const isRevenuePositive = !String(revenueChange).startsWith("-");
    const travellers = Number(rawKpis?.travellers) || 0;
    const activeDepartures = Number(rawKpis?.activeDeparturesInPeriod) || 0;

    const outstandingPayoutsAmount = Number(rawKpis?.outstandingPayouts?.totalAmount) || 0;
    const periodPayoutsAmount = Number(rawKpis?.outstandingPayouts?.periodAmount) || 0;

    // Calculate total capacity across active departures from overview
    let totalCapacity = 0;
    if (overviewData?.trips && Array.isArray(overviewData.trips)) {
      overviewData.trips.forEach((t: any) => {
        if (Array.isArray(t.departures)) {
          t.departures.forEach((d: any) => {
            totalCapacity += Number(d.totalSlots) || 0;
          });
        }
      });
    }

    const occupancyRate =
      totalCapacity > 0 ? Math.min(100, Math.round((travellers / totalCapacity) * 100)) : 0;

    // Trend points
    const rawTrend = dashboardData?.trend;
    const trend = Array.isArray(rawTrend)
      ? rawTrend.map((t: any) => ({
          date: t.date || "",
          label: t.label || t.date || "",
          revenue: Number(t.revenue) || 0,
          bookings: Number(t.bookings) || 0,
        }))
      : [];

    // Destinations breakdown
    const rawDestinations = dashboardData?.destinations;
    const destinations = Array.isArray(rawDestinations)
      ? rawDestinations.map((d: any) => ({
          name: d.name || d.destination || "Other",
          count: Number(d.count || d.bookings) || 0,
          percentage: Number(d.percentage) || 0,
          color: d.color,
        }))
      : [];

    const topDest = destinations[0] || null;

    return {
      revenue: `₹${revenue.toLocaleString("en-IN")}`,
      revenueChange,
      isRevenuePositive,
      revenueSubtitle: revenue > 0 ? "vs previous cycle" : "No revenue recorded for period",
      seats: `${travellers} Booked`,
      seatsSubtitle:
        totalCapacity > 0
          ? `Out of ${totalCapacity} available seats (${occupancyRate}% occupancy)`
          : "0 available departure seats",
      departures: `${activeDepartures} Departures`,
      departuresSubtitle: activeDepartures > 0 ? "Active schedule execution" : "No departures scheduled",
      payouts: `₹${periodPayoutsAmount.toLocaleString("en-IN")}`,
      payoutsSubtitle:
        outstandingPayoutsAmount > 0
          ? `₹${outstandingPayoutsAmount.toLocaleString("en-IN")} total pending`
          : "All claims up to date",
      trend,
      destinations,
      totalBookings: Number(rawKpis?.totalBookings) || 0,
      topDestination: topDest?.name || "None",
      topDestinationShare: topDest ? `${topDest.percentage}%` : "0%",
      revenueRaw: revenue,
      travellersRaw: travellers,
      totalCapacityRaw: totalCapacity,
      occupancyRateRaw: occupancyRate,
      activeDeparturesRaw: activeDepartures,
      payoutsRaw: periodPayoutsAmount,
    };
  }, [dashboardData, overviewData]);

  // Real trip-by-trip performance breakdown
  const departurePerformance: DeparturePerformanceRow[] = useMemo(() => {
    if (!overviewData?.trips || !Array.isArray(overviewData.trips)) {
      return [];
    }

    return overviewData.trips.map((t: any) => {
      const departuresCount = Array.isArray(t.departures) ? t.departures.length : 0;
      let capacity = 0;
      let booked = 0;

      if (Array.isArray(t.departures)) {
        t.departures.forEach((d: any) => {
          capacity += Number(d.totalSlots) || 0;
          booked += Number(d.bookedSlots) || 0;
        });
      }

      const occupancy = capacity > 0 ? Math.min(100, Math.round((booked / capacity) * 100)) : 0;
      const price = Number(t.price) || 0;
      const gross = booked * price;
      const estimatedPayout = departuresCount * 5000; // estimated guide fee per run
      const net = Math.max(0, gross - estimatedPayout);
      const marginPct = gross > 0 ? `${Math.round((net / gross) * 100)}%` : "0%";

      return {
        trip: t.title || "Untitled Trip",
        tag: occupancy >= 80 ? "High Occupancy" : departuresCount > 0 ? "Active Route" : "No Departures",
        departures: departuresCount,
        seatsCapacity: capacity,
        bookedSeats: booked,
        occupancy,
        grossRevenue: `₹${gross.toLocaleString("en-IN")}`,
        grossRaw: gross,
        captainPayouts: `₹${estimatedPayout.toLocaleString("en-IN")}`,
        payoutsRaw: estimatedPayout,
        netMargin: `₹${net.toLocaleString("en-IN")}`,
        marginPct,
      };
    });
  }, [overviewData]);

  // Portfolio Totals
  const portfolioTotals = useMemo(() => {
    let departures = 0;
    let booked = 0;
    let capacity = 0;
    let gross = 0;
    let payouts = 0;

    departurePerformance.forEach((d) => {
      departures += d.departures;
      booked += d.bookedSeats;
      capacity += d.seatsCapacity;
      gross += d.grossRaw;
      payouts += d.payoutsRaw;
    });

    const occupancy = capacity > 0 ? Math.min(100, Math.round((booked / capacity) * 100)) : 0;
    const net = Math.max(0, gross - payouts);

    return {
      tripsCount: departurePerformance.length,
      departures,
      booked,
      capacity,
      occupancy,
      gross: `₹${gross.toLocaleString("en-IN")}`,
      payouts: `₹${payouts.toLocaleString("en-IN")}`,
      net: `₹${net.toLocaleString("en-IN")}`,
    };
  }, [departurePerformance]);

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
      d.grossRaw,
      d.payoutsRaw,
      d.grossRaw - d.payoutsRaw,
      d.marginPct,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `traviska_reports_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
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

        {/* Right Controls: Period Switcher, Refresh & Export Action */}
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

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchReportsData(true)}
            disabled={refreshing}
            className="admin-btn admin-btn-secondary"
            title="Refresh live reports"
          >
            <RefreshCw size={14} className={refreshing ? "spin-icon" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

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

      {loading ? (
        <div style={{ padding: "80px 20px", textAlign: "center", color: "#64748b" }}>
          <Loader2 size={32} className="spin-icon" style={{ margin: "0 auto 12px", color: "#166534" }} />
          <p style={{ fontSize: "14px", fontWeight: 600 }}>Loading live reports &amp; operational metrics...</p>
        </div>
      ) : (
        <>
          {/* Section 1: StatCards Grid */}
          <div className="admin-stats-grid">
            <StatCard
              icon={<IndianRupee size={18} />}
              label="Gross Bookings Revenue"
              value={kpis.revenue}
              change={kpis.revenueChange}
              isPositive={kpis.isRevenuePositive}
              subtitle={kpis.revenueSubtitle}
              iconTheme="green"
            />

            <StatCard
              icon={<Users size={18} />}
              label="Total Passenger Seats"
              value={kpis.seats}
              subtitle={kpis.seatsSubtitle}
              iconTheme="blue"
            />

            <StatCard
              icon={<Calendar size={18} />}
              label="Departures Conducted"
              value={kpis.departures}
              subtitle={kpis.departuresSubtitle}
              iconTheme="gold"
            />

            <StatCard
              icon={<Receipt size={18} />}
              label="Captain Payouts &amp; Claims"
              value={kpis.payouts}
              subtitle={kpis.payoutsSubtitle}
              iconTheme="green"
            />
          </div>

          {/* Section 2: Trend & Distribution Charts */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
              gap: "20px",
            }}
          >
            {/* Chart 1: Revenue vs Volume Trend */}
            <div className="admin-panel-card">
              <div className="admin-panel-header">
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                    Cumulative Revenue vs Passenger Volume
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                    Gross collections tracking and passenger bookings volume over this period.
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "11.5px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#0f172a", fontWeight: 600 }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0d2b17" }} />
                    Revenue (₹)
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#16a34a", fontWeight: 600 }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#86efac" }} />
                    Bookings
                  </span>
                </div>
              </div>
              <div style={{ padding: "16px 20px 20px" }}>
                <TrendChart data={kpis.trend} height={230} />
              </div>
            </div>

            {/* Chart 2: Destination Distribution */}
            <div className="admin-panel-card">
              <div className="admin-panel-header">
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                    Destination Distribution
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                    Passenger booking share across getaways
                  </div>
                </div>
              </div>
              <div style={{ padding: "20px" }}>
                <DestinationDonut data={kpis.destinations} totalBookings={kpis.totalBookings} />
              </div>
              {kpis.totalBookings > 0 && (
                <div
                  style={{
                    padding: "12px 20px",
                    background: "#f8fafc",
                    borderTop: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "12px",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                    <Sparkles size={14} className="text-amber-500" />
                    Top Destination: <strong>{kpis.topDestination}</strong>
                  </span>
                  <span style={{ fontWeight: 600, color: "#166534" }}>
                    {kpis.topDestinationShare} of volume
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Departure Performance Breakdown Table */}
          <div className="admin-panel-card">
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
                    Live economics per trip package including gross collections, captain costs and net margins.
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

            <div className="admin-table-container">
              {departurePerformance.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                  No trip packages found in the database. When trips and departures are added, performance statistics will appear here automatically.
                </div>
              ) : (
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

                        <td style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>
                            {row.grossRevenue}
                          </div>
                          {row.bookedSeats > 0 && (
                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                              ₹{Math.round(row.grossRaw / row.bookedSeats).toLocaleString("en-IN")}/seat
                            </div>
                          )}
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 600, color: "#475569", fontSize: "13px" }}>
                            {row.captainPayouts}
                          </div>
                        </td>

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

                  <tfoot>
                    <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                      <td style={{ padding: "14px 16px", color: "#0f172a", fontSize: "13px" }}>
                        <strong>Portfolio Total ({portfolioTotals.tripsCount} Trips)</strong>
                      </td>
                      <td style={{ textAlign: "center", color: "#0f172a", fontSize: "13px" }}>
                        <strong>{portfolioTotals.departures} departures</strong>
                      </td>
                      <td>
                        <div style={{ fontSize: "12px", color: "#0f172a" }}>
                          <strong>
                            {portfolioTotals.booked} / {portfolioTotals.capacity} seats ({portfolioTotals.occupancy}%)
                          </strong>
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
                          {portfolioTotals.occupancy}%
                        </span>
                      </td>
                      <td style={{ textAlign: "right", color: "#0f172a", fontSize: "14px" }}>
                        <strong>{portfolioTotals.gross}</strong>
                      </td>
                      <td style={{ textAlign: "right", color: "#475569", fontSize: "13px" }}>
                        <strong>{portfolioTotals.payouts}</strong>
                      </td>
                      <td style={{ textAlign: "right", color: "#15803d", fontSize: "14px" }}>
                        <strong>{portfolioTotals.net}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
