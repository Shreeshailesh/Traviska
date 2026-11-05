
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";

import { auth } from "../firebase";

export default function CustomerLogin() {
    const navigate = useNavigate();
  const [phone, setPhone] = useState("");

  const [otp, setOtp] = useState("");
const [otpSent, setOtpSent] = useState(false);
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
const [confirmationResult, setConfirmationResult] =
  useState<ConfirmationResult | null>(null);

const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

useEffect(() => {
  return () => {
    recaptchaVerifierRef.current?.clear();
    recaptchaVerifierRef.current = null;
  };
}, []);

  const handleSendOtp = async () => {
  if (!/^[6-9]\d{9}$/.test(phone)) {
    setError("Enter a valid 10-digit mobile number");
    return;
  }

  setLoading(true);
  setError("");

  try {
    if (!recaptchaVerifierRef.current) {
  recaptchaVerifierRef.current = new RecaptchaVerifier(
    auth,
    "recaptcha-container",
    { size: "invisible" }
  );
}

const verifier = recaptchaVerifierRef.current;
    const result = await signInWithPhoneNumber(
      auth,
      `+91${phone}`,
      verifier
    );

    setConfirmationResult(result);
    setOtpSent(true);
  } catch (err) {
    console.error("OTP request failed:", err);
    setError("Could not send OTP. Please try again.");
  } finally {
    setLoading(false);
  }
};

 const handleVerifyOtp = async () => {
  if (!confirmationResult || otp.length !== 6) {
    setError("Please enter a valid 6-digit OTP");
    return;
  }

  setLoading(true);
  setError("");

  try {
    const result = await confirmationResult.confirm(otp);

    const idToken = await result.user.getIdToken();

    const response = await fetch(
  "http://localhost:5001/customer/firebase-login",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  }
);

const data = await response.json();

if (!response.ok || !data.success) {
  throw new Error(data.message || "Customer login failed");
}

console.log("Traviska customer login successful:", data.customer);

localStorage.setItem("customerToken", data.token);
localStorage.setItem("customer", JSON.stringify(data.customer));
navigate("/customer/dashboard", { replace: true });

  } catch (err) {
    console.error("OTP verification failed:", err);
    setError("Invalid or expired OTP. Please try again.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "80px auto",
        padding: "30px",
        border: "1px solid #ddd",
        borderRadius: "12px",
        textAlign: "center",
        backgroundColor: "#1f1f1f",
color: "#ffffff",
      }}
    >
      <h2>Customer Login</h2>

      <p>Login or register using your mobile number</p>

      <input
        type="tel"
        placeholder="Enter 10-digit mobile number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        maxLength={10}
       style={{
  width: "100%",
  padding: "12px",
  marginBottom: "16px",
  boxSizing: "border-box",
  backgroundColor: "#2a2a2a",
  color: "#ffffff",
  border: "1px solid #888",
  borderRadius: "8px",
  outline: "none",
  fontSize: "15px",
}}
      />

      <button
        type="button"
        onClick={handleSendOtp}
        disabled={!/^[6-9]\d{9}$/.test(phone)}
       style={{
  padding: "12px 24px",
  backgroundColor: "#ff6b00",
  color: "#ffffff",
  border: "none",
  borderRadius: "8px",
  fontSize: "15px",
  fontWeight: "bold",
  cursor: "pointer",
  opacity: /^[6-9]\d{9}$/.test(phone) ? 1 : 0.5,
}}
      >
        Send OTP
      </button>

      {error && (
  <p
    role="alert"
    style={{
      color: "#ff6b6b",
      fontSize: "14px",
      marginTop: "12px",
    }}
  >
    {error}
  </p>
)}

      <div id="recaptcha-container"></div>

      {otpSent && (
  <div style={{ marginTop: "20px" }}>
    <h3>Verify OTP</h3>

    <input
      type="text"
      inputMode="numeric"
      placeholder="Enter 6-digit OTP"
      value={otp}
      onChange={(e) =>
        setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
      }
      maxLength={6}
      style={{
        width: "100%",
        padding: "12px",
        boxSizing: "border-box",
        backgroundColor: "#2a2a2a",
        color: "#ffffff",
        border: "1px solid #888",
        borderRadius: "8px",
        fontSize: "16px",
        textAlign: "center",
      }}
    />
    <button
  type="button"
  onClick={handleVerifyOtp}
  disabled={otp.length !== 6 || loading}
  style={{
    marginTop: "15px",
    padding: "12px 24px",
    backgroundColor: "#ff6b00",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
    opacity: otp.length === 6 && !loading ? 1 : 0.5,
  }}
>
  {loading ? "Verifying..." : "Verify OTP"}
</button>
  </div>
)}

      <p style={{ fontSize: "13px", marginTop: "20px" }}>
        You can also book trips without logging in.
      </p>
    </div>
  );
}
