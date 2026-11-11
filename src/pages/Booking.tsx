
import { useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../api";

function Booking() {
  const location = useLocation();
  const trip = location.state;

  const [travellers, setTravellers] = useState(
    trip?.travellers ? Number(trip.travellers) : 1
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [date, setDate] = useState(
    trip?.selectedDate
      ? new Date(trip.selectedDate)
          .toISOString()
          .split("T")[0]
      : ""
  );

  const [requests, setRequests] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const price =
    Number(
      trip?.price?.toString().replace(/[₹,]/g, "")
    ) || 0;

  const total = price * travellers;

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    if (
      !name.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !date
    ) {
      alert("Please fill all required details");
      return;
    }

    if (!trip?._id || !trip?.slotId) {
      alert("Please select a valid trip and travel date");
      return;
    }

    if (
      !Number.isSafeInteger(travellers) ||
      travellers < 1
    ) {
      alert("Please enter a valid number of travelers");
      return;
    }

    if (!(window as any).Razorpay) {
      alert(
        "Payment gateway could not load. Please refresh the page."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Create a Razorpay order.
      // The backend calculates the actual trip price.
      const orderResponse = await axios.post(
        `${API_BASE_URL}/create-order`,
        {
          tripId: trip._id,
          slotId: trip.slotId,
          travellers,
        }
      );

      const order = orderResponse.data.order;

      if (
        !orderResponse.data.success ||
        !order?.id
      ) {
        throw new Error(
          "Could not create payment order"
        );
      }

      // Step 2: Open Razorpay Checkout.
      const razorpay = new (window as any).Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        name: "Traviska",
        description: trip.title,
        order_id: order.id,

        prefill: {
          name,
          email,
          contact: phone,
        },

        theme: {
          color: "#ff6b00",
        },

        // Step 3: Verify payment on the backend.
        handler: async (paymentResponse: any) => {
          try {
            const customerToken =
              localStorage.getItem("customerToken");

            const verification = await axios.post(
              `${API_BASE_URL}/verify-payment`,
              {
                razorpay_order_id:
                  paymentResponse.razorpay_order_id,

                razorpay_payment_id:
                  paymentResponse.razorpay_payment_id,

                razorpay_signature:
                  paymentResponse.razorpay_signature,

                bookingDetails: {
                  tripId: trip._id,
                  slotId: trip.slotId,
                  travellers,
                  name,
                  email,
                  phone,
                  requests,
                },
              },
              {
                // Authenticated customers get bookings
                // linked to their customer account.
                // Guests can book without a token.
                headers: customerToken
                  ? {
                      Authorization:
                        `Bearer ${customerToken}`,
                    }
                  : {},
              }
            );

            if (
              verification.data.success &&
              verification.data.bookingConfirmed
            ) {
              alert(
                "Payment successful! Your booking is confirmed."
              );
            } else {
              alert(
                "Payment received, but booking confirmation is pending. " +
                  `Contact support with order ID: ${order.id}`
              );
            }
          } catch (verificationError) {
            console.error(
              "Payment verification error:",
              verificationError
            );

            alert(
              "Your payment may have been received, but we could not " +
                "confirm your booking. Do not pay again. " +
                `Contact support with order ID: ${order.id}`
            );
          }
        },
      });

      razorpay.on(
        "payment.failed",
        (response: any) => {
          console.error(
            "Razorpay payment failed:",
            response.error
          );

          alert(
            "Payment was not completed. Please check its status before retrying."
          );
        }
      );

      razorpay.open();
    } catch (error) {
      console.error(
        "Payment order creation failed:",
        error
      );

     alert(
  import.meta.env.PROD
    ? "Online payments are temporarily unavailable. Please contact Traviska for booking assistance."
    : "Could not start payment. Please try again."
);
    } finally {
      setIsSubmitting(false);
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
          boxShadow:
            "0 10px 25px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            color: "#222",
            marginBottom: "25px",
          }}
        >
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
            <h2
              style={{
                margin: "0 0 8px",
                color: "#222",
              }}
            >
              {trip.title}
            </h2>

            <p
              style={{
                margin: "5px 0",
                color: "#555",
              }}
            >
              📍 {trip.location}
            </p>

            <p
              style={{
                margin: "5px 0",
                color: "#555",
              }}
            >
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
          onChange={(e) =>
            setName(e.target.value)
          }
          style={inputStyle}
        />

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          style={inputStyle}
        />

        <input
          type="tel"
          placeholder="Phone Number"
          value={phone}
          onChange={(e) =>
            setPhone(e.target.value)
          }
          style={inputStyle}
        />

        <label style={labelStyle}>
          Travel Date
        </label>

        <input
          type="date"
          value={date}
          onChange={(e) =>
            setDate(e.target.value)
          }
          style={inputStyle}
        />

        <label style={labelStyle}>
          Number of Travelers
        </label>

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
          onChange={(e) =>
            setRequests(e.target.value)
          }
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
            flexWrap: "wrap",
            gap: "15px",
            marginTop: "25px",
            paddingTop: "20px",
            borderTop: "1px solid #eee",
          }}
        >
          <strong
            style={{
              fontSize: "20px",
              color: "#222",
            }}
          >
            Total: ₹{total}
          </strong>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              background: "#ff6b00",
              color: "#fff",
              border: "none",
              padding: "14px 28px",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: isSubmitting
                ? "not-allowed"
                : "pointer",
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting
              ? "Processing..."
              : "Confirm Booking"}
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
