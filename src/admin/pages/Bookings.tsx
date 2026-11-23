import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  Search,
  Plus,
  RefreshCw,
  Mountain,
  List,
  Calendar,
  MapPin,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  XCircle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Phone,
  FileText,
  Eye,
  X,
  ExternalLink,
  MessageCircle,
  Send,
  Check,
  Copy,
  Share2,
} from "lucide-react";

import { API_BASE_URL } from "../../api";
import { StatusBadge } from "../ui/StatusBadge";
import { Drawer } from "../ui/Drawer";
import { Modal } from "../ui/Modal";
import "../admin.css";

// Types
export interface DepartureSlot {
  _id: string;
  date: string;
  formattedDate: string;
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
  isClosed: boolean;
  assignedCaptain?: any;
  assignedCaptains?: any[];
  whatsappGroupLink?: string;
}

export interface TripPackage {
  _id: string;
  title: string;
  location: string;
  duration: string;
  price: number;
  image: string;
  departuresCount: number;
  totalCapacity: number;
  totalBooked: number;
  departures: DepartureSlot[];
  primaryDeparture?: DepartureSlot | null;
}

export interface TravellerDetail {
  _id?: string;
  name: string;
  age?: string;
  gender?: string;
  phone?: string;
}

export interface RescheduleHistoryItem {
  previousSlotId?: string;
  previousDate?: string;
  newSlotId?: string;
  newDate?: string;
  reason?: string;
  rescheduledAt?: string;
  rescheduledBy?: string;
}

export interface BookingItem {
  _id: string;
  bookingCode: string;
  name: string;
  phone: string;
  email?: string;
  travellers: number;
  travellerDetails?: TravellerDetail[];
  pickupLocation: string;
  pickupLocationId?: string | null;
  pickupDetails?: {
    name?: string;
    address?: string;
    landmark?: string;
    pickupTime?: string;
    googleMapsUrl?: string;
  };
  amount: number;
  originalTotal?: number;
  couponCode?: string | null;
  discountAmount?: number;
  paymentStatus: "Paid" | "Pending" | "Failed";
  paymentMethod: string;
  paymentReference: string;
  status: "Pending" | "Confirmed" | "Cancelled";
  isRescheduled: boolean;
  rescheduledAt?: string | null;
  rescheduleHistory?: RescheduleHistoryItem[];
  cancelledAt?: string | null;
  cancellationReason?: string;
  cancellationNotes?: string;
  requests?: string;
  date: string;
  rawDate?: string;
  trip: {
    title: string;
    location: string;
    duration: string;
    image: string;
  };
  slotId?: string | null;
  slotWhatsappGroupLink?: string;
  createdAt: string;
}

export const Bookings: React.FC = () => {
  const [searchParams] = useSearchParams();

  // Top switcher: "trip-wise" or "all"
  const [viewMode, setViewMode] = useState<"trip-wise" | "all">("trip-wise");

  // Trips & overview state
  const [trips, setTrips] = useState<TripPackage[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [tripsLoading, setTripsLoading] = useState<boolean>(true);
  const [tripSearch, setTripSearch] = useState<string>("");
  const [tripsPage, setTripsPage] = useState<number>(1);
  const TRIPS_PER_PAGE = 5;

  // Bookings list state
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState<boolean>(true);
  const [tabCounts, setTabCounts] = useState({ booked: 0, rescheduled: 0, cancelled: 0, total: 0 });
  const [availablePickups, setAvailablePickups] = useState<string[]>([]);

  // Sub-tabs in table: "booked" | "rescheduled" | "cancelled"
  const [activeTab, setActiveTab] = useState<"booked" | "rescheduled" | "cancelled">("booked");

  // Filters for bookings table
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPickup, setSelectedPickup] = useState<string>("all");
  const [rescheduleMode, setRescheduleMode] = useState<"propose" | "direct">("propose");
  const [cancelSource, setCancelSource] = useState<"Customer" | "Traviska">("Customer");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [bookingsPage, setBookingsPage] = useState<number>(1);
  const BOOKINGS_PER_PAGE = 5;

  // Modals & Drawers
  const [viewingBooking, setViewingBooking] = useState<BookingItem | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<BookingItem | null>(null);
  const [targetRescheduleSlotId, setTargetRescheduleSlotId] = useState<string>("");
  const [rescheduleReason, setRescheduleReason] = useState<string>("Customer requested date change");
  const [reschedulingSubmitting, setReschedulingSubmitting] = useState<boolean>(false);

  const [cancelBooking, setCancelBooking] = useState<BookingItem | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("Customer Request");
  const [cancelNotes, setCancelNotes] = useState<string>("");
  const [cancelSubmitting, setCancelSubmitting] = useState<boolean>(false);

  // Manual Add Booking Drawer State
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(searchParams.get("action") === "new");
  const [manualCustomerName, setManualCustomerName] = useState("");
  const [manualCustomerPhone, setManualCustomerPhone] = useState("");
  const [manualCustomerEmail, setManualCustomerEmail] = useState("");
  const [manualSlotId, setManualSlotId] = useState("");
  const [manualPickup, setManualPickup] = useState("Majestic, Bengaluru – 10:00 PM");
  const [manualPaymentMethod, setManualPaymentMethod] = useState<"UPI" | "Bank Transfer" | "Cash">("UPI");
  const [manualPaymentRef, setManualPaymentRef] = useState("");
  const [manualConfirmed, setManualConfirmed] = useState(true);
  const [manualRequests, setManualRequests] = useState("");
  const [manualWhatsappOptIn, setManualWhatsappOptIn] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // WhatsApp Invite Link Modal (when departure link needs configuration)
  const [whatsAppModalBooking, setWhatsAppModalBooking] = useState<BookingItem | null>(null);
  const [whatsAppInputLink, setWhatsAppInputLink] = useState<string>("");
  const [savingWhatsAppLink, setSavingWhatsAppLink] = useState<boolean>(false);

  // Departure Bulk WhatsApp Broadcast Modal
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState<boolean>(false);
  const [broadcastSlotId, setBroadcastSlotId] = useState<string>("");
  const [broadcastLink, setBroadcastLink] = useState<string>("");
  const [broadcastCustomers, setBroadcastCustomers] = useState<BookingItem[]>([]);
  const [loadingBroadcastCustomers, setLoadingBroadcastCustomers] = useState<boolean>(false);
  const [savingBroadcastLink, setSavingBroadcastLink] = useState<boolean>(false);
  const [metaBroadcasting, setMetaBroadcasting] = useState<boolean>(false);
  const [metaBroadcastSummary, setMetaBroadcastSummary] = useState<string | null>(null);
  const [broadcastSentIds, setBroadcastSentIds] = useState<string[]>([]);
  const [broadcastCurrentIndex, setBroadcastCurrentIndex] = useState<number>(0);
  const [isBroadcastActive, setIsBroadcastActive] = useState<boolean>(false);
  const [numbersCopied, setNumbersCopied] = useState<boolean>(false);
  const [messageCopied, setMessageCopied] = useState<boolean>(false);

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Delete Modals State

  // Body scroll lock and Escape key listener for Modals
  useEffect(() => {
    const isModalOpen = Boolean(
      rescheduleBooking || cancelBooking
    );
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setRescheduleBooking(null);
        setCancelBooking(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [rescheduleBooking, cancelBooking]);

  // Active Selected Trip
  const selectedTrip = useMemo(() => {
    return trips.find((t) => t._id === selectedTripId) || trips[0] || null;
  }, [trips, selectedTripId]);

  // Active Selected Departure
  const selectedSlot = useMemo(() => {
    if (!selectedTrip || !selectedTrip.departures || selectedTrip.departures.length === 0) {
      return null;
    }
    if (selectedSlotId && selectedSlotId !== "all") {
      const match = selectedTrip.departures.find((d) => d._id === selectedSlotId);
      if (match) return match;
    }
    return null;
  }, [selectedTrip, selectedSlotId]);

  // Load Trips Overview
  const fetchOverview = async () => {
    setTripsLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/bookings/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success && Array.isArray(res.data.trips)) {
        const loadedTrips: TripPackage[] = res.data.trips;
        setTrips(loadedTrips);

        if (loadedTrips.length > 0) {
          const currentExists = loadedTrips.some((t) => t._id === selectedTripId);
          if (!selectedTripId || !currentExists) {
            // Pick first trip (backend returns trips sorted by latest bookings and activity)
            const initialTrip = loadedTrips[0];
            setSelectedTripId(initialTrip._id);
            setSelectedSlotId("all");
          }
        }
      }
    } catch (err) {
      console.error("Failed to load overview:", err);
    } finally {
      setTripsLoading(false);
    }
  };

  // Load Bookings List
  const fetchBookingsList = async () => {
    setBookingsLoading(true);
    const token = localStorage.getItem("token");
    try {
      const params: any = {
        tab: activeTab,
        search: searchQuery.trim(),
        pickup: selectedPickup !== "all" ? selectedPickup : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
      };

      if (viewMode === "trip-wise") {
        if (selectedSlotId && selectedSlotId !== "all") {
          params.slotId = selectedSlotId;
        } else if (selectedTripId) {
          params.tripId = selectedTripId;
        }
      }

      const res = await axios.get(`${API_BASE_URL}/admin/bookings/list`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      if (res.data.success) {
        setBookings(res.data.bookings || []);
        if (res.data.counts) {
          setTabCounts(res.data.counts);
        }
        if (Array.isArray(res.data.availablePickups)) {
          setAvailablePickups(res.data.availablePickups);
        }
      }
    } catch (err) {
      console.error("Failed to load bookings list:", err);
    } finally {
      setBookingsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchOverview();
  }, []);

  // When selection or filters change, reload bookings
  useEffect(() => {
    fetchBookingsList();
  }, [viewMode, selectedTripId, selectedSlotId, activeTab, selectedPickup, selectedStatus, searchQuery]);

  // When trip selection changes, default to "all" departures
  const handleSelectTrip = (trip: TripPackage) => {
    setSelectedTripId(trip._id);
    setSelectedSlotId("all");
    setBookingsPage(1);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchOverview(), fetchBookingsList()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtered trips list for left panel search
  const filteredTrips = useMemo(() => {
    if (!tripSearch.trim()) return trips;
    const q = tripSearch.toLowerCase();
    return trips.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q)
    );
  }, [trips, tripSearch]);

  // Paginated trips in sidebar
  const paginatedTrips = useMemo(() => {
    const start = (tripsPage - 1) * TRIPS_PER_PAGE;
    return filteredTrips.slice(start, start + TRIPS_PER_PAGE);
  }, [filteredTrips, tripsPage]);

  const totalTripPages = Math.ceil(filteredTrips.length / TRIPS_PER_PAGE) || 1;

  // Paginated bookings in table
  const paginatedBookings = useMemo(() => {
    const start = (bookingsPage - 1) * BOOKINGS_PER_PAGE;
    return bookings.slice(start, start + BOOKINGS_PER_PAGE);
  }, [bookings, bookingsPage]);

  const totalBookingPages = Math.ceil(bookings.length / BOOKINGS_PER_PAGE) || 1;

  // Handle select all rows

  // Reschedule submission
  const handleConfirmReschedule = async () => {
    if (!rescheduleBooking || !targetRescheduleSlotId) {
      alert("Please select a target departure slot");
      return;
    }
    setReschedulingSubmitting(true);
    const token = localStorage.getItem("token");

    try {
      const endpoint =
        rescheduleMode === "propose"
          ? `${API_BASE_URL}/api/admin/bookings/${rescheduleBooking._id}/propose-reschedule`
          : `${API_BASE_URL}/admin/bookings/${rescheduleBooking._id}/reschedule`;
      const res = await axios.post(
        endpoint,
        {
          newSlotId: targetRescheduleSlotId,
          reason: rescheduleReason.trim(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) {
        alert(res.data.message || "Booking rescheduled successfully!");
        setRescheduleBooking(null);
        setTargetRescheduleSlotId("");
        if (res.data.targetTripId) {
          setSelectedTripId(res.data.targetTripId);
        }
        if (res.data.targetSlotId) {
          setSelectedSlotId(res.data.targetSlotId);
        }
        setViewMode("trip-wise");
        fetchOverview();
        fetchBookingsList();
      }
    } catch (err: any) {
      console.error("Reschedule failed:", err);
      alert(err.response?.data?.message || "Failed to reschedule booking");
    } finally {
      setReschedulingSubmitting(false);
    }
  };

  // Cancellation submission
  const handleConfirmCancel = async () => {
    if (!cancelBooking) return;
    setCancelSubmitting(true);
    const token = localStorage.getItem("token");

    try {
      const res = await axios.post(
        `${API_BASE_URL}/admin/bookings/${cancelBooking._id}/cancel`,
        {
          cancellationSource: cancelSource,
          reason: cancelReason,
          notes: cancelNotes.trim(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) {
        alert(res.data.message || "Booking cancelled successfully");
        setCancelBooking(null);
        setCancelNotes("");
        fetchOverview();
        fetchBookingsList();
      }
    } catch (err: any) {
      console.error("Cancellation failed:", err);
      alert(err.response?.data?.message || "Failed to cancel booking");
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Helper to resolve WhatsApp group link for a booking's specific departure
  const getDepartureWhatsAppLink = (booking: BookingItem): string => {
    if (booking.slotWhatsappGroupLink && booking.slotWhatsappGroupLink.trim()) {
      return booking.slotWhatsappGroupLink.trim();
    }
    // Try finding by slotId in loaded trips
    if (booking.slotId) {
      for (const t of trips) {
        const slot = t.departures?.find((d) => String(d._id) === String(booking.slotId));
        if (slot?.whatsappGroupLink && slot.whatsappGroupLink.trim()) {
          return slot.whatsappGroupLink.trim();
        }
      }
    }
    // Try matching by departure date and trip title
    for (const t of trips) {
      if (t.title.trim().toLowerCase() === booking.trip?.title?.trim().toLowerCase()) {
        const slot = t.departures?.find((d) => d.formattedDate === booking.date || d.date === booking.rawDate);
        if (slot?.whatsappGroupLink && slot.whatsappGroupLink.trim()) {
          return slot.whatsappGroupLink.trim();
        }
      }
    }
    return "";
  };

  // Open WhatsApp Web or mobile app with pre-filled departure group invitation
  const openWhatsAppChat = (booking: BookingItem, groupLink: string) => {
    const customerName = (booking.name || "Traveller").trim();
    const tripTitle = booking.trip?.title || "your upcoming trip";
    const departureDate = booking.date || "your booked departure";
    const bookingCode = booking.bookingCode || "";
    const travellers = booking.travellers || 1;
    const pickup = booking.pickupLocation || "";

    const message =
      `Hi ${customerName}, greetings from Traviska! 🌄\n\n` +
      `Here is the official WhatsApp group joining link for your booked departure of *${tripTitle}* on *${departureDate}*:\n\n` +
      `👉 ${groupLink.trim()}\n\n` +
      `Please join the group to stay updated on pickup timings, packing checklist, and connect with your trip captains and co-travellers!\n\n` +
      `• Booking ID: ${bookingCode}\n` +
      `• Travellers: ${travellers}\n` +
      (pickup ? `• Pickup: ${pickup}\n\n` : `\n`) +
      `If you have any questions, feel free to reply directly to this message. See you soon on the trip! 🎒✨`;

    let cleanPhone = (booking.phone || "").replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  // Click handler for sending WhatsApp group link
  const handleSendWhatsApp = (booking: BookingItem) => {
    const link = getDepartureWhatsAppLink(booking);
    if (link) {
      openWhatsAppChat(booking, link);
    } else {
      // Slot doesn't have a WhatsApp link yet — open configuration prompt
      setWhatsAppModalBooking(booking);
      setWhatsAppInputLink("");
    }
  };

  // Save new link to departure slot and immediately trigger WhatsApp chat
  const handleSaveAndSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsAppModalBooking || !whatsAppInputLink.trim()) return;

    const trimmedLink = whatsAppInputLink.trim();
    setSavingWhatsAppLink(true);

    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
    const targetSlotId = whatsAppModalBooking.slotId;

    try {
      if (targetSlotId) {
        await axios.put(
          `${API_BASE_URL}/admin/operations/slots/${targetSlotId}/links`,
          { whatsappGroupLink: trimmedLink },
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
      }

      // Update local state in trips
      setTrips((prevTrips) =>
        prevTrips.map((t) => ({
          ...t,
          departures: t.departures.map((d) =>
            String(d._id) === String(targetSlotId)
              ? { ...d, whatsappGroupLink: trimmedLink }
              : d
          ),
        }))
      );

      // Update local state in bookings
      setBookings((prevBookings) =>
        prevBookings.map((b) =>
          String(b.slotId) === String(targetSlotId)
            ? { ...b, slotWhatsappGroupLink: trimmedLink }
            : b
        )
      );

      const updatedBooking = { ...whatsAppModalBooking, slotWhatsappGroupLink: trimmedLink };
      setWhatsAppModalBooking(null);
      setWhatsAppInputLink("");
      openWhatsAppChat(updatedBooking, trimmedLink);
    } catch (err) {
      console.error("Failed to save slot link:", err);
      // Fallback: still open WhatsApp even if backend save encountered issue
      openWhatsAppChat(whatsAppModalBooking, trimmedLink);
      setWhatsAppModalBooking(null);
    } finally {
      setSavingWhatsAppLink(false);
    }
  };

  const handleMetaBroadcastAll = async () => {
    if (!broadcastSlotId) return;
    const cleanLink = broadcastLink.trim();
    if (!cleanLink || !/^https?:\/\//i.test(cleanLink)) {
      alert("Please enter a valid WhatsApp group invite link starting with https://");
      return;
    }
    if (
      !window.confirm(
        `Send the official WhatsApp group link via Meta Cloud API to all opted-in customers on this departure?`
      )
    ) {
      return;
    }

    setMetaBroadcasting(true);
    setMetaBroadcastSummary(null);
    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/admin/bookings/broadcast-whatsapp-group`,
        { slotId: broadcastSlotId, whatsappGroupLink: cleanLink },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.data?.success) {
        const { sentCount, skippedOptInCount, failedCount, results } = res.data;
        const sentBookingIds = (results || [])
          .filter((r: any) => r.status === "API Accepted")
          .map((r: any) => r.bookingId);
        if (sentBookingIds.length > 0) {
          setBroadcastSentIds((prev) => Array.from(new Set([...prev, ...sentBookingIds])));
        }
        setMetaBroadcastSummary(
          `Meta Cloud API Broadcast: ${sentCount} Sent • ${skippedOptInCount} Skipped (No Opt-In) • ${failedCount} Failed`
        );
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to send via Meta Cloud API.");
    } finally {
      setMetaBroadcasting(false);
    }
  };

  // Open departure broadcast modal
  const handleOpenDepartureBroadcast = async (preferredSlotId?: string) => {
    if (!selectedTrip || !selectedTrip.departures || selectedTrip.departures.length === 0) {
      alert("No scheduled departures available for this trip package yet.");
      return;
    }

    // Determine target departure slot
    let targetSlot = selectedTrip.departures.find((d) => d._id === preferredSlotId);
    if (!targetSlot) {
      targetSlot =
        selectedTrip.departures.find((d) => d.bookedSlots > 0) ||
        selectedTrip.departures.find((d) => new Date(d.date) >= new Date()) ||
        selectedTrip.departures[0];
    }

    if (!targetSlot) return;

    setBroadcastSlotId(targetSlot._id);
    setBroadcastLink(targetSlot.whatsappGroupLink || "");
    setBroadcastSentIds([]);
    setBroadcastCurrentIndex(0);
    setIsBroadcastActive(false);
    setNumbersCopied(false);
    setMessageCopied(false);
    setIsBroadcastModalOpen(true);

    await loadBroadcastCustomers(targetSlot._id);
  };

  // Load confirmed customers for chosen departure
  const loadBroadcastCustomers = async (slotId: string) => {
    setLoadingBroadcastCustomers(true);
    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/bookings/list`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: {
          slotId,
          tab: "booked",
        },
      });
      if (res.data?.success && Array.isArray(res.data.bookings)) {
        setBroadcastCustomers(res.data.bookings);
      } else {
        setBroadcastCustomers([]);
      }
    } catch (err) {
      console.error("Failed to load departure customers for broadcast:", err);
      setBroadcastCustomers([]);
    } finally {
      setLoadingBroadcastCustomers(false);
    }
  };

  // Handle departure date dropdown switch inside modal
  const handleBroadcastSlotChange = async (newSlotId: string) => {
    setBroadcastSlotId(newSlotId);
    const match = selectedTrip?.departures?.find((d) => d._id === newSlotId);
    if (match) {
      setBroadcastLink(match.whatsappGroupLink || "");
    }
    setBroadcastSentIds([]);
    setBroadcastCurrentIndex(0);
    setIsBroadcastActive(false);
    await loadBroadcastCustomers(newSlotId);
  };

  // Save WhatsApp group link to departure slot
  const handleSaveBroadcastLink = async () => {
    if (!broadcastSlotId || !broadcastLink.trim()) return;
    setSavingBroadcastLink(true);
    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
    try {
      await axios.put(
        `${API_BASE_URL}/trip-slots/${broadcastSlotId}`,
        { whatsappGroupLink: broadcastLink.trim() },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      // Update local state in trips
      setTrips((prev) =>
        prev.map((t) => ({
          ...t,
          departures: t.departures.map((d) =>
            d._id === broadcastSlotId ? { ...d, whatsappGroupLink: broadcastLink.trim() } : d
          ),
        }))
      );
      setBookings((prev) =>
        prev.map((b) =>
          String(b.slotId) === String(broadcastSlotId)
            ? { ...b, slotWhatsappGroupLink: broadcastLink.trim() }
            : b
        )
      );
    } catch (err) {
      console.error("Failed to save broadcast group link:", err);
    } finally {
      setSavingBroadcastLink(false);
    }
  };

  // Start sending to all customers
  const handleStartBroadcast = async () => {
    if (!broadcastLink.trim()) {
      alert("Please enter the WhatsApp Group Joining Link first.");
      return;
    }
    if (broadcastCustomers.length === 0) {
      alert("No confirmed customers have booked this departure yet.");
      return;
    }

    // Auto-save link if needed
    await handleSaveBroadcastLink();

    // If single customer, open directly with one click
    if (broadcastCustomers.length === 1) {
      const single = broadcastCustomers[0];
      openWhatsAppChat(single, broadcastLink.trim());
      setBroadcastSentIds([single._id]);
      setIsBroadcastActive(true);
      setBroadcastCurrentIndex(1);
      return;
    }

    // If multiple customers, open the first one and show one-click step advance
    const firstCustomer = broadcastCustomers[0];
    openWhatsAppChat(firstCustomer, broadcastLink.trim());
    setBroadcastSentIds([firstCustomer._id]);
    setIsBroadcastActive(true);
    setBroadcastCurrentIndex(1);
  };

  // Advance to next customer in queue
  const handleSendNextCustomer = () => {
    if (broadcastCurrentIndex >= broadcastCustomers.length) return;
    const nextCustomer = broadcastCustomers[broadcastCurrentIndex];
    openWhatsAppChat(nextCustomer, broadcastLink.trim());
    setBroadcastSentIds((prev) => (prev.includes(nextCustomer._id) ? prev : [...prev, nextCustomer._id]));
    setBroadcastCurrentIndex((prev) => prev + 1);
  };

  // Copy all customer phone numbers
  const handleCopyAllNumbers = () => {
    const phones = broadcastCustomers
      .map((c) => {
        let p = (c.phone || "").replace(/[^0-9]/g, "");
        if (p.length === 10) p = `+91 ${p}`;
        return p;
      })
      .filter(Boolean)
      .join(", ");

    if (phones) {
      navigator.clipboard.writeText(phones);
      setNumbersCopied(true);
      setTimeout(() => setNumbersCopied(false), 2000);
    }
  };

  // Copy full invite message template
  const handleCopyBroadcastMessage = () => {
    const targetSlot = selectedTrip?.departures?.find((d) => d._id === broadcastSlotId);
    const dateStr = targetSlot?.formattedDate || "your departure date";
    const msg =
      `Hi [Customer Name], greetings from Traviska! 🌄\n\n` +
      `Here is the official WhatsApp group joining link for your booked departure of *${selectedTrip?.title}* on *${dateStr}*:\n\n` +
      `👉 ${broadcastLink.trim()}\n\n` +
      `Please join the group to stay updated on pickup timings, packing checklist, and connect with your trip captains and co-travellers!\n\n` +
      `See you soon on the trip! 🎒✨\n- Team Traviska`;

    navigator.clipboard.writeText(msg);
    setMessageCopied(true);
    setTimeout(() => setMessageCopied(false), 2000);
  };

  // Manual booking submission
  const handleCreateManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCustomerName.trim() || !manualCustomerPhone.trim() || !manualCustomerEmail.trim()) {
      alert("Customer name, phone, and email are required");
      return;
    }
    if (!manualSlotId) {
      alert("Please select a valid trip departure slot");
      return;
    }

    setManualSubmitting(true);
    const token = localStorage.getItem("token");

    try {
      const res = await axios.post(
        `${API_BASE_URL}/admin/manual-bookings`,
        {
          name: manualCustomerName.trim(),
          phone: manualCustomerPhone.trim(),
          email: manualCustomerEmail.trim(),
          slotId: manualSlotId,
          travellers: 1,
          travellerDetails: [
            {
              name: manualCustomerName.trim(),
              phone: manualCustomerPhone.trim(),
              gender: "Male",
              age: "25",
            },
          ],
          pickupLocation: manualPickup,
          paymentMethod: manualPaymentMethod,
          paymentReference: manualPaymentRef.trim() || undefined,
          paymentConfirmed: manualConfirmed,
          requests: manualRequests.trim(),
          whatsappOptIn: manualWhatsappOptIn,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success || res.data.booking) {
        const invNum = res.data.invoice?.invoiceNumber;
        const emailStatus = res.data.emailResult?.status;
        const waStatus = res.data.whatsappPreview?.status;
        alert(
          invNum
            ? `Booking created successfully!\nInvoice: ${invNum}\nEmail: ${emailStatus || "—"}\nWhatsApp: ${waStatus || "—"}`
            : "Booking created successfully!"
        );
        setIsAddDrawerOpen(false);
        setManualCustomerName("");
        setManualCustomerPhone("");
        setManualCustomerEmail("");
        setManualPaymentRef("");
        setManualRequests("");
        setManualWhatsappOptIn(false);
        fetchOverview();
        fetchBookingsList();
      }
    } catch (err: any) {
      console.error("Manual booking error:", err);
      alert(err.response?.data?.message || "Failed to create booking");
    } finally {
      setManualSubmitting(false);
    }
  };

  // Find all available departure slots across all trips for reschedule modal
  const allAvailableDepartureSlots = useMemo(() => {
    const list: Array<{ tripTitle: string; slot: DepartureSlot }> = [];
    trips.forEach((t) => {
      t.departures.forEach((s) => {
        if (!s.isClosed) {
          list.push({ tripTitle: t.title, slot: s });
        }
      });
    });
    return list;
  }, [trips]);

  return (
    <div style={{ width: "100%", paddingBottom: "48px" }}>
      {/* ======================================================================
          HEADER SECTION (Title, Subtitle, Switcher Pills, Actions)
          ====================================================================== */}
      <div className="admin-page-header">
        <div className="admin-page-title-box">
          <h1>Bookings</h1>
          <p>View bookings trip-wise, manage customers, reschedule or cancel bookings.</p>
        </div>

        <div className="bookings-header-actions" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh bookings and trips"
          >
            <RefreshCw size={15} className={isRefreshing ? "spin-icon" : ""} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>


          <button
            type="button"
            className="admin-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#25D366",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(37, 211, 102, 0.25)",
            }}
            onClick={() => handleOpenDepartureBroadcast(selectedSlotId !== "all" ? selectedSlotId : "")}
            title="Send WhatsApp Group Invite to departure customers"
          >
            <MessageCircle size={15} />
            <span>Send Group Link to All</span>
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => {
              if (trips.length > 0 && trips[0].departures.length > 0) {
                setManualSlotId(trips[0].departures[0]._id);
              }
              setIsAddDrawerOpen(true);
            }}
          >
            <Plus size={16} />
            <span>New Booking</span>
          </button>
        </div>
      </div>

      {/* Top Switcher: Trip-wise vs All Bookings */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "14px", marginBottom: "8px" }}>
        <button
          type="button"
          onClick={() => {
            setViewMode("trip-wise");
            setBookingsPage(1);
          }}
          className={`bookings-tab-pill ${viewMode === "trip-wise" ? "active" : ""}`}
        >
          <Mountain size={16} color={viewMode === "trip-wise" ? "#164e23" : "#64748b"} />
          <span>Trip-wise Bookings</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setViewMode("all");
            setBookingsPage(1);
          }}
          className={`bookings-tab-pill ${viewMode === "all" ? "active" : ""}`}
        >
          <List size={16} color={viewMode === "all" ? "#164e23" : "#64748b"} />
          <span>All Bookings</span>
        </button>
      </div>

      {/* ======================================================================
          MAIN BOOKINGS WORKSPACE
          ====================================================================== */}
      <div className="bookings-layout">
        {/* ====================================================================
            LEFT SIDEBAR: TRIPS LIST (Visible in Trip-wise mode)
            ==================================================================== */}
        {viewMode === "trip-wise" && (
          <aside className="bookings-trips-panel">
            <div className="bookings-panel-header">
              <h3>Trips ({trips.length})</h3>
              <p>Select a trip to view its bookings</p>
            </div>

            {/* Trip search input */}
            <div className="bookings-trip-search">
              <Search size={15} className="bookings-trip-search-icon" />
              <input
                type="text"
                placeholder="Search trips..."
                value={tripSearch}
                onChange={(e) => {
                  setTripSearch(e.target.value);
                  setTripsPage(1);
                }}
              />
            </div>

            {/* Trips List Items */}
            {tripsLoading ? (
              <div style={{ padding: "30px 0", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                Loading real trip packages...
              </div>
            ) : filteredTrips.length === 0 ? (
              <div style={{ padding: "30px 0", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                No trips found
              </div>
            ) : (
              <div className="bookings-trips-list">
                {paginatedTrips.map((trip) => {
                  const isSelected = trip._id === selectedTripId;
                  const displayDate = trip.primaryDeparture?.formattedDate || "No departure";
                  const totalBooked = trip.totalBooked || 0;
                  const totalCap = trip.totalCapacity || 24;

                  return (
                    <button
                      key={trip._id}
                      type="button"
                      onClick={() => handleSelectTrip(trip)}
                      className={`bookings-trip-card ${isSelected ? "active" : ""}`}
                    >
                      <img
                        src={trip.image}
                        alt={trip.title}
                        className="bookings-trip-thumb"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200";
                        }}
                      />

                      <div className="bookings-trip-info">
                        <span className="bookings-trip-title">{trip.title}</span>
                        <span className="bookings-trip-meta">
                          <Calendar size={11} />
                          <span>{displayDate}</span>
                          <span>•</span>
                          <span>{trip.duration}</span>
                        </span>
                      </div>

                      <div className="bookings-trip-stat">
                        <span className="bookings-trip-stat-count">
                          {totalBooked} / {totalCap}
                        </span>
                        <span className="bookings-trip-stat-label">Booked</span>
                      </div>

                      <ChevronRight size={14} color={isSelected ? "#164e23" : "#94a3b8"} />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Sidebar pagination */}
            {totalTripPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                <button
                  type="button"
                  className="bookings-page-btn"
                  disabled={tripsPage === 1}
                  onClick={() => setTripsPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>

                {Array.from({ length: totalTripPages }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`bookings-page-btn ${tripsPage === i + 1 ? "active" : ""}`}
                    onClick={() => setTripsPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  type="button"
                  className="bookings-page-btn"
                  disabled={tripsPage === totalTripPages}
                  onClick={() => setTripsPage((p) => Math.min(totalTripPages, p + 1))}
                  aria-label="Next page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </aside>
        )}

        {/* ====================================================================
            RIGHT MAIN PANEL: HERO CARD, STATUS TABS, FILTER & TABLE
            ==================================================================== */}
        <div className="bookings-main-panel">
          {/* Selected Trip Hero Card (in Trip-wise view) */}
          {viewMode === "trip-wise" && selectedTrip && (
            <div className="bookings-hero-card">
              <div className="bookings-hero-left">
                <img
                  src={selectedTrip.image}
                  alt={selectedTrip.title}
                  className="bookings-hero-img"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300";
                  }}
                />

                <div className="bookings-hero-details">
                  <h2 className="bookings-hero-title">{selectedTrip.title}</h2>

                  <div className="bookings-hero-meta-row">
                    <span className="bookings-hero-meta-item">
                      <MapPin size={14} color="#164e23" />
                      <span>{selectedTrip.location}</span>
                    </span>

                    {/* Departure selector if departures exist */}
                    <span className="bookings-hero-meta-item">
                      <Calendar size={14} color="#164e23" />
                      {selectedTrip.departures && selectedTrip.departures.length > 0 ? (
                        <select
                          className="bookings-departure-select"
                          value={selectedSlotId}
                          onChange={(e) => {
                            setSelectedSlotId(e.target.value);
                            setBookingsPage(1);
                          }}
                        >
                          <option value="all">
                            All Departures ({selectedTrip.totalBooked}/{selectedTrip.totalCapacity} seats)
                          </option>
                          {selectedTrip.departures.map((d) => (
                            <option key={d._id} value={d._id}>
                              {d.formattedDate} ({d.bookedSlots}/{d.totalSlots} seats)
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>No departures scheduled</span>
                      )}
                    </span>

                    <span className="bookings-hero-meta-item">
                      <Clock size={14} color="#164e23" />
                      <span>{selectedTrip.duration}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side: Smaller WhatsApp Button ABOVE Seats Booked Badge */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: "7px",
                  flexShrink: 0,
                }}
              >
                {/* Smaller, compact WhatsApp Button */}
                <button
                  type="button"
                  onClick={() => handleOpenDepartureBroadcast(selectedSlotId !== "all" ? selectedSlotId : "")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    background: "#25D366",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "14px",
                    padding: "4px 10px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(37, 211, 102, 0.35)",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#1ebc59")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#25D366")}
                  title="Send WhatsApp Group Invite to all customers of a departure date"
                >
                  <MessageCircle size={12} />
                  <span>Send WhatsApp to Departure</span>
                </button>

                {/* Seats Booked Badge & More Options */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <div className="bookings-hero-badge">
                    <span className="bookings-hero-badge-count">
                      {selectedSlot
                        ? `${selectedSlot.bookedSlots} / ${selectedSlot.totalSlots}`
                        : `${selectedTrip.totalBooked} / ${selectedTrip.totalCapacity}`}
                    </span>
                    <span className="bookings-hero-badge-label">
                      {selectedSlot ? "Seats Booked" : "Total Trip Seats Booked"}
                    </span>
                    {(() => {
                      const bookedVal = selectedSlot ? selectedSlot.bookedSlots : selectedTrip.totalBooked;
                      const capVal = selectedSlot ? selectedSlot.totalSlots : selectedTrip.totalCapacity;
                      if (capVal > 0 && bookedVal > capVal) {
                        return (
                          <span
                            style={{
                              marginTop: "4px",
                              fontSize: "10.5px",
                              fontWeight: 700,
                              color: "#991b1b",
                              background: "#fee2e2",
                              border: "1px solid #fecaca",
                              borderRadius: "999px",
                              padding: "2px 8px",
                            }}
                          >
                            Overbooked (+{bookedVal - capVal})
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <button
                    type="button"
                    className="booking-action-icon-btn"
                    title="More Options"
                    onClick={() => {
                      alert(`Trip: ${selectedTrip.title}\nDepartures: ${selectedTrip.departuresCount}\nPrice: ₹${selectedTrip.price}`);
                    }}
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Status Tabs Bar */}
          <div className="bookings-tabs-row">
            <button
              type="button"
              onClick={() => {
                setActiveTab("booked");
                setBookingsPage(1);
              }}
              className={`bookings-tab-pill ${activeTab === "booked" ? "active" : ""}`}
            >
              <Users size={15} />
              <span>Booked Customers ({tabCounts.booked})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("rescheduled");
                setBookingsPage(1);
              }}
              className={`bookings-tab-pill ${activeTab === "rescheduled" ? "active" : ""}`}
            >
              <Calendar size={15} />
              <span>Rescheduled ({tabCounts.rescheduled})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("cancelled");
                setBookingsPage(1);
              }}
              className={`bookings-tab-pill ${activeTab === "cancelled" ? "active" : ""}`}
            >
              <XCircle size={15} />
              <span>Cancelled ({tabCounts.cancelled})</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="bookings-filters-card">
            <div className="bookings-search-input-box">
              <Search size={16} className="bookings-trip-search-icon" />
              <input
                type="text"
                placeholder="Search by customer, phone or booking ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setBookingsPage(1);
                }}
              />
            </div>

            <div className="bookings-filter-dropdowns">
              {/* Pickup location filter */}
              <select
                className="bookings-filter-select"
                value={selectedPickup}
                onChange={(e) => {
                  setSelectedPickup(e.target.value);
                  setBookingsPage(1);
                }}
              >
                <option value="all">All Pickups</option>
                {availablePickups.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              {/* Status filter */}
              <select
                className="bookings-filter-select"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setBookingsPage(1);
                }}
              >
                <option value="all">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Bookings Table Card */}
          <div className="bookings-table-card">
            {/* Mobile Booking Cards (<= 768px) */}
            <div className="bookings-mobile-cards">
              {bookingsLoading ? (
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[1, 2, 3].map((n) => (
                    <div key={n} style={{ height: "110px", borderRadius: "12px", background: "#f1f5f9" }} />
                  ))}
                </div>
              ) : paginatedBookings.length === 0 ? (
                <div style={{ textAlign: "center", padding: "36px 16px" }}>
                  <FileText size={30} color="#cbd5e1" style={{ margin: "0 auto 8px" }} />
                  <p style={{ margin: 0, fontWeight: 600, color: "#475569", fontSize: "14px" }}>
                    No bookings found
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8" }}>
                    {activeTab === "cancelled"
                      ? "No cancelled bookings for this selection."
                      : activeTab === "rescheduled"
                        ? "No rescheduled bookings for this selection."
                        : "No customers have booked this departure yet."}
                  </p>
                </div>
              ) : (
                paginatedBookings.map((b) => {
                  return (
                    <div
                      key={`mob-${b._id}`}
                      className="booking-mobile-card"
                      style={{ background: "#ffffff" }}
                    >
                      <div className="booking-mobile-card-header" onClick={() => setViewingBooking(b)}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                          <span className="booking-code-badge">{b.bookingCode}</span>
                        </div>
                        <StatusBadge status={b.paymentStatus} />
                      </div>

                      <div className="booking-mobile-card-body" onClick={() => setViewingBooking(b)}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: "14.5px", color: "#0f172a", wordBreak: "break-word" }}>
                              {b.name}
                            </div>
                            <div style={{ fontSize: "12.5px", color: "#475569", marginTop: "2px" }}>
                              {b.phone}
                            </div>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: "15px", color: "#0d2b17", flexShrink: 0 }}>
                            ₹{b.amount.toLocaleString("en-IN")}
                          </div>
                        </div>

                        <div className="booking-mobile-card-meta">
                          <span>📅 {b.date || "—"}</span>
                          <span>•</span>
                          <span>👥 {b.travellers} {b.travellers === 1 ? "Traveller" : "Travellers"}</span>
                          <span>•</span>
                          <span>📍 {b.pickupLocation || "—"}</span>
                        </div>
                      </div>

                      <div className="booking-mobile-card-actions">
                        {b.phone && b.phone !== "-" && (
                          <a
                            href={`tel:${b.phone}`}
                            className="booking-action-btn"
                            style={{ textDecoration: "none", color: "#0f172a" }}
                          >
                            <Phone size={13} />
                            <span>Call</span>
                          </a>
                        )}
                        {b.status !== "Cancelled" && (
                          <button
                            type="button"
                            className="booking-action-btn whatsapp"
                            onClick={() => handleSendWhatsApp(b)}
                          >
                            <MessageCircle size={13} color="#15803d" />
                            <span>WhatsApp</span>
                          </button>
                        )}
                        {b.status !== "Cancelled" && (
                          <button
                            type="button"
                            className="booking-action-btn reschedule"
                            onClick={() => {
                              setRescheduleBooking(b);
                              if (selectedSlotId) setTargetRescheduleSlotId("");
                            }}
                          >
                            <Calendar size={13} />
                            <span>Reschedule</span>
                          </button>
                        )}
                        {b.status !== "Cancelled" && (
                          <button
                            type="button"
                            className="booking-action-btn cancel"
                            onClick={() => {
                              setCancelBooking(b);
                              setCancelReason("Customer Request");
                              setCancelNotes("");
                            }}
                          >
                            <X size={13} />
                            <span>Cancel</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="booking-action-btn"
                          onClick={() => setViewingBooking(b)}
                        >
                          <Eye size={13} />
                          <span>Details</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="admin-table-container bookings-desktop-table">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Customer & Contact</th>
                    <th>Travellers</th>
                    <th>Pickup Location</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {bookingsLoading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                        Loading customer bookings...
                      </td>
                    </tr>
                  ) : paginatedBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "48px 20px" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                          <FileText size={32} color="#cbd5e1" />
                          <p style={{ margin: 0, fontWeight: 600, color: "#475569" }}>
                            No bookings found
                          </p>
                          <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>
                            {activeTab === "cancelled"
                              ? "No cancelled bookings for this selection."
                              : activeTab === "rescheduled"
                                ? "No rescheduled bookings for this selection."
                                : "No customers have booked this departure yet."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedBookings.map((b) => {
                      return (
                        <tr key={b._id}>

                          {/* Booking ID */}
                          <td>
                            <span className="booking-code-badge">{b.bookingCode}</span>
                          </td>

                          {/* Customer & Contact */}
                          <td>
                            <div className="booking-customer-cell">
                              <span className="booking-customer-name">{b.name}</span>
                              <span className="booking-customer-phone" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <Phone size={11} color="#64748b" />
                                <span>{b.phone}</span>
                                {b.phone && b.phone !== "-" && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSendWhatsApp(b);
                                    }}
                                    title={`Send WhatsApp Group Link to ${b.name}`}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      padding: "1px 2px",
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      color: "#16a34a",
                                    }}
                                  >
                                    <MessageCircle size={12} />
                                  </button>
                                )}
                              </span>
                            </div>
                          </td>

                          {/* Travellers */}
                          <td>
                            <span
                              className="booking-traveller-pill"
                              style={{ cursor: "pointer" }}
                              onClick={() => setViewingBooking(b)}
                              title="Click to view traveller details"
                            >
                              <Users size={12} />
                              <span>
                                {b.travellers} {b.travellers === 1 ? "Traveller" : "Travellers"}
                              </span>
                            </span>
                          </td>

                          {/* Pickup Location */}
                          <td>
                            <div className="booking-pickup-cell">
                              <MapPin size={13} color="#164e23" />
                              <span>{b.pickupLocation}</span>
                            </div>
                          </td>

                          {/* Amount */}
                          <td>
                            <span className="booking-amount-cell">
                              ₹{b.amount.toLocaleString("en-IN")}
                            </span>
                          </td>

                          {/* Payment status badge */}
                          <td>
                            <StatusBadge status={b.paymentStatus} />
                          </td>

                          {/* Action Buttons */}
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                              {/* Direct WhatsApp Group Invite Button */}
                              {b.status !== "Cancelled" && (
                                <button
                                  type="button"
                                  className="booking-action-btn whatsapp"
                                  onClick={() => handleSendWhatsApp(b)}
                                  title={`Send departure WhatsApp group link to ${b.name}`}
                                >
                                  <MessageCircle size={13} color="#15803d" />
                                  <span>WhatsApp</span>
                                </button>
                              )}

                              {b.status !== "Cancelled" && (
                                <button
                                  type="button"
                                  className="booking-action-btn reschedule"
                                  onClick={() => {
                                    setRescheduleBooking(b);
                                    if (selectedSlotId) {
                                      setTargetRescheduleSlotId("");
                                    }
                                  }}
                                  title="Reschedule this booking"
                                >
                                  <Calendar size={13} />
                                  <span>Reschedule</span>
                                </button>
                              )}

                              {b.status !== "Cancelled" && (
                                <button
                                  type="button"
                                  className="booking-action-btn cancel"
                                  onClick={() => {
                                    setCancelBooking(b);
                                    setCancelReason("Customer Request");
                                    setCancelNotes("");
                                  }}
                                  title="Cancel this booking"
                                >
                                  <X size={13} />
                                  <span>Cancel</span>
                                </button>
                              )}

                              <button
                                type="button"
                                className="booking-action-icon-btn"
                                onClick={() => setViewingBooking(b)}
                                title="View full booking details"
                              >
                                <Eye size={14} />
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

            {/* Table Pagination Footer */}
            <div className="bookings-table-footer">
              <span>
                Showing{" "}
                {bookings.length > 0 ? (bookingsPage - 1) * BOOKINGS_PER_PAGE + 1 : 0}–
                {Math.min(bookingsPage * BOOKINGS_PER_PAGE, bookings.length)} of{" "}
                {bookings.length} customers
              </span>

              {totalBookingPages > 1 && (
                <div className="bookings-pagination">
                  <button
                    type="button"
                    className="bookings-page-btn"
                    disabled={bookingsPage === 1}
                    onClick={() => setBookingsPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous bookings page"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  {Array.from({ length: totalBookingPages }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`bookings-page-btn ${bookingsPage === i + 1 ? "active" : ""}`}
                      onClick={() => setBookingsPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="bookings-page-btn"
                    disabled={bookingsPage === totalBookingPages}
                    onClick={() => setBookingsPage((p) => Math.min(totalBookingPages, p + 1))}
                    aria-label="Next bookings page"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================================
          MODAL 1: RESCHEDULE BOOKING
          ====================================================================== */}
      {rescheduleBooking && (
        <Modal
          isOpen={Boolean(rescheduleBooking)}
          onClose={() => setRescheduleBooking(null)}
          title={`Reschedule Booking — ${rescheduleBooking.bookingCode}`}
          subtitle={`Customer: ${rescheduleBooking.name} • Travellers: ${rescheduleBooking.travellers}`}
          maxWidth="560px"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Current Departure Notice */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "8px",
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
                fontSize: "13px",
                color: "#334155",
              }}
            >
              <strong>Current Schedule:</strong> {rescheduleBooking.trip.title} on{" "}
              <strong>{rescheduleBooking.date}</strong>
            </div>

            {/* Select Target Departure Slot */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Select New Departure Date *
              </label>
              <select
                value={targetRescheduleSlotId}
                onChange={(e) => setTargetRescheduleSlotId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              >
                <option value="">-- Choose target departure date --</option>
                {allAvailableDepartureSlots.map(({ tripTitle, slot }) => {
                  const isSame = String(rescheduleBooking.slotId) === String(slot._id);
                  const remaining = Math.max(0, slot.totalSlots - slot.bookedSlots);
                  const hasEnoughSeats = remaining >= rescheduleBooking.travellers;

                  return (
                    <option
                      key={slot._id}
                      value={slot._id}
                      disabled={isSame || !hasEnoughSeats}
                    >
                      {tripTitle} — {slot.formattedDate} ({remaining} seats available
                      {isSame ? " • Current Slot" : !hasEnoughSeats ? " • Full" : ""})
                    </option>
                  );
                })}
              </select>
              <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>
                Only open departure slots with sufficient available seats ({rescheduleBooking.travellers} seats) are enabled.
              </span>
            </div>

            {/* Reason input */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Reschedule Reason (Internal Record)
              </label>
              <input
                type="text"
                placeholder="e.g. Customer requested date change due to personal emergency"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Reschedule Workflow Mode */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Reschedule Type *
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setRescheduleMode("propose")}
                  style={{
                    padding: "9px 10px",
                    borderRadius: "8px",
                    border: rescheduleMode === "propose" ? "2px solid #0e3820" : "1px solid #cbd5e1",
                    background: rescheduleMode === "propose" ? "#f0fdf4" : "#fff",
                    color: "#0f172a",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  Propose &amp; Ask Customer
                  <div style={{ fontSize: "11px", fontWeight: 400, color: "#475569", marginTop: "2px" }}>
                    Customer chooses Accept or 100% Refund
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRescheduleMode("direct")}
                  style={{
                    padding: "9px 10px",
                    borderRadius: "8px",
                    border: rescheduleMode === "direct" ? "2px solid #0e3820" : "1px solid #cbd5e1",
                    background: rescheduleMode === "direct" ? "#f0fdf4" : "#fff",
                    color: "#0f172a",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  Direct Reschedule
                  <div style={{ fontSize: "11px", fontWeight: 400, color: "#475569", marginTop: "2px" }}>
                    Move {rescheduleBooking.travellers} seat(s) immediately
                  </div>
                </button>
              </div>
            </div>

            {/* Capacity change preview */}
            <div
              style={{
                background: rescheduleMode === "propose" ? "#eff6ff" : "#eef7ed",
                border: rescheduleMode === "propose" ? "1px solid #bfdbfe" : "1px solid #b9deb4",
                borderRadius: "8px",
                padding: "12px 14px",
                fontSize: "12.5px",
                color: rescheduleMode === "propose" ? "#1e3a8a" : "#164e23",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
                <CheckCircle size={15} />
                <span>
                  {rescheduleMode === "propose"
                    ? "Awaiting Customer Response (Seats Held Until Accepted)"
                    : "Automatic Capacity & Website Sync"}
                </span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "11.5px" }}>
                {rescheduleMode === "propose"
                  ? "Customer will receive an email/WhatsApp & see Accept New Date or Request 100% Refund in My Trips. Seats will move only after customer confirmation."
                  : `Submitting will automatically release ${rescheduleBooking.travellers} seat(s) from the current departure and reserve ${rescheduleBooking.travellers} seat(s) in the new departure.`}
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px", paddingTop: "14px", borderTop: "1px solid #e2e8f0" }}>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setRescheduleBooking(null)}
                disabled={reschedulingSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={handleConfirmReschedule}
                disabled={!targetRescheduleSlotId || reschedulingSubmitting}
              >
                {reschedulingSubmitting ? "Rescheduling..." : "Confirm Reschedule"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ======================================================================
          MODAL 2: CANCEL BOOKING
          ====================================================================== */}
      {cancelBooking && (
        <Modal
          isOpen={Boolean(cancelBooking)}
          onClose={() => setCancelBooking(null)}
          title={`Cancel Booking — ${cancelBooking.bookingCode}`}
          subtitle={`Customer: ${cancelBooking.name} • Amount: ₹${cancelBooking.amount.toLocaleString("en-IN")}`}
          maxWidth="520px"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "12px 14px",
                fontSize: "12.5px",
                color: "#991b1b",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}>
                <AlertCircle size={15} />
                <span>Seat Release Notice</span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "11.5px", color: "#b91c1c" }}>
                Cancelling will immediately release <strong>{cancelBooking.travellers} seat(s)</strong> back to the departure slot so other travellers can book online.
              </p>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Cancellation Source *
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                <button
                  type="button"
                  onClick={() => setCancelSource("Customer")}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "8px",
                    border: cancelSource === "Customer" ? "2px solid #0e3820" : "1px solid #cbd5e1",
                    background: cancelSource === "Customer" ? "#f0fdf4" : "#fff",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  Customer Requested
                  <div style={{ fontSize: "11px", fontWeight: 400, color: "#475569" }}>
                    Standard tiered policy (90/50/25/0%)
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setCancelSource("Traviska")}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "8px",
                    border: cancelSource === "Traviska" ? "2px solid #0e3820" : "1px solid #cbd5e1",
                    background: cancelSource === "Traviska" ? "#f0fdf4" : "#fff",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  Traviska Initiated
                  <div style={{ fontSize: "11px", fontWeight: 400, color: "#475569" }}>
                    100% Refund Guarantee (0% fee)
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Cancellation Reason *
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              >
                <option value="Customer Request">Customer Request (Personal / Change of plans)</option>
                <option value="Medical Emergency">Medical Emergency</option>
                <option value="Weather / Natural Disaster">Weather / Natural Constraints</option>
                <option value="Payment Issue">Payment Issue / Unverified Payment</option>
                <option value="Operational Cancellation">Operational / Route Cancellation</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Internal Notes & Refund Remarks
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Customer informed via WhatsApp, refund processed via UPI transaction #..."
                value={cancelNotes}
                onChange={(e) => setCancelNotes(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px", paddingTop: "14px", borderTop: "1px solid #e2e8f0" }}>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setCancelBooking(null)}
                disabled={cancelSubmitting}
              >
                Keep Booking
              </button>
              <button
                type="button"
                className="admin-btn"
                style={{ background: "#dc2626", color: "#ffffff", borderColor: "#dc2626" }}
                onClick={handleConfirmCancel}
                disabled={cancelSubmitting}
              >
                {cancelSubmitting ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </Modal>
      )}


      {/* ======================================================================
          DRAWER: VIEW FULL BOOKING DETAILS
          ====================================================================== */}
      <Drawer
        isOpen={Boolean(viewingBooking)}
        onClose={() => setViewingBooking(null)}
        title={viewingBooking ? `Booking Details — ${viewingBooking.bookingCode}` : "Booking Details"}
        width="560px"
      >
        {viewingBooking && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Status Header Pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                background: "#f8fafc",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                  Booking Status
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                  <StatusBadge status={viewingBooking.status} />
                  <StatusBadge status={viewingBooking.paymentStatus} />
                  {viewingBooking.isRescheduled && (
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "12px",
                        background: "#e0f2fe",
                        color: "#0369a1",
                        fontSize: "11px",
                        fontWeight: 600,
                      }}
                    >
                      Rescheduled
                    </span>
                  )}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                  Total Amount
                </span>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                  ₹{viewingBooking.amount.toLocaleString("en-IN")}
                </div>
                {viewingBooking.couponCode && (
                  <div style={{ marginTop: "4px", fontSize: "11px", color: "#15803d", fontWeight: 600 }}>
                    <span style={{ textDecoration: "line-through", color: "#94a3b8", marginRight: "6px" }}>
                      ₹{(viewingBooking.originalTotal || viewingBooking.amount + (viewingBooking.discountAmount || 0)).toLocaleString("en-IN")}
                    </span>
                    Coupon {viewingBooking.couponCode} (-₹{(viewingBooking.discountAmount || 0).toLocaleString("en-IN")})
                  </div>
                )}
              </div>
            </div>

            {/* Customer Details */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
              <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                Customer Information
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                <div>
                  <span style={{ color: "#64748b", fontSize: "11.5px" }}>Primary Name</span>
                  <div style={{ fontWeight: 600, color: "#0f172a" }}>{viewingBooking.name}</div>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: "11.5px" }}>Phone Number</span>
                  <div style={{ fontWeight: 600, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                    <a href={`tel:${viewingBooking.phone}`} style={{ color: "#164e23", textDecoration: "none" }}>
                      {viewingBooking.phone}
                    </a>
                    {viewingBooking.phone && viewingBooking.phone !== "-" && (
                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp(viewingBooking)}
                        title="Send WhatsApp Group Join Link"
                        style={{
                          background: "#f0fdf4",
                          border: "1px solid #86efac",
                          color: "#15803d",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontWeight: 600,
                        }}
                      >
                        <MessageCircle size={11} />
                        <span>Send WhatsApp Link</span>
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: "11.5px" }}>Email</span>
                  <div style={{ fontWeight: 500, color: "#0f172a" }}>
                    {viewingBooking.email ? (
                      <a href={`mailto:${viewingBooking.email}`} style={{ color: "#164e23", textDecoration: "none" }}>
                        {viewingBooking.email}
                      </a>
                    ) : (
                      "Not provided"
                    )}
                  </div>
                </div>

                {/* Full Pickup Point Details */}
                <div style={{ gridColumn: "span 2", borderTop: "1px solid #f1f5f9", paddingTop: "10px", marginTop: "4px" }}>
                  <span style={{ color: "#64748b", fontSize: "11.5px", fontWeight: 600, display: "flex", alignItems: "center", gap: "5px" }}>
                    <MapPin size={13} color="#166534" /> Boarding Point & Pickup Details
                  </span>
                  <div style={{ marginTop: "4px" }}>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>
                      {viewingBooking.pickupDetails?.name || viewingBooking.pickupLocation}
                    </div>

                    {viewingBooking.pickupDetails?.pickupTime && (
                      <div style={{ fontSize: "12px", color: "#166534", fontWeight: 600, marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={12} /> Scheduled Pickup: {viewingBooking.pickupDetails.pickupTime}
                      </div>
                    )}

                    {viewingBooking.pickupDetails?.address && (
                      <div style={{ fontSize: "12px", color: "#475569", marginTop: "3px" }}>
                        Address: {viewingBooking.pickupDetails.address}
                      </div>
                    )}

                    {viewingBooking.pickupDetails?.landmark && (
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                        Landmark: <strong>{viewingBooking.pickupDetails.landmark}</strong>
                      </div>
                    )}

                    {viewingBooking.pickupDetails?.googleMapsUrl && (
                      <div style={{ marginTop: "6px" }}>
                        <a
                          href={viewingBooking.pickupDetails.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#2563eb",
                            textDecoration: "none",
                            background: "#eff6ff",
                            padding: "4px 8px",
                            borderRadius: "6px",
                          }}
                        >
                          <MapPin size={12} /> Open in Google Maps <ExternalLink size={11} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Trip & Departure */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
              <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                Trip & Departure
              </h4>
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <img
                  src={viewingBooking.trip.image}
                  alt={viewingBooking.trip.title}
                  style={{ width: "54px", height: "54px", borderRadius: "8px", objectFit: "cover" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200";
                  }}
                />
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                    {viewingBooking.trip.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                    📍 {viewingBooking.trip.location} • 📅 {viewingBooking.date} • ⏱️ {viewingBooking.trip.duration}
                  </div>
                </div>
              </div>
            </div>

            {/* Travellers List */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
              <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                Travellers ({viewingBooking.travellers})
              </h4>
              {viewingBooking.travellerDetails && viewingBooking.travellerDetails.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {viewingBooking.travellerDetails.map((t, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        background: "#f8fafc",
                        borderRadius: "6px",
                        fontSize: "12.5px",
                      }}
                    >
                      <div>
                        <strong>{t.name || `Traveller #${idx + 1}`}</strong>{" "}
                        <span style={{ color: "#64748b" }}>
                          ({t.gender || "Not specified"}, {t.age ? `${t.age} yrs` : "Age -"})
                        </span>
                      </div>
                      {t.phone && <div style={{ color: "#64748b", fontSize: "12px" }}>📞 {t.phone}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: "12.5px", color: "#64748b" }}>
                  Primary traveller: {viewingBooking.name} ({viewingBooking.travellers} seat(s) booked).
                </div>
              )}
            </div>

            {/* Payment & Transaction */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
              <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                Payment & Transactions
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12.5px" }}>
                <div>
                  <span style={{ color: "#64748b", fontSize: "11px" }}>Payment Method</span>
                  <div style={{ fontWeight: 600 }}>{viewingBooking.paymentMethod}</div>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: "11px" }}>Payment Reference / ID</span>
                  <div style={{ fontWeight: 600, fontFamily: "monospace" }}>
                    {viewingBooking.paymentReference}
                  </div>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: "11px" }}>Booked On</span>
                  <div style={{ color: "#334155" }}>
                    {new Date(viewingBooking.createdAt).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}
                  </div>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: "11px" }}>Special Requests</span>
                  <div style={{ color: "#334155" }}>{viewingBooking.requests || "None"}</div>
                </div>
              </div>
            </div>

            {/* Cancellation or Reschedule History if present */}
            {viewingBooking.status === "Cancelled" && (
              <div style={{ border: "1px solid #fecaca", background: "#fef2f2", borderRadius: "10px", padding: "16px" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: 700, color: "#b91c1c" }}>
                  Cancellation Information
                </h4>
                <div style={{ fontSize: "12.5px", color: "#7f1d1d" }}>
                  <div><strong>Reason:</strong> {viewingBooking.cancellationReason || "Not specified"}</div>
                  {viewingBooking.cancellationNotes && (
                    <div style={{ marginTop: "4px" }}><strong>Notes:</strong> {viewingBooking.cancellationNotes}</div>
                  )}
                  {viewingBooking.cancelledAt && (
                    <div style={{ marginTop: "4px", fontSize: "11.5px", color: "#991b1b" }}>
                      Cancelled at: {new Date(viewingBooking.cancelledAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions at bottom of drawer */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
              {viewingBooking.status !== "Cancelled" && (
                <button
                  type="button"
                  className="admin-btn"
                  style={{
                    width: "100%",
                    background: "#f0fdf4",
                    color: "#15803d",
                    border: "1px solid #86efac",
                    fontWeight: 700,
                    padding: "10px",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                  onClick={() => handleSendWhatsApp(viewingBooking)}
                >
                  <MessageCircle size={16} color="#15803d" />
                  <span>Send WhatsApp Group Joining Link</span>
                </button>
              )}

              <div style={{ display: "flex", gap: "10px" }}>
                {viewingBooking.status !== "Cancelled" && (
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      const b = viewingBooking;
                      setViewingBooking(null);
                      setRescheduleBooking(b);
                    }}
                  >
                    <Calendar size={15} />
                    <span>Reschedule Booking</span>
                  </button>
                )}

                {viewingBooking.status !== "Cancelled" && (
                  <button
                    type="button"
                    className="admin-btn"
                    style={{ flex: 1, background: "#dc2626", color: "#ffffff", borderColor: "#dc2626" }}
                    onClick={() => {
                      const b = viewingBooking;
                      setViewingBooking(null);
                      setCancelBooking(b);
                    }}
                  >
                    <X size={15} />
                    <span>Cancel Booking</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* ======================================================================
          DRAWER: MANUAL BOOKING CREATION
          ====================================================================== */}
      <Drawer
        isOpen={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        title="Create New Booking"
        width="540px"
      >
        <form onSubmit={handleCreateManualBooking} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
              Customer Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Kushal Gowda"
              value={manualCustomerName}
              onChange={(e) => setManualCustomerName(e.target.value)}
              className="admin-search-input"
              style={{ background: "#ffffff" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                Phone Number *
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={manualCustomerPhone}
                onChange={(e) => setManualCustomerPhone(e.target.value)}
                className="admin-search-input"
                style={{ background: "#ffffff" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="e.g. kushal@example.com"
                value={manualCustomerEmail}
                onChange={(e) => setManualCustomerEmail(e.target.value)}
                className="admin-search-input"
                style={{ background: "#ffffff" }}
              />
            </div>
          </div>

          <div
            style={{
              padding: "12px 14px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
            }}
          >
            <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
              WhatsApp Notifications
            </div>
            <label
              htmlFor="admin-manual-whatsapp-optin"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                fontSize: "12.5px",
                color: "#334155",
                lineHeight: 1.45,
                cursor: "pointer",
              }}
            >
              <input
                id="admin-manual-whatsapp-optin"
                type="checkbox"
                checked={manualWhatsappOptIn}
                onChange={(e) => setManualWhatsappOptIn(e.target.checked)}
                style={{
                  marginTop: "2px",
                  width: "16px",
                  height: "16px",
                  accentColor: "#166534",
                  flexShrink: 0,
                  cursor: "pointer",
                }}
              />
              <span>
                I confirm that the customer has agreed to receive booking confirmations, invoices and trip updates from Traviska via WhatsApp.
              </span>
            </label>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
              Select Trip & Departure Date *
            </label>
            <select
              required
              value={manualSlotId}
              onChange={(e) => setManualSlotId(e.target.value)}
              className="bookings-filter-select"
              style={{ width: "100%", padding: "10px" }}
            >
              <option value="">-- Select Departure Slot --</option>
              {allAvailableDepartureSlots.map(({ tripTitle, slot }) => {
                const remaining = Math.max(0, slot.totalSlots - slot.bookedSlots);
                return (
                  <option key={slot._id} value={slot._id} disabled={remaining <= 0}>
                    {tripTitle} — {slot.formattedDate} ({remaining} seats remaining)
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
              Pickup Location
            </label>
            <input
              type="text"
              placeholder="e.g. Majestic, Bengaluru – 10:00 PM"
              value={manualPickup}
              onChange={(e) => setManualPickup(e.target.value)}
              className="admin-search-input"
              style={{ background: "#ffffff" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                Payment Method
              </label>
              <select
                value={manualPaymentMethod}
                onChange={(e) => setManualPaymentMethod(e.target.value as any)}
                className="bookings-filter-select"
                style={{ width: "100%" }}
              >
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                Payment Reference
              </label>
              <input
                type="text"
                placeholder="e.g. UPI Ref # or Cash"
                value={manualPaymentRef}
                onChange={(e) => setManualPaymentRef(e.target.value)}
                className="admin-search-input"
                style={{ background: "#ffffff" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              id="confirm-payment-chk"
              checked={manualConfirmed}
              onChange={(e) => setManualConfirmed(e.target.checked)}
              style={{ width: "16px", height: "16px", cursor: "pointer" }}
            />
            <label htmlFor="confirm-payment-chk" style={{ fontSize: "13px", cursor: "pointer" }}>
              Mark as Paid & Confirmed immediately
            </label>
          </div>

          <div style={{ marginTop: "16px" }}>
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "12px" }}
              disabled={manualSubmitting}
            >
              {manualSubmitting ? "Creating Booking..." : "Create Booking"}
            </button>
          </div>
        </form>
      </Drawer>

      {/* ======================================================================
          MODAL: CONFIGURE DEPARTURE WHATSAPP LINK & SEND
          ====================================================================== */}
      <Modal
        isOpen={Boolean(whatsAppModalBooking)}
        onClose={() => {
          setWhatsAppModalBooking(null);
          setWhatsAppInputLink("");
        }}
        title="Send WhatsApp Group Joining Link"
        subtitle={
          whatsAppModalBooking
            ? `Configure WhatsApp group link for ${whatsAppModalBooking.trip?.title} (${whatsAppModalBooking.date}) and send to ${whatsAppModalBooking.name}`
            : "Configure departure WhatsApp group link"
        }
      >
        <form onSubmit={handleSaveAndSendWhatsApp} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "8px",
              padding: "12px 14px",
              fontSize: "12.5px",
              color: "#166534",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: "4px" }}>
              No WhatsApp group link is configured yet for this departure.
            </div>
            <div>
              Enter the invite link below. It will be saved for this departure slot (syncing with the Captain Portal) and immediately opened in WhatsApp to send to <strong>{whatsAppModalBooking?.name}</strong>.
            </div>
          </div>

          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
              <MessageCircle size={15} color="#16a34a" />
              <span>WhatsApp Group Invite Link *</span>
            </label>
            <input
              type="url"
              required
              placeholder="https://chat.whatsapp.com/..."
              value={whatsAppInputLink}
              onChange={(e) => setWhatsAppInputLink(e.target.value)}
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

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => {
                setWhatsAppModalBooking(null);
                setWhatsAppInputLink("");
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingWhatsAppLink || !whatsAppInputLink.trim()}
              className="admin-btn admin-btn-primary"
              style={{ background: "#16a34a", borderColor: "#16a34a", gap: "6px" }}
            >
              <MessageCircle size={14} />
              <span>{savingWhatsAppLink ? "Saving..." : "Save & Open WhatsApp"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================================
          MODAL: BROADCAST WHATSAPP INVITE LINK BY DEPARTURE DATE
          ====================================================================== */}
      <Modal
        isOpen={isBroadcastModalOpen}
        onClose={() => {
          setIsBroadcastModalOpen(false);
          setIsBroadcastActive(false);
        }}
        title="Broadcast WhatsApp Group Link by Departure"
        subtitle={`Select a departure date, verify group invite link, and send to all booked customers.`}
        maxWidth="640px"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Trip Header Banner */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "10px",
              padding: "10px 14px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "#25D366",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                flexShrink: 0,
              }}
            >
              <MessageCircle size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#14532d" }}>
                {selectedTrip?.title}
              </div>
              <div style={{ fontSize: "12px", color: "#166534" }}>
                {selectedTrip?.location} • {selectedTrip?.duration}
              </div>
            </div>
          </div>

          {/* 1. SELECT DEPARTURE DATE */}
          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12.5px",
                fontWeight: 700,
                color: "#1e293b",
                marginBottom: "6px",
              }}
            >
              <Calendar size={14} color="#166534" />
              <span>Select Departure Date *</span>
            </label>
            <select
              value={broadcastSlotId}
              onChange={(e) => handleBroadcastSlotChange(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1.5px solid #cbd5e1",
                borderRadius: "8px",
                fontSize: "13.5px",
                fontWeight: 600,
                color: "#0f172a",
                background: "#ffffff",
                boxSizing: "border-box",
                cursor: "pointer",
              }}
            >
              {selectedTrip?.departures && selectedTrip.departures.length > 0 ? (
                selectedTrip.departures.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.formattedDate} — ({d.bookedSlots} / {d.totalSlots} seats booked)
                    {d.whatsappGroupLink ? " • WhatsApp Link Set" : " • Needs WhatsApp Link"}
                  </option>
                ))
              ) : (
                <option value="">No departures scheduled</option>
              )}
            </select>
          </div>

          {/* 2. WHATSAPP GROUP INVITE LINK */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  color: "#1e293b",
                }}
              >
                <Share2 size={14} color="#25D366" />
                <span>Departure WhatsApp Group Invite Link *</span>
              </label>
              {broadcastLink.trim() && (
                <button
                  type="button"
                  onClick={handleSaveBroadcastLink}
                  disabled={savingBroadcastLink}
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 600,
                    color: "#15803d",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  {savingBroadcastLink ? "Saving..." : "Save Link to Departure"}
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="url"
                placeholder="https://chat.whatsapp.com/..."
                value={broadcastLink}
                onChange={(e) => setBroadcastLink(e.target.value)}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "#0f172a",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
              This link is sent to customers and automatically synced with the Captain Portal for this departure date.
            </div>
          </div>

          {/* 3. CUSTOMERS TO BE CONTACTED */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                <Users size={14} color="#166534" />
                <span>Booked Customers for this Departure ({broadcastCustomers.length})</span>
              </div>
              {broadcastCustomers.length > 0 && (
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={handleCopyAllNumbers}
                    style={{
                      background: "none",
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
                    {numbersCopied ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
                    <span>{numbersCopied ? "Numbers Copied!" : "Copy Numbers"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyBroadcastMessage}
                    style={{
                      background: "none",
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
                    {messageCopied ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
                    <span>{messageCopied ? "Message Copied!" : "Copy Message"}</span>
                  </button>
                </div>
              )}
            </div>

            {loadingBroadcastCustomers ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#64748b", fontSize: "13px", background: "#f8fafc", borderRadius: "8px" }}>
                Loading departure customers...
              </div>
            ) : broadcastCustomers.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "#64748b", fontSize: "13px", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                <div style={{ fontWeight: 600, color: "#334155", marginBottom: "2px" }}>No Booked Customers for this Departure</div>
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>Select a departure date with active bookings above to send invites.</div>
              </div>
            ) : (
              <div style={{ maxHeight: "190px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#ffffff" }}>
                {broadcastCustomers.map((c, idx) => {
                  const isSent = broadcastSentIds.includes(c._id);
                  const isUpNext = isBroadcastActive && broadcastCurrentIndex === idx;

                  return (
                    <div
                      key={c._id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "9px 12px",
                        borderBottom: idx < broadcastCustomers.length - 1 ? "1px solid #f1f5f9" : "none",
                        background: isSent ? "#f0fdf4" : isUpNext ? "#fffbeb" : "#ffffff",
                      }}
                    >
                      <div className="bookings-header-actions" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "50%",
                            background: isSent ? "#dcfce7" : "#e2e8f0",
                            color: isSent ? "#15803d" : "#475569",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                        >
                          {isSent ? "✓" : (c.name || "T").slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                            {c.name}
                            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 400, marginLeft: "6px" }}>
                              ({c.bookingCode})
                            </span>
                          </div>
                          <div style={{ fontSize: "11.5px", color: "#475569" }}>
                            {c.phone} • {c.travellers} {c.travellers === 1 ? "traveller" : "travellers"}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {isSent ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "#15803d",
                              background: "#dcfce7",
                              padding: "3px 8px",
                              borderRadius: "12px",
                            }}
                          >
                            <Check size={11} /> Sent
                          </span>
                        ) : isUpNext ? (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "#b45309",
                              background: "#fef3c7",
                              padding: "3px 8px",
                              borderRadius: "12px",
                            }}
                          >
                            Up Next
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#64748b",
                              background: "#f1f5f9",
                              padding: "3px 8px",
                              borderRadius: "12px",
                            }}
                          >
                            Ready
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (!broadcastLink.trim()) {
                              alert("Please enter WhatsApp group link first.");
                              return;
                            }
                            openWhatsAppChat(c, broadcastLink.trim());
                            setBroadcastSentIds((prev) => (prev.includes(c._id) ? prev : [...prev, c._id]));
                          }}
                          title={`Send directly to ${c.name}`}
                          style={{
                            background: "none",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11.5px",
                            color: "#166534",
                          }}
                        >
                          <MessageCircle size={12} color="#25D366" />
                          <span>Send</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. BROADCAST PROGRESS / ACTIONS */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginTop: "4px",
              paddingTop: "12px",
              borderTop: "1px solid #e2e8f0",
            }}
          >
            {isBroadcastActive && broadcastCustomers.length > 1 && (
              <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  <span>Broadcast Progress</span>
                  <span>
                    {broadcastSentIds.length} of {broadcastCustomers.length} Sent
                  </span>
                </div>
                <div style={{ width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${(broadcastSentIds.length / broadcastCustomers.length) * 100}%`,
                      height: "100%",
                      background: "#25D366",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            )}

            {metaBroadcastSummary && (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  color: "#166534",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                {metaBroadcastSummary}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => {
                  setIsBroadcastModalOpen(false);
                  setIsBroadcastActive(false);
                  setMetaBroadcastSummary(null);
                }}
              >
                Close
              </button>

              {!isBroadcastActive && (
                <button
                  type="button"
                  onClick={handleMetaBroadcastAll}
                  disabled={metaBroadcasting || loadingBroadcastCustomers || broadcastCustomers.length === 0}
                  className="admin-btn admin-btn-primary"
                  style={{
                    background: broadcastCustomers.length > 0 ? "#0e3820" : "#94a3b8",
                    borderColor: broadcastCustomers.length > 0 ? "#0e3820" : "#94a3b8",
                    color: "#ffffff",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "10px 16px",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  <Send size={14} />
                  <span>{metaBroadcasting ? "Sending via Meta..." : "One-Click Send to All (Meta API)"}</span>
                </button>
              )}

              {isBroadcastActive && broadcastCurrentIndex < broadcastCustomers.length ? (
                <button
                  type="button"
                  onClick={handleSendNextCustomer}
                  className="admin-btn admin-btn-primary"
                  style={{
                    background: "#16a34a",
                    borderColor: "#16a34a",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "9px 18px",
                    fontWeight: 700,
                  }}
                >
                  <Send size={15} />
                  <span>
                    Open Next Customer ({broadcastCurrentIndex + 1}/{broadcastCustomers.length}:{" "}
                    {broadcastCustomers[broadcastCurrentIndex]?.name || ""})
                  </span>
                </button>
              ) : isBroadcastActive && broadcastCurrentIndex >= broadcastCustomers.length ? (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "#15803d",
                    fontWeight: 700,
                    fontSize: "13px",
                    padding: "8px 14px",
                    background: "#dcfce7",
                    borderRadius: "8px",
                  }}
                >
                  <CheckCircle size={16} />
                  <span>All Customers Opened in WhatsApp!</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleStartBroadcast}
                  disabled={loadingBroadcastCustomers || broadcastCustomers.length === 0}
                  className="admin-btn admin-btn-primary"
                  style={{
                    background: broadcastCustomers.length > 0 ? "#25D366" : "#94a3b8",
                    borderColor: broadcastCustomers.length > 0 ? "#25D366" : "#94a3b8",
                    color: "#ffffff",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 20px",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    borderRadius: "8px",
                    cursor: broadcastCustomers.length > 0 ? "pointer" : "not-allowed",
                    boxShadow: broadcastCustomers.length > 0 ? "0 2px 8px rgba(37, 211, 102, 0.35)" : "none",
                  }}
                >
                  <MessageCircle size={16} />
                  <span>
                    Send Invite to All Customers ({broadcastCustomers.length})
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Bookings;
