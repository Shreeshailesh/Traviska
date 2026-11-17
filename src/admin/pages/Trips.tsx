import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  Mountain,
  Plus,
  Search,
  Eye,
  Edit2,
  Calendar,
  Users,
  MapPin,
  Clock,
  Trash2,
  Shield,
  AlertCircle,
  CheckCircle2,
  Star,
  Award,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  FileText,
  LayoutGrid,
  Table as TableIcon,
  Lock,
  Unlock,
  ExternalLink,
  MessageCircle,
} from "lucide-react";

import { API_BASE_URL } from "../../api";
import { Modal } from "../ui/Modal";
import PickupLocations from "./TripOperations/PickupLocations";

interface TripItem {
  _id: string;
  title: string;
  location: string;
  duration: string;
  price: string | number;
  image: string;
  description?: string;
  category?: string;
}

interface CaptainItem {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  status: "Active" | "Inactive" | "On Trip";
  rating?: number;
  totalTrips?: number;
  completedTrips?: number;
  defaultTripFee?: number;
  avatar?: string;
  specialities?: string[];
}

interface CompletedTripHistoryItem {
  id: string;
  tripTitle: string;
  destination: string;
  duration: string;
  departureDate: string | null;
  returnDate: string | null;
  role: string;
  status: string;
  slotId?: string;
}

interface CaptainHistoryData {
  captain: {
    id: string;
    name: string;
    phone: string;
    status: string;
    rating?: number;
    avatar?: string;
  };
  stats: {
    totalCompletedTrips: number;
    totalUpcomingAssignments: number;
  };
  history: CompletedTripHistoryItem[];
}

interface SlotCaptain {
  _id?: string;
  name: string;
  phone?: string;
  avatar?: string;
  rating?: number;
  role: "Head Captain" | "Main Captain" | "Trainee Captain" | string;
  captainFee?: number;
}

interface SlotItem {
  _id: string;
  trip: {
    _id: string;
    title: string;
    location?: string;
    image?: string;
  } | string;
  date: string;
  returnDate?: string;
  bookedSlots: number;
  totalSlots: number;
  isClosed: boolean;
  assignedCaptain?: SlotCaptain | null;
  assignedCaptains?: SlotCaptain[];
  photoDriveLink?: string;
  billDriveLink?: string;
  whatsappGroupLink?: string;
}

export const Trips: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"packages" | "departures" | "pickups">("packages");
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Add Departure Modal
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);
  const [slotTripId, setSlotTripId] = useState("");
  const [slotDate, setSlotDate] = useState("");
  const [slotTotalSeats, setSlotTotalSeats] = useState(24);
  const [slotPhotoDriveLink, setSlotPhotoDriveLink] = useState("");
  const [slotBillDriveLink, setSlotBillDriveLink] = useState("");
  const [slotWhatsappGroupLink, setSlotWhatsappGroupLink] = useState("");
  const [savingSlot, setSavingSlot] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [slotSuccess, setSlotSuccess] = useState<string | null>(null);
  const [returnToAssignTrip, setReturnToAssignTrip] = useState<TripItem | null>(null);

  // Edit Departure Links Modal (for existing slots)
  const [isEditLinksModalOpen, setIsEditLinksModalOpen] = useState(false);
  const [selectedSlotForLinks, setSelectedSlotForLinks] = useState<SlotItem | null>(null);
  const [editPhotoDriveLink, setEditPhotoDriveLink] = useState("");
  const [editBillDriveLink, setEditBillDriveLink] = useState("");
  const [editWhatsappGroupLink, setEditWhatsappGroupLink] = useState("");
  const [savingLinks, setSavingLinks] = useState(false);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [linksSuccess, setLinksSuccess] = useState<string | null>(null);

  // View mode, filter & search for Departures
  const [departuresViewMode, setDeparturesViewMode] = useState<"cards" | "table">("cards");
  const [departureFilter, setDepartureFilter] = useState<"all" | "upcoming" | "soldout" | "closed" | "unassigned">("all");
  const [departureSearch, setDepartureSearch] = useState("");

  // Edit Departure Slot Modal (Full Edit)
  const [isEditSlotOpen, setIsEditSlotOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<SlotItem | null>(null);
  const [editSlotTripId, setEditSlotTripId] = useState("");
  const [editSlotDate, setEditSlotDate] = useState("");
  const [editSlotTotalSeats, setEditSlotTotalSeats] = useState(24);
  const [editSlotPhotoDriveLink, setEditSlotPhotoDriveLink] = useState("");
  const [editSlotBillDriveLink, setEditSlotBillDriveLink] = useState("");
  const [editSlotWhatsappGroupLink, setEditSlotWhatsappGroupLink] = useState("");
  const [editSlotIsClosed, setEditSlotIsClosed] = useState(false);
  const [savingEditSlot, setSavingEditSlot] = useState(false);
  const [editSlotError, setEditSlotError] = useState<string | null>(null);
  const [editSlotSuccess, setEditSlotSuccess] = useState<string | null>(null);

  // Assign Captain Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTripForAssign, setSelectedTripForAssign] = useState<TripItem | null>(null);
  const [captains, setCaptains] = useState<CaptainItem[]>([]);
  const [loadingCaptains, setLoadingCaptains] = useState(false);

  const [assignSlotId, setAssignSlotId] = useState("");
  const [assignCaptainId, setAssignCaptainId] = useState("");
  const [assignFee, setAssignFee] = useState<number | string>(5000);
  const [assignRole, setAssignRole] = useState("Head Captain");
  const [assignNotes, setAssignNotes] = useState("");
  const [assigningCaptain, setAssigningCaptain] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [confirmReassign, setConfirmReassign] = useState(false);
  const [removingCaptainId, setRemovingCaptainId] = useState<string | null>(null);

  // Captain Experience & History State
  const [captainHistory, setCaptainHistory] = useState<CaptainHistoryData | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const formatSlotDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getRoleBadgeStyle = (role: string | undefined) => {
    const r = (role || "Head Captain").toLowerCase();
    if (r.includes("head") || r.includes("lead")) {
      return {
        bg: "#dcfce7",
        color: "#166534",
        border: "1px solid #bbf7d0",
        label: "Head Captain",
        rank: 1,
      };
    }
    if (r.includes("main") || r.includes("assistant")) {
      return {
        bg: "#dbeafe",
        color: "#1e40af",
        border: "1px solid #bfdbfe",
        label: "Main Captain",
        rank: 2,
      };
    }
    return {
      bg: "#f1f5f9",
      color: "#334155",
      border: "1px solid #e2e8f0",
      label: "Trainee Captain",
      rank: 3,
    };
  };

  const fetchTripsAndSlots = async () => {
    setLoading(true);
    setFetchError(null);
    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [tRes, sRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/trips`, { headers }),
        axios.get(`${API_BASE_URL}/trip-slots`, { headers }),
      ]);

      if (tRes.status === "fulfilled") {
        const tripList = Array.isArray(tRes.value.data) ? tRes.value.data : [];
        setTrips(tripList);
        if (tripList.length > 0 && !slotTripId) {
          setSlotTripId(tripList[0]._id);
        }
      } else {
        console.error("Trips API error:", tRes.reason);
        setFetchError("Unable to load trip packages. Please check backend connection.");
      }

      if (sRes.status === "fulfilled") {
        const slotList = Array.isArray(sRes.value.data) ? sRes.value.data : [];
        setSlots(slotList);
      } else {
        console.warn("Trip slots API warning:", sRes.reason);
      }
    } catch (e: any) {
      console.error("Failed to fetch trips data", e);
      setFetchError(e?.message || "Failed to load trip packages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTripsAndSlots();
    fetchCaptainsList();
  }, []);

  // Handle URL query params for opening Assign Modal directly
  useEffect(() => {
    const modalParam = searchParams.get("modal");
    const slotIdParam = searchParams.get("slotId");
    if (modalParam === "assign" && trips.length > 0 && slots.length > 0) {
      if (slotIdParam) {
        const targetSlot = slots.find((s) => s._id === slotIdParam);
        if (targetSlot) {
          const tripId = typeof targetSlot.trip === "object" ? targetSlot.trip._id : targetSlot.trip;
          const tr = trips.find((t) => t._id === tripId) || trips[0];
          handleOpenAssignModal(tr, targetSlot._id);
        }
      } else {
        handleOpenAssignModal(trips[0]);
      }
    } else if (modalParam === "add-departure") {
      setIsAddSlotOpen(true);
    } else if (modalParam === "drive-links" && slots.length > 0) {
      const targetSlot = slotIdParam ? slots.find((s) => s._id === slotIdParam) : slots[0];
      if (targetSlot) {
        handleOpenLinksModal(targetSlot);
      }
    } else if (modalParam === "edit-slot" && slots.length > 0) {
      const targetSlot = slotIdParam ? slots.find((s) => s._id === slotIdParam) : slots[0];
      if (targetSlot) {
        handleOpenEditSlot(targetSlot);
      }
    }
  }, [searchParams, trips.length, slots.length]);

  // Fetch Captain Experience & Trip History when a captain is selected
  useEffect(() => {
    if (!isAssignModalOpen || !assignCaptainId) {
      setCaptainHistory(null);
      return;
    }

    let isMounted = true;
    const fetchHistory = async () => {
      setLoadingHistory(true);
      setShowAllHistory(false);
      const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
      try {
        const res = await axios.get(
          `${API_BASE_URL}/admin/operations/captains/${assignCaptainId}/history`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        if (isMounted && res.data?.success) {
          setCaptainHistory(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch captain history:", err);
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [assignCaptainId, isAssignModalOpen]);

  const fetchCaptainsList = async () => {
    setLoadingCaptains(true);
    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/operations/captains`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.captains) {
        setCaptains(res.data.captains);
        return res.data.captains as CaptainItem[];
      }
    } catch (err) {
      console.error("Failed to fetch captains:", err);
    } finally {
      setLoadingCaptains(false);
    }
    return [];
  };

  const handleOpenAssignModal = async (trip: TripItem, defaultSlotId?: string) => {
    setSelectedTripForAssign(trip);
    setAssignError(null);
    setAssignSuccess(null);
    setConfirmReassign(false);

    let curCaptains = captains;
    if (curCaptains.length === 0) {
      curCaptains = await fetchCaptainsList();
    }

    const tripSlots = slots.filter((s) => {
      const tId = typeof s.trip === "object" ? s.trip?._id : s.trip;
      return String(tId) === String(trip._id);
    });

    const targetSlotId = defaultSlotId || (tripSlots.length > 0 ? tripSlots[0]._id : "");
    setAssignSlotId(targetSlotId);

    const initialSlot = tripSlots.find((s) => s._id === targetSlotId);
    if (initialSlot?.assignedCaptain) {
      const curCapId = (initialSlot.assignedCaptain as any)._id || (initialSlot.assignedCaptain as any).id;
      if (curCapId) {
        setAssignCaptainId(curCapId);
      }
    } else {
      const activeCaps = curCaptains.filter((c) => c.status === "Active");
      if (activeCaps.length > 0) {
        setAssignCaptainId(activeCaps[0]._id);
        setAssignFee(activeCaps[0].defaultTripFee || 5000);
      }
    }

    setIsAssignModalOpen(true);
  };

  const handleSlotSelectionChange = (slotId: string) => {
    setAssignSlotId(slotId);
    setAssignError(null);
    setConfirmReassign(false);
  };

  const handleCaptainSelectionChange = (capId: string) => {
    setAssignCaptainId(capId);
    setAssignError(null);
    setConfirmReassign(false);
    const cap = captains.find((c) => c._id === capId);
    if (cap) {
      setAssignFee(cap.defaultTripFee || 5000);
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError(null);
    setAssignSuccess(null);

    if (!assignSlotId) {
      setAssignError("Please select a departure slot.");
      return;
    }
    if (!assignCaptainId) {
      setAssignError("Please select an active captain.");
      return;
    }
    if (Number(assignFee) < 0 || isNaN(Number(assignFee))) {
      setAssignError("Please enter a valid agreed trip fee.");
      return;
    }

    const currentSlot = slots.find((s) => s._id === assignSlotId);
    const selectedCap = captains.find((c) => c._id === assignCaptainId);

    // Duplicate assignment with same role check
    const existingTeam = currentSlot?.assignedCaptains || (currentSlot?.assignedCaptain ? [currentSlot.assignedCaptain] : []);
    const alreadyWithSameRole = existingTeam.find(
      (c: any) => ((c._id || c.id) === assignCaptainId || c.name === selectedCap?.name) && c.role === assignRole
    );
    if (alreadyWithSameRole) {
      setAssignError(`${selectedCap?.name || "This captain"} is already assigned as ${assignRole} for this departure.`);
      return;
    }

    // Role-specific reassignment confirmation checks:
    // 1. Head Captain: Max 1 allowed per departure
    if (assignRole === "Head Captain") {
      const existingHead = existingTeam.find((c: any) => (c.role || "").includes("Head") || (c.role || "").includes("Lead"));
      if (existingHead && (existingHead._id || existingHead.name) !== assignCaptainId && !confirmReassign) {
        const confirmPrompt = `This departure already has a Head Captain: ${existingHead.name}. Replace them with ${selectedCap?.name}?`;
        if (!window.confirm(confirmPrompt)) {
          setConfirmReassign(false);
          return;
        }
        setConfirmReassign(true);
      }
    }
    // 2. Main Captain: Max 1 allowed per departure
    else if (assignRole === "Main Captain") {
      const existingMain = existingTeam.find((c: any) => (c.role || "").includes("Main") || (c.role || "").includes("Assistant"));
      if (existingMain && (existingMain._id || existingMain.name) !== assignCaptainId && !confirmReassign) {
        const confirmPrompt = `This departure already has a Main Captain: ${existingMain.name}. Replace them with ${selectedCap?.name}?`;
        if (!window.confirm(confirmPrompt)) {
          setConfirmReassign(false);
          return;
        }
        setConfirmReassign(true);
      }
    }
    // 3. Trainee Captain: Multiple Trainee Captains allowed per departure!

    // Overlapping availability check
    if (currentSlot?.date) {
      const slotDateObj = new Date(currentSlot.date);
      const isOverlap = slots.some((s) => {
        if (s._id === assignSlotId) return false;
        const sCaps = s.assignedCaptains || (s.assignedCaptain ? [s.assignedCaptain] : []);
        const matchesCap = sCaps.some((sc: any) => (sc._id || sc.id) === assignCaptainId || sc.name === selectedCap?.name);
        if (!matchesCap) return false;
        const otherDate = new Date(s.date);
        return (
          slotDateObj.getFullYear() === otherDate.getFullYear() &&
          slotDateObj.getMonth() === otherDate.getMonth() &&
          slotDateObj.getDate() === otherDate.getDate()
        );
      });

      if (isOverlap && !confirmReassign) {
        setAssignError(`Availability Conflict: ${selectedCap?.name} already has a departure assigned on this same date.`);
        return;
      }
    }

    setAssigningCaptain(true);
    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");

    try {
      const res = await axios.post(
        `${API_BASE_URL}/admin/operations/assignments`,
        {
          slotId: assignSlotId,
          captainId: assignCaptainId,
          role: assignRole,
          notes: assignNotes,
          captainFee: Number(assignFee),
          confirmReassign: true,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data?.success) {
        setAssignSuccess(`Captain ${selectedCap?.name || ""} assigned successfully!`);
        await fetchTripsAndSlots();
        setTimeout(() => {
          setIsAssignModalOpen(false);
          setAssignSuccess(null);
        }, 1200);
      } else {
        setAssignError(res.data?.message || "Failed to assign captain");
      }
    } catch (err: any) {
      console.error("Assignment submission error:", err);
      const msg = err.response?.data?.message || "Failed to assign captain";
      setAssignError(msg);
      if (err.response?.status === 409) {
        setConfirmReassign(true);
      }
    } finally {
      setAssigningCaptain(false);
    }
  };

  const handleRemoveCaptain = async (slotId: string, captainId: string, captainName: string) => {
    if (!slotId || !captainId) return;

    const confirmMsg = `Are you sure you want to remove ${captainName} from this departure slot?`;
    if (!window.confirm(confirmMsg)) return;

    setRemovingCaptainId(captainId);
    setAssignError(null);
    setAssignSuccess(null);

    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await axios.delete(
        `${API_BASE_URL}/admin/operations/assignments/${slotId}/${captainId}`,
        { headers }
      );

      if (res.data?.success) {
        setAssignSuccess(`${captainName} has been removed from this departure slot.`);

        // Optimistically update slots in state immediately
        setSlots((prevSlots) =>
          prevSlots.map((s) => {
            if (s._id !== slotId) return s;
            const updatedTeam = (s.assignedCaptains || []).filter((c: any) => {
              const cId = c._id || c.id || c.captain?._id || c.captain || c.captainId?._id || c.captainId;
              return cId !== captainId && c.name !== captainName;
            });
            const remainingHead =
              updatedTeam.find((c: any) => (c.role || "").includes("Head")) ||
              updatedTeam[0] ||
              null;
            return {
              ...s,
              assignedCaptain: remainingHead,
              assignedCaptains: updatedTeam,
            };
          })
        );

        // If the removed captain was selected in the dropdown, reset or choose another
        if (assignCaptainId === captainId) {
          const anotherCap = captains.find((c) => c._id !== captainId && c.status === "Active");
          setAssignCaptainId(anotherCap ? anotherCap._id : "");
        }

        // Re-fetch in background to sync server state
        await fetchTripsAndSlots();
      } else {
        setAssignError(res.data?.message || "Failed to remove captain from departure slot.");
      }
    } catch (err: any) {
      console.error("Failed to remove captain:", err);
      setAssignError(err.response?.data?.message || "Failed to remove captain from departure slot.");
    } finally {
      setRemovingCaptainId(null);
    }
  };

  const handleToggleSlot = async (slotId: string) => {
    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
    // Optimistically update local state immediately
    setSlots((prev) =>
      prev.map((s) => (s._id === slotId ? { ...s, isClosed: !s.isClosed } : s))
    );
    try {
      await axios.put(
        `${API_BASE_URL}/trip-slots/${slotId}/toggle`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      fetchTripsAndSlots();
    } catch (e) {
      console.error("Failed to toggle slot:", e);
      // Revert if error
      setSlots((prev) =>
        prev.map((s) => (s._id === slotId ? { ...s, isClosed: !s.isClosed } : s))
      );
      alert("Failed to toggle slot availability");
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!window.confirm("Are you sure you want to delete this trip package?")) return;
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${API_BASE_URL}/trips/${tripId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchTripsAndSlots();
    } catch (e) {
      console.error("Failed to delete trip:", e);
      alert("Failed to delete trip");
    }
  };

  const handleCreateDeparture = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlotError(null);
    setSlotSuccess(null);

    if (!slotTripId) {
      setSlotError("Please select a trip package.");
      return;
    }
    if (!slotDate || !slotDate.trim()) {
      setSlotError("Please specify a departure date.");
      return;
    }
    if (Number(slotTotalSeats) <= 0 || isNaN(Number(slotTotalSeats))) {
      setSlotError("Total seats capacity must be at least 1.");
      return;
    }

    setSavingSlot(true);
    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");

    // Standardize input date string
    let cleanDate = slotDate.trim();
    const ddmmyyyyMatch = cleanDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyyMatch) {
      const day = ddmmyyyyMatch[1].padStart(2, "0");
      const month = ddmmyyyyMatch[2].padStart(2, "0");
      const year = ddmmyyyyMatch[3];
      cleanDate = `${year}-${month}-${day}`;
    }

    try {
      const res = await axios.post(
        `${API_BASE_URL}/trip-slots`,
        {
          trip: slotTripId,
          tripId: slotTripId,
          date: cleanDate,
          totalSlots: Number(slotTotalSeats) || 24,
          photoDriveLink: slotPhotoDriveLink.trim(),
          billDriveLink: slotBillDriveLink.trim(),
          whatsappGroupLink: slotWhatsappGroupLink.trim(),
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data?.success && res.data?.slot) {
        setSlotSuccess("Departure slot created successfully!");
        const newSlot = res.data.slot;

        // Immediately update local slots state so departures table and Assign modal have it without reload
        setSlots((prev) => [newSlot, ...prev]);

        // Refetch full data
        fetchTripsAndSlots();

        setTimeout(() => {
          setIsAddSlotOpen(false);
          setSlotDate("");
          setSlotPhotoDriveLink("");
          setSlotBillDriveLink("");
          setSlotWhatsappGroupLink("");
          setSlotSuccess(null);

          // If this slot was scheduled from within the Assign modal, reopen Assign modal with this slot preselected!
          if (returnToAssignTrip) {
            const tr = returnToAssignTrip;
            setReturnToAssignTrip(null);
            handleOpenAssignModal(tr, newSlot._id);
          }
        }, 700);
      } else {
        setSlotError(res.data?.message || "Failed to add departure slot");
      }
    } catch (err: any) {
      console.error("Failed to add departure:", err);
      setSlotError(err.response?.data?.message || "Failed to add departure slot");
    } finally {
      setSavingSlot(false);
    }
  };

  const handleOpenLinksModal = (slot: SlotItem) => {
    setSelectedSlotForLinks(slot);
    setEditPhotoDriveLink(slot.photoDriveLink || "");
    setEditBillDriveLink(slot.billDriveLink || "");
    setEditWhatsappGroupLink(slot.whatsappGroupLink || "");
    setLinksError(null);
    setLinksSuccess(null);
    setIsEditLinksModalOpen(true);
  };

  const handleSaveSlotLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotForLinks) return;
    setSavingLinks(true);
    setLinksError(null);
    setLinksSuccess(null);

    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
    try {
      const res = await axios.put(
        `${API_BASE_URL}/admin/operations/slots/${selectedSlotForLinks._id}/links`,
        {
          photoDriveLink: editPhotoDriveLink.trim(),
          billDriveLink: editBillDriveLink.trim(),
          whatsappGroupLink: editWhatsappGroupLink.trim(),
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data?.success) {
        setLinksSuccess("Departure Drive & WhatsApp links updated successfully!");
        setSlots((prev) =>
          prev.map((s) =>
            s._id === selectedSlotForLinks._id
              ? {
                  ...s,
                  photoDriveLink: editPhotoDriveLink.trim(),
                  billDriveLink: editBillDriveLink.trim(),
                  whatsappGroupLink: editWhatsappGroupLink.trim(),
                }
              : s
          )
        );
        fetchTripsAndSlots();
        setTimeout(() => {
          setIsEditLinksModalOpen(false);
          setLinksSuccess(null);
        }, 800);
      } else {
        setLinksError(res.data?.message || "Failed to update links.");
      }
    } catch (err: any) {
      console.error("Failed to update links:", err);
      setLinksError(err.response?.data?.message || "Failed to update links.");
    } finally {
      setSavingLinks(false);
    }
  };

  const handleOpenEditSlot = (slot: SlotItem) => {
    setEditingSlot(slot);
    const tId = typeof slot.trip === "object" ? slot.trip._id : slot.trip;
    setEditSlotTripId(tId || (trips[0] ? trips[0]._id : ""));

    let yyyymmdd = "";
    if (slot.date) {
      try {
        const d = new Date(slot.date);
        if (!isNaN(d.getTime())) {
          yyyymmdd = d.toISOString().split("T")[0];
        } else {
          yyyymmdd = slot.date.split("T")[0];
        }
      } catch {
        yyyymmdd = slot.date;
      }
    }
    setEditSlotDate(yyyymmdd);
    setEditSlotTotalSeats(slot.totalSlots || 24);
    setEditSlotPhotoDriveLink(slot.photoDriveLink || "");
    setEditSlotBillDriveLink(slot.billDriveLink || "");
    setEditSlotWhatsappGroupLink(slot.whatsappGroupLink || "");
    setEditSlotIsClosed(Boolean(slot.isClosed));
    setEditSlotError(null);
    setEditSlotSuccess(null);
    setIsEditSlotOpen(true);
  };

  const handleSaveEditSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;
    setSavingEditSlot(true);
    setEditSlotError(null);
    setEditSlotSuccess(null);

    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");

    let cleanDate = editSlotDate.trim();
    const ddmmyyyyMatch = cleanDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyyMatch) {
      cleanDate = `${ddmmyyyyMatch[3]}-${ddmmyyyyMatch[2].padStart(2, "0")}-${ddmmyyyyMatch[1].padStart(2, "0")}`;
    }

    try {
      const res = await axios.put(
        `${API_BASE_URL}/trip-slots/${editingSlot._id}`,
        {
          trip: editSlotTripId,
          tripId: editSlotTripId,
          date: cleanDate,
          totalSlots: Number(editSlotTotalSeats),
          photoDriveLink: editSlotPhotoDriveLink.trim(),
          billDriveLink: editSlotBillDriveLink.trim(),
          whatsappGroupLink: editSlotWhatsappGroupLink.trim(),
          isClosed: editSlotIsClosed,
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data?.success) {
        setEditSlotSuccess("Departure slot updated successfully!");
        const targetTrip = trips.find((t) => t._id === editSlotTripId);
        setSlots((prev) =>
          prev.map((s) => {
            if (s._id !== editingSlot._id) return s;
            return {
              ...s,
              trip: targetTrip
                ? {
                    _id: targetTrip._id,
                    title: targetTrip.title,
                    location: targetTrip.location,
                    image: targetTrip.image,
                  }
                : s.trip,
              date: cleanDate,
              totalSlots: Number(editSlotTotalSeats),
              photoDriveLink: editSlotPhotoDriveLink.trim(),
              billDriveLink: editSlotBillDriveLink.trim(),
              whatsappGroupLink: editSlotWhatsappGroupLink.trim(),
              isClosed: editSlotIsClosed,
            };
          })
        );
        fetchTripsAndSlots();
        setTimeout(() => {
          setIsEditSlotOpen(false);
          setEditSlotSuccess(null);
        }, 750);
      } else {
        setEditSlotError(res.data?.message || "Failed to update departure slot.");
      }
    } catch (err: any) {
      console.error("Failed to update departure slot:", err);
      setEditSlotError(err.response?.data?.message || "Failed to update departure slot.");
    } finally {
      setSavingEditSlot(false);
    }
  };

  const handleDeleteDepartureSlot = async (slotId: string) => {
    const slot = slots.find((s) => s._id === slotId);
    if (slot && slot.bookedSlots > 0) {
      alert(`Cannot delete departure slot with ${slot.bookedSlots} confirmed booking(s). Please cancel or reassign bookings first.`);
      return;
    }
    if (!window.confirm("Are you sure you want to delete this departure slot?")) return;
    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
    try {
      const res = await axios.delete(`${API_BASE_URL}/trip-slots/${slotId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.data?.success) {
        setSlots((prev) => prev.filter((s) => s._id !== slotId));
      }
      fetchTripsAndSlots();
    } catch (err: any) {
      console.error("Failed to delete departure slot:", err);
      alert(err.response?.data?.message || "Failed to delete departure slot.");
    }
  };

  const filteredSlots = slots.filter((s) => {
    const tripObj = typeof s.trip === "object" ? s.trip : null;
    const title = (tripObj?.title || "").toLowerCase();
    const dateStr = (s.date || "").toLowerCase();
    const formatted = formatSlotDate(s.date).toLowerCase();
    const available = s.totalSlots - s.bookedSlots;
    const isUpcoming = !s.isClosed && available > 0;
    const team = s.assignedCaptains || (s.assignedCaptain ? [s.assignedCaptain] : []);

    if (departureSearch.trim()) {
      const q = departureSearch.trim().toLowerCase();
      const matches = title.includes(q) || dateStr.includes(q) || formatted.includes(q);
      if (!matches) return false;
    }

    if (departureFilter === "upcoming") return isUpcoming;
    if (departureFilter === "soldout") return !s.isClosed && available <= 0;
    if (departureFilter === "closed") return Boolean(s.isClosed);
    if (departureFilter === "unassigned") return team.length === 0;
    return true;
  });

  const filteredTrips = trips.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.location || "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-title-box">
          <h1>Trips</h1>
          <p>Manage trip packages, departures, slots and pickup locations.</p>
        </div>

        {/* Top sub-navigation tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setActiveTab("packages")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 16px",
              borderRadius: "10px",
              border: "1px solid",
              borderColor: activeTab === "packages" ? "#166534" : "#e2e8f0",
              background: activeTab === "packages" ? "#eaf5e9" : "#ffffff",
              color: activeTab === "packages" ? "#166534" : "#475569",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Mountain size={15} />
            <span>Trip Packages</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("departures")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 16px",
              borderRadius: "10px",
              border: "1px solid",
              borderColor: activeTab === "departures" ? "#166534" : "#e2e8f0",
              background: activeTab === "departures" ? "#eaf5e9" : "#ffffff",
              color: activeTab === "departures" ? "#166534" : "#475569",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Calendar size={15} />
            <span>Departures & Slots</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pickups")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 16px",
              borderRadius: "10px",
              border: "1px solid",
              borderColor: activeTab === "pickups" ? "#166534" : "#e2e8f0",
              background: activeTab === "pickups" ? "#eaf5e9" : "#ffffff",
              color: activeTab === "pickups" ? "#166534" : "#475569",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <MapPin size={15} />
            <span>Pickup Locations</span>
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => navigate("/admin/add-trip")}
          >
            <Plus size={16} />
            <span>Create Trip</span>
          </button>
        </div>
      </div>

      {fetchError && (
        <div
          style={{
            padding: "14px 18px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "12px",
            color: "#b91c1c",
            fontSize: "13px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{fetchError}</span>
          <button
            type="button"
            onClick={fetchTripsAndSlots}
            style={{
              padding: "5px 12px",
              background: "#b91c1c",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* SECTION 1: TRIP PACKAGES GRID (Matches Reference Image #4) */}
      {activeTab === "packages" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e7ecf0",
              borderRadius: "14px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Mountain size={20} color="#166534" />
              <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                Trip Packages ({trips.length})
              </h2>
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                All your travel packages. Create, edit or manage trips here.
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ position: "relative", width: "280px" }}>
                <Search
                  size={15}
                  style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
                />
                <input
                  type="text"
                  placeholder="Search trips by name or destination..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px 8px 32px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    background: "#f8fafc",
                  }}
                />
              </div>

              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => navigate("/admin/add-trip")}
                style={{ padding: "8px 14px", fontSize: "12.5px" }}
              >
                <Plus size={14} />
                <span>Add Trip</span>
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {loading ? (
              <div style={{ padding: "40px", color: "#94a3b8", textAlign: "center", gridColumn: "1 / -1" }}>
                Loading trip packages...
              </div>
            ) : filteredTrips.length === 0 ? (
              <div style={{ padding: "48px", color: "#94a3b8", textAlign: "center", gridColumn: "1 / -1" }}>
                No trips found
              </div>
            ) : (
              filteredTrips.map((t) => (
                <div
                  key={t._id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e7ecf0",
                    borderRadius: "14px",
                    overflow: "hidden",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Image Cover */}
                  <div style={{ position: "relative", height: "160px", background: "#f1f5f9" }}>
                    <img
                      src={t.image || "https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?w=600"}
                      alt={t.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <div style={{ position: "absolute", top: "12px", left: "12px" }}>
                      <span className="admin-badge active">● Active</span>
                    </div>

                    <div style={{ position: "absolute", top: "12px", right: "12px" }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteTrip(t._id)}
                        title="Delete Trip"
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.9)",
                          border: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          color: "#ef4444",
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div style={{ padding: "16px", display: "flex", flexDirection: "column", flex: 1, gap: "10px" }}>
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                        {t.title}
                      </h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#64748b", marginTop: "3px" }}>
                        <MapPin size={13} color="#15803d" />
                        <span>{t.location || "South India"}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "12px", color: "#475569" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={13} color="#15803d" />
                        <span>{t.duration || "2 Days / 1 Night"}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Users size={13} color="#15803d" />
                        <span>Min 12</span>
                      </div>
                    </div>

                    <div style={{ marginTop: "auto", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "16px", fontWeight: 700, color: "#166534" }}>
                        ₹{Number(t.price).toLocaleString("en-IN")}
                      </span>
                      <span style={{ fontSize: "11px", color: "#64748b" }}> per person</span>
                    </div>

                    {/* Card Actions */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "10px" }}>
                      <a
                        href={`/trip/${t._id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: "7px 6px", fontSize: "11.5px", justifyContent: "center" }}
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </a>

                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        onClick={() => navigate(`/admin/add-trip?edit=${t._id}`)}
                        style={{ padding: "7px 6px", fontSize: "11.5px", justifyContent: "center" }}
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSlotTripId(t._id);
                          setActiveTab("departures");
                        }}
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: "7px 6px", fontSize: "11.5px", justifyContent: "center" }}
                      >
                        <Calendar size={13} />
                        <span>Manage Slots</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenAssignModal(t)}
                        className="admin-btn admin-btn-primary"
                        style={{ padding: "7px 6px", fontSize: "11.5px", justifyContent: "center", background: "#0d2b17" }}
                        title="Assign Captain to Departure"
                      >
                        <Shield size={13} />
                        <span>Assign Captain</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: TRIP DEPARTURES & SLOTS */}
      {activeTab === "departures" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Header Controls Bar */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "#dcfce7",
                  color: "#166534",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Calendar size={22} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h2 style={{ fontSize: "17px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                    Trip Departures & Slots
                  </h2>
                  <span
                    style={{
                      background: "#f1f5f9",
                      color: "#475569",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    {slots.length} total
                  </span>
                </div>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Schedule dates, manage capacity, assign captain team, and configure drive folders.
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {/* View Switch: Cards vs Table */}
              <div
                style={{
                  display: "inline-flex",
                  background: "#f1f5f9",
                  padding: "3px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <button
                  type="button"
                  onClick={() => setDeparturesViewMode("cards")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: departuresViewMode === "cards" ? "#ffffff" : "transparent",
                    color: departuresViewMode === "cards" ? "#166534" : "#64748b",
                    fontWeight: departuresViewMode === "cards" ? 700 : 500,
                    fontSize: "12px",
                    cursor: "pointer",
                    boxShadow: departuresViewMode === "cards" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  <LayoutGrid size={14} />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeparturesViewMode("table")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: departuresViewMode === "table" ? "#ffffff" : "transparent",
                    color: departuresViewMode === "table" ? "#166534" : "#64748b",
                    fontWeight: departuresViewMode === "table" ? 700 : 500,
                    fontSize: "12px",
                    cursor: "pointer",
                    boxShadow: departuresViewMode === "table" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  <TableIcon size={14} />
                  <span>Table</span>
                </button>
              </div>

              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => setIsAddSlotOpen(true)}
              >
                <Plus size={16} />
                <span>Add Departure</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
              flexWrap: "wrap",
            }}
          >
            {/* Search Input */}
            <div style={{ position: "relative", flex: "1 1 240px", maxWidth: "380px" }}>
              <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Search departures by trip or date..."
                value={departureSearch}
                onChange={(e) => setDepartureSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 12px 7px 32px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12.5px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Filter Pills */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              {[
                { id: "all", label: "All", count: slots.length, activeBg: "#166534" },
                { id: "upcoming", label: "Upcoming", count: slots.filter((s) => !s.isClosed && (s.totalSlots - s.bookedSlots) > 0).length, activeBg: "#166534" },
                { id: "soldout", label: "Sold Out", count: slots.filter((s) => !s.isClosed && (s.totalSlots - s.bookedSlots) <= 0).length, activeBg: "#dc2626" },
                { id: "closed", label: "Closed", count: slots.filter((s) => Boolean(s.isClosed)).length, activeBg: "#b45309" },
                { id: "unassigned", label: "Unassigned Captain", count: slots.filter((s) => !(s.assignedCaptains?.length || s.assignedCaptain)).length, activeBg: "#166534" },
              ].map((f) => {
                const isSelected = departureFilter === f.id;
                const activeColor = f.activeBg || "#166534";
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setDepartureFilter(f.id as any)}
                    style={{
                      border: `1px solid ${isSelected ? activeColor : "#e2e8f0"}`,
                      background: isSelected ? activeColor : "#ffffff",
                      color: isSelected ? "#ffffff" : "#475569",
                      padding: "5px 10px",
                      borderRadius: "6px",
                      fontSize: "11.5px",
                      fontWeight: isSelected ? 700 : 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>{f.label}</span>
                    <span
                      style={{
                        background: isSelected ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                        color: isSelected ? "#ffffff" : "#64748b",
                        fontSize: "10px",
                        padding: "1px 5px",
                        borderRadius: "10px",
                        fontWeight: 700,
                      }}
                    >
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* VIEW MODE 1: CARDS VIEW */}
          {departuresViewMode === "cards" && (
            <div>
              {filteredSlots.length === 0 ? (
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px dashed #cbd5e1",
                    borderRadius: "14px",
                    padding: "48px 24px",
                    textAlign: "center",
                    color: "#64748b",
                  }}
                >
                  <Calendar size={36} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
                  <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b", margin: "0 0 6px 0" }}>
                    No departure slots match your search or filter
                  </h3>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px 0" }}>
                    Try clearing filters or schedule a new departure slot for your trips.
                  </p>
                  <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                    {(departureSearch || departureFilter !== "all") && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        onClick={() => {
                          setDepartureSearch("");
                          setDepartureFilter("all");
                        }}
                      >
                        Clear Filters
                      </button>
                    )}
                    <button
                      type="button"
                      className="admin-btn admin-btn-primary"
                      onClick={() => setIsAddSlotOpen(true)}
                    >
                      <Plus size={15} />
                      <span>Add Departure</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
                    gap: "20px",
                  }}
                >
                  {filteredSlots.map((s) => {
                    const tripObj = typeof s.trip === "object" ? s.trip : null;
                    const matchedTrip = trips.find((t) => t._id === (tripObj?._id || s.trip));
                    const tripTitle = tripObj?.title || matchedTrip?.title || "Custom Trip";
                    const tripLocation = tripObj?.location || matchedTrip?.location || "South India";
                    const tripImage = tripObj?.image || matchedTrip?.image || "https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?w=600";
                    const available = s.totalSlots - s.bookedSlots;
                    const team = s.assignedCaptains && s.assignedCaptains.length > 0
                      ? s.assignedCaptains
                      : (s.assignedCaptain?.name ? [s.assignedCaptain] : []);

                    return (
                      <div
                        key={s._id}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "16px",
                          boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03)",
                          display: "flex",
                          flexDirection: "column",
                          overflow: "hidden",
                          transition: "transform 0.15s ease, box-shadow 0.15s ease",
                        }}
                      >
                        {/* Cover Image Banner */}
                        <div style={{ position: "relative", height: "130px", background: "#f1f5f9" }}>
                          <img
                            src={tripImage}
                            alt={tripTitle}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: "linear-gradient(to top, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.35) 60%, rgba(15, 23, 42, 0.15) 100%)",
                            }}
                          />

                          {/* Status Badge */}
                          <div style={{ position: "absolute", top: "12px", left: "12px" }}>
                            {s.isClosed ? (
                              <span
                                style={{
                                  background: "rgba(217, 119, 6, 0.95)",
                                  color: "#ffffff",
                                  padding: "4px 9px",
                                  borderRadius: "20px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                                }}
                              >
                                <Lock size={11} /> Closed Slot
                              </span>
                            ) : available === 0 ? (
                              <span
                                style={{
                                  background: "rgba(220, 38, 38, 0.95)",
                                  color: "#ffffff",
                                  padding: "4px 9px",
                                  borderRadius: "20px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                                }}
                              >
                                Sold Out
                              </span>
                            ) : (
                              <span
                                style={{
                                  background: "rgba(22, 101, 52, 0.95)",
                                  color: "#ffffff",
                                  padding: "4px 9px",
                                  borderRadius: "20px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                                }}
                              >
                                ● Upcoming
                              </span>
                            )}
                          </div>

                          {/* Quick Edit and Delete buttons */}
                          <div style={{ position: "absolute", top: "10px", right: "10px", display: "flex", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditSlot(s)}
                              title="Edit Departure Slot"
                              style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "50%",
                                background: "rgba(255, 255, 255, 0.95)",
                                border: "none",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                color: "#0f172a",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                              }}
                            >
                              <Edit2 size={13} />
                            </button>

                            {s.bookedSlots === 0 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteDepartureSlot(s._id)}
                                title="Delete Departure Slot"
                                style={{
                                  width: "30px",
                                  height: "30px",
                                  borderRadius: "50%",
                                  background: "rgba(255, 255, 255, 0.95)",
                                  border: "none",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  color: "#ef4444",
                                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>

                          {/* Trip Title & Location */}
                          <div style={{ position: "absolute", bottom: "10px", left: "14px", right: "14px" }}>
                            <h3
                              style={{
                                margin: 0,
                                fontSize: "15px",
                                fontWeight: 700,
                                color: "#ffffff",
                                textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {tripTitle}
                            </h3>
                            <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#e2e8f0", marginTop: "2px" }}>
                              <MapPin size={11} color="#86efac" />
                              <span>{tripLocation}</span>
                              {matchedTrip?.duration && (
                                <>
                                  <span style={{ opacity: 0.6 }}>&bull;</span>
                                  <Clock size={11} color="#86efac" />
                                  <span>{matchedTrip.duration}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
                          {/* Departure Date Banner */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              borderRadius: "10px",
                              padding: "10px 12px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "8px",
                                  background: "#dcfce7",
                                  color: "#166534",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <Calendar size={16} />
                              </div>
                              <div>
                                <div style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                  Departure Date
                                </div>
                                <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                                  {formatSlotDate(s.date)}
                                </div>
                              </div>
                            </div>

                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 600 }}>Capacity</div>
                              <div style={{ fontSize: "13px", fontWeight: 700, color: "#166534" }}>
                                {s.totalSlots} Seats
                              </div>
                            </div>
                          </div>

                          {/* Capacity & Bookings Bar */}
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px", fontSize: "12px" }}>
                              <span style={{ color: "#475569", fontWeight: 600 }}>
                                Booked: <strong>{s.bookedSlots}</strong> / {s.totalSlots}
                              </span>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: available === 0 ? "#dc2626" : available <= 5 ? "#d97706" : "#166534",
                                }}
                              >
                                {available === 0 ? "No seats left" : `${available} seats left`}
                              </span>
                            </div>
                            <div
                              style={{
                                width: "100%",
                                height: "6px",
                                background: "#f1f5f9",
                                borderRadius: "999px",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${Math.min(100, Math.round((s.bookedSlots / (s.totalSlots || 1)) * 100))}%`,
                                  background: available === 0 ? "#ef4444" : available <= 5 ? "#f59e0b" : "#166534",
                                  borderRadius: "999px",
                                  transition: "width 0.3s ease",
                                }}
                              />
                            </div>
                          </div>

                          {/* Assigned Captains Section */}
                          <div
                            style={{
                              border: "1px solid #e2e8f0",
                              borderRadius: "10px",
                              padding: "9px 12px",
                              background: "#ffffff",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: team.length > 0 ? "6px" : "0" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#334155" }}>
                                <Shield size={14} color="#166534" />
                                <span>Assigned Team ({team.length})</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const tr = trips.find((t) => t._id === (typeof s.trip === "object" ? s.trip?._id : s.trip)) || trips[0];
                                  handleOpenAssignModal(tr, s._id);
                                }}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#166534",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  padding: 0,
                                }}
                              >
                                {team.length > 0 ? "Manage" : "+ Assign"}
                              </button>
                            </div>

                            {team.length > 0 ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                                {team.map((cap: any, cIdx: number) => {
                                  const roleStyle = getRoleBadgeStyle(cap.role);
                                  return (
                                    <div
                                      key={cap._id || cap.id || cIdx}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        background: "#f8fafc",
                                        padding: "4px 8px",
                                        borderRadius: "6px",
                                        fontSize: "11.5px",
                                      }}
                                    >
                                      <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                                        <div
                                          style={{
                                            width: "20px",
                                            height: "20px",
                                            borderRadius: "50%",
                                            background: roleStyle.bg,
                                            color: roleStyle.color,
                                            fontSize: "10px",
                                            fontWeight: 700,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                          }}
                                        >
                                          {cap.name ? cap.name[0].toUpperCase() : "C"}
                                        </div>
                                        <span style={{ fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                          {cap.name}
                                        </span>
                                      </div>
                                      <span
                                        style={{
                                          background: roleStyle.bg,
                                          color: roleStyle.color,
                                          border: roleStyle.border,
                                          fontSize: "9.5px",
                                          fontWeight: 700,
                                          padding: "1px 6px",
                                          borderRadius: "4px",
                                          whiteSpace: "nowrap",
                                          flexShrink: 0,
                                        }}
                                      >
                                        {roleStyle.label}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div style={{ fontSize: "11.5px", color: "#94a3b8", fontStyle: "italic", marginTop: "2px" }}>
                                No captain assigned yet. Click "+ Assign" above.
                              </div>
                            )}
                          </div>

                          {/* Links Indicators (Drive & WhatsApp) */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                              {/* Photos Link */}
                              <div
                                style={{
                                  background: s.photoDriveLink ? "#f0fdf4" : "#f8fafc",
                                  border: `1px solid ${s.photoDriveLink ? "#bbf7d0" : "#e2e8f0"}`,
                                  borderRadius: "8px",
                                  padding: "6px 9px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  fontSize: "11px",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "5px", color: s.photoDriveLink ? "#166534" : "#94a3b8", fontWeight: 600 }}>
                                  <FolderOpen size={12} color={s.photoDriveLink ? "#166534" : "#94a3b8"} />
                                  <span>Photos Drive</span>
                                </div>
                                {s.photoDriveLink ? (
                                  <a
                                    href={s.photoDriveLink.startsWith("http") ? s.photoDriveLink : `https://${s.photoDriveLink}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: "#166534", display: "flex", alignItems: "center" }}
                                    title="Open Photos Drive folder"
                                  >
                                    <ExternalLink size={11} />
                                  </a>
                                ) : (
                                  <span style={{ fontSize: "10px", color: "#94a3b8" }}>—</span>
                                )}
                              </div>

                              {/* Bills Link */}
                              <div
                                style={{
                                  background: s.billDriveLink ? "#f0f9ff" : "#f8fafc",
                                  border: `1px solid ${s.billDriveLink ? "#bae6fd" : "#e2e8f0"}`,
                                  borderRadius: "8px",
                                  padding: "6px 9px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  fontSize: "11px",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "5px", color: s.billDriveLink ? "#0284c7" : "#94a3b8", fontWeight: 600 }}>
                                  <FileText size={12} color={s.billDriveLink ? "#0284c7" : "#94a3b8"} />
                                  <span>Bills Drive</span>
                                </div>
                                {s.billDriveLink ? (
                                  <a
                                    href={s.billDriveLink.startsWith("http") ? s.billDriveLink : `https://${s.billDriveLink}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: "#0284c7", display: "flex", alignItems: "center" }}
                                    title="Open Bills Drive folder"
                                  >
                                    <ExternalLink size={11} />
                                  </a>
                                ) : (
                                  <span style={{ fontSize: "10px", color: "#94a3b8" }}>—</span>
                                )}
                              </div>
                            </div>

                            {/* WhatsApp Group Link */}
                            <div
                              style={{
                                background: s.whatsappGroupLink ? "#f0fdf4" : "#f8fafc",
                                border: `1px solid ${s.whatsappGroupLink ? "#86efac" : "#e2e8f0"}`,
                                borderRadius: "8px",
                                padding: "6px 9px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                fontSize: "11px",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "5px", color: s.whatsappGroupLink ? "#15803d" : "#94a3b8", fontWeight: 600 }}>
                                <MessageCircle size={12} color={s.whatsappGroupLink ? "#15803d" : "#94a3b8"} />
                                <span>WhatsApp Group</span>
                              </div>
                              {s.whatsappGroupLink ? (
                                <a
                                  href={s.whatsappGroupLink.startsWith("http") ? s.whatsappGroupLink : `https://${s.whatsappGroupLink}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: "#15803d", display: "flex", alignItems: "center", gap: "3px", textDecoration: "none", fontWeight: 600 }}
                                  title="Open WhatsApp Group invitation"
                                >
                                  <span>Open</span>
                                  <ExternalLink size={11} />
                                </a>
                              ) : (
                                <span style={{ fontSize: "10px", color: "#94a3b8" }}>Not added</span>
                              )}
                            </div>
                          </div>

                          {/* Card Actions Grid */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "auto", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
                            <button
                              type="button"
                              className="admin-btn admin-btn-secondary"
                              onClick={() => handleOpenEditSlot(s)}
                              style={{ padding: "7px 6px", fontSize: "11.5px", justifyContent: "center", fontWeight: 600 }}
                            >
                              <Edit2 size={12} />
                              <span>Edit Slot</span>
                            </button>

                            <button
                              type="button"
                              className="admin-btn admin-btn-secondary"
                              onClick={() => handleOpenLinksModal(s)}
                              title="Configure Photos Drive, Bills Drive & WhatsApp Group Links"
                              style={{ padding: "7px 6px", fontSize: "11.5px", justifyContent: "center", fontWeight: 600 }}
                            >
                              <FolderOpen size={12} />
                              <span>Drive & Chat</span>
                            </button>

                            <button
                              type="button"
                              className="admin-btn admin-btn-secondary"
                              onClick={() => {
                                const tr = trips.find((t) => t._id === (typeof s.trip === "object" ? s.trip?._id : s.trip)) || trips[0];
                                handleOpenAssignModal(tr, s._id);
                              }}
                              style={{ padding: "7px 6px", fontSize: "11.5px", justifyContent: "center", fontWeight: 600 }}
                            >
                              <Shield size={12} />
                              <span>{team.length > 0 ? "Reassign" : "Assign Captain"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleSlot(s._id)}
                              style={{
                                border: "1px solid",
                                borderColor: s.isClosed ? "#fde68a" : "#cbd5e1",
                                background: s.isClosed ? "#fef3c7" : "#ffffff",
                                color: s.isClosed ? "#b45309" : "#475569",
                                borderRadius: "6px",
                                padding: "7px 6px",
                                fontSize: "11.5px",
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "4px",
                              }}
                            >
                              {s.isClosed ? (
                                <>
                                  <Unlock size={12} />
                                  <span>Open Slot</span>
                                </>
                              ) : (
                                <>
                                  <Lock size={12} />
                                  <span>Close Slot</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW MODE 2: TABLE VIEW */}
          {departuresViewMode === "table" && (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e7ecf0",
                borderRadius: "14px",
                overflow: "hidden",
              }}
            >
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: "50px" }}>#</th>
                      <th>Trip Package</th>
                      <th>Departure Date</th>
                      <th style={{ textAlign: "center" }}>Capacity</th>
                      <th style={{ textAlign: "center" }}>Booked</th>
                      <th style={{ textAlign: "center" }}>Available</th>
                      <th>Assigned Captain</th>
                      <th>Status</th>
                      <th style={{ textAlign: "center", minWidth: "260px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSlots.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                          No departures found.
                        </td>
                      </tr>
                    ) : (
                      filteredSlots.map((s, idx) => {
                        const tripObj = typeof s.trip === "object" ? s.trip : null;
                        const matchedTrip = trips.find((t) => t._id === (tripObj?._id || s.trip));
                        const tripTitle = tripObj?.title || matchedTrip?.title || "Custom Trip";
                        const available = s.totalSlots - s.bookedSlots;
                        const isUpcoming = !s.isClosed && available > 0;
                        const team = s.assignedCaptains && s.assignedCaptains.length > 0
                          ? s.assignedCaptains
                          : (s.assignedCaptain?.name ? [s.assignedCaptain] : []);

                        return (
                          <tr key={s._id}>
                            <td>{idx + 1}</td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <img
                                  src={tripObj?.image || matchedTrip?.image || "https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?w=100"}
                                  alt={tripTitle}
                                  style={{ width: "36px", height: "36px", borderRadius: "6px", objectFit: "cover" }}
                                />
                                <span style={{ fontWeight: 600, color: "#0f172a" }}>
                                  {tripTitle}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: "#166534" }}>
                                {formatSlotDate(s.date)}
                              </span>
                            </td>
                            <td style={{ textAlign: "center", fontWeight: 600 }}>{s.totalSlots}</td>
                            <td style={{ textAlign: "center", color: "#166534", fontWeight: 700 }}>
                              {s.bookedSlots}
                            </td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: available === 0 ? "#ef4444" : "#0f172a" }}>
                              {available}
                            </td>
                            <td>
                              {team.length === 0 ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#94a3b8" }}>
                                  <Shield size={14} />
                                  <span>Unassigned</span>
                                </div>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                  {team.map((cap: any, cIdx: number) => {
                                    const b = getRoleBadgeStyle(cap.role);
                                    return (
                                      <div key={cap._id || cIdx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <div
                                          style={{
                                            width: "20px",
                                            height: "20px",
                                            borderRadius: "50%",
                                            background: b.bg,
                                            color: b.color,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "9.5px",
                                            fontWeight: 700,
                                            flexShrink: 0,
                                          }}
                                        >
                                          {cap.name ? cap.name[0].toUpperCase() : "C"}
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                          <span style={{ fontWeight: 600, color: "#0f172a", fontSize: "12px" }}>
                                            {cap.name}
                                          </span>
                                          <span
                                            style={{
                                              fontSize: "9.5px",
                                              fontWeight: 700,
                                              padding: "1px 5px",
                                              borderRadius: "8px",
                                              background: b.bg,
                                              color: b.color,
                                              border: b.border,
                                            }}
                                          >
                                            {b.label}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                            <td>
                              {s.isClosed ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    padding: "3px 8px",
                                    borderRadius: "12px",
                                    background: "#fef3c7",
                                    color: "#92400e",
                                    border: "1px solid #fde68a",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                  }}
                                >
                                  <Lock size={11} /> Closed
                                </span>
                              ) : available <= 0 ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    padding: "3px 8px",
                                    borderRadius: "12px",
                                    background: "#fee2e2",
                                    color: "#b91c1c",
                                    border: "1px solid #fecaca",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                  }}
                                >
                                  Sold Out
                                </span>
                              ) : isUpcoming ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    padding: "3px 8px",
                                    borderRadius: "12px",
                                    background: "#f0fdf4",
                                    color: "#166534",
                                    border: "1px solid #bbf7d0",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                  }}
                                >
                                  ● Upcoming
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    padding: "3px 8px",
                                    borderRadius: "12px",
                                    background: "#f1f5f9",
                                    color: "#475569",
                                    border: "1px solid #e2e8f0",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                  }}
                                >
                                  Active
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditSlot(s)}
                                  title="Edit Departure Slot"
                                  style={{
                                    border: "1px solid #cbd5e1",
                                    background: "#ffffff",
                                    color: "#0f172a",
                                    borderRadius: "6px",
                                    padding: "5px 8px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  <Edit2 size={12} />
                                  <span>Edit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const tr = trips.find((t) => t._id === (typeof s.trip === "object" ? s.trip?._id : s.trip)) || trips[0];
                                    handleOpenAssignModal(tr, s._id);
                                  }}
                                  title="Assign or Reassign Captain"
                                  style={{
                                    border: "1px solid #bbf7d0",
                                    background: "#f0fdf4",
                                    color: "#166534",
                                    borderRadius: "6px",
                                    padding: "5px 8px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  <Shield size={12} />
                                  <span>{team.length > 0 ? "Reassign" : "Assign"}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenLinksModal(s)}
                                  title="View & Edit Drive & WhatsApp Links"
                                  style={{
                                    border: "1px solid #e2e8f0",
                                    background: (s.photoDriveLink || s.billDriveLink || s.whatsappGroupLink) ? "#eff6ff" : "#f8fafc",
                                    color: (s.photoDriveLink || s.billDriveLink || s.whatsappGroupLink) ? "#1d4ed8" : "#64748b",
                                    borderRadius: "6px",
                                    padding: "5px 8px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  <FolderOpen size={12} />
                                  <span>Links</span>
                                  {(s.photoDriveLink || s.billDriveLink || s.whatsappGroupLink) && (
                                    <span
                                      title="Links configured"
                                      style={{
                                        display: "inline-block",
                                        width: "5px",
                                        height: "5px",
                                        borderRadius: "50%",
                                        backgroundColor: "#2563eb",
                                      }}
                                    />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleSlot(s._id)}
                                  title={s.isClosed ? "Open Slot" : "Close Slot"}
                                  style={{
                                    border: "none",
                                    background: s.isClosed ? "#fef3c7" : "#e2e8f0",
                                    color: s.isClosed ? "#b45309" : "#475569",
                                    borderRadius: "6px",
                                    padding: "5px 8px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  {s.isClosed ? "Closed" : "Open"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: PICKUP LOCATIONS */}
      {activeTab === "pickups" && (
        <div style={{ marginTop: "10px" }}>
          <PickupLocations />
        </div>
      )}

      {/* ADD DEPARTURE MODAL */}
      <Modal
        isOpen={isAddSlotOpen}
        onClose={() => {
          setIsAddSlotOpen(false);
          setSlotError(null);
          setSlotSuccess(null);
        }}
        title="Add Departure Slot"
        subtitle="Schedule departure date and seat capacity"
      >
        <form onSubmit={handleCreateDeparture} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Error and Success notifications */}
          {slotError && (
            <div
              style={{
                padding: "10px 14px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                color: "#b91c1c",
                fontSize: "12.5px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{slotError}</span>
            </div>
          )}

          {slotSuccess && (
            <div
              style={{
                padding: "10px 14px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                color: "#166534",
                fontSize: "12.5px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
              <span>{slotSuccess}</span>
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
              Trip Package *
            </label>
            <select
              value={slotTripId}
              onChange={(e) => setSlotTripId(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                background: "#ffffff",
              }}
            >
              {trips.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
              Departure Date *
            </label>
            <input
              type="date"
              value={slotDate}
              onChange={(e) => setSlotDate(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                background: "#ffffff",
                boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
              Accepts date picker selection or standard formats (e.g. 24/12/2026 or 2026-12-24).
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
              Total Seats Capacity *
            </label>
            <input
              type="number"
              min="1"
              value={slotTotalSeats}
              onChange={(e) => setSlotTotalSeats(Number(e.target.value))}
              required
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Trip Photos Drive Link */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
              <FolderOpen size={14} color="#166534" />
              <span>Trip Photos Google Drive Link (Optional)</span>
            </label>
            <input
              type="url"
              placeholder="https://drive.google.com/drive/folders/..."
              value={slotPhotoDriveLink}
              onChange={(e) => setSlotPhotoDriveLink(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
              Google Drive folder for trip photos. Syncs directly with Captain Portal <strong>Drive Link</strong>.
            </div>
          </div>

          {/* Bills & Invoices Drive Link */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
              <FileText size={14} color="#0284c7" />
              <span>Bills & Invoices Google Drive Link (Optional)</span>
            </label>
            <input
              type="url"
              placeholder="https://drive.google.com/drive/folders/..."
              value={slotBillDriveLink}
              onChange={(e) => setSlotBillDriveLink(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
              Google Drive folder for expense receipts & bills. Syncs directly with Captain Portal <strong>Bill Link</strong>.
            </div>
          </div>

          {/* WhatsApp Group Invite Link */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
              <MessageCircle size={14} color="#16a34a" />
              <span>WhatsApp Group Invite Link (Optional)</span>
            </label>
            <input
              type="url"
              placeholder="https://chat.whatsapp.com/..."
              value={slotWhatsappGroupLink}
              onChange={(e) => setSlotWhatsappGroupLink(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
              Official travellers chat group. Syncs directly with Captain Portal <strong>WhatsApp Group</strong> button.
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => {
                setIsAddSlotOpen(false);
                setSlotError(null);
                setSlotSuccess(null);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingSlot}
              className="admin-btn admin-btn-primary"
            >
              {savingSlot ? "Adding..." : "Add Departure"}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT DEPARTURE LINKS MODAL (DRIVE & WHATSAPP) */}
      <Modal
        isOpen={isEditLinksModalOpen}
        onClose={() => {
          setIsEditLinksModalOpen(false);
          setLinksError(null);
          setLinksSuccess(null);
        }}
        title="Departure Links (Drive & WhatsApp)"
        subtitle="Configure Photos Drive, Bills Drive and WhatsApp Group invite links for this departure slot"
      >
        <form onSubmit={handleSaveSlotLinks} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {linksError && (
            <div style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", padding: "8px 12px", borderRadius: "6px", fontSize: "12px" }}>
              {linksError}
            </div>
          )}
          {linksSuccess && (
            <div style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", padding: "8px 12px", borderRadius: "6px", fontSize: "12px" }}>
              {linksSuccess}
            </div>
          )}

          {/* Slot summary info */}
          {selectedSlotForLinks && (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 12px", fontSize: "12px", color: "#334155" }}>
              <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: "2px" }}>
                {typeof selectedSlotForLinks.trip === "object" ? selectedSlotForLinks.trip?.title : "Trip Departure"}
              </div>
              <div style={{ color: "#64748b" }}>
                Departure: <strong>{formatSlotDate(selectedSlotForLinks.date)}</strong> &bull; Total Seats: {selectedSlotForLinks.totalSlots}
              </div>
            </div>
          )}

          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
              <FolderOpen size={14} color="#166534" />
              <span>Trip Photos Google Drive Link</span>
            </label>
            <input
              type="url"
              placeholder="https://drive.google.com/drive/folders/..."
              value={editPhotoDriveLink}
              onChange={(e) => setEditPhotoDriveLink(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
              Syncs directly with Captain Portal <strong>Drive Link</strong> for trip photos.
            </div>
          </div>

          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
              <FileText size={14} color="#0284c7" />
              <span>Bills & Invoices Google Drive Link</span>
            </label>
            <input
              type="url"
              placeholder="https://drive.google.com/drive/folders/..."
              value={editBillDriveLink}
              onChange={(e) => setEditBillDriveLink(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
              Syncs directly with Captain Portal <strong>Bill Link</strong> for expense receipts and invoices.
            </div>
          </div>

          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
              <MessageCircle size={14} color="#16a34a" />
              <span>WhatsApp Group Invite Link</span>
            </label>
            <input
              type="url"
              placeholder="https://chat.whatsapp.com/..."
              value={editWhatsappGroupLink}
              onChange={(e) => setEditWhatsappGroupLink(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
              Syncs directly with Captain Portal <strong>WhatsApp Group</strong> button for this departure slot.
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => {
                setIsEditLinksModalOpen(false);
                setLinksError(null);
                setLinksSuccess(null);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingLinks}
              className="admin-btn admin-btn-primary"
            >
              {savingLinks ? "Saving..." : "Save Links"}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT DEPARTURE SLOT MODAL (FULL EDIT) */}
      <Modal
        isOpen={isEditSlotOpen}
        onClose={() => {
          setIsEditSlotOpen(false);
          setEditSlotError(null);
          setEditSlotSuccess(null);
        }}
        title="Edit Departure Slot"
        subtitle="Modify departure date, total seats capacity, trip package, and Google Drive folder links."
      >
        <form onSubmit={handleSaveEditSlot} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {editSlotError && (
            <div style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", padding: "8px 12px", borderRadius: "6px", fontSize: "12px" }}>
              {editSlotError}
            </div>
          )}
          {editSlotSuccess && (
            <div style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", padding: "8px 12px", borderRadius: "6px", fontSize: "12px" }}>
              {editSlotSuccess}
            </div>
          )}

          {/* Current Bookings info banner */}
          {editingSlot && (
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "10px 12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "12px",
              }}
            >
              <div>
                <span style={{ color: "#64748b" }}>Confirmed Bookings: </span>
                <strong style={{ color: "#166534" }}>{editingSlot.bookedSlots} passengers</strong>
              </div>
              <div style={{ color: "#64748b" }}>
                Departure ID: <span style={{ fontFamily: "monospace" }}>{editingSlot._id.slice(-6)}</span>
              </div>
            </div>
          )}

          {/* Trip Package Selection */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
              Trip Package *
            </label>
            <select
              value={editSlotTripId}
              onChange={(e) => setEditSlotTripId(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                background: "#ffffff",
                boxSizing: "border-box",
              }}
            >
              {trips.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Departure Date */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
              Departure Date *
            </label>
            <input
              type="date"
              value={editSlotDate}
              onChange={(e) => setEditSlotDate(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                background: "#ffffff",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Total Seats Capacity */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
              Total Seats Capacity *
            </label>
            <input
              type="number"
              min={editingSlot?.bookedSlots || 1}
              value={editSlotTotalSeats}
              onChange={(e) => setEditSlotTotalSeats(Number(e.target.value))}
              required
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
            {editingSlot && editingSlot.bookedSlots > 0 && (
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                Must be at least {editingSlot.bookedSlots} to accommodate confirmed bookings.
              </div>
            )}
          </div>

          {/* Photos Google Drive Link */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
              <FolderOpen size={14} color="#166534" />
              <span>Trip Photos Google Drive Link (Optional)</span>
            </label>
            <input
              type="url"
              placeholder="https://drive.google.com/drive/folders/..."
              value={editSlotPhotoDriveLink}
              onChange={(e) => setEditSlotPhotoDriveLink(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
              Syncs with Captain Portal <strong>Drive Link</strong>.
            </div>
          </div>

          {/* Bills Google Drive Link */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
              <FileText size={14} color="#0284c7" />
              <span>Bills & Invoices Google Drive Link (Optional)</span>
            </label>
            <input
              type="url"
              placeholder="https://drive.google.com/drive/folders/..."
              value={editSlotBillDriveLink}
              onChange={(e) => setEditSlotBillDriveLink(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
              Syncs with Captain Portal <strong>Bill Link</strong>.
            </div>
          </div>

          {/* WhatsApp Group Invite Link */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
              <MessageCircle size={14} color="#16a34a" />
              <span>WhatsApp Group Invite Link (Optional)</span>
            </label>
            <input
              type="url"
              placeholder="https://chat.whatsapp.com/..."
              value={editSlotWhatsappGroupLink}
              onChange={(e) => setEditSlotWhatsappGroupLink(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
              Official departure chat group. Syncs directly with Captain Portal <strong>WhatsApp Group</strong> button.
            </div>
          </div>

          {/* Closed / Open status toggle */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={editSlotIsClosed}
                onChange={(e) => setEditSlotIsClosed(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "#166534" }}
              />
              <span>Close Departure Slot (Stop accepting new bookings)</span>
            </label>
            <div style={{ fontSize: "11px", color: "#64748b", marginLeft: "24px", marginTop: "2px" }}>
              When closed, travellers will see this departure slot as closed/sold out on the website.
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => {
                setIsEditSlotOpen(false);
                setEditSlotError(null);
                setEditSlotSuccess(null);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEditSlot}
              className="admin-btn admin-btn-primary"
            >
              {savingEditSlot ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ASSIGN TRIP CAPTAIN MODAL */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Trip Captain"
        subtitle="Assign a certified trip leader to a scheduled departure slot"
        maxWidth="680px"
      >
        {selectedTripForAssign && (() => {
          const selectedCap = captains.find((c) => c._id === assignCaptainId);

          return (
          <form onSubmit={handleSubmitAssignment} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Selected Trip Package Header Banner */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 14px",
                background: "#f8fafc",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
              }}
            >
              <img
                src={selectedTripForAssign.image || "https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?w=200"}
                alt={selectedTripForAssign.title}
                style={{ width: "52px", height: "52px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Selected Trip Package
                </div>
                <div style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {selectedTripForAssign.title}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                  <span>{selectedTripForAssign.location}</span>
                  <span>•</span>
                  <span>{selectedTripForAssign.duration}</span>
                  <span>•</span>
                  <span style={{ fontWeight: 600, color: "#166534" }}>₹{Number(selectedTripForAssign.price).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Error & Success Messages */}
            {assignError && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  color: "#b91c1c",
                  fontSize: "12.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{assignError}</span>
              </div>
            )}

            {assignSuccess && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  color: "#166534",
                  fontSize: "12.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                <span>{assignSuccess}</span>
              </div>
            )}

            {/* Departure Slot Selection */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>
                  Departure Date & Slot *
                </label>
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  Assignments belong to specific departure dates
                </span>
              </div>

              {(() => {
                const availableTripSlots = slots.filter((s) => {
                  const tId = typeof s.trip === "object" ? s.trip?._id : s.trip;
                  return String(tId) === String(selectedTripForAssign._id);
                });

                if (availableTripSlots.length === 0) {
                  return (
                    <div style={{ padding: "14px", background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: "8px" }}>
                      <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#92400e" }}>
                        No departures scheduled for this trip yet
                      </div>
                      <p style={{ margin: "4px 0 10px 0", fontSize: "12px", color: "#b45309" }}>
                        To assign a captain, please schedule at least one departure date for this trip first.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setReturnToAssignTrip(selectedTripForAssign);
                          setIsAssignModalOpen(false);
                          setSlotTripId(selectedTripForAssign._id);
                          setSlotError(null);
                          setSlotSuccess(null);
                          setIsAddSlotOpen(true);
                        }}
                        className="admin-btn admin-btn-primary"
                        style={{ fontSize: "11.5px", padding: "6px 12px" }}
                      >
                        <Plus size={13} />
                        <span>Schedule Departure Date Now</span>
                      </button>
                    </div>
                  );
                }

                const currentSlotObj = slots.find((s) => s._id === assignSlotId);

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <select
                      value={assignSlotId}
                      onChange={(e) => handleSlotSelectionChange(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        fontSize: "13px",
                        background: "#ffffff",
                        color: "#0f172a",
                      }}
                    >
                      {availableTripSlots.map((s) => {
                        const capName = s.assignedCaptain?.name ? ` [Captain: ${s.assignedCaptain.name}]` : " [Unassigned]";
                        const booked = `${s.bookedSlots}/${s.totalSlots} seats`;
                        return (
                          <option key={s._id} value={s._id}>
                            {formatSlotDate(s.date)} • {booked} {capName}
                          </option>
                        );
                      })}
                    </select>

                    {/* Currently Assigned Leadership Team Notice */}
                    {(() => {
                      const team = currentSlotObj?.assignedCaptains && currentSlotObj.assignedCaptains.length > 0
                        ? currentSlotObj.assignedCaptains
                        : (currentSlotObj?.assignedCaptain?.name ? [currentSlotObj.assignedCaptain] : []);

                      if (team.length === 0) return null;

                      return (
                        <div
                          style={{
                            padding: "10px 14px",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              Assigned Departure Leadership Team ({team.length})
                            </div>
                            <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 600 }}>
                              1 Head • 1 Main • Multiple Trainees
                            </span>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {team.map((cap, cIdx) => {
                              const b = getRoleBadgeStyle(cap.role);
                              const capId =
                                (cap as any)._id ||
                                (cap as any).id ||
                                (cap as any).captain?._id ||
                                (cap as any).captain ||
                                (cap as any).captainId?._id ||
                                (cap as any).captainId;
                              const isRemoving = removingCaptainId === capId;
                              return (
                                <div
                                  key={capId || cIdx}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "6px 10px",
                                    background: "#ffffff",
                                    borderRadius: "6px",
                                    border: "1px solid #e2e8f0",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Shield size={14} color={b.color} />
                                    <div>
                                      <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#0f172a" }}>
                                        {cap.name}
                                      </span>
                                      {cap.phone && (
                                        <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "6px" }}>
                                          ({cap.phone})
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span
                                      style={{
                                        fontSize: "10.5px",
                                        fontWeight: 700,
                                        padding: "2px 8px",
                                        borderRadius: "12px",
                                        background: b.bg,
                                        color: b.color,
                                        border: b.border,
                                      }}
                                    >
                                      {b.label}
                                    </span>

                                    <button
                                      type="button"
                                      disabled={isRemoving}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveCaptain(assignSlotId, capId, cap.name);
                                      }}
                                      title={`Remove ${cap.name} from this departure slot`}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: "3px 8px",
                                        fontSize: "11px",
                                        fontWeight: 600,
                                        color: "#b91c1c",
                                        background: "#fef2f2",
                                        border: "1px solid #fecaca",
                                        borderRadius: "6px",
                                        cursor: isRemoving ? "not-allowed" : "pointer",
                                        opacity: isRemoving ? 0.6 : 1,
                                        transition: "all 0.15s ease",
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!isRemoving) {
                                          e.currentTarget.style.background = "#fee2e2";
                                          e.currentTarget.style.borderColor = "#f87171";
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isRemoving) {
                                          e.currentTarget.style.background = "#fef2f2";
                                          e.currentTarget.style.borderColor = "#fecaca";
                                        }
                                      }}
                                    >
                                      <Trash2 size={12} />
                                      <span>{isRemoving ? "Removing..." : "Remove"}</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>

            {/* Captain Selector */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>
                  Registered Active Captain *
                </label>
                {loadingCaptains && <span style={{ fontSize: "11px", color: "#166534" }}>Loading captains...</span>}
              </div>

              <select
                value={assignCaptainId}
                onChange={(e) => handleCaptainSelectionChange(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontSize: "13px",
                  background: "#ffffff",
                  color: "#0f172a",
                }}
              >
                {captains.length === 0 ? (
                  <option value="">No captains available</option>
                ) : (
                  captains.map((c) => {
                    const stars = c.rating ? `★ ${c.rating}` : "★ 4.8";
                    return (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.phone}) • {stars} {c.status !== "Active" ? `[${c.status}]` : ""}
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            {/* CAPTAIN EXPERIENCE & TRIP HISTORY PANEL */}
            {selectedCap && (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {/* 1. Profile & Verification Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "50%",
                        background: "#0d2b17",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "13px",
                        flexShrink: 0,
                      }}
                    >
                      {selectedCap.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                          {selectedCap.name}
                        </span>
                        <CheckCircle2 size={14} color="#166534" />
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        {selectedCap.phone} {selectedCap.email ? `• ${selectedCap.email}` : ""}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {/* Active Status Badge */}
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: selectedCap.status === "Active" ? "#dcfce7" : "#f1f5f9",
                        color: selectedCap.status === "Active" ? "#166534" : "#475569",
                        border: selectedCap.status === "Active" ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: selectedCap.status === "Active" ? "#16a34a" : "#94a3b8",
                        }}
                      />
                      {selectedCap.status || "Active"}
                    </span>

                    {/* Star Rating Badge (only when genuine rating exists) */}
                    {selectedCap.rating ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          padding: "4px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: "#fef3c7",
                          color: "#b45309",
                          border: "1px solid #fde68a",
                        }}
                      >
                        <Star size={12} fill="#b45309" color="#b45309" />
                        <span>{selectedCap.rating.toFixed(1)}</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Loading State */}
                {loadingHistory ? (
                  <div style={{ padding: "16px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                    Loading captain experience & expedition records...
                  </div>
                ) : (
                  <>
                    {/* 2. Experience Summary KPI Cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                      {/* Metric 1: Total Completed */}
                      <div
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          padding: "10px 12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#166534", marginBottom: "4px" }}>
                          <Award size={14} />
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
                            Total Completed
                          </span>
                        </div>
                        <div style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a" }}>
                          {captainHistory?.stats?.totalCompletedTrips ?? 0}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                          expeditions completed
                        </div>
                      </div>

                      {/* Metric 2: Completed to Current Destination */}
                      {(() => {
                        const targetDest = selectedTripForAssign?.location || selectedTripForAssign?.title || "";
                        const completedList = captainHistory?.history || [];
                        const destCount = completedList.filter((h) => {
                          const cDest = targetDest.toLowerCase();
                          const hDest = (h.destination || "").toLowerCase();
                          const hTitle = (h.tripTitle || "").toLowerCase();
                          return cDest.includes(hDest) || hDest.includes(cDest) || hTitle.includes(cDest);
                        }).length;

                        const shortDest = targetDest.split(",")[0].trim() || "Destination";

                        return (
                          <div
                            style={{
                              background: "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              padding: "10px 12px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#2563eb", marginBottom: "4px" }}>
                              <MapPin size={14} />
                              <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
                                To {shortDest}
                              </span>
                            </div>
                            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a" }}>
                              {destCount}
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                              trips to {shortDest}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Metric 3: Total Upcoming Assignments */}
                      <div
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          padding: "10px 12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#d97706", marginBottom: "4px" }}>
                          <Calendar size={14} />
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
                            Upcoming
                          </span>
                        </div>
                        <div style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a" }}>
                          {captainHistory?.stats?.totalUpcomingAssignments ?? 0}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                          scheduled departures
                        </div>
                      </div>
                    </div>

                    {/* 3. Completed Trip History Table / List */}
                    <div style={{ marginTop: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
                          Completed Trip History ({captainHistory?.history?.length ?? 0})
                        </span>
                        {captainHistory?.history && captainHistory.history.length > 5 && (
                          <button
                            type="button"
                            onClick={() => setShowAllHistory(!showAllHistory)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#166534",
                              fontSize: "11.5px",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <span>{showAllHistory ? "Show Less" : `View All (${captainHistory.history.length}) Trips`}</span>
                            {showAllHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        )}
                      </div>

                      {/* When no completed trips exist */}
                      {(!captainHistory?.history || captainHistory.history.length === 0) ? (
                        <div
                          style={{
                            padding: "14px",
                            background: "#ffffff",
                            borderRadius: "8px",
                            border: "1px dashed #cbd5e1",
                            textAlign: "center",
                          }}
                        >
                          <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#475569" }}>
                            No completed trips yet — New Captain
                          </div>
                          <div style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "2px" }}>
                            This captain is newly registered and has no completed expeditions logged yet.
                          </div>
                        </div>
                      ) : (
                        /* Completed Trips Table */
                        <div
                          style={{
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              maxHeight: showAllHistory ? "240px" : "180px",
                              overflowY: "auto",
                            }}
                          >
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                              <thead>
                                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>
                                  <th style={{ padding: "8px 10px", fontWeight: 600 }}>Trip Package</th>
                                  <th style={{ padding: "8px 10px", fontWeight: 600 }}>Destination</th>
                                  <th style={{ padding: "8px 10px", fontWeight: 600 }}>Departure</th>
                                  <th style={{ padding: "8px 10px", fontWeight: 600 }}>Return</th>
                                  <th style={{ padding: "8px 10px", fontWeight: 600 }}>Role</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(showAllHistory ? captainHistory.history : captainHistory.history.slice(0, 5)).map((item, idx) => (
                                  <tr
                                    key={item.id || idx}
                                    style={{
                                      borderBottom: idx === (showAllHistory ? captainHistory.history.length : Math.min(captainHistory.history.length, 5)) - 1 ? "none" : "1px solid #f1f5f9",
                                    }}
                                  >
                                    <td style={{ padding: "8px 10px", fontWeight: 600, color: "#0f172a" }}>
                                      {item.tripTitle}
                                    </td>
                                    <td style={{ padding: "8px 10px", color: "#475569" }}>
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                        <MapPin size={11} color="#64748b" />
                                        {item.destination}
                                      </span>
                                    </td>
                                    <td style={{ padding: "8px 10px", color: "#334155", whiteSpace: "nowrap" }}>
                                      {formatSlotDate(item.departureDate)}
                                    </td>
                                    <td style={{ padding: "8px 10px", color: "#64748b", whiteSpace: "nowrap" }}>
                                      {formatSlotDate(item.returnDate)}
                                    </td>
                                    <td style={{ padding: "8px 10px" }}>
                                      {(() => {
                                        const b = getRoleBadgeStyle(item.role);
                                        return (
                                          <span
                                            style={{
                                              padding: "2px 7px",
                                              borderRadius: "10px",
                                              fontSize: "10.5px",
                                              fontWeight: 600,
                                              background: b.bg,
                                              color: b.color,
                                              border: b.border,
                                            }}
                                          >
                                            {b.label}
                                          </span>
                                        );
                                      })()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Agreed Trip Fee & Role Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                  Agreed Trip Fee (₹) *
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: "13px", fontWeight: 600 }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={assignFee}
                    onChange={(e) => setAssignFee(e.target.value)}
                    required
                    placeholder="5000"
                    style={{
                      width: "100%",
                      padding: "9px 12px 9px 26px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                  Assignment Role *
                </label>
                <select
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "13px",
                    background: "#ffffff",
                    color: "#0f172a",
                    fontWeight: 600,
                  }}
                >
                  <option value="Head Captain">1. Head Captain (Highest Authority - Max 1)</option>
                  <option value="Main Captain">2. Main Captain (Second-in-Command - Max 1)</option>
                  <option value="Trainee Captain">3. Trainee Captain (Supporting Role - Multiple allowed)</option>
                </select>
              </div>
            </div>

            {/* Operational Instructions / Notes */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                Operational Notes & Instructions (Optional)
              </label>
              <textarea
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Lead departure from Majestic pickup at 10 PM. Coordinate passenger roll-call and vehicle diesel advance."
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Overlap & Conflict Check Warning */}
            {(() => {
              const currentSlot = slots.find((s) => s._id === assignSlotId);
              const selectedCap = captains.find((c) => c._id === assignCaptainId);
              if (!currentSlot?.date || !selectedCap) return null;

              const slotDateObj = new Date(currentSlot.date);
              const conflictSlot = slots.find((s) => {
                if (s._id === assignSlotId) return false;
                const sCapId = (s.assignedCaptain as any)?._id || (s.assignedCaptain as any)?.id;
                const matches = sCapId === assignCaptainId || s.assignedCaptain?.name === selectedCap.name;
                if (!matches) return false;
                const otherDate = new Date(s.date);
                return (
                  slotDateObj.getFullYear() === otherDate.getFullYear() &&
                  slotDateObj.getMonth() === otherDate.getMonth() &&
                  slotDateObj.getDate() === otherDate.getDate()
                );
              });

              if (!conflictSlot) return null;

              const cTripTitle = typeof conflictSlot.trip === "object" ? conflictSlot.trip?.title : "Another Trip";

              return (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#fffbeb",
                    border: "1px solid #fef3c7",
                    borderRadius: "8px",
                    color: "#b45309",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Availability Warning:</strong> {selectedCap.name} is already assigned to {cTripTitle} on {conflictSlot.date}.
                  </span>
                </div>
              );
            })()}

            {/* Reassignment Confirmation Checkbox */}
            {(() => {
              const currentSlot = slots.find((s) => s._id === assignSlotId);
              const selectedCap = captains.find((c) => c._id === assignCaptainId);
              const hasExistingDifferentCaptain =
                currentSlot?.assignedCaptain?.name &&
                selectedCap?.name &&
                currentSlot.assignedCaptain.name !== selectedCap.name;

              if (!hasExistingDifferentCaptain) return null;

              return (
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: "#92400e",
                    background: "#fffbeb",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #fde68a",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={confirmReassign}
                    onChange={(e) => setConfirmReassign(e.target.checked)}
                    style={{ marginTop: "2px" }}
                  />
                  <span>
                    <strong>Confirm Reassignment:</strong> Replace current captain <strong>{currentSlot?.assignedCaptain?.name}</strong> with <strong>{selectedCap?.name}</strong> for this departure.
                  </span>
                </label>
              );
            })()}

            {/* Modal Buttons */}
            {(() => {
              const currentSlot = slots.find((s) => s._id === assignSlotId);
              const selectedCap = captains.find((c) => c._id === assignCaptainId);
              const isReassigning = Boolean(
                currentSlot?.assignedCaptain?.name &&
                selectedCap?.name &&
                currentSlot.assignedCaptain.name !== selectedCap.name
              );

              const availableTripSlots = slots.filter((s) => {
                const tId = typeof s.trip === "object" ? s.trip?._id : s.trip;
                return String(tId) === String(selectedTripForAssign._id);
              });

              return (
                <div
                  style={{
                    position: "sticky",
                    bottom: "-20px",
                    background: "#ffffff",
                    padding: "14px 0 6px 0",
                    borderTop: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                    marginTop: "6px",
                    zIndex: 10,
                  }}
                >
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => setIsAssignModalOpen(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={Boolean(
                      assigningCaptain ||
                      availableTripSlots.length === 0 ||
                      (isReassigning && !confirmReassign)
                    )}
                    className="admin-btn admin-btn-primary"
                    style={{
                      background: isReassigning ? "#b45309" : "#0d2b17",
                      opacity: isReassigning && !confirmReassign ? 0.6 : 1,
                    }}
                  >
                    <Shield size={14} />
                    <span>
                      {assigningCaptain
                        ? "Saving Assignment..."
                        : isReassigning
                        ? "Reassign Captain"
                        : "Assign Captain"}
                    </span>
                  </button>
                </div>
              );
            })()}
          </form>
          );
        })()}
      </Modal>
    </div>
  );
};

export default Trips;
