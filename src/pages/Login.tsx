
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../api";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      alert("Please enter your email and password");
      return;
    }

    if (isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/login`,
        {
          email: email.trim(),
          password,
        }
      );

      if (data.success && data.user?.role === "admin" && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("isAdmin", "true");

        navigate("/admin", { replace: true });
      } else {
        alert("Admin access only");
      }
    } catch (error) {
      console.error("Admin login failed:", error);
      alert("Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
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
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "40px",
          borderRadius: "15px",
          width: "100%",
          maxWidth: "400px",
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
          autoComplete="username"
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "15px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            fontSize: "16px",
            color: "#000",
            background: "#fff",
            boxSizing: "border-box",
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleLogin();
            }
          }}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "25px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            fontSize: "16px",
            color: "#000",
            background: "#fff",
            boxSizing: "border-box",
          }}
        />

        <button
          type="button"
          onClick={handleLogin}
          disabled={isLoading}
          style={{
            background: "#ff6b00",
            color: "#fff",
            border: "none",
            padding: "12px 30px",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </div>
    </div>
  );
}

export default Login;
