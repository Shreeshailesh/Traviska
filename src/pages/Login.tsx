import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Login() {
    const navigate = useNavigate();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const handleLogin = async () => {
  try {
    console.log("Step 1: Login button clicked");
    const { data } = await axios.post(
      "http://localhost:5001/login",
      {
        email,
        password,
      }
    );

    console.log("Server Response:", data);
    if (data.success) {
        localStorage.setItem("token", data.token);
navigate("/admin");
    }
  } catch (err) {
    console.log(err);
    alert("Login Failed");
  }
};

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "40px",
          borderRadius: "15px",
          width: "400px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            marginBottom: "30px",
            color: "#ff6b00",
          }}
        >
          Traviska Login
        </h1>

        <input
  type="email"
  placeholder="Email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "15px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            fontSize: "16px",
            color: "#000",
            background: "#fff",
          }}
        />

        <input
  type="password"
  placeholder="Password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "25px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            fontSize: "16px",
            color: "#000",
            background: "#fff",
          }}
        />

      <button
  style={{
    padding: "10px 25px",
    cursor: "pointer",
  }}
  onClick={handleLogin}
  
>
  Login
</button>

      </div>
    </div>
  );
}

export default Login;