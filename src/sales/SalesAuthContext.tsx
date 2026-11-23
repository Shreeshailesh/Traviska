import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../api";

export interface SalesUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "sales" | "sales_lead";
  department?: string;
}

interface SalesAuthContextType {
  token: string | null;
  user: SalesUser | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const SalesAuthContext = createContext<SalesAuthContextType | undefined>(undefined);

export const SalesAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SalesUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      // Check for sales token or admin token in localStorage
      const storedToken = localStorage.getItem("sales_token") || localStorage.getItem("token");
      const storedUser = localStorage.getItem("sales_user");

      if (storedToken) {
        if (!cancelled) setToken(storedToken);
        if (storedUser) {
          try {
            if (!cancelled) setUser(JSON.parse(storedUser));
          } catch {
            if (!cancelled) setUser(null);
          }
        } else if (localStorage.getItem("isAdmin") === "true") {
          try {
            const res = await axios.get(`${API_BASE_URL}/admin/verify`, {
              headers: { Authorization: `Bearer ${storedToken}` },
              timeout: 4000,
            });
            if (!cancelled && res.data?.success !== false) {
              setUser({
                id: res.data?.user?._id || "admin-user",
                name: res.data?.user?.name || "Admin User",
                email: res.data?.user?.email || "admin@traviska.com",
                role: "admin",
                department: "Executive Management",
              });
            }
          } catch {
            if (!cancelled) setUser(null);
          }
        } else {
          if (!cancelled) setUser(null);
        }
      }
      if (!cancelled) setIsLoading(false);
    };

    initAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/sales/login`, {
        email: email.trim().toLowerCase(),
        password: pass.trim(),
      });

      if (response.data.success && response.data.token) {
        const authToken = response.data.token;
        const authUser = response.data.user;

        localStorage.setItem("sales_token", authToken);
        localStorage.setItem("sales_user", JSON.stringify(authUser));

        setToken(authToken);
        setUser(authUser);
        return { success: true };
      }
      return { success: false, message: response.data.message || "Login failed" };
    } catch (error: any) {
      const msg = error.response?.data?.message || "Invalid email or password.";
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem("sales_token");
    localStorage.removeItem("sales_user");
    setToken(null);
    setUser(null);
  };

  return (
    <SalesAuthContext.Provider
      value={{
        token,
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: Boolean(token && user),
      }}
    >
      {children}
    </SalesAuthContext.Provider>
  );
};

export const useSalesAuth = () => {
  const context = useContext(SalesAuthContext);
  if (!context) {
    throw new Error("useSalesAuth must be used within a SalesAuthProvider");
  }
  return context;
};

