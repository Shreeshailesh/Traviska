import { API_BASE_URL } from "../api";
import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import "./Admin.css";
import { useNavigate } from "react-router-dom";
import AdminTripSectionsEditor, {
  normalizeSections,
  createDefaultSections,
  type TripSectionsState,
} from "../components/AdminTripSectionsEditor";


function Admin() {
    const navigate = useNavigate();

    const location = useLocation();
const activeSection = location.pathname.split("/")[2] || "dashboard";
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [bookingSearch, setBookingSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [tripFilter, setTripFilter] = useState("All");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const bookingDetailsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
  if (selectedBooking) {
    bookingDetailsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}, [selectedBooking]);
  const [trips, setTrips] = useState([]);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const bookingsTableRef = useRef<HTMLTableElement>(null);
  useEffect(() => {
  if (expandedTripId) {
    bookingsTableRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}, [expandedTripId]);
  const [editingTrip, setEditingTrip] = useState<any>(null);
  const editTripRef = useRef<HTMLDivElement>(null);

  const prevEditingTripId = useRef<string | null>(null);
  useEffect(() => {
  if (editingTrip && editingTrip._id !== prevEditingTripId.current) {
    prevEditingTripId.current = editingTrip._id;
    editTripRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
  if (!editingTrip) {
    prevEditingTripId.current = null;
  }
}, [editingTrip]);

  const [slots, setSlots] = useState([]);
const [selectedTripForSlot, setSelectedTripForSlot] = useState("");
const [slotDate, setSlotDate] = useState("");
const [totalSlots, setTotalSlots] = useState(20);
const [editingSlot, setEditingSlot] = useState<any>(null);
const editSlotRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  if (editingSlot) {
    editSlotRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}, [editingSlot]);

const [manualBooking, setManualBooking] = useState({
  name: "",
  email: "",
  phone: "",
  slotId: "",
  travellers: 1,
  requests: "",
  paymentMethod: "UPI",
  paymentReference: "",
  paymentConfirmed: false,
});

const [manualBookingSaving, setManualBookingSaving] = useState(false);

const [globalSections, setGlobalSections] = useState<TripSectionsState>(
  createDefaultSections()
);
const [loadingSections, setLoadingSections] = useState(false);
const [savingSections, setSavingSections] = useState(false);

const fetchGlobalSections = async () => {
  try {
    setLoadingSections(true);
    const { data } = await axios.get(`${API_BASE_URL}/global-trip-sections`);
    if (data) {
      setGlobalSections(normalizeSections(data));
    }
  } catch (err) {
    console.error("Failed to fetch global trip sections:", err);
  } finally {
    setLoadingSections(false);
  }
};

const saveGlobalSections = async () => {
  try {
    setSavingSections(true);
    const { data } = await axios.put(
      `${API_BASE_URL}/global-trip-sections`,
      globalSections,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    alert(data.message || "Detailed trip sections saved successfully!");
    if (data.sections) {
      setGlobalSections(normalizeSections(data.sections));
    }
  } catch (err: any) {
    console.error("Failed to save global trip sections:", err);
    alert(err.response?.data?.message || "Failed to save trip sections");
  } finally {
    setSavingSections(false);
  }
};

  const handleLogout = () => {
  localStorage.removeItem("token");
  navigate("/login");
};

 useEffect(() => {
  const token = localStorage.getItem("token");

  if (!token) {
    navigate("/login");
    return;
  }

  fetchBookings();
  fetchTrips();
  fetchSlots();
  fetchGlobalSections();
}, []);

const fetchBookings = async () => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/bookings`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

   

    setBookings(data);
  } catch (err) {
    console.error(err);
  }
};

  const fetchTrips = async () => {
  try {
const { data } = await axios.get(`${API_BASE_URL}/trips`, {
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});


    setTrips(data);
  } catch (err) {
    console.error(err);
  }
};

const updateBookingStatus = async (
  bookingId: string,
  status: string
) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/bookings/${bookingId}/status`,
      { status },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    alert(response.data.message);
    fetchBookings();
  } catch (err: any) {
  console.error(err);

  alert(
    err.response?.data?.message ||
      "Failed to update booking status"
  );

  fetchBookings();
}
};

const recordManualPayment = async (booking: any) => {
  if (
    booking.bookingSource !== "Admin" ||
    booking.status !== "Pending" ||
    booking.paymentStatus !== "Pending"
  ) {
    return;
  }

  const paymentReference =
    booking.paymentMethod === "Cash"
      ? ""
      : prompt("Enter the verified UPI UTR / bank transaction reference:");

  if (paymentReference === null) return;

  if (booking.paymentMethod !== "Cash" && !paymentReference.trim()) {
    alert("Payment reference is required");
    return;
  }

  if (!confirm("Have you verified that the payment was received?")) {
    return;
  }

  try {
    const response = await axios.put(
      `${API_BASE_URL}/admin/bookings/${booking._id}/record-payment`,
      { paymentReference },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    alert(response.data.message);
    await Promise.all([fetchBookings(), fetchSlots()]);
  } catch (err: any) {
    console.error(err);
    alert(
      err.response?.data?.message || "Failed to record payment"
    );
  }
};

const createManualBooking = async () => {
  if (manualBookingSaving) return;

  try {
    setManualBookingSaving(true);

    const response = await axios.post(
      `${API_BASE_URL}/admin/manual-bookings`,
      manualBooking,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    alert(response.data.message);

    setManualBooking({
      name: "",
      email: "",
      phone: "",
      slotId: "",
      travellers: 1,
      requests: "",
      paymentMethod: "UPI",
      paymentReference: "",
      paymentConfirmed: false,
    });

    await Promise.all([fetchBookings(), fetchSlots()]);
  } catch (err: any) {
    console.error(err);

    alert(
      err.response?.data?.message ||
        "Failed to create manual booking"
    );
  } finally {
    setManualBookingSaving(false);
  }
};

const fetchSlots = async () => {
  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/trip-slots`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    setSlots(data);
  } catch (err) {
    console.error(err);
  }
};

const updateTrip = async () => {
  try {
    await axios.put(
  `${API_BASE_URL}/trips/${editingTrip._id}`,
  editingTrip,
  {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  }
);

    alert("Trip Updated Successfully!");

    setEditingTrip(null);

    fetchTrips();
  } catch (err) {
    console.error(err);
    alert("Failed to update trip");
  }
};

const deleteTrip = async (id: string) => {
  if (!window.confirm("Are you sure you want to delete this trip?")) {
  return;
}
  try {
    await axios.delete(`${API_BASE_URL}/trips/${id}`, {
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

    alert("Trip Deleted Successfully!");

    fetchTrips();
  } catch (err) {
    console.error(err);
    alert("Failed to delete trip");
  }
};

const customers = Array.from(
  new Map(
    bookings
      .filter((booking: any) => booking.email)
      .map((booking: any) => [
        booking.email.trim().toLowerCase(),
        {
          name: booking.name,
          email: booking.email,
          phone: booking.phone,
        },
      ])
  ).values()
) as { name: string; email: string; phone: string }[];



const totalRevenue = bookings.reduce(
  (sum: number, booking: any) => sum + (booking.total || 0),
  0
);

const createSlot = async () => {
  if (!selectedTripForSlot || !slotDate || !totalSlots) {
    alert("Please fill all slot details");
    return;
  }

  try {
    await axios.post(
      `${API_BASE_URL}/trip-slots`,
      {
        trip: selectedTripForSlot,
        date: slotDate,
        totalSlots: Number(totalSlots),
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    alert("Trip slot created successfully!");

    setSelectedTripForSlot("");
    setSlotDate("");
    setTotalSlots(20);

    fetchSlots();
  } catch (err) {
    console.error(err);
    alert("Failed to create trip slot");
  }
};

const updateSlot = async () => {
  if (!editingSlot) return;

  try {
    await axios.put(
      `${API_BASE_URL}/trip-slots/${editingSlot._id}`,
      {
        date: editingSlot.date,
        totalSlots: Number(editingSlot.totalSlots),
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    alert("Trip slot updated successfully!");

    setEditingSlot(null);
    fetchSlots();
  } catch (err) {
    console.error(err);
    alert("Failed to update trip slot");
  }
};

const toggleSlot = async (slot: any) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/trip-slots/${slot._id}/toggle`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

   alert(response.data.message);
fetchBookings();
fetchSlots();
  } catch (err) {
    console.error(err);
    alert("Failed to update trip slot");
  }
};

const paidBookings = bookings.filter(
  (booking: any) => booking.paymentStatus === "Paid"
).length;


return (
  <div className="admin-layout">
    {/* Mobile Header Bar (shown on screens <= 900px) */}
    <header className="admin-mobile-header">
      <div className="admin-mobile-header-left">
        <button
          type="button"
          className="admin-mobile-toggle-btn"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Open menu"
        >
          ☰
        </button>
        <span className="admin-mobile-brand">Traviska Admin</span>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="admin-mobile-logout-btn"
      >
        Logout
      </button>
    </header>

    <Sidebar
      isOpen={mobileSidebarOpen}
      onClose={() => setMobileSidebarOpen(false)}
    />

    <div className="admin-main-content">
      <div className="admin-top-bar">
        <h1 className="admin-title">
          {activeSection === "dashboard"
            ? "📊 Dashboard"
            : activeSection === "bookings"
            ? "📅 Bookings"
            : activeSection === "trips"
            ? "🧳 Trips"
            : activeSection === "sections"
            ? "📑 Detailed Trip Sections"
            : activeSection === "customers"
            ? "👥 Customers"
            : "⚙️ Settings"}
        </h1>

        <button
          onClick={handleLogout}
          className="admin-desktop-logout"
          style={{
            background: "#ef4444",
            color: "#fff",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Logout
        </button>
      </div>

{activeSection === "trips" && (
  <>
<div
  style={{
    background: "#fff",
    padding: "20px",
    borderRadius: "16px",
    marginBottom: "30px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
  }}
>
  <h2 style={{ color: "#222", marginBottom: "20px" }}>
    Add Trip Slot
  </h2>

  <select
    value={selectedTripForSlot}
    onChange={(e) => setSelectedTripForSlot(e.target.value)}
    style={{
      width: "100%",
      padding: "12px",
      marginBottom: "15px",
      border: "1px solid #ccc",
      borderRadius: "8px",
    }}
  >
    <option value="">Select Trip</option>

    {trips.map((trip: any) => (
      <option key={trip._id} value={trip._id}>
        {trip.title} - {trip.location}
      </option>
    ))}
  </select>

  <input
    type="date"
    value={slotDate}
    onChange={(e) => setSlotDate(e.target.value)}
    style={{
      width: "100%",
      padding: "12px",
      marginBottom: "15px",
      border: "1px solid #ccc",
      borderRadius: "8px",
    }}
  />

  <input
    type="number"
    min="1"
    value={totalSlots}
    onChange={(e) => setTotalSlots(Number(e.target.value))}
    placeholder="Total Slots"
    style={{
      width: "100%",
      padding: "12px",
      marginBottom: "15px",
      border: "1px solid #ccc",
      borderRadius: "8px",
    }}
  />

  <button
    onClick={createSlot}
    style={{
      background: "#ff6b00",
      color: "#fff",
      border: "none",
      padding: "12px 20px",
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: "bold",
    }}
  >
    Add Slot
  </button>
</div>

  </>
)}

{/* Manual Booking Form */}
{activeSection === "bookings" && (
  <>
<div
  style={{
    marginTop: "40px",
    background: "#fff",
    padding: "24px",
    borderRadius: "16px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
  }}
>
  <h2 style={{ color: "#222" }}>Add Manual Booking</h2>

  <p style={{ color: "#666" }}>
    Create a booking for customers paying by UPI, bank transfer, or cash.
  </p>

  <form
    onSubmit={(e) => {
      e.preventDefault();
      createManualBooking();
    }}
    style={{ display: "grid", gap: "12px", maxWidth: "550px" }}
  >
    <input
      required
      placeholder="Customer Name"
      value={manualBooking.name}
      onChange={(e) =>
        setManualBooking({ ...manualBooking, name: e.target.value })
      }
    />

    <input
      type="email"
      placeholder="Email (optional)"
      value={manualBooking.email}
      onChange={(e) =>
        setManualBooking({ ...manualBooking, email: e.target.value })
      }
    />

    <input
      required
      placeholder="Phone Number"
      value={manualBooking.phone}
      onChange={(e) =>
        setManualBooking({ ...manualBooking, phone: e.target.value })
      }
    />

    <select
      required
      value={manualBooking.slotId}
      onChange={(e) =>
        setManualBooking({ ...manualBooking, slotId: e.target.value })
      }
    >
      <option value="">Select Trip & Date</option>
      {slots
        .filter(
          (slot: any) =>
            !slot.isClosed && slot.bookedSlots < slot.totalSlots
        )
        .map((slot: any) => (
          <option key={slot._id} value={slot._id}>
            {slot.trip?.title || "Unknown Trip"} —{" "}
            {new Date(slot.date).toLocaleDateString("en-GB")} (
            {slot.totalSlots - slot.bookedSlots} available)
          </option>
        ))}
    </select>

    <input
      required
      type="number"
      min="1"
      placeholder="Number of Travellers"
      value={manualBooking.travellers}
      onChange={(e) =>
        setManualBooking({
          ...manualBooking,
          travellers: Number(e.target.value),
        })
      }
    />

    <select
      value={manualBooking.paymentMethod}
      onChange={(e) =>
        setManualBooking({
          ...manualBooking,
          paymentMethod: e.target.value,
        })
      }
    >
      <option value="UPI">UPI / QR Scanner</option>
      <option value="Bank Transfer">Bank Transfer</option>
      <option value="Cash">Cash</option>
    </select>

    <input
      placeholder="Payment Reference / UTR"
      required={
        manualBooking.paymentConfirmed &&
        manualBooking.paymentMethod !== "Cash"
      }
      value={manualBooking.paymentReference}
      onChange={(e) =>
        setManualBooking({
          ...manualBooking,
          paymentReference: e.target.value,
        })
      }
    />

    <textarea
      placeholder="Special Requests (optional)"
      value={manualBooking.requests}
      onChange={(e) =>
        setManualBooking({
          ...manualBooking,
          requests: e.target.value,
        })
      }
    />

    <label style={{ color: "#222" }}>
      <input
        type="checkbox"
        checked={manualBooking.paymentConfirmed}
        onChange={(e) =>
          setManualBooking({
            ...manualBooking,
            paymentConfirmed: e.target.checked,
          })
        }
      />{" "}
      I have verified that payment was received
    </label>

    <button
      type="submit"
      disabled={manualBookingSaving}
      style={{
        background: "#ff6b00",
        color: "#fff",
        border: "none",
        padding: "12px",
        borderRadius: "8px",
        cursor: manualBookingSaving ? "not-allowed" : "pointer",
      }}
    >
      {manualBookingSaving ? "Saving..." : "Create Manual Booking"}
    </button>
  </form>
</div>
  </>
)}
{activeSection === "trips" && (
  <>

<div
  style={{
    marginTop: "40px",
    background: "#fff",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
  }}
>
  <h2 style={{ color: "#222", marginBottom: "20px" }}>
    Trip Slots
  </h2>


<div className="admin-table-scroll">
<table
    style={{
      width: "100%",
      borderCollapse: "collapse",
    }}
  >
    <thead>
      <tr style={{ borderBottom: "2px solid #eee" }}>
        <th style={{ padding: "12px", textAlign: "left" }}>
          Trip
        </th>

        <th style={{ padding: "12px", textAlign: "left" }}>
          Date
        </th>

        <th style={{ padding: "12px", textAlign: "left" }}>
          Total Slots
        </th>

        <th style={{ padding: "12px", textAlign: "left" }}>
          Booked
        </th>

        <th style={{ padding: "12px", textAlign: "left" }}>
          Available
        </th>

        <th style={{ padding: "12px", textAlign: "left" }}>
          Status
        </th>
        <th style={{ padding: "12px", textAlign: "left" }}>
  Action
</th>
      </tr>
    </thead>

    <tbody>
      {slots.map((slot: any) => {
        const available =
          slot.totalSlots - slot.bookedSlots;

        const status =
          slot.isClosed || available <= 0
            ? "Sold Out"
            : available <= 3
            ? "Filling Fast"
            : "Available";

        return (
          <tr
            key={slot._id}
            style={{
              borderBottom: "1px solid #eee",
            }}
          >
            <td
              style={{
                padding: "12px",
                color: "#222",
              }}
            >
              {slot.trip?.title || "Unknown Trip"}
            </td>

            <td
              style={{
                padding: "12px",
                color: "#222",
              }}
            >
              {new Date(slot.date).toLocaleDateString()}
            </td>

            <td
              style={{
                padding: "12px",
                color: "#222",
              }}
            >
              {slot.totalSlots}
            </td>

            <td
              style={{
                padding: "12px",
                color: "#222",
              }}
            >
              {slot.bookedSlots}
            </td>

            <td
              style={{
                padding: "12px",
                color: "#222",
              }}
            >
              {available}
            </td>

            <td style={{ padding: "12px" }}>
              <span
                style={{
                  background:
                    status === "Sold Out"
                      ? "#ef4444"
                      : status === "Filling Fast"
                      ? "#f59e0b"
                      : "#22c55e",

                  color: "#fff",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  fontSize: "14px",
                }}
              >
                {status}
              </span>
            </td>

           <td style={{ padding: "12px" }}>
  <button
    type="button"
    onClick={() => {
      
      setEditingSlot(slot);
    }}
    style={{
      background: "#2563eb",
      color: "#fff",
      border: "none",
      padding: "8px 14px",
      borderRadius: "8px",
      cursor: "pointer",
    }}
  >
    Edit
  </button>
  <button
  type="button"
  onClick={() => toggleSlot(slot)}
  style={{
    background: slot.isClosed ? "#22c55e" : "#ef4444",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    marginLeft: "8px",
  }}
>
  {slot.isClosed ? "Reopen" : "Close"}
</button>
</td>

          </tr>
        );
      })}
    </tbody>
  </table>
  </div>
</div>

{editingSlot && (
  <div
  ref={editSlotRef}
    style={{
      marginTop: "40px",
      marginBottom: "40px",
      background: "#fff",
      borderRadius: "16px",
      padding: "20px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
    }}
  >
    <h2 style={{ color: "#222", marginBottom: "20px" }}>
      Edit Trip Slot
    </h2>

    <input
      type="date"
      value={String(editingSlot.date).substring(0, 10)}
      onChange={(e) =>
        setEditingSlot({
          ...editingSlot,
          date: e.target.value,
        })
      }
      style={{
        width: "100%",
        padding: "12px",
        marginBottom: "15px",
        border: "1px solid #ccc",
        borderRadius: "8px",
      }}
    />

    <input
      type="number"
      value={editingSlot.totalSlots}
      min="1"
      onChange={(e) =>
        setEditingSlot({
          ...editingSlot,
          totalSlots: Number(e.target.value),
        })
      }
      style={{
        width: "100%",
        padding: "12px",
        marginBottom: "15px",
        border: "1px solid #ccc",
        borderRadius: "8px",
      }}
    />

    <button
      type="button"
      onClick={updateSlot}
      style={{
        background: "#2563eb",
        color: "#fff",
        border: "none",
        padding: "12px 20px",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "bold",
      }}

    >
      Save Slot
    </button>

    <button
      type="button"
      onClick={() => setEditingSlot(null)}
      style={{
        background: "#6b7280",
        color: "#fff",
        border: "none",
        padding: "12px 20px",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "bold",
        marginLeft: "10px",
      }}
    >
      Cancel
    </button>
  </div>
)}

  </>
)}
    {activeSection === "trips" && editingTrip && (
  <div
  ref={editTripRef}
  style={{
    marginTop: "40px",
    marginBottom: "40px",
    background: "#fff",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
  }}
>
    <h2 style={{ color: "#222", marginBottom: "20px" }}>
      Edit Trip
    </h2>

    <input
  type="text"
  value={editingTrip.title}
  onChange={(e) =>
    setEditingTrip({
      ...editingTrip,
      title: e.target.value,
    })
  }
  placeholder="Trip Title"
  style={{
    width: "100%",
    padding: "12px",
    marginBottom: "15px",
    border: "1px solid #ccc",
    borderRadius: "8px",
  }}
/>

    <input
  type="text"
  value={editingTrip.location}
  onChange={(e) =>
    setEditingTrip({
      ...editingTrip,
      location: e.target.value,
    })
  }
  placeholder="Location"
  style={{
    width: "100%",
    padding: "12px",
    marginBottom: "15px",
    border: "1px solid #ccc",
    borderRadius: "8px",
  }}
/>


<textarea
  value={editingTrip.description ?? ""}
  onChange={(e) =>
    setEditingTrip({
      ...editingTrip,
      description: e.target.value,
    })
  }
  placeholder="About This Trip - Description"
  rows={5}
  style={{
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    marginBottom: "15px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    fontSize: "15px",
    fontFamily: "inherit",
    resize: "vertical",
  }}
/>


{[
  { field: "highlights", label: "Overview & Highlights" },
  { field: "itinerary", label: "Itinerary" },
  { field: "inclusions", label: "Inclusions" },
  { field: "exclusions", label: "Exclusions" },
  { field: "thingsToCarry", label: "Things to Carry" },
].map(({ field, label }) => (
  <div key={field} style={{ marginBottom: "15px" }}>
    <label
      style={{
        display: "block",
        marginBottom: "8px",
        fontWeight: 600,
        color: "#222",
      }}
    >
      {label}
    </label>

    <textarea
      value={(editingTrip as any)[field] ?? ""}
      onChange={(e) =>
        setEditingTrip({
          ...editingTrip,
          [field]: e.target.value,
        })
      }
      placeholder={`Enter ${label}`}
      rows={5}
      style={{
        width: "100%",
        padding: "12px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        boxSizing: "border-box",
        fontSize: "15px",
        resize: "vertical",
      }}
    />
  </div>
))}

<button
  onClick={updateTrip}
  style={{
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "12px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    marginTop: "10px",
  }}
>
  Save Changes
</button>

<button
  onClick={() => deleteTrip(editingTrip._id)}
  style={{
    background: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "12px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    marginTop: "10px",
    marginLeft: "10px",
  }}
>
  Delete Trip
</button>

  </div>

  
)}

{activeSection === "sections" && (
  <div
    style={{
      background: "#fff",
      padding: "24px 28px",
      borderRadius: "16px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
      marginBottom: "40px",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "14px",
        borderBottom: "1px solid #eee",
        paddingBottom: "18px",
        marginBottom: "20px",
      }}
    >
      <div>
        <h2 style={{ color: "#222", margin: "0 0 6px", fontSize: "22px" }}>
          Global Detailed Trip Sections
        </h2>
        <p style={{ color: "#6b7280", margin: 0, fontSize: "14px" }}>
          These 5 sections (Safety Information, Why Choose Us, Cancellation Policy, Terms &amp; Conditions, Important Notes)
          are displayed universally across <strong>all trip pages</strong>. Points edited here apply to every trip.
        </p>
      </div>

      <button
        type="button"
        onClick={saveGlobalSections}
        disabled={savingSections}
        style={{
          background: "#ff6b00",
          color: "#fff",
          border: "none",
          padding: "12px 24px",
          borderRadius: "8px",
          cursor: savingSections ? "not-allowed" : "pointer",
          fontWeight: "bold",
          fontSize: "14px",
          boxShadow: "0 2px 8px rgba(255,107,0,0.25)",
        }}
      >
        {savingSections ? "Saving..." : "Save Sections"}
      </button>
    </div>

    {loadingSections ? (
      <div style={{ padding: "40px 0", textAlign: "center", color: "#6b7280" }}>
        Loading sections...
      </div>
    ) : (
      <AdminTripSectionsEditor
        value={globalSections}
        onChange={setGlobalSections}
      />
    )}

    <div style={{ marginTop: "24px", textAlign: "right" }}>
      <button
        type="button"
        onClick={saveGlobalSections}
        disabled={savingSections}
        style={{
          background: "#ff6b00",
          color: "#fff",
          border: "none",
          padding: "12px 24px",
          borderRadius: "8px",
          cursor: savingSections ? "not-allowed" : "pointer",
          fontWeight: "bold",
          fontSize: "14px",
          boxShadow: "0 2px 8px rgba(255,107,0,0.25)",
        }}
      >
        {savingSections ? "Saving..." : "Save Sections"}
      </button>
    </div>
  </div>
)}

{activeSection === "customers" && (
  <div
    style={{
      background: "#fff",
      padding: "24px",
      borderRadius: "16px",
      marginTop: "30px",
    }}
  >
    <h2>👥 Customers</h2>
    <p
  style={{
    fontSize: "18px",
    fontWeight: "bold",
    color: "#2563eb",
    marginBottom: "20px",
  }}
>
  Total Customers: {customers.length}
</p>
    <div className="admin-table-scroll">
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
  <thead>
    <tr>
      <th style={{ padding: "12px", textAlign: "left" }}>Name</th>
      <th style={{ padding: "12px", textAlign: "left" }}>Email</th>
      <th style={{ padding: "12px", textAlign: "left" }}>Phone</th>
    </tr>
  </thead>

  <tbody>
    {customers.map((customer) => (
      <tr key={customer.email} style={{ borderTop: "1px solid #ddd" }}>
        <td style={{ padding: "12px" }}>{customer.name}</td>
        <td style={{ padding: "12px" }}>{customer.email}</td>
        <td style={{ padding: "12px" }}>{customer.phone}</td>
      </tr>
    ))}
  </tbody>
</table>
</div>
  </div>
)}

{activeSection === "settings" && (
  <div
    style={{
      background: "#fff",
      padding: "24px",
      borderRadius: "16px",
      marginTop: "30px",
    }}
  >
    <h2>⚙️ Admin Settings</h2>
    <button
  onClick={handleLogout}
  style={{
    background: "#ef4444",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    marginTop: "20px",
  }}
>
  Logout
</button>
    <p>Manage your Traviska admin account and website settings.</p>
  </div>
)}

    {/* Stats Cards */}
    
{activeSection === "dashboard" && (
  <>

    <div style={{ height: "40px" }} />

<div className="stats-grid">
  <div className="stat-card">
        <h3>Total Bookings</h3>
        <h1>{bookings.length}</h1>
      </div>

      <div className="stat-card">
        <h3>Total Revenue</h3>
        <h1>₹{totalRevenue.toLocaleString()}</h1>
      </div>

      <div className="stat-card">
        <h3>Paid Bookings</h3>
        <h1>{paidBookings}</h1>
      </div>
      <div className="stat-card">
  <h3>Total Trips</h3>
  <h1>{trips.length}</h1>
</div>
<div className="stat-card">
  <h3>Total Customers</h3>
  <h1>{customers.length}</h1>
</div>
    </div>
    <div style={{ marginTop: "30px" }}>

    </div>
      </>
)}
    {/* Recent Bookings */}
    {activeSection === "bookings" && (
  <>
    <div
      style={{
        marginTop: "40px",
        background: "#fff",
        borderRadius: "16px",
        padding: "20px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
      }}
    >
      <h2 style={{ color: "#222", marginBottom: "20px" }}>
  Bookings by Trip
</h2>

{trips.map((trip: any) => (
  <div
    key={trip._id}
    onClick={() =>
      setExpandedTripId(
        expandedTripId === trip._id ? null : trip._id
      )
    }
    style={{
      padding: "16px",
      marginBottom: "10px",
      background: "#f8fafc",
      border: "1px solid #ddd",
      borderRadius: "10px",
      cursor: "pointer",
      color: "#222",
      fontWeight: "bold",
    }}
  >
    {trip.title}
    <span
  style={{
    marginLeft: "12px",
    fontSize: "13px",
    color: "#666",
    fontWeight: "normal",
  }}
>
  {bookings.filter(
  (booking: any) =>
    booking.trip?.title === trip.title
).length} bookings)
</span>
    <span style={{ float: "right" }}>
      {expandedTripId === trip._id ? "▲" : "▼"}
    </span>
  </div>
))}

      <input
  type="text"
  placeholder="Search by customer name, email or phone..."
  value={bookingSearch}
  onChange={(e) => setBookingSearch(e.target.value)}
  style={{
    width: "100%",
    padding: "12px",
    marginBottom: "20px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    boxSizing: "border-box",
  }}
/>

<select
  value={paymentFilter}
  onChange={(e) => setPaymentFilter(e.target.value)}
  style={{
    padding: "12px",
    marginBottom: "20px",
    border: "1px solid #ddd",
    borderRadius: "8px",
  }}
>
  <option value="All">All Payments</option>
  <option value="Paid">Paid</option>
  <option value="Pending">Pending</option>
  <option value="Failed">Failed</option>
</select>

<select
  value={statusFilter}
  onChange={(e) => setStatusFilter(e.target.value)}
  style={{
    padding: "12px",
    marginBottom: "20px",
    marginLeft: "10px",
    border: "1px solid #ddd",
    borderRadius: "8px",
  }}
>
  <option value="All">All Booking Statuses</option>
  <option value="Confirmed">Confirmed</option>
  <option value="Pending">Pending</option>
  <option value="Cancelled">Cancelled</option>
</select>

<select
  value={tripFilter}
  onChange={(e) => setTripFilter(e.target.value)}
  style={{
    padding: "12px",
    marginBottom: "20px",
    marginLeft: "10px",
    border: "1px solid #ddd",
    borderRadius: "8px",
  }}
>
  <option value="All">All Trips</option>
  {trips.map((trip: any) => (
    <option key={trip._id} value={trip.title}>
      {trip.title}
    </option>
  ))}
</select>


      <table
  ref={bookingsTableRef}
  style={{
    width: "100%",
    borderCollapse: "collapse",
  }}
>
        <thead>
          <tr style={{ borderBottom: "2px solid #eee" }}>
            <th style={{ padding: "12px", textAlign: "left" }}>Customer</th>
            <th style={{ padding: "12px", textAlign: "left" }}>Trip</th>
            <th style={{ padding: "12px", textAlign: "left" }}>Date</th>
            <th style={{ padding: "12px", textAlign: "left" }}>Travellers</th>
            <th style={{ padding: "12px", textAlign: "left" }}>Amount</th>
            <th style={{ padding: "12px", textAlign: "left" }}>Status</th>
          </tr>
        </thead>

        <tbody>
          {bookings
  .filter((booking: any) => {
     if (
  !expandedTripId ||
  booking.trip?.title !==
    (trips.find((trip: any) => trip._id === expandedTripId) as any)?.title
) {
  return false;
}
  const search = bookingSearch.toLowerCase().trim();

  const matchesPayment =
    paymentFilter === "All" ||
    booking.paymentStatus === paymentFilter;

    const matchesStatus =
  statusFilter === "All" ||
  booking.status === statusFilter;

  const matchesTrip =
  tripFilter === "All" ||
  booking.trip?.title === tripFilter;

  return matchesPayment && matchesStatus && matchesTrip && (

      String(booking.name || "").toLowerCase().includes(search) ||
      String(booking.email || "").toLowerCase().includes(search) ||
      String(booking.phone || "").toLowerCase().includes(search)
    );
  })
  .map((booking: any) => (
            <tr
              key={booking._id}
              style={{ borderBottom: "1px solid #eee" }}
            >
              <td style={{ padding: "12px", color: "#222" }}>
                {booking.name}
              </td>

              <td style={{ padding: "12px", color: "#222" }}>
                {booking.trip?.title || booking.trip}
              </td>

              <td style={{ padding: "12px", color: "#222" }}>
  {booking.date
    ? new Date(booking.date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—"}
</td>

              <td style={{ padding: "12px", color: "#222" }}>
                {booking.travellers}
              </td>

              <td style={{ padding: "12px", color: "#222" }}>
                ₹{booking.total}
              </td>

              <td style={{ padding: "12px" }}>
  <select
    value={booking.status}
    onChange={(e) =>
      updateBookingStatus(booking._id, e.target.value)
    }
    style={{
      padding: "8px 12px",
      borderRadius: "8px",
      border: "1px solid #ccc",
      cursor: "pointer",
    }}
  >
    <option value="Pending">Pending</option>
    <option value="Confirmed">Confirmed</option>
    <option value="Cancelled">Cancelled</option>
  </select>
</td>

<td style={{ padding: "12px" }}>
  <button
    type="button"
    onClick={() => {
  
  setSelectedBooking(booking);
}}
    style={{
      background: "#2563eb",
      color: "#fff",
      border: "none",
      padding: "8px 14px",
      borderRadius: "8px",
      cursor: "pointer",
    }}
  >
    View
  </button>

{booking.bookingSource === "Admin" &&
  booking.status === "Pending" &&
  booking.paymentStatus === "Pending" && (
    <button
      type="button"
      onClick={() => recordManualPayment(booking)}
      style={{
        background: "#16a34a",
        color: "#fff",
        border: "none",
        padding: "8px 14px",
        borderRadius: "8px",
        cursor: "pointer",
        marginLeft: "8px",
      }}
    >
      Record Payment
    </button>
  )}

</td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {selectedBooking && (
  <div
      ref={bookingDetailsRef}
    style={{

      marginTop: "30px",
      marginBottom: "30px",
      background: "#fff",
      borderRadius: "16px",
      padding: "24px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
    }}
  >
    <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  }}
>
  <h2 style={{ color: "#222", margin: 0 }}>
    Booking Details
  </h2>

  <span
    style={{
      background:
        selectedBooking.status === "Confirmed"
          ? "#22c55e"
          : selectedBooking.status === "Cancelled"
          ? "#ef4444"
          : "#f59e0b",
      color: "#fff",
      padding: "7px 14px",
      borderRadius: "20px",
      fontSize: "14px",
      fontWeight: "bold",
    }}
  >
    {selectedBooking.status}
  </span>
</div>

    <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "18px",
  }}
>
  <div>
    <strong>Trip</strong>
    <p>{selectedBooking.trip?.title || "N/A"}</p>
  </div>

  <div>
    <strong>Customer</strong>
    <p>{selectedBooking.name}</p>
  </div>

  <div>
    <strong>Email</strong>
    <p>{selectedBooking.email}</p>
  </div>

  <div>
    <strong>Phone</strong>
    <p>{selectedBooking.phone}</p>
  </div>

  <div>
    <strong>Date</strong>
    <p>
  {selectedBooking.date
    ? new Date(selectedBooking.date).toLocaleDateString("en-GB")
    : "—"}
</p>
  </div>

  <div>
    <strong>Travellers</strong>
    <p>{selectedBooking.travellers}</p>
  </div>

  <div>
    <strong>Total Amount</strong>
    <p>₹{selectedBooking.total}</p>
  </div>

  <div>
  <strong>Payment Status</strong>
  <p>{selectedBooking.paymentStatus || "Pending"}</p>
</div>

<div>
  <strong>Payment Method</strong>
  <p>
    {selectedBooking.paymentMethod ||
      (selectedBooking.paymentId ? "Razorpay" : "Not recorded")}
  </p>
</div>

<div>
  <strong>Payment Reference</strong>
  <p>
    {selectedBooking.paymentReference ||
      selectedBooking.paymentId ||
      "Not available"}
  </p>
</div>

<div>
  <strong>Booking Source</strong>
  <p>
    {selectedBooking.bookingSource === "Admin"
      ? "Admin (Manual Booking)"
      : "Website (Online Booking)"}
  </p>
</div>

  <div>
    <strong>Special Requests</strong>
    <p>{selectedBooking.requests || "None"}</p>
  </div>
</div>

    <button
      type="button"
      onClick={() => setSelectedBooking(null)}
      style={{
        marginTop: "15px",
        background: "#6b7280",
        color: "#fff",
        border: "none",
        padding: "10px 18px",
        borderRadius: "8px",
        cursor: "pointer",
      }}
    >
      Close
    </button>
  </div>
)}
</>
)}

{activeSection === "trips" && (
  <>
    <div
  style={{
    marginTop: "40px",
    background: "#fff",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
  }}
>
  <h2 style={{ color: "#222", marginBottom: "20px" }}>
    All Trips
  </h2>
  <button
  onClick={() => navigate("/admin/add-trip")}
  style={{
    background: "#2563eb",
    color: "white",
    padding: "12px 20px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "20px",
  }}
>
  + Add Trip
</button>

  <div className="admin-table-scroll">
<table
    style={{
      width: "100%",
      borderCollapse: "collapse",
    }}
  >
    <thead>
      <tr style={{ borderBottom: "2px solid #eee" }}>
        <th style={{ padding: "12px", textAlign: "left" }}>Title</th>
        <th style={{ padding: "12px", textAlign: "left" }}>Location</th>
        <th style={{ padding: "12px", textAlign: "left" }}>Duration</th>
        <th style={{ padding: "12px", textAlign: "left" }}>Price</th>
        <th style={{ padding: "12px", textAlign: "left" }}>Action</th>
      </tr>
    </thead>

    <tbody>
      {trips.map((trip: any) => (
        <tr
          key={trip._id}
          style={{ borderBottom: "1px solid #eee" }}
        >
          <td style={{ padding: "12px", color: "#222" }}>
            {trip.title}
          </td>

          <td style={{ padding: "12px", color: "#222" }}>
            {trip.location}
          </td>

          <td style={{ padding: "12px", color: "#222" }}>
            {trip.duration}
          </td>

          <td style={{ padding: "12px", color: "#222" }}>
            ₹{trip.price}
          </td>
          <td style={{ padding: "12px" }}>
<button
onClick={() => setEditingTrip(trip)}
  style={{
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    marginRight: "10px",
  }}
>
  Edit
</button>

  <button
    onClick={() => deleteTrip(trip._id)}
    style={{
      background: "#ef4444",
      color: "#fff",
      border: "none",
      padding: "8px 14px",
      borderRadius: "8px",
      cursor: "pointer",
    }}
  >
    Delete
  </button>
</td>
        </tr>
      ))}
    </tbody>
  </table>
  </div>
</div>
  </>
)}

  </div>
    </div>   
);
}

export default Admin;