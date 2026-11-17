import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../api";
import { useSalesAuth } from "./SalesAuthContext";
import {
  TicketCheck,
  Calendar,
  Users,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

export const SalesManualBooking: React.FC = () => {
  const { token } = useSalesAuth();

  const [trips, setTrips] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");

  const [customerName, setCustomerName] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");

  const [travellers, setTravellers] = useState<number>(1);
  const [travellerDetails, setTravellerDetails] = useState<any[]>([
    { name: "", phone: "", age: "", gender: "Male" },
  ]);

  const [total, setTotal] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("UPI");
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<string>("Paid");
  const [notes, setNotes] = useState<string>("");

  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successBooking, setSuccessBooking] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Trips and Slots
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        const [tripsRes, slotsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/trips`),
          axios.get(`${API_BASE_URL}/slots?limit=100`),
        ]);
        setTrips(tripsRes.data || []);
        setSlots(slotsRes.data || []);
      } catch (err) {
        console.error("Error fetching trips/slots:", err);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // Filter slots for chosen trip
  const filteredSlots = selectedTripId
    ? slots.filter((s) => s.tripId?._id === selectedTripId || s.tripId === selectedTripId)
    : slots;

  // Auto-calculate suggested total price when trip or pax changes
  useEffect(() => {
    if (selectedTripId) {
      const trip = trips.find((t) => t._id === selectedTripId);
      if (trip && trip.price) {
        const rawPrice = Number(String(trip.price).replace(/\D/g, "")) || 0;
        setTotal(rawPrice * travellers);
      }
    }
  }, [selectedTripId, travellers, trips]);

  const handlePaxCountChange = (count: number) => {
    const validCount = Math.max(1, count);
    setTravellers(validCount);

    const updated = [...travellerDetails];
    while (updated.length < validCount) {
      updated.push({ name: "", phone: "", age: "", gender: "Male" });
    }
    while (updated.length > validCount) {
      updated.pop();
    }
    setTravellerDetails(updated);
  };

  const handleTravellerChange = (index: number, field: string, val: string) => {
    const updated = [...travellerDetails];
    updated[index] = { ...updated[index], [field]: val };
    setTravellerDetails(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !selectedSlotId) {
      setErrorMsg("Customer name, phone number, and departure slot are required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await axios.post(
        `${API_BASE_URL}/api/sales/manual-booking`,
        {
          customerName,
          customerEmail,
          customerPhone,
          tripId: selectedTripId,
          slotId: selectedSlotId,
          total: Number(total),
          travellers: Number(travellers),
          travellerDetails,
          paymentMethod,
          paymentReference,
          paymentStatus,
          notes,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setSuccessBooking(res.data.booking);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to create manual booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSuccessBooking(null);
    setSelectedTripId("");
    setSelectedSlotId("");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setTravellers(1);
    setTravellerDetails([{ name: "", phone: "", age: "", gender: "Male" }]);
    setTotal(0);
    setPaymentReference("");
    setNotes("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "900px", margin: "0 auto" }}>
      {/* Page Header (Admin Design Standard) */}
      <div className="admin-page-header">
        <div className="admin-page-title-box">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1>Create Manual &amp; Offline Booking</h1>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 9px",
                borderRadius: "20px",
                background: "#eaf5e9",
                color: "#164e23",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              Direct Settlement
            </span>
          </div>
          <p>
            Issue confirmed departure bookings for walk-in, WhatsApp, phone, or corporate clients with custom pricing.
          </p>
        </div>
      </div>

      {isLoadingData ? (
        <div style={{ padding: "80px 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "32px", height: "32px", border: "3px solid #164e23", borderTopColor: "transparent", borderRadius: "50%", animation: "spinIconAnim 0.8s linear infinite" }} />
        </div>
      ) : successBooking ? (
        <div
          className="admin-card"
          style={{
            background: "#ffffff",
            border: "2px solid #22c55e",
            borderRadius: "16px",
            padding: "40px 30px",
            textAlign: "center",
            boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "#dcfce7",
              color: "#15803d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckCircle2 size={34} />
          </div>

          <div>
            <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Booking Confirmed &amp; Registered
            </span>
            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: "4px 0" }}>
              Booking Code: #{successBooking.bookingCode}
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
              Confirmed for {successBooking.name} ({successBooking.travellers} passenger{successBooking.travellers > 1 ? "s" : ""}) • ₹
              {(successBooking.total || 0).toLocaleString("en-IN")} via {successBooking.paymentMethod}
            </p>
          </div>

          <div
            style={{
              padding: "12px 18px",
              borderRadius: "10px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              fontSize: "12.5px",
              color: "#334155",
              maxWidth: "500px",
            }}
          >
            This booking is registered in MongoDB, updated in departure slot manifests, and recorded in the Sales Portal.
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="admin-btn-primary"
            style={{ marginTop: "8px" }}
          >
            Issue Another Booking
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {errorMsg && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "10px",
                background: "#fee2e2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Trip & Slot */}
          <div
            className="admin-card"
            style={{
              background: "#ffffff",
              border: "1px solid #e7ecf0",
              borderRadius: "14px",
              padding: "20px 24px",
              boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
              <Calendar size={18} color="#164e23" />
              <h3 style={{ margin: 0, fontSize: "14.5px", fontWeight: 700, color: "#0f172a" }}>
                1. Select Expedition &amp; Departure Date
              </h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", fontSize: "12.5px" }}>
              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                  Expedition Package *
                </label>
                <select
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                >
                  <option value="">-- Choose Expedition --</option>
                  {trips.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.title} ({t.duration || "Multi-day"}) - ₹{t.price}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                  Departure Date Slot *
                </label>
                <select
                  required
                  value={selectedSlotId}
                  onChange={(e) => setSelectedSlotId(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                >
                  <option value="">-- Choose Date Slot --</option>
                  {filteredSlots.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.date} • {s.tripId?.title || "Trip"} ({s.bookedCount || 0}/{s.capacity || 20} booked)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Customer Contact */}
          <div
            className="admin-card"
            style={{
              background: "#ffffff",
              border: "1px solid #e7ecf0",
              borderRadius: "14px",
              padding: "20px 24px",
              boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
              <Users size={18} color="#164e23" />
              <h3 style={{ margin: 0, fontSize: "14.5px", fontWeight: 700, color: "#0f172a" }}>
                2. Customer Contact Details
              </h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", fontSize: "12.5px" }}>
              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                  Primary Contact Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full name"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                  Mobile Number (WhatsApp) *
                </label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Passenger Details */}
          <div
            className="admin-card"
            style={{
              background: "#ffffff",
              border: "1px solid #e7ecf0",
              borderRadius: "14px",
              padding: "20px 24px",
              boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <TicketCheck size={18} color="#164e23" />
                <h3 style={{ margin: 0, fontSize: "14.5px", fontWeight: 700, color: "#0f172a" }}>
                  3. Passenger Manifest ({travellers} Traveler{travellers > 1 ? "s" : ""})
                </h3>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Total Seats:</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={travellers}
                  onChange={(e) => handlePaxCountChange(Number(e.target.value))}
                  style={{ width: "50px", padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontWeight: 700, textAlign: "center" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {travellerDetails.map((pax, index) => (
                <div
                  key={index}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr",
                    gap: "12px",
                    fontSize: "12px",
                  }}
                >
                  <div>
                    <label style={{ display: "block", fontWeight: 600, color: "#475569", marginBottom: "3px" }}>
                      Passenger #{index + 1} Name
                    </label>
                    <input
                      type="text"
                      value={pax.name}
                      onChange={(e) => handleTravellerChange(index, "name", e.target.value)}
                      placeholder={index === 0 ? customerName || "Full name" : "Full name"}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontWeight: 600, color: "#475569", marginBottom: "3px" }}>
                      Age
                    </label>
                    <input
                      type="number"
                      value={pax.age}
                      onChange={(e) => handleTravellerChange(index, "age", e.target.value)}
                      placeholder="Age"
                      style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontWeight: 600, color: "#475569", marginBottom: "3px" }}>
                      Gender
                    </label>
                    <select
                      value={pax.gender}
                      onChange={(e) => handleTravellerChange(index, "gender", e.target.value)}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Pricing & Settlement */}
          <div
            className="admin-card"
            style={{
              background: "#ffffff",
              border: "1px solid #e7ecf0",
              borderRadius: "14px",
              padding: "20px 24px",
              boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
              <IndianRupee size={18} color="#164e23" />
              <h3 style={{ margin: 0, fontSize: "14.5px", fontWeight: 700, color: "#0f172a" }}>
                4. Pricing &amp; Payment Settlement
              </h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", fontSize: "12.5px" }}>
              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                  Agreed Total Price (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={total}
                  onChange={(e) => setTotal(Number(e.target.value))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: 700, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                >
                  <option value="UPI">UPI Transfer</option>
                  <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                  <option value="Cash">Cash at Office</option>
                  <option value="Razorpay">Razorpay Gateway</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                  Payment Status
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                >
                  <option value="Paid">Paid / Settled</option>
                  <option value="Pending">Pending Partial Payment</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", fontSize: "12.5px" }}>
              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                  Transaction UTR / Reference
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. UPI-9988776655"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                  Special Booking Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Vegetarian meals, pickup point preference"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="admin-btn-primary"
              style={{ padding: "10px 24px", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}
            >
              {isSubmitting && <Loader2 size={15} className="spin-icon" />}
              <span>Confirm &amp; Issue Booking</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SalesManualBooking;
