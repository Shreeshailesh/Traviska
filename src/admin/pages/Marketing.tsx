import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../api";
import { StatCard } from "../ui/StatCard";
import { Modal } from "../ui/Modal";
import {
  Tag,
  Plus,
  Copy,
  Check,
  Calendar,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Loader2,
  RefreshCw,
  Camera,
  ExternalLink,
  Search,
  RotateCcw,
  IndianRupee,
  Eye,
  ArrowRight,
  ArrowLeft,
  Ticket,
} from "lucide-react";
import { AdminGalleryManager } from "./AdminGalleryManager";

interface Coupon {
  id: string;
  code: string;
  discountType: "percentage" | "flat";
  value: number;
  minBookingAmount: number;
  validUntil: string;
  usageCount: number;
  usageLimit: number;
  isActive: boolean;
  applicableTrips: string;
}

export const MarketingPage: React.FC = () => {
  const [marketingSection, setMarketingSection] = useState<"coupons" | "gallery">("coupons");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showAddCouponModal, setShowAddCouponModal] = useState(false);
  const [showGalleryUploadTrigger, setShowGalleryUploadTrigger] = useState(false);

  // Gallery Counts for Top Stat Cards & Tabs
  const [galleryStats, setGalleryStats] = useState({
    total: 14,
    active: 14,
    top: 7,
    bottom: 7,
  });

  // Coupons Search & Filter State
  const [couponSearchQuery, setCouponSearchQuery] = useState("");
  const [couponStatusFilter, setCouponStatusFilter] = useState<"all" | "active" | "disabled">("all");

  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discountType: "flat" as "percentage" | "flat",
    value: 500,
    minBookingAmount: 4000,
    validUntil: "2026-12-31",
    usageLimit: 100,
    applicableTrips: "All Trips",
  });

  const getAuthHeader = () => {
    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchCoupons = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await axios.get(`${API_BASE_URL}/admin/coupons`, {
        headers: getAuthHeader(),
      });
      if (res.data.success && Array.isArray(res.data.coupons)) {
        setCoupons(res.data.coupons);
      }
    } catch (err) {
      console.error("Failed to load coupons:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleActive = async (id: string) => {
    try {
      // Optimistic update
      setCoupons((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
      );
      await axios.put(
        `${API_BASE_URL}/admin/coupons/${id}/toggle`,
        {},
        { headers: getAuthHeader() }
      );
    } catch (err) {
      console.error("Failed to toggle coupon status:", err);
      fetchCoupons(true);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete coupon code "${code}"?`)) {
      return;
    }
    try {
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      await axios.delete(`${API_BASE_URL}/admin/coupons/${id}`, {
        headers: getAuthHeader(),
      });
    } catch (err) {
      console.error("Failed to delete coupon:", err);
      fetchCoupons(true);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code.trim()) return;

    setSubmitting(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/admin/coupons`,
        {
          code: newCoupon.code.toUpperCase().trim(),
          discountType: newCoupon.discountType,
          value: Number(newCoupon.value),
          minBookingAmount: Number(newCoupon.minBookingAmount),
          validUntil: newCoupon.validUntil,
          usageLimit: Number(newCoupon.usageLimit),
          applicableTrips: newCoupon.applicableTrips,
        },
        { headers: getAuthHeader() }
      );

      if (res.data.success && res.data.coupon) {
        setCoupons([res.data.coupon, ...coupons]);
        setShowAddCouponModal(false);
        setNewCoupon({
          code: "",
          discountType: "flat",
          value: 500,
          minBookingAmount: 4000,
          validUntil: "2026-12-31",
          usageLimit: 100,
          applicableTrips: "All Trips",
        });
      } else {
        alert(res.data.message || "Failed to create coupon");
      }
    } catch (err: any) {
      console.error("Failed to create coupon:", err);
      alert(err.response?.data?.message || "Failed to create coupon");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Coupons
  const filteredCoupons = useMemo(() => {
    return coupons.filter((coupon) => {
      if (couponStatusFilter === "active" && !coupon.isActive) return false;
      if (couponStatusFilter === "disabled" && coupon.isActive) return false;

      if (couponSearchQuery.trim()) {
        const q = couponSearchQuery.toLowerCase();
        const matchCode = coupon.code.toLowerCase().includes(q);
        const matchTrips = (coupon.applicableTrips || "").toLowerCase().includes(q);
        const matchType = coupon.discountType.toLowerCase().includes(q);
        return matchCode || matchTrips || matchType;
      }
      return true;
    });
  }, [coupons, couponStatusFilter, couponSearchQuery]);

  const activeCouponsCount = coupons.filter((c) => c.isActive).length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0);
  const avgMinOrder = coupons.length > 0 ? Math.round(coupons.reduce((sum, c) => sum + (c.minBookingAmount || 0), 0) / coupons.length) : 0;

  return (
    <div className="w-full space-y-6 pb-14">
      {/* 1. Standard Traviska Admin Header */}
      <div className="admin-page-header">
        <div className="admin-page-title-box">
          <div className="flex items-center gap-3">
            <h1>Marketing & Campaigns</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Growth & Conversions
            </span>
          </div>
          <p>
            Manage promotional discount coupons, flash offers, and the homepage cinematic media gallery.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => fetchCoupons(true)}
            disabled={loading || refreshing}
            className="admin-btn admin-btn-secondary"
            title="Refresh Marketing Data"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-emerald-800 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            <span>Refresh</span>
          </button>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn admin-btn-secondary"
            title="Open Homepage in New Tab"
          >
            <ExternalLink className="w-4 h-4 text-gray-600" />
            <span>Preview Site</span>
          </a>

          {marketingSection === "coupons" ? (
            <button
              type="button"
              onClick={() => setShowAddCouponModal(true)}
              className="admin-btn admin-btn-primary shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Coupon</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowGalleryUploadTrigger(true)}
              className="admin-btn admin-btn-primary shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Media</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top KPI Stat Cards (4 Cards Grid matching Payouts & Dashboard) */}
      <div className="admin-stats-grid">
        {marketingSection === "coupons" ? (
          <>
            <StatCard
              icon={<Sparkles size={18} />}
              label="Active Promo Codes"
              value={loading ? "..." : `${activeCouponsCount} Active`}
              subtitle={`${coupons.length} total coupons configured`}
              change={activeCouponsCount > 0 ? `${activeCouponsCount} Live` : undefined}
              isPositive={true}
              iconTheme="green"
            />
            <StatCard
              icon={<Tag size={18} />}
              label="Total Redemptions"
              value={loading ? "..." : `${totalRedemptions} Uses`}
              subtitle="Across verified customer bookings"
              iconTheme="blue"
            />
            <StatCard
              icon={<IndianRupee size={18} />}
              label="Avg Min Booking"
              value={loading ? "..." : `₹${avgMinOrder.toLocaleString("en-IN")}`}
              subtitle="Eligible order threshold"
              iconTheme="gold"
            />
            <StatCard
              icon={<Calendar size={18} />}
              label="Flash Campaign Status"
              value="Year-End 2026"
              subtitle="Scheduled holiday promotion"
              iconTheme="default"
            />
          </>
        ) : (
          <>
            <StatCard
              icon={<Camera size={18} />}
              label="Total Media Frames"
              value={`${galleryStats.total} Frames`}
              subtitle="Across both marquee rows"
              iconTheme="green"
            />
            <StatCard
              icon={<Eye size={18} />}
              label="Active on Homepage"
              value={`${galleryStats.active} Live`}
              subtitle="Looping in 60 FPS marquee"
              change="100% Seamless"
              isPositive={true}
              iconTheme="blue"
            />
            <StatCard
              icon={<ArrowRight size={18} />}
              label="Top Row (Left &rarr; Right)"
              value={`${galleryStats.top} Frames`}
              subtitle="Clockwise cinematic glide"
              iconTheme="gold"
            />
            <StatCard
              icon={<ArrowLeft size={18} />}
              label="Bottom Row (Right &rarr; Left)"
              value={`${galleryStats.bottom} Frames`}
              subtitle="Counter-directional glide"
              iconTheme="default"
            />
          </>
        )}
      </div>

      {/* 3. Hero Campaign / Marquee Banner */}
      {marketingSection === "coupons" ? (
        <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50 border border-emerald-200/90 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#0d2b17] flex items-center justify-center text-white shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <span className="font-extrabold text-gray-900 text-[13.5px] block">
                Upcoming Holiday Campaign: Year-End Getaways 2026
              </span>
              <span className="text-gray-600 text-xs mt-0.5 block">
                Automated promotional banner scheduled for customer checkout with promo code{" "}
                <strong className="text-emerald-900 font-bold font-mono">NEWYEAR2027</strong>.
              </span>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-emerald-800 shadow-2xs shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Campaign Scheduled</span>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50 border border-emerald-200/90 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#0d2b17] flex items-center justify-center text-white shrink-0 shadow-xs">
              <Camera className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <span className="font-extrabold text-gray-900 text-[13.5px] block">
                Live Dual-Row Homepage Media Showcase
              </span>
              <span className="text-gray-600 text-xs mt-0.5 block">
                Continuous GPU-composited photo &amp; video marquee positioned directly below &ldquo;Why Travel With Traviska?&rdquo;.
              </span>
            </div>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-[#0d2b17] hover:bg-[#164e23] text-white font-bold rounded-xl transition-all shadow-xs shrink-0 flex items-center gap-1.5 text-xs"
          >
            <span>View on Homepage</span>
            <ExternalLink className="w-3.5 h-3.5 text-emerald-300" />
          </a>
        </div>
      )}

      {/* 4. Primary Section Segmented Control Switcher */}
      <div className="flex items-center gap-1.5 p-1.5 bg-gray-100/90 rounded-2xl border border-gray-200/80 overflow-x-auto w-fit">
        <button
          type="button"
          onClick={() => setMarketingSection("coupons")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            marketingSection === "coupons"
              ? "bg-white text-gray-900 shadow-xs border border-gray-200/80"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <Tag
            size={15}
            className={marketingSection === "coupons" ? "text-emerald-700" : ""}
          />
          <span>Promotions &amp; Coupons</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              marketingSection === "coupons"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-gray-200/70 text-gray-600"
            }`}
          >
            {coupons.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMarketingSection("gallery")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            marketingSection === "gallery"
              ? "bg-white text-gray-900 shadow-xs border border-gray-200/80"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <Camera
            size={15}
            className={marketingSection === "gallery" ? "text-emerald-700" : ""}
          />
          <span>Homepage Media Gallery</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              marketingSection === "gallery"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-gray-200/70 text-gray-600"
            }`}
          >
            {galleryStats.total}
          </span>
        </button>
      </div>

      {/* 5. Active Section Body */}
      {marketingSection === "gallery" ? (
        <AdminGalleryManager
          onCountChange={(total, active, top, bottom) =>
            setGalleryStats({ total, active, top, bottom })
          }
          showUploadModalExternal={showGalleryUploadTrigger}
          onCloseUploadModalExternal={() => setShowGalleryUploadTrigger(false)}
        />
      ) : (
        <div className="space-y-5">
          {/* Coupons Search & Filter Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={couponSearchQuery}
                  onChange={(e) => setCouponSearchQuery(e.target.value)}
                  placeholder="Search coupons by code, discount, or trip..."
                  className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d2b17]/20 focus:border-[#0d2b17] transition-all"
                />
              </div>

              <select
                value={couponStatusFilter}
                onChange={(e) => setCouponStatusFilter(e.target.value as any)}
                className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0d2b17]/20"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="disabled">Disabled Only</option>
              </select>
            </div>

            {(couponSearchQuery || couponStatusFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setCouponSearchQuery("");
                  setCouponStatusFilter("all");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Coupons Table Card */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-200/80 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2 font-bold text-gray-900 text-xs">
                <Ticket className="w-4 h-4 text-[#0d2b17]" />
                <span>Promotional Coupons List ({filteredCoupons.length})</span>
              </div>
            </div>

            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-[#0d2b17] mb-3" />
                <p className="text-xs font-semibold text-gray-600">Loading coupons...</p>
              </div>
            ) : filteredCoupons.length === 0 ? (
              <div className="py-20 text-center p-8">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto mb-3.5">
                  <Tag className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-gray-900">No coupons found</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Try adjusting your search criteria or create your first customer promo code.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddCouponModal(true)}
                  className="mt-4 px-4 py-2 bg-[#0d2b17] hover:bg-[#164321] text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
                >
                  Create New Coupon
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 border-b border-gray-200/80 text-[11px] text-gray-500 font-extrabold uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Coupon Code</th>
                      <th className="px-5 py-3.5">Discount Offer</th>
                      <th className="px-5 py-3.5">Applicability</th>
                      <th className="px-5 py-3.5">Min Order</th>
                      <th className="px-5 py-3.5">Redemptions</th>
                      <th className="px-5 py-3.5">Validity</th>
                      <th className="px-5 py-3.5 text-center">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCoupons.map((coupon) => (
                      <tr
                        key={coupon.id}
                        className="hover:bg-gray-50/60 transition-colors"
                      >
                        {/* Coupon Code Chip */}
                        <td className="px-5 py-4 font-mono font-bold text-gray-900">
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100/80 border border-gray-200/70 text-xs">
                            <span className="tracking-wide">{coupon.code}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(coupon.code)}
                              className="text-gray-400 hover:text-gray-800 transition-colors"
                              title="Copy promo code"
                            >
                              {copiedCode === coupon.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Discount Amount */}
                        <td className="px-5 py-4 font-bold text-emerald-800 text-xs">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                            {coupon.discountType === "flat"
                              ? `₹${coupon.value} Flat OFF`
                              : `${coupon.value}% OFF`}
                          </span>
                        </td>

                        {/* Applicability */}
                        <td className="px-5 py-4 text-gray-700 text-xs font-medium">
                          {coupon.applicableTrips || "All Trips"}
                        </td>

                        {/* Min Order */}
                        <td className="px-5 py-4 text-gray-700 font-semibold">
                          ₹{coupon.minBookingAmount.toLocaleString("en-IN")}
                        </td>

                        {/* Redemptions */}
                        <td className="px-5 py-4 text-gray-700">
                          <span className="font-bold text-gray-900">
                            {coupon.usageCount}
                          </span>{" "}
                          <span className="text-gray-400">/ {coupon.usageLimit}</span>
                        </td>

                        {/* Validity */}
                        <td className="px-5 py-4 text-gray-600">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>{coupon.validUntil}</span>
                          </div>
                        </td>

                        {/* Status Toggle */}
                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(coupon.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold"
                          >
                            {coupon.isActive ? (
                              <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                <ToggleRight className="w-4 h-4 text-emerald-600" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">
                                <ToggleLeft className="w-4 h-4 text-gray-400" />
                                <span>Disabled</span>
                              </span>
                            )}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(coupon.id, coupon.code)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Coupon"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Coupon Modal (Unified Luxury Modal) */}
      <Modal
        isOpen={showAddCouponModal}
        onClose={() => setShowAddCouponModal(false)}
        title="Create Promo Coupon"
        subtitle="Configure promo codes, discount percentages, and rules."
        maxWidth="540px"
      >
        <form onSubmit={handleCreateCoupon} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "6px",
              }}
            >
              COUPON CODE *
            </label>
            <input
              type="text"
              required
              value={newCoupon.code}
              onChange={(e) =>
                setNewCoupon({
                  ...newCoupon,
                  code: e.target.value.toUpperCase(),
                })
              }
              placeholder="e.g. TRAVISKA500, NEWYEAR2027"
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: "13px",
                fontFamily: "monospace",
                fontWeight: 700,
                color: "#0f172a",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                outline: "none",
                background: "#ffffff",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "6px",
                }}
              >
                DISCOUNT TYPE *
              </label>
              <select
                value={newCoupon.discountType}
                onChange={(e) =>
                  setNewCoupon({
                    ...newCoupon,
                    discountType: e.target.value as "percentage" | "flat",
                  })
                }
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  fontSize: "13px",
                  color: "#0f172a",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  outline: "none",
                  background: "#ffffff",
                  boxSizing: "border-box",
                }}
              >
                <option value="flat">Flat Amount (₹)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "6px",
                }}
              >
                DISCOUNT VALUE *
              </label>
              <input
                type="number"
                required
                min="1"
                value={newCoupon.value}
                onChange={(e) =>
                  setNewCoupon({
                    ...newCoupon,
                    value: Number(e.target.value),
                  })
                }
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  fontSize: "13px",
                  color: "#0f172a",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  outline: "none",
                  background: "#ffffff",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "6px",
                }}
              >
                MIN BOOKING (₹)
              </label>
              <input
                type="number"
                min="0"
                value={newCoupon.minBookingAmount}
                onChange={(e) =>
                  setNewCoupon({
                    ...newCoupon,
                    minBookingAmount: Number(e.target.value),
                  })
                }
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  fontSize: "13px",
                  color: "#0f172a",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  outline: "none",
                  background: "#ffffff",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "6px",
                }}
              >
                MAX REDEMPTIONS
              </label>
              <input
                type="number"
                min="1"
                value={newCoupon.usageLimit}
                onChange={(e) =>
                  setNewCoupon({
                    ...newCoupon,
                    usageLimit: Number(e.target.value),
                  })
                }
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  fontSize: "13px",
                  color: "#0f172a",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  outline: "none",
                  background: "#ffffff",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "6px",
              }}
            >
              APPLICABLE TRIPS
            </label>
            <input
              type="text"
              value={newCoupon.applicableTrips}
              onChange={(e) =>
                setNewCoupon({
                  ...newCoupon,
                  applicableTrips: e.target.value,
                })
              }
              placeholder="e.g. All Trips, Wayanad Explorer"
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: "13px",
                color: "#0f172a",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                outline: "none",
                background: "#ffffff",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "6px",
              }}
            >
              VALID UNTIL DATE *
            </label>
            <input
              type="date"
              required
              value={newCoupon.validUntil}
              onChange={(e) =>
                setNewCoupon({
                  ...newCoupon,
                  validUntil: e.target.value,
                })
              }
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: "13px",
                color: "#0f172a",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                outline: "none",
                background: "#ffffff",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "10px",
              paddingTop: "14px",
              borderTop: "1px solid #e2e8f0",
              marginTop: "4px",
            }}
          >
            <button
              type="button"
              onClick={() => setShowAddCouponModal(false)}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                color: "#64748b",
                cursor: "pointer",
                padding: "8px 16px",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: "#0d2b17",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "9px 20px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.6 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              <span>{submitting ? "Creating..." : "Save Coupon"}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MarketingPage;
