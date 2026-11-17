import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  QrCode,
  User,
  Clock,
  Loader2,
  FileText,
  X,
  Search,
  Eye,
  Sparkles,
  AlertTriangle,
  ArrowLeft,
  Upload,
  Info,
  ShieldCheck,
  Check,
  ChevronDown,
} from "lucide-react";
import { useCaptainAuth } from "./CaptainAuthContext";
import { API_BASE_URL } from "../api";

interface ExpenseSlot {
  _id: string;
  date?: string;
  trip?: {
    _id?: string;
    title?: string;
    location?: string;
    duration?: string;
    image?: string;
  };
}

interface ExpenseClaim {
  _id: string;
  title: string;
  amount: number;
  category: string;
  paymentMode: string;
  status: "Pending" | "Approved" | "Auto Approved" | "Rejected" | "Settled";
  isCompanyPaid: boolean;
  notes?: string;
  receiptUrl?: string;
  rejectionReason?: string;
  slotId?: ExpenseSlot;
  createdAt: string;
}

interface ExpenseSummary {
  totalSubmitted: number;
  submittedCount: number;
  approvedAmount: number;
  approvedCount: number;
  pendingAmount: number;
  pendingCount: number;
  rejectedAmount: number;
  rejectedCount: number;
  settledAmount: number;
  traviskaCardAmount: number;
  traviskaUpiAmount: number;
  selfPaidAmount: number;
}

interface AssignedTripOption {
  slotId: string;
  tripTitle: string;
  location?: string;
  dateRangeLabel?: string;
}

export const CaptainExpensesPortal: React.FC = () => {
  const { token } = useCaptainAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({
    totalSubmitted: 0,
    submittedCount: 0,
    approvedAmount: 0,
    approvedCount: 0,
    pendingAmount: 0,
    pendingCount: 0,
    rejectedAmount: 0,
    rejectedCount: 0,
    settledAmount: 0,
    traviskaCardAmount: 0,
    traviskaUpiAmount: 0,
    selfPaidAmount: 0,
  });

  const [assignedTrips, setAssignedTrips] = useState<AssignedTripOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddPageOpen, setIsAddPageOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseClaim | null>(null);

  // Sync isAddPageOpen with search parameter `?action=add`
  const isAddMode = searchParams.get("action") === "add" || isAddPageOpen;

  const openAddExpense = () => {
    setFormError(null);
    setIsAddPageOpen(true);
    setSearchParams({ action: "add" });
  };

  const closeAddExpense = () => {
    setIsAddPageOpen(false);
    setSearchParams({});
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentModeFilter, setPaymentModeFilter] = useState("All");
  const [tripFilter, setTripFilter] = useState("All");

  // Form State
  const [submitting, setSubmitting] = useState(false);
  const [formSlotId, setFormSlotId] = useState("");
  const [formPaymentMode, setFormPaymentMode] = useState<"Traviska Card" | "Traviska UPI" | "Self">("Traviska Card");
  const [formCategory, setFormCategory] = useState("Breakfast");
  const [formTitle, setFormTitle] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formReceipt, setFormReceipt] = useState("");
  const [receiptFile, setReceiptFile] = useState<{ name: string; size: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const CATEGORIES = [
    "Breakfast",
    "Food",
    "Tolls",
    "Parking",
    "Tickets",
    "Transport",
    "Fuel",
    "Hotel",
    "Coordinator Food",
    "Driver Allowance",
    "Activities",
    "Medical & First Aid",
    "Others",
  ];

  // 1. Fetch Expenses & Summary from dedicated Captain endpoint (Task 1)
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const curToken = token || localStorage.getItem("captainToken");
      const res = await fetch(`${API_BASE_URL}/captain/expenses`, {
        headers: {
          Authorization: `Bearer ${curToken}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.expenses)) {
          setClaims(data.expenses);
          if (data.summary) {
            setSummary(data.summary);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch captain expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Assigned Trips for Dropdown
  const fetchAssignedTrips = async () => {
    try {
      const curToken = token || localStorage.getItem("captainToken");
      const res = await fetch(`${API_BASE_URL}/captain/portal/trips`, {
        headers: {
          Authorization: `Bearer ${curToken}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.trips)) {
          const list: AssignedTripOption[] = data.trips.map((t: any) => ({
            slotId: String(t.slotId),
            tripTitle: t.tripTitle,
            location: t.location,
            dateRangeLabel: t.dateRangeLabel,
          }));
          setAssignedTrips(list);
          if (list.length > 0 && !formSlotId) {
            setFormSlotId(list[0].slotId);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch assigned trips:", err);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchAssignedTrips();
  }, [token]);

  // Handle local file selection for receipt
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setReceiptFile({
      name: file.name,
      size: `${sizeMb} MB`,
    });
    const reader = new FileReader();
    reader.onload = () => {
      setFormReceipt(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formSlotId) {
      setFormError("Please select a trip departure.");
      return;
    }
    const numAmt = Number(formAmount);
    if (!numAmt || numAmt <= 0) {
      setFormError("Please enter a valid expense amount greater than ₹0.");
      return;
    }
    if (!formTitle.trim()) {
      setFormError("Please enter an expense title.");
      return;
    }

    setSubmitting(true);
    try {
      const curToken = token || localStorage.getItem("captainToken");
      const res = await fetch(`${API_BASE_URL}/captain/expenses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${curToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slotId: formSlotId,
          paymentMode: formPaymentMode,
          category: formCategory,
          expenseType: formCategory,
          title: formTitle.trim(),
          amount: numAmt,
          notes: formNotes.trim(),
          receiptUrl: formReceipt.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to submit expense claim");
      }

      // Success notification
      const isCompany = formPaymentMode === "Traviska Card" || formPaymentMode === "Traviska UPI";
      setFeedbackToast({
        type: "success",
        message: isCompany
          ? `₹${numAmt.toLocaleString("en-IN")} recorded & Auto Approved as Company Paid (${formPaymentMode}).`
          : `₹${numAmt.toLocaleString("en-IN")} submitted for reimbursement (Pending Admin Approval).`,
      });

      // Reset form and close full page
      setFormTitle("");
      setFormAmount("");
      setFormNotes("");
      setFormReceipt("");
      setReceiptFile(null);
      closeAddExpense();

      // Refresh data immediately
      await fetchExpenses();

      // Clear toast after 5s
      setTimeout(() => setFeedbackToast(null), 5000);
    } catch (err: any) {
      setFormError(err.message || "Failed to submit expense");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Claims
  const filteredClaims = claims.filter((claim) => {
    const matchesSearch =
      searchQuery === "" ||
      claim.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (claim.slotId?.trip?.title && claim.slotId.trip.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Approved" && ["Approved", "Auto Approved"].includes(claim.status)) ||
      claim.status === statusFilter;

    const matchesPaymentMode =
      paymentModeFilter === "All" ||
      (paymentModeFilter === "Self" && ["Self", "Self (Any Mode)"].includes(claim.paymentMode)) ||
      claim.paymentMode === paymentModeFilter;

    const matchesTrip =
      tripFilter === "All" ||
      (claim.slotId && String(claim.slotId._id) === tripFilter);

    return matchesSearch && matchesStatus && matchesPaymentMode && matchesTrip;
  });

  // =========================================================================
  // VIEW 1: FULL PAGE ADD TRIP EXPENSE (Requested by User)
  // =========================================================================
  if (isAddMode) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-32 sm:pb-16 animate-in fade-in duration-150">
        {/* Top Navigation & Back Button */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={closeAddExpense}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E5EBE7] text-xs font-bold text-[#174C3C] hover:bg-[#EAF3EE] transition-all shadow-2xs group"
          >
            <ArrowLeft className="w-4 h-4 text-[#174C3C] group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Trip Expenses</span>
          </button>
          <span className="text-xs font-semibold text-[#66756E] hidden sm:inline">
            Logging on-road expense for assigned departure
          </span>
        </div>

        {/* Page Header Banner */}
        <div className="bg-white p-5 sm:p-6 rounded-[20px] border border-[#E5EBE7] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#174C3C] uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Log Trip Expense</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#172B24] tracking-tight">
              Add Trip Expense
            </h1>
            <p className="text-xs sm:text-sm text-[#66756E] mt-1">
              Record on-road fuel, toll, meals or tickets for your assigned departure.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#EAF3EE] text-[#174C3C] border border-[#C5DED0]">
              <ShieldCheck className="w-4 h-4 text-[#174C3C]" />
              Real-time DB Sync
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {formError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-800 font-semibold flex items-center gap-2 shadow-2xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{formError}</span>
          </div>
        )}

        {/* Form Container (Desktop: 2 Columns, Mobile: 1 Column) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Form Card (Col Span 2) */}
          <div className="lg:col-span-2">
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl border border-[#DDE4E0] p-6 sm:p-8 shadow-xs space-y-6"
            >
              <div className="flex items-center justify-between border-b border-[#EEF2F0] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#172B24] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#174C3C]" />
                    Expense Details
                  </h3>
                  <p className="text-xs text-[#66756E] mt-0.5">
                    Fill in the departure, payment mode, and financial breakdown
                  </p>
                </div>
                <span className="text-[11px] font-bold text-[#174C3C] bg-[#EAF3EE] px-2.5 py-1 rounded-full">
                  Step 1 of 1
                </span>
              </div>

              {/* 1. Trip Departure Dropdown */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#172B24] uppercase tracking-wider">
                  Select Trip Departure <span className="text-emerald-700 font-bold">*</span>
                </label>
                {assignedTrips.length === 0 ? (
                  <p className="text-xs text-amber-800 bg-amber-50 p-3.5 rounded-xl border border-amber-200">
                    No assigned departure records found. You can still submit on your active assignment.
                  </p>
                ) : (
                  <div className="relative">
                    <select
                      value={formSlotId}
                      onChange={(e) => setFormSlotId(e.target.value)}
                      required
                      className="w-full h-12 pl-4 pr-10 rounded-xl border border-[#DDE4E0] bg-[#FAFCFA] hover:border-[#A3B8AD] focus:border-[#174C3C] focus:ring-4 focus:ring-[#174C3C]/12 focus:bg-white text-sm font-semibold text-[#172B24] focus:outline-hidden appearance-none transition-all shadow-2xs cursor-pointer"
                    >
                      {assignedTrips.map((trip) => (
                        <option key={trip.slotId} value={trip.slotId}>
                          {trip.tripTitle} ({trip.dateRangeLabel || "Active Departure"})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#66756E] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                )}
              </div>

              {/* 2. Three Selectable Payment Mode Cards */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#172B24] uppercase tracking-wider">
                    Payment Mode <span className="text-emerald-700 font-bold">*</span>
                  </label>
                  <span className="text-[11px] text-[#66756E]">Select settlement source</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Option 1: Traviska Card */}
                  <div
                    onClick={() => setFormPaymentMode("Traviska Card")}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex sm:flex-col items-center justify-between sm:justify-center text-left sm:text-center gap-3 ${
                      formPaymentMode === "Traviska Card"
                        ? "border-[#174C3C] bg-[#EAF3EE] shadow-xs ring-2 ring-[#174C3C]"
                        : "border-[#DDE4E0] bg-[#FAFCFA] hover:border-[#A3B8AD] hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center sm:flex-col gap-3 sm:gap-2">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          formPaymentMode === "Traviska Card"
                            ? "bg-[#174C3C] text-white shadow-2xs"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-[#172B24] block leading-tight">
                          Traviska Card
                        </span>
                        <span className="text-[10px] text-[#66756E] hidden sm:block mt-0.5">
                          Company Card
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full shrink-0">
                      Auto Approved
                    </span>
                  </div>

                  {/* Option 2: Traviska UPI */}
                  <div
                    onClick={() => setFormPaymentMode("Traviska UPI")}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex sm:flex-col items-center justify-between sm:justify-center text-left sm:text-center gap-3 ${
                      formPaymentMode === "Traviska UPI"
                        ? "border-[#174C3C] bg-[#EAF3EE] shadow-xs ring-2 ring-[#174C3C]"
                        : "border-[#DDE4E0] bg-[#FAFCFA] hover:border-[#A3B8AD] hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center sm:flex-col gap-3 sm:gap-2">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          formPaymentMode === "Traviska UPI"
                            ? "bg-[#174C3C] text-white shadow-2xs"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-[#172B24] block leading-tight">
                          Traviska UPI
                        </span>
                        <span className="text-[10px] text-[#66756E] hidden sm:block mt-0.5">
                          Company Scanner
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full shrink-0">
                      Auto Approved
                    </span>
                  </div>

                  {/* Option 3: Self-Paid */}
                  <div
                    onClick={() => setFormPaymentMode("Self")}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex sm:flex-col items-center justify-between sm:justify-center text-left sm:text-center gap-3 ${
                      formPaymentMode === "Self"
                        ? "border-[#174C3C] bg-[#EAF3EE] shadow-xs ring-2 ring-[#174C3C]"
                        : "border-[#DDE4E0] bg-[#FAFCFA] hover:border-[#A3B8AD] hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center sm:flex-col gap-3 sm:gap-2">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          formPaymentMode === "Self"
                            ? "bg-[#174C3C] text-white shadow-2xs"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-[#172B24] block leading-tight">
                          Self-Paid
                        </span>
                        <span className="text-[10px] text-[#66756E] hidden sm:block mt-0.5">
                          Personal Funds
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full shrink-0">
                      Admin Review
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#FAFCFA] border border-[#DDE4E0] text-xs text-[#66756E] flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#174C3C] shrink-0" />
                  <span>
                    {formPaymentMode === "Traviska Card" || formPaymentMode === "Traviska UPI"
                      ? "Company-paid expense: Auto-approved and recorded for trip audit. Does not deduct from personal payout."
                      : "Personal payment: Requires admin approval and will be added directly to your Captain Wallet for reimbursement."}
                  </span>
                </div>
              </div>

              {/* 3. Category & Amount (Uniform Field Heights) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#172B24] uppercase tracking-wider">
                    Expense Category <span className="text-emerald-700 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      required
                      className="w-full h-12 pl-4 pr-10 rounded-xl border border-[#DDE4E0] bg-[#FAFCFA] hover:border-[#A3B8AD] focus:border-[#174C3C] focus:ring-4 focus:ring-[#174C3C]/12 focus:bg-white text-sm font-semibold text-[#172B24] focus:outline-hidden appearance-none transition-all shadow-2xs cursor-pointer"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#66756E] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#172B24] uppercase tracking-wider">
                    Amount (₹) <span className="text-emerald-700 font-bold">*</span>
                  </label>
                  <div className="flex items-center h-12 rounded-xl border border-[#DDE4E0] bg-[#FAFCFA] hover:border-[#A3B8AD] focus-within:border-[#174C3C] focus-within:ring-4 focus-within:ring-[#174C3C]/12 focus-within:bg-white transition-all shadow-2xs overflow-hidden">
                    <span className="h-full px-4 flex items-center justify-center text-sm font-bold text-[#174C3C] bg-[#EAF3EE] border-r border-[#DDE4E0] select-none shrink-0">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-full h-full px-4 bg-transparent text-sm font-bold text-[#172B24] placeholder:text-[#94A3B8] placeholder:font-normal focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Title */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#172B24] uppercase tracking-wider">
                  Expense Title <span className="text-emerald-700 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Team breakfast for day 1 / Highway diesel refill"
                  required
                  className="w-full h-12 px-4 rounded-xl border border-[#DDE4E0] bg-[#FAFCFA] hover:border-[#A3B8AD] focus:border-[#174C3C] focus:ring-4 focus:ring-[#174C3C]/12 focus:bg-white text-sm font-medium text-[#172B24] placeholder:text-[#94A3B8] focus:outline-hidden transition-all shadow-2xs"
                />
              </div>

              {/* 5. Additional Notes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#172B24] uppercase tracking-wider">
                    Additional Notes
                  </label>
                  <span className="text-[11px] font-medium text-[#66756E]">Optional</span>
                </div>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Toll receipt slip #4829, Dhaba lunch stop near Sakleshpur"
                  className="w-full p-4 rounded-xl border border-[#DDE4E0] bg-[#FAFCFA] hover:border-[#A3B8AD] focus:border-[#174C3C] focus:ring-4 focus:ring-[#174C3C]/12 focus:bg-white text-sm font-medium text-[#172B24] placeholder:text-[#94A3B8] focus:outline-hidden transition-all shadow-2xs resize-none"
                />
              </div>

              {/* 6. Receipt Attachment & Reference */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#172B24] uppercase tracking-wider">
                    Receipt / Bill Proof
                  </label>
                  <span className="text-[11px] font-medium text-[#66756E]">Optional</span>
                </div>

                {receiptFile ? (
                  <div className="flex items-center justify-between p-4 rounded-xl bg-[#EAF3EE] border border-[#C5DED0]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#174C3C] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#172B24] truncate">
                          {receiptFile.name}
                        </p>
                        <p className="text-xs text-[#66756E]">{receiptFile.size}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptFile(null);
                        setFormReceipt("");
                      }}
                      className="p-2 rounded-xl text-gray-500 hover:text-red-600 hover:bg-white transition-colors"
                      title="Remove attachment"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[#C5DED0] hover:border-[#174C3C] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-[#FAFCFA] hover:bg-[#EAF3EE]/40 group">
                    <div className="w-11 h-11 rounded-xl bg-[#EAF3EE] group-hover:bg-[#174C3C] text-[#174C3C] group-hover:text-white flex items-center justify-center transition-colors mb-2.5 shadow-2xs">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold text-[#172B24]">
                      Click or drag receipt photo to upload
                    </span>
                    <span className="text-xs text-[#66756E] mt-1">
                      Supports PNG, JPG, WebP, PDF (Max 10MB)
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}

                {/* Optional Slip / Reference Number (Uniform Height) */}
                <div>
                  <input
                    type="text"
                    value={formReceipt.startsWith("data:") ? "" : formReceipt}
                    onChange={(e) => setFormReceipt(e.target.value)}
                    placeholder="Or type bill / voucher reference (e.g. Bill #10293)"
                    className="w-full h-12 px-4 rounded-xl border border-[#DDE4E0] bg-[#FAFCFA] hover:border-[#A3B8AD] focus:border-[#174C3C] focus:ring-4 focus:ring-[#174C3C]/12 focus:bg-white text-sm font-medium text-[#172B24] placeholder:text-[#94A3B8] focus:outline-hidden transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Form Action Buttons (Uniform Heights & Modern Contrast) */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-6 border-t border-[#EEF2F0]">
                <button
                  type="button"
                  onClick={closeAddExpense}
                  className="w-full sm:w-auto h-12 px-6 rounded-xl border border-[#DDE4E0] bg-white text-sm font-bold text-[#66756E] hover:bg-gray-50 hover:text-[#172B24] transition-colors text-center shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto h-12 inline-flex items-center justify-center gap-2 px-8 rounded-xl bg-[#174C3C] text-white text-sm font-bold shadow-sm hover:bg-[#123B2E] hover:shadow-md active:scale-[0.98] disabled:opacity-50 transition-all shrink-0 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Expense</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Approval Policy Guide Cards */}
          <div className="space-y-4">
            {/* Card 1: How Expense Approval Works */}
            <div className="bg-white rounded-[22px] border border-[#E5EBE7] p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#174C3C] uppercase tracking-wider border-b border-gray-100 pb-2.5">
                <Info className="w-4 h-4 text-[#174C3C]" />
                <span>How Expense Approval Works</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1">
                  <div className="font-bold text-blue-900 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                    Traviska Card
                  </div>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    Automatically accepted as company-paid. No manual approval required.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1">
                  <div className="font-bold text-purple-900 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-purple-700" />
                    Traviska UPI
                  </div>
                  <p className="text-[11px] text-purple-800 leading-relaxed">
                    Automatically accepted as company-paid. No manual approval required.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-700" />
                    Self (Any Mode)
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Requires admin approval. Once approved, the amount will be added to the captain's reimbursement (wallet payout).
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Key Points */}
            <div className="bg-white rounded-[22px] border border-[#E5EBE7] p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#172B24] uppercase tracking-wider border-b border-gray-100 pb-2.5">
                <ShieldCheck className="w-4 h-4 text-[#174C3C]" />
                <span>Key Guidelines</span>
              </div>

              <div className="space-y-2.5 text-xs text-[#66756E]">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#174C3C] mt-0.5 shrink-0" />
                  <span>Expense will be linked to the selected trip and departure.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#174C3C] mt-0.5 shrink-0" />
                  <span>Company-paid expenses (Card/UPI) do not alter captain payout.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#174C3C] mt-0.5 shrink-0" />
                  <span>Only approved Self expenses are eligible for reimbursement.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#174C3C] mt-0.5 shrink-0" />
                  <span>Upload a receipt photo or ticket slip whenever possible.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: MAIN TRIP EXPENSES DASHBOARD & CLAIMS LIST
  // =========================================================================
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {feedbackToast && (
        <div
          className={`p-4 rounded-[16px] text-xs font-semibold flex items-center justify-between shadow-md transition-all ${
            feedbackToast.type === "success"
              ? "bg-[#174C3C] text-white border border-emerald-600"
              : "bg-rose-600 text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{feedbackToast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackToast(null)}
            className="text-white/80 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-[18px] border border-[#E5EBE7] shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#174C3C] uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>On-Trip Finance & Claims</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#172B24] tracking-tight">
            Trip Expenses
          </h2>
          <p className="text-xs sm:text-sm text-[#66756E] mt-1">
            Log on-trip expenses via company card, UPI, or personal funds with real-time approval sync.
          </p>
        </div>

        {/* Button opens Full Page Add Expense */}
        <button
          type="button"
          onClick={openAddExpense}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#174C3C] text-white font-bold text-xs sm:text-sm shadow-md hover:bg-[#123B2E] active:scale-95 transition-all shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* 4 Summary Cards (Task 5) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Submitted */}
        <div className="bg-white p-4 sm:p-5 rounded-[18px] border border-[#E5EBE7] shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-[#174C3C] mb-2">
            <span className="text-xs font-bold text-[#66756E] uppercase tracking-wider">
              Total Submitted
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#EAF3EE] flex items-center justify-center text-[#174C3C]">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#172B24]">
            ₹{summary.totalSubmitted.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-[#66756E] mt-1 font-medium">
            {summary.submittedCount} claims logged
          </p>
        </div>

        {/* Card 2: Approved (Auto + Admin) */}
        <div className="bg-white p-4 sm:p-5 rounded-[18px] border border-[#E5EBE7] shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-bold text-[#66756E] uppercase tracking-wider">
              Approved
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#172B24]">
            ₹{summary.approvedAmount.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-[#66756E] mt-1 font-medium">
            {summary.approvedCount} claims approved
          </p>
        </div>

        {/* Card 3: Pending Approval */}
        <div className="bg-white p-4 sm:p-5 rounded-[18px] border border-[#E5EBE7] shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-bold text-[#66756E] uppercase tracking-wider">
              Pending Approval
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#172B24]">
            ₹{summary.pendingAmount.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-[#66756E] mt-1 font-medium">
            {summary.pendingCount} claims awaiting review
          </p>
        </div>

        {/* Card 4: Rejected */}
        <div className="bg-white p-4 sm:p-5 rounded-[18px] border border-[#E5EBE7] shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-xs font-bold text-[#66756E] uppercase tracking-wider">
              Rejected
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-700">
              <X className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#172B24]">
            ₹{summary.rejectedAmount.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-[#66756E] mt-1 font-medium">
            {summary.rejectedCount} claims declined
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#DDE4E0] shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#66756E] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, category, or trip..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#DDE4E0] bg-[#FAFCFA] hover:border-[#A3B8AD] focus:border-[#174C3C] focus:ring-4 focus:ring-[#174C3C]/10 focus:bg-white text-xs sm:text-sm font-medium text-[#172B24] placeholder:text-[#94A3B8] focus:outline-hidden transition-all shadow-2xs"
            />
          </div>

          {/* Trip Filter */}
          <div className="w-full md:w-48 relative">
            <select
              value={tripFilter}
              onChange={(e) => setTripFilter(e.target.value)}
              className="w-full h-11 pl-3.5 pr-9 rounded-xl border border-[#DDE4E0] bg-[#FAFCFA] hover:border-[#A3B8AD] focus:border-[#174C3C] focus:ring-4 focus:ring-[#174C3C]/10 focus:bg-white text-xs sm:text-sm font-medium text-[#172B24] focus:outline-hidden appearance-none transition-all shadow-2xs cursor-pointer"
            >
              <option value="All">All Trips</option>
              {assignedTrips.map((t) => (
                <option key={t.slotId} value={t.slotId}>
                  {t.tripTitle}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#66756E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Payment Mode Filter */}
          <div className="w-full md:w-44 relative">
            <select
              value={paymentModeFilter}
              onChange={(e) => setPaymentModeFilter(e.target.value)}
              className="w-full h-11 pl-3.5 pr-9 rounded-xl border border-[#DDE4E0] bg-[#FAFCFA] hover:border-[#A3B8AD] focus:border-[#174C3C] focus:ring-4 focus:ring-[#174C3C]/10 focus:bg-white text-xs sm:text-sm font-medium text-[#172B24] focus:outline-hidden appearance-none transition-all shadow-2xs cursor-pointer"
            >
              <option value="All">All Payment Modes</option>
              <option value="Traviska Card">Traviska Card</option>
              <option value="Traviska UPI">Traviska UPI</option>
              <option value="Self">Self (Personal)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-[#66756E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-40 relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-11 pl-3.5 pr-9 rounded-xl border border-[#DDE4E0] bg-[#FAFCFA] hover:border-[#A3B8AD] focus:border-[#174C3C] focus:ring-4 focus:ring-[#174C3C]/10 focus:bg-white text-xs sm:text-sm font-medium text-[#172B24] focus:outline-hidden appearance-none transition-all shadow-2xs cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
            <ChevronDown className="w-4 h-4 text-[#66756E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Expenses Table Container */}
      <div className="bg-white rounded-[20px] border border-[#E5EBE7] shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E5EBE7] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#172B24]">Submitted Expense Claims</h3>
            <p className="text-xs text-[#66756E] mt-0.5">
              Synced live with MongoDB database & Admin approval desk
            </p>
          </div>
          <span className="text-xs font-bold text-[#174C3C] bg-[#EAF3EE] px-3 py-1 rounded-full">
            Showing {filteredClaims.length} of {claims.length} claims
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#66756E]">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#174C3C] mb-2" />
            <p className="text-xs font-medium">Loading synced expense records...</p>
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#EAF3EE] text-[#174C3C] flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#172B24]">No expenses logged yet</h4>
            <p className="text-xs text-[#66756E] max-w-sm mx-auto mt-1">
              {searchQuery || statusFilter !== "All" || paymentModeFilter !== "All"
                ? "No expense records match your current filter criteria."
                : "Record your on-trip diesel refill, toll, entry tickets, or meals for this departure."}
            </p>
            <button
              type="button"
              onClick={openAddExpense}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#174C3C] text-white text-xs font-bold hover:bg-[#123B2E] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Expense</span>
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F8FAF8] border-b border-[#E5EBE7] text-[11px] font-bold text-[#66756E] uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Trip</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Title & Notes</th>
                    <th className="py-3 px-4">Payment Mode</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EBE7]">
                  {filteredClaims.map((claim) => (
                    <tr
                      key={claim._id}
                      onClick={() => setSelectedExpense(claim)}
                      className="hover:bg-[#F8FAF8] transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-medium text-[#66756E] whitespace-nowrap">
                        {new Date(claim.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#172B24] max-w-[180px] truncate">
                        {claim.slotId?.trip?.title || "Assigned Trip"}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 text-gray-800">
                          {claim.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#172B24]">{claim.title}</div>
                        {claim.notes && (
                          <div className="text-[11px] text-[#66756E] truncate max-w-xs">
                            {claim.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            claim.paymentMode === "Traviska Card"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : claim.paymentMode === "Traviska UPI"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {claim.paymentMode === "Traviska Card" && <CreditCard className="w-3 h-3" />}
                          {claim.paymentMode === "Traviska UPI" && <QrCode className="w-3 h-3" />}
                          {claim.paymentMode !== "Traviska Card" && claim.paymentMode !== "Traviska UPI" && <User className="w-3 h-3" />}
                          <span>{claim.paymentMode}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-[#172B24] whitespace-nowrap text-sm">
                        ₹{Number(claim.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {claim.status === "Auto Approved" || claim.isCompanyPaid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Auto Approved
                          </span>
                        ) : claim.status === "Approved" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                          </span>
                        ) : claim.status === "Pending" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            <Clock className="w-3.5 h-3.5" /> Pending Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                            <X className="w-3.5 h-3.5" /> Rejected
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedExpense(claim);
                          }}
                          className="p-1.5 rounded-lg text-[#66756E] hover:text-[#174C3C] hover:bg-[#EAF3EE] transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (md:hidden) */}
            <div className="md:hidden divide-y divide-[#E5EBE7]">
              {filteredClaims.map((claim) => (
                <div
                  key={claim._id}
                  onClick={() => setSelectedExpense(claim)}
                  className="p-4 space-y-2 hover:bg-[#F8FAF8] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#66756E]">
                      {new Date(claim.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-base font-extrabold text-[#172B24]">
                      ₹{Number(claim.amount).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-[#172B24] leading-snug">
                    {claim.title}
                  </h4>
                  <p className="text-xs text-[#66756E]">
                    {claim.slotId?.trip?.title || "Assigned Trip"}
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
                        {claim.category}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          claim.paymentMode === "Traviska Card"
                            ? "bg-blue-50 text-blue-700"
                            : claim.paymentMode === "Traviska UPI"
                            ? "bg-purple-50 text-purple-700"
                            : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {claim.paymentMode}
                      </span>
                    </div>

                    {claim.status === "Auto Approved" || claim.isCompanyPaid ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Auto Approved
                      </span>
                    ) : claim.status === "Approved" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Approved
                      </span>
                    ) : claim.status === "Pending" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" /> Pending Review
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full">
                        <X className="w-3 h-3" /> Rejected
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ============================================================ */}
      {/* EXPENSE DETAILS MODAL                                        */}
      {/* ============================================================ */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-[22px] max-w-lg w-full p-6 shadow-2xl border border-[#E5EBE7] my-8 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EBE7]">
              <div>
                <span className="text-[11px] font-bold text-[#174C3C] uppercase tracking-wider">
                  Expense Claim Details
                </span>
                <h3 className="text-xl font-extrabold text-[#172B24] mt-0.5">
                  ₹{Number(selectedExpense.amount).toLocaleString("en-IN")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExpense(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#66756E] hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E5EBE7] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#66756E] font-medium">Status</span>
                  {selectedExpense.status === "Auto Approved" || selectedExpense.isCompanyPaid ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Auto Approved (Company Paid)
                    </span>
                  ) : selectedExpense.status === "Approved" ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approved by Admin
                    </span>
                  ) : selectedExpense.status === "Pending" ? (
                    <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100/70 px-2.5 py-0.5 rounded-full">
                      <Clock className="w-3.5 h-3.5" /> Awaiting Admin Approval
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-rose-800 bg-rose-100/70 px-2.5 py-0.5 rounded-full">
                      <X className="w-3.5 h-3.5" /> Rejected
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#66756E] font-medium">Payment Mode</span>
                  <span className="font-bold text-[#172B24]">{selectedExpense.paymentMode}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#66756E] font-medium">Trip Departure</span>
                  <span className="font-bold text-[#172B24] max-w-[220px] truncate">
                    {selectedExpense.slotId?.trip?.title || "Assigned Trip"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#66756E] font-medium">Category</span>
                  <span className="font-semibold text-[#172B24]">{selectedExpense.category}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#66756E] font-medium">Submitted On</span>
                  <span className="text-[#172B24]">
                    {new Date(selectedExpense.createdAt).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#172B24] mb-1">Expense Title</h4>
                <p className="p-3 rounded-xl bg-gray-50 border border-[#E5EBE7] text-[#172B24] font-medium">
                  {selectedExpense.title}
                </p>
              </div>

              {selectedExpense.notes && (
                <div>
                  <h4 className="font-bold text-[#172B24] mb-1">Notes</h4>
                  <p className="p-3 rounded-xl bg-gray-50 border border-[#E5EBE7] text-[#66756E]">
                    {selectedExpense.notes}
                  </p>
                </div>
              )}

              {selectedExpense.rejectionReason && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Admin Rejection Reason</span>
                  </div>
                  <p className="text-xs">{selectedExpense.rejectionReason}</p>
                </div>
              )}

              {/* Payout Impact Box */}
              <div className="p-3.5 rounded-xl bg-[#EAF3EE] border border-[#174C3C]/20 text-[#174C3C]">
                <span className="font-bold uppercase tracking-wider text-[10.5px]">Payout Impact</span>
                <p className="text-xs mt-0.5">
                  {selectedExpense.isCompanyPaid || selectedExpense.paymentMode.includes("Traviska")
                    ? "✓ This expense was paid using Traviska company funds and does not impact your captain honorarium payout."
                    : selectedExpense.status === "Approved"
                    ? "✓ Approved! This reimbursement amount is added directly to your captain payable balance in Wallet."
                    : selectedExpense.status === "Rejected"
                    ? "✕ This expense was rejected by admin and will not be reimbursed."
                    : "⏳ Pending review. Once approved by admin, this amount will be added to your payable balance."}
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedExpense(null)}
                className="px-5 py-2 rounded-xl bg-[#174C3C] text-white text-xs font-bold hover:bg-[#123B2E]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaptainExpensesPortal;
