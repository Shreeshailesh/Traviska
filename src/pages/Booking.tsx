import { useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";

function Booking() {
  const location = useLocation();

  const trip = location.state;

  const [travellers, setTravellers] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(
  trip?.selectedDate
    ? new Date(trip.selectedDate).toISOString().split("T")[0]
    : ""
);
  const [requests, setRequests] = useState("");

  const price = Number(
    trip?.price?.toString().replace(/[₹,]/g, "")
  ) || 0;

  const total = price * travellers;

  const handleSubmit = async () => {
    if (!name || !email || !phone || !date) {
      alert("Please fill all required details");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:5001/booking",
        {
          trip,
          slotId: trip?.slotId,
          name,
          email,
          phone,
          date,
          travellers,
          requests,
          total,
        }
      );

      alert(response.data.message);
    } catch (err) {
      console.error(err);
      alert("Booking failed!");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "120px 40px 60px",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          background: "#fff",
          padding: "35px",
          borderRadius: "16px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ color: "#222", marginBottom: "25px" }}>
          Book Your Trip
        </h1>

        {trip && (
          <div
            style={{
              background: "#fff7f0",
              padding: "18px",
              borderRadius: "12px",
              marginBottom: "25px",
            }}
          >
            <h2 style={{ margin: "0 0 8px", color: "#222" }}>
              {trip.title}
            </h2>

            <p style={{ margin: "5px 0", color: "#555" }}>
              📍 {trip.location}
            </p>

            <p style={{ margin: "5px 0", color: "#555" }}>
              ⏳ {trip.duration}
            </p>

            <p
              style={{
                margin: "10px 0 0",
                fontWeight: "700",
                color: "#ff6b00",
              }}
            >
              ₹{price} per person
            </p>
          </div>
        )}

        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          type="tel"
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={inputStyle}
        />

        <label style={labelStyle}>Travel Date</label>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={inputStyle}
        />

        <label style={labelStyle}>Number of Travelers</label>

        <input
          type="number"
          min="1"
          value={travellers}
          onChange={(e) =>
            setTravellers(Number(e.target.value))
          }
          style={inputStyle}
        />

        <textarea
          placeholder="Special Requests"
          value={requests}
          onChange={(e) => setRequests(e.target.value)}
          style={{
            ...inputStyle,
            height: "100px",
            resize: "vertical",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "25px",
            paddingTop: "20px",
            borderTop: "1px solid #eee",
          }}
        >
          <strong style={{ fontSize: "20px", color: "#222" }}>
            Total: ₹{total}
          </strong>

          <button
            onClick={handleSubmit}
            style={{
              background: "#ff6b00",
              color: "#fff",
              border: "none",
              padding: "14px 28px",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Confirm Booking
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "13px",
  marginBottom: "15px",
  border: "1px solid #ddd",
  borderRadius: "8px",
  fontSize: "16px",
  boxSizing: "border-box" as const,
};

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  fontWeight: "600",
  color: "#333",
};

export default Booking;