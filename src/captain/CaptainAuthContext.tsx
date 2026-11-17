import React, { createContext, useContext, useState, useEffect } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { API_BASE_URL } from "../api";
import { auth } from "../firebase";

export interface CaptainPermissions {
  isHead: boolean;
  isMain: boolean;
  isTrainee: boolean;
  canFinalizeAttendance: boolean;
  canMarkAttendance: boolean;
  canApproveExpenses: boolean;
  canSubmitExpenses: boolean;
  canCompleteTrip: boolean;
}

export interface CaptainUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: "Head Captain" | "Main Captain" | "Trainee Captain" | string;
  permissions?: CaptainPermissions;
  rating?: number;
  totalTrips?: number;
  completedTrips?: number;
  upcomingTrips?: number;
  wallet?: {
    pendingBalance: number;
    totalEarned: number;
    advanceReceived: number;
  };
}

export const normalizeCaptainRole = (role?: string): "Head Captain" | "Main Captain" | "Trainee Captain" => {
  const r = (role || "Head Captain").toLowerCase();
  if (r.includes("head") || r.includes("lead")) return "Head Captain";
  if (r.includes("main") || r.includes("assistant")) return "Main Captain";
  return "Trainee Captain";
};

export const getRolePermissions = (role?: string): CaptainPermissions => {
  const norm = normalizeCaptainRole(role);
  return {
    isHead: norm === "Head Captain",
    isMain: norm === "Main Captain",
    isTrainee: norm === "Trainee Captain",
    canFinalizeAttendance: norm === "Head Captain",
    canMarkAttendance: norm === "Head Captain" || norm === "Main Captain",
    canApproveExpenses: norm === "Head Captain",
    canSubmitExpenses: true,
    canCompleteTrip: norm === "Head Captain",
  };
};

interface CaptainAuthContextType {
  token: string | null;
  captain: CaptainUser | null;
  login: (token: string, captainData: CaptainUser) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  loading: boolean;
}

const CaptainAuthContext = createContext<CaptainAuthContextType>({
  token: null,
  captain: null,
  login: () => {},
  logout: () => {},
  refreshProfile: async () => {},
  loading: true,
});

export const CaptainAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const enrichCaptain = (c: any): CaptainUser | null => {
    if (!c) return null;
    const role = normalizeCaptainRole(c.role);
    const permissions = c.permissions || getRolePermissions(role);
    return { ...c, role, permissions };
  };

  const [token, setToken] = useState<string | null>(() => localStorage.getItem("captainToken"));
  const [captain, setCaptain] = useState<CaptainUser | null>(() => {
    const saved = localStorage.getItem("captainUser");
    if (!saved) return null;
    try {
      return enrichCaptain(JSON.parse(saved));
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const refreshProfile = async () => {
    const curToken = token || localStorage.getItem("captainToken");
    if (!curToken) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/captain/me`, {
        headers: { Authorization: `Bearer ${curToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.captain) {
          const enriched = enrichCaptain(data.captain);
          setCaptain(enriched);
          localStorage.setItem("captainUser", JSON.stringify(enriched));
        }
      } else if (res.status === 401 || res.status === 403) {
        // Session invalid or captain deactivated
        logout();
      }
    } catch (err) {
      console.log("Captain profile refresh fallback:", err);
    } finally {
      setLoading(false);
    }
  };

  const login = (newToken: string, captainData: CaptainUser) => {
    const enriched = enrichCaptain(captainData);
    setToken(newToken);
    setCaptain(enriched);
    localStorage.setItem("captainToken", newToken);
    localStorage.setItem("captainUser", JSON.stringify(enriched));
  };

  const logout = () => {
    setToken(null);
    setCaptain(null);
    localStorage.removeItem("captainToken");
    localStorage.removeItem("captainUser");
  };

  // Keep Firebase ID token fresh across active sessions
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (user) {
        try {
          const freshToken = await user.getIdToken();
          setToken(freshToken);
          localStorage.setItem("captainToken", freshToken);
        } catch (e) {
          console.warn("Could not refresh captain token:", e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (token) {
      refreshProfile();
    }
  }, [token]);

  return (
    <CaptainAuthContext.Provider
      value={{
        token,
        captain,
        login,
        logout,
        refreshProfile,
        loading,
      }}
    >
      {children}
    </CaptainAuthContext.Provider>
  );
};

export const useCaptainAuth = () => useContext(CaptainAuthContext);
