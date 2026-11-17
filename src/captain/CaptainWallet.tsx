import React, { useEffect, useState } from "react";
import {
  Wallet,
  ArrowDownLeft,
  Building,
  CheckCircle2,
  Clock,
  Loader2,
  TrendingUp,
  Info,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { useCaptainAuth } from "./CaptainAuthContext";
import { API_BASE_URL } from "../api";

interface TripBreakdownItem {
  _id: string;
  slotId: string;
  tripTitle: string;
  location?: string;
  departureDate: string;
  tripFee: number;
  approvedExpenses: number;
  companyAdvance: number;
  totalPayout: number;
  amountPaid: number;
  balance: number;
  status: string;
  traviskaCardExpenses: number;
  traviskaUpiExpenses: number;
}

interface SettlementTransaction {
  _id: string;
  payoutId?: string;
  tripTitle: string;
  departureDate: string;
  amount: number;
  paymentMethod: string;
  paymentReference: string;
  settledAt: string;
  settledBy?: string;
  notes?: string;
}

interface WalletData {
  tripEarnings: number;
  advancesReceived: number;
  approvedReimbursements: number;
  pendingReimbursements: number;
  payableBalance: number;
  totalPaidOut: number;
  tripBreakdown: TripBreakdownItem[];
  history: SettlementTransaction[];
}

export const CaptainWallet: React.FC = () => {
  const { token, captain } = useCaptainAuth();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletData>({
    tripEarnings: 0,
    advancesReceived: 0,
    approvedReimbursements: 0,
    pendingReimbursements: 0,
    payableBalance: 0,
    totalPaidOut: 0,
    tripBreakdown: [],
    history: [],
  });

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const curToken = token || localStorage.getItem("captainToken");
      const res = await fetch(`${API_BASE_URL}/captain/wallet`, {
        headers: {
          Authorization: `Bearer ${curToken}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.wallet) {
          setWallet(data.wallet);
        }
      }
    } catch (err) {
      console.error("Failed to load captain wallet:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [token]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-[18px] border border-[#E5EBE7] shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#174C3C] uppercase tracking-wider mb-1">
            <Wallet className="w-3.5 h-3.5" />
            <span>Financials & Settlements</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#172B24] tracking-tight">
            Captain Wallet
          </h2>
          <p className="text-xs sm:text-sm text-[#66756E] mt-1">
            Track honorarium earnings, advance disbursements, approved reimbursements and bank settlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#EAF3EE] text-[#174C3C] border border-[#174C3C]/20">
            {captain?.name || "Muskan B."} • {captain?.role || "Main Captain"}
          </span>
        </div>
      </div>

      {/* Six Real Financial Metric Cards (Task 6) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Final Payable Balance (HERO CARD) */}
        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-[#174C3C] to-[#0d2b17] text-white p-5 rounded-[20px] shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                Final Payable Balance
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                Live Dues
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-black mt-2">
              ₹{wallet.payableBalance.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-emerald-200 mt-1 font-medium">
              Net honorarium & approved claims owed to you
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-xs text-emerald-100">
            <span>Settled within T+2 days of trip wrap-up</span>
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
          </div>
        </div>

        {/* Card 2: Trip Earnings (Honorarium) */}
        <div className="bg-white p-4 sm:p-5 rounded-[18px] border border-[#E5EBE7] shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-[#174C3C] mb-2">
            <span className="text-xs font-bold text-[#66756E] uppercase tracking-wider">
              Trip Earnings
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#EAF3EE] flex items-center justify-center text-[#174C3C]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#172B24]">
            ₹{wallet.tripEarnings.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-[#66756E] mt-1 font-medium">
            Base fees across assigned trips
          </p>
        </div>

        {/* Card 3: Approved Reimbursements */}
        <div className="bg-white p-4 sm:p-5 rounded-[18px] border border-[#E5EBE7] shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-bold text-[#66756E] uppercase tracking-wider">
              Approved Claims
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#172B24]">
            ₹{wallet.approvedReimbursements.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-[#66756E] mt-1 font-medium">
            Self expenses approved by admin
          </p>
        </div>

        {/* Card 4: Pending Reimbursements */}
        <div className="bg-white p-4 sm:p-5 rounded-[18px] border border-[#E5EBE7] shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-bold text-[#66756E] uppercase tracking-wider">
              Pending Claims
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#172B24]">
            ₹{wallet.pendingReimbursements.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-[#66756E] mt-1 font-medium">
            Under admin verification
          </p>
        </div>

        {/* Card 5: Advances Received */}
        <div className="bg-white p-4 sm:p-5 rounded-[18px] border border-[#E5EBE7] shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-blue-700 mb-2">
            <span className="text-xs font-bold text-[#66756E] uppercase tracking-wider">
              Advances Received
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#172B24]">
            ₹{wallet.advancesReceived.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-[#66756E] mt-1 font-medium">
            Disbursed prior to departure
          </p>
        </div>

        {/* Card 6: Total Paid Out */}
        <div className="bg-white p-4 sm:p-5 rounded-[18px] border border-[#E5EBE7] shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-purple-700 mb-2">
            <span className="text-xs font-bold text-[#66756E] uppercase tracking-wider">
              Total Paid Out
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#172B24]">
            ₹{wallet.totalPaidOut.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-[#66756E] mt-1 font-medium">
            Disbursed settlements to bank
          </p>
        </div>
      </div>

      {/* Financial Rule Notice */}
      <div className="bg-[#EAF3EE] border border-[#174C3C]/20 rounded-[18px] p-4 text-xs text-[#174C3C] flex items-start gap-3">
        <Info className="w-5 h-5 shrink-0 mt-0.5 text-[#174C3C]" />
        <div>
          <h4 className="font-bold text-sm text-[#174C3C]">
            Company-Paid vs Self-Paid Expenses Policy
          </h4>
          <p className="text-xs text-[#174C3C]/90 mt-1 leading-relaxed">
            Expenses paid using <strong>Traviska Card</strong> or <strong>Traviska UPI</strong> are direct company expenses. They are logged for trip auditing and do not alter or reduce your personal honorarium. Approved <strong>Self-Paid</strong> expenses are reimbursed directly and added to your Final Payable Balance.
          </p>
        </div>
      </div>

      {/* Trip-Wise Payout Breakdown (Task 6) */}
      <div className="bg-white rounded-[18px] border border-[#E5EBE7] shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5EBE7] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#172B24]">
            Trip-Wise Payout Breakdown
          </h3>
          <span className="text-xs text-[#66756E] font-medium">
            {wallet.tripBreakdown.length} assigned departures
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-[#66756E] flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin mb-2 text-[#174C3C]" />
            <p className="text-xs font-semibold">Calculating trip honorariums...</p>
          </div>
        ) : wallet.tripBreakdown.length === 0 ? (
          <div className="p-10 text-center">
            <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-[#172B24]">No assigned trip payouts</p>
            <p className="text-[11px] text-[#66756E] mt-0.5">
              Trip payout records are generated automatically when departures are assigned.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF8] border-b border-[#E5EBE7] text-[#66756E] uppercase font-bold text-[10.5px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Trip & Departure</th>
                  <th className="py-3 px-4 text-right">Trip Fee</th>
                  <th className="py-3 px-4 text-right">Approved Claims</th>
                  <th className="py-3 px-4 text-right">Advance Paid</th>
                  <th className="py-3 px-4 text-right">Net Payable</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7]">
                {wallet.tripBreakdown.map((item) => (
                  <tr key={item._id} className="hover:bg-[#F8FAF8] transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#172B24]">{item.tripTitle}</p>
                      <p className="text-[11px] text-[#66756E]">{item.departureDate} • {item.location}</p>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#172B24]">
                      ₹{item.tripFee.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-700">
                      +₹{item.approvedExpenses.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-rose-700">
                      -₹{item.companyAdvance.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-sm text-[#174C3C]">
                      ₹{item.balance.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                          item.status === "Settled"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment & Settlement History (Task 6) */}
      <div className="bg-white rounded-[18px] border border-[#E5EBE7] shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5EBE7] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#172B24]">
            Payment & Settlement History
          </h3>
          <span className="text-xs text-[#66756E] font-medium">
            {wallet.history.length} transactions recorded
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#66756E]">Loading settlement logs...</div>
        ) : wallet.history.length === 0 ? (
          <div className="p-10 text-center">
            <Building className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-[#172B24]">No payment transactions yet</p>
            <p className="text-[11px] text-[#66756E] mt-0.5">
              Settlement records appear here automatically when the Traviska Admin processes payouts.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5EBE7] text-xs">
            {wallet.history.map((tx) => (
              <div key={tx._id} className="p-4 flex items-center justify-between gap-3 hover:bg-[#F8FAF8]">
                <div>
                  <p className="font-bold text-[#172B24]">{tx.tripTitle}</p>
                  <p className="text-[11px] text-[#66756E] mt-0.5">
                    Ref: <span className="font-mono text-[#174C3C] font-semibold">{tx.paymentReference}</span> • {tx.paymentMethod}
                  </p>
                  <p className="text-[10.5px] text-[#8F9D96] mt-0.5">
                    Settled on {new Date(tx.settledAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-extrabold text-emerald-700">
                    +₹{Number(tx.amount).toLocaleString("en-IN")}
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 mt-1">
                    Settled
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CaptainWallet;
