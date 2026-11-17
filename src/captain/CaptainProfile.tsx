import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  Building2,
  Headphones,
  LogOut,
  ChevronRight,
  Phone,
  Mail,
  X,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useCaptainAuth } from "./CaptainAuthContext";
import { API_BASE_URL } from "../api";

export const CaptainProfile: React.FC = () => {
  const { captain, logout, token } = useCaptainAuth();
  const navigate = useNavigate();

  const [walletCredit, setWalletCredit] = useState<number>(12000);
  const [totalTrips, setTotalTrips] = useState<number>(15);
  const [rating] = useState<string>("4.9 (18 reviews)");

  // Modals
  const [showSupport, setShowSupport] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  useEffect(() => {
    fetchProfileStats();
  }, [token]);

  const fetchProfileStats = async () => {
    try {
      const curToken = token || localStorage.getItem("captainToken");
      if (!curToken) return;

      const resWallet = await fetch(`${API_BASE_URL}/captain/wallet`, {
        headers: { Authorization: `Bearer ${curToken}` },
      });
      const dataWallet = await resWallet.json();
      if (dataWallet.success && dataWallet.wallet) {
        setWalletCredit(dataWallet.wallet.pendingBalance || 0);
      }

      const resTrips = await fetch(`${API_BASE_URL}/captain/portal/trips`, {
        headers: { Authorization: `Bearer ${curToken}` },
      });
      const dataTrips = await resTrips.json();
      if (dataTrips.success && Array.isArray(dataTrips.trips)) {
        setTotalTrips(dataTrips.trips.length);
      }
    } catch (err) {
      console.error("Profile stats fetch fallback:", err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/captain/login");
  };

  const captainName = captain?.name || "Shailesh";
  const initial = captainName.charAt(0).toUpperCase() || "S";
  const captainPhone = captain?.phone ? `+91 ${captain.phone.replace(/^\+91/, "")}` : "+91 91234 56789";
  const captainRole = captain?.role || "Head Captain";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-title-group">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <h1 className="admin-page-title">Captain Officer Profile</h1>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "#e8f5e9",
                color: "#164e23",
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: "999px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#164e23",
                }}
              />
              Verified Captain
            </span>
          </div>
          <p className="admin-page-subtitle">
            Officer credential record, operational permissions, rating summary, and disbursement profile.
          </p>
        </div>

        <div className="admin-page-actions">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => setShowSupport(true)}
          >
            <Headphones size={15} />
            <span>Operations Hotline</span>
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => setShowLogoutConfirm(true)}
            style={{ color: "#dc2626" }}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Hero Officer Identity Card with Signature Mountain Silhouette Header */}
      <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Banner with Mountain SVG watermark */}
        <div
          style={{
            background: "linear-gradient(135deg, #092312 0%, #0d381c 50%, #164e27 100%)",
            padding: "28px",
            position: "relative",
            color: "#ffffff",
          }}
        >
          <svg
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              height: "100%",
              opacity: 0.15,
              pointerEvents: "none",
            }}
            viewBox="0 0 300 100"
            fill="none"
          >
            <polygon points="50,100 150,20 250,100" fill="#ffffff" />
            <polygon points="120,100 220,10 320,100" fill="#ffffff" />
          </svg>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "20px",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
              {/* Avatar circle */}
              <div
                style={{
                  width: "68px",
                  height: "68px",
                  borderRadius: "50%",
                  background: "#d9eec7",
                  color: "#0d2b17",
                  fontWeight: 800,
                  fontSize: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
                  flexShrink: 0,
                }}
              >
                {initial}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <h2 style={{ fontSize: "22px", fontWeight: 800, margin: 0, color: "#ffffff" }}>
                    {captainName}
                  </h2>
                  <span
                    style={{
                      background: "rgba(217, 238, 199, 0.2)",
                      border: "1px solid rgba(217, 238, 199, 0.4)",
                      color: "#d9eec7",
                      padding: "2px 8px",
                      borderRadius: "999px",
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {captainRole}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "13px", color: "#e2e8f0" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Phone size={14} color="#d9eec7" />
                    {captainPhone}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <ShieldCheck size={14} color="#d9eec7" />
                    Officer Badge Verified
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => navigate("/captain/bank-details")}
                style={{
                  background: "rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                }}
              >
                <Building2 size={15} />
                <span>Bank Details</span>
              </button>

              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => navigate("/captain/payout-history")}
                style={{
                  background: "rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                }}
              >
                <Wallet size={15} />
                <span>Payout Ledger</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Quick Stat Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            borderTop: "1px solid #e7ecf0",
            background: "#ffffff",
          }}
        >
          <div style={{ padding: "20px 24px", borderRight: "1px solid #e7ecf0" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
              Total Expeditions
            </div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
              {totalTrips} Trips
            </div>
            <div style={{ fontSize: "12px", color: "#166534", marginTop: "2px" }}>100% completion rate</div>
          </div>

          <div style={{ padding: "20px 24px", borderRight: "1px solid #e7ecf0" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
              Traveller Rating
            </div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Star size={20} fill="#eab308" color="#eab308" />
              <span>{rating}</span>
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>Verified customer reviews</div>
          </div>

          <div style={{ padding: "20px 24px", borderRight: "1px solid #e7ecf0" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
              Pending Balance
            </div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#164e23", marginTop: "4px" }}>
              ₹ {walletCredit.toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>Ready for disbursement</div>
          </div>

          <div style={{ padding: "20px 24px" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
              Status
            </div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
              Active On Duty
            </div>
            <div style={{ fontSize: "12px", color: "#166534", marginTop: "2px" }}>Authorized for departures</div>
          </div>
        </div>
      </div>

      {/* Settings & Links Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px" }}>
        {/* Card 1: Bank & Disbursement Account */}
        <div
          className="admin-card"
          onClick={() => navigate("/captain/bank-details")}
          style={{ cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  background: "#dcfce7",
                  color: "#166534",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Building2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                  Bank &amp; UPI Account
                </h3>
                <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                  Manage destination bank account for direct deposits
                </p>
              </div>
            </div>
            <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>
              Update your account number, bank IFSC code, and primary UPI ID to receive automatic honorarium and expense claims.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "14px", borderTop: "1px solid #f1f5f9", marginTop: "14px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#164e23" }}>Configure Settlement Account</span>
            <ChevronRight size={16} color="#164e23" />
          </div>
        </div>

        {/* Card 2: Payout Ledger */}
        <div
          className="admin-card"
          onClick={() => navigate("/captain/payout-history")}
          style={{ cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  background: "#e0f2fe",
                  color: "#0369a1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Wallet size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                  Payouts &amp; Settlement Ledger
                </h3>
                <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                  Review transactions, IMPS references &amp; UTR codes
                </p>
              </div>
            </div>
            <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>
              Audit past settlements, check processing status of recent trips, and track reimbursements disbursed by finance.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "14px", borderTop: "1px solid #f1f5f9", marginTop: "14px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#164e23" }}>View Complete Ledger</span>
            <ChevronRight size={16} color="#164e23" />
          </div>
        </div>

        {/* Card 3: Operations Support Hotline */}
        <div
          className="admin-card"
          onClick={() => setShowSupport(true)}
          style={{ cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  background: "#fef3c7",
                  color: "#b45309",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Headphones size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                  Operations Desk Hotline
                </h3>
                <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                  24x7 Road support, emergency &amp; dispatch desk
                </p>
              </div>
            </div>
            <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>
              Contact dispatch supervisors for emergency road assistance, itinerary updates, and urgent manifest resolutions.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "14px", borderTop: "1px solid #f1f5f9", marginTop: "14px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#164e23" }}>Reach Operations Desk</span>
            <ChevronRight size={16} color="#164e23" />
          </div>
        </div>
      </div>

      {/* Operations Hotline Modal */}
      {showSupport && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              background: "#ffffff",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #092312 0%, #0d381c 50%, #164e27 100%)",
                padding: "20px 24px",
                position: "relative",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Headphones size={20} color="#d9eec7" />
                <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#ffffff" }}>
                  Operations Desk Hotline
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSupport(false)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                  24x7 Emergency Operations Line
                </div>
                <a
                  href="tel:+918001234567"
                  style={{
                    fontSize: "17px",
                    fontWeight: 800,
                    color: "#164e23",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "4px",
                  }}
                >
                  <Phone size={16} />
                  +91 80012 34567
                </a>
              </div>

              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                  Operations Desk Email
                </div>
                <a
                  href="mailto:operations@traviska.com"
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#164e23",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "4px",
                  }}
                >
                  <Mail size={16} />
                  operations@traviska.com
                </a>
              </div>

              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setShowSupport(false)}
                style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "420px",
              background: "#ffffff",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #092312 0%, #0d381c 50%, #164e27 100%)",
                padding: "20px 24px",
                position: "relative",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <LogOut size={20} color="#f87171" />
                <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#ffffff" }}>
                  Confirm Sign Out
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "24px" }}>
              <p style={{ fontSize: "14px", color: "#334155", lineHeight: 1.5, margin: "0 0 20px 0" }}>
                Are you sure you want to log out of the Captain Operations Portal?
              </p>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setShowLogoutConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={handleLogout}
                  style={{ background: "#dc2626", borderColor: "#dc2626" }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaptainProfile;
