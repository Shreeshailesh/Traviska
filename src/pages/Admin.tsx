import { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import "./Admin.css";
import { useNavigate } from "react-router-dom";

function Admin() {
    const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [trips, setTrips] = useState([]);
  const [editingTrip, setEditingTrip] = useState<any>(null);

  const [slots, setSlots] = useState([]);
const [selectedTripForSlot, setSelectedTripForSlot] = useState("");
const [slotDate, setSlotDate] = useState("");
const [totalSlots, setTotalSlots] = useState(20);

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
}, []);

const fetchBookings = async () => {
  try {
    const { data } = await axios.get("http://localhost:5001/bookings", {
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
const { data } = await axios.get("http://localhost:5001/trips", {
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});
    setTrips(data);
  } catch (err) {
    console.error(err);
  }
};

const fetchSlots = async () => {
  try {
    const { data } = await axios.get(
      "http://localhost:5001/trip-slots",
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
      `http://localhost:5001/trips/${editingTrip._id}`,
      editingTrip
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
  try {
    await axios.delete(`http://localhost:5001/trips/${id}`);

    alert("Trip Deleted Successfully!");

    fetchTrips();
  } catch (err) {
    console.error(err);
    alert("Failed to delete trip");
  }
};

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
      "http://localhost:5001/trip-slots",
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
  } catch (err) {
    console.error(err);
    alert("Failed to create trip slot");
  }
};

const paidBookings = bookings.filter(
  (booking: any) => booking.status === "Paid"
).length;


return (
  <div
    style={{
      display: "flex",
      background: "#f5f7fb",
      minHeight: "100vh",
    }}
  >
    <Sidebar />

    <div
  style={{
    flex: 1,
    padding: "40px",
    overflowX: "auto",
  }}
  >
  
    <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
  }}
>
  <h1 className="admin-title">
    Traviska Admin Dashboard
  </h1>

  <button
    onClick={handleLogout}
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
          </tr>
        );
      })}
    </tbody>
  </table>
</div>

    {editingTrip && (
  <div
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

    {/* Stats Cards */}
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
    </div>
    <div style={{ marginTop: "30px" }}>

    </div>
    {/* Recent Bookings */}
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
        Recent Bookings
      </h2>

      <table
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
          {bookings.map((booking: any) => (
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
                {booking.date}
              </td>

              <td style={{ padding: "12px", color: "#222" }}>
                {booking.travellers}
              </td>

              <td style={{ padding: "12px", color: "#222" }}>
                ₹{booking.total}
              </td>

              <td style={{ padding: "12px" }}>
                <span
                  style={{
                    background: "#22c55e",
                    color: "#fff",
                    padding: "6px 12px",
                    borderRadius: "20px",
                    fontSize: "14px",
                  }}
                >
                  {booking.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
    </div>   
);
}

export default Admin;