"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Calendar, 
  Clock, 
  Bike as BikeIcon, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Layers, 
  ArrowRight, 
  UserCheck, 
  Wrench, 
  RefreshCw,
  Info,
  ChevronRight,
  Filter,
  Wallet,
  Check
} from "lucide-react";
import { useRide } from "@/context/RideContext";
import { CAMPUS_BIKES, Bike } from "@/data/bikes";
import { Booking, CycleMaintenanceInfo } from "@/lib/bookingStore";

export interface CycleSlotAvailability {
  cycleId: string;
  cycleName: string;
  status: "AVAILABLE" | "BOOKED" | "IN_USE" | "MAINTENANCE";
  isMaintenance: boolean;
  isBookedInSlot: boolean;
  bookedSlot?: {
    bookingId: string;
    studentId: string;
    studentName: string;
    startTime: string;
    endTime: string;
    status: string;
  };
}

interface CapacityData {
  totalFleet: number;
  maintenanceCyclesCount: number;
  activeFleetCapacity: number;
  overlappingConfirmedCount: number;
  availableSlots: number;
  isOverbooked: boolean;
  specificBikeBooked: boolean;
  specificBikeMaintenance: boolean;
  cycleAvailability?: Record<string, CycleSlotAvailability>;
}

export const BookingPolicyConsole: React.FC = () => {
  const { currentUser, walletBalance, setIsWalletModalOpen, refreshWallet, setIsAuthModalOpen } = useRide();
  // Active Tab: "book" | "my-bookings" | "admin-portal"
  const [activeTab, setActiveTab] = useState<"book" | "my-bookings" | "admin-portal">("book");

  // Student Identity from active university session
  const studentId = currentUser?.userId || "260691";
  const studentName = currentUser?.name || "Samir Yadav";

  // Form State
  const [bookingDate, setBookingDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("17:00");
  const [endTime, setEndTime] = useState<string>("19:00");
  const [cyclePreference, setCyclePreference] = useState<string>("ANY"); // "ANY" or cycle.id

  // Server & Live Time Data
  const [campusNow, setCampusNow] = useState<{ dateStr: string; timeStr: string; nowMs: number }>({
    dateStr: "",
    timeStr: "",
    nowMs: Date.now(),
  });

  // Capacity & Fleet State
  const [capacity, setCapacity] = useState<CapacityData | null>(null);
  const [fleetList, setFleetList] = useState<CycleMaintenanceInfo[]>([]);
  const [isLoadingCapacity, setIsLoadingCapacity] = useState<boolean>(false);

  // Bookings list state
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(false);

  // Submission feedback
  const [submissionStatus, setSubmissionStatus] = useState<{
    type: "idle" | "submitting" | "success" | "error";
    message: string;
    booking?: Booking;
  }>({ type: "idle", message: "" });

  // Admin action state
  const [adminActionLoading, setAdminActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [activeRejectId, setActiveRejectId] = useState<string | null>(null);
  const [selectedAssignBike, setSelectedAssignBike] = useState<{ [bookingId: string]: string }>({});

  // 1. Fetch initial campus time and fleet
  const fetchCampusInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/fleet");
      const data = await res.json();
      if (data.success) {
        setFleetList(data.fleet);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    setIsLoadingBookings(true);
    try {
      const res = await fetch("/api/bookings");
      const data = await res.json();
      if (data.success) {
        setCampusNow(data.campusNow);
        setAllBookings(data.bookings);
        setMyBookings(
          data.bookings.filter(
            (b: Booking) => b.studentId.toLowerCase() === studentId.toLowerCase()
          )
        );
        if (!bookingDate) {
          setBookingDate(data.campusNow.dateStr);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingBookings(false);
    }
  }, [studentId, bookingDate]);

  useEffect(() => {
    fetchCampusInfo();
    fetchBookings();
  }, [fetchCampusInfo, fetchBookings]);

  // 2. Fetch live capacity whenever date, start, end, or preference changes
  const checkCapacity = useCallback(async () => {
    if (!bookingDate || !startTime || !endTime) return;
    setIsLoadingCapacity(true);
    try {
      const query = new URLSearchParams({
        date: bookingDate,
        startTime,
        endTime,
        cycleId: cyclePreference,
      });
      const res = await fetch(`/api/fleet/capacity?${query.toString()}`);
      const data = await res.json();
      if (data.success && data.capacity) {
        setCapacity(data.capacity);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingCapacity(false);
    }
  }, [bookingDate, startTime, endTime, cyclePreference]);

  useEffect(() => {
    checkCapacity();
  }, [checkCapacity]);

  // Keep shared booking availability live across all user accounts & browser sessions
  useEffect(() => {
    const interval = setInterval(() => {
      checkCapacity();
      fetchBookings();
    }, 3500);

    const handleFocusOrVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        checkCapacity();
        fetchBookings();
      }
    };

    window.addEventListener("focus", handleFocusOrVisibility);
    document.addEventListener("visibilitychange", handleFocusOrVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocusOrVisibility);
      document.removeEventListener("visibilitychange", handleFocusOrVisibility);
    };
  }, [checkCapacity, fetchBookings]);

  // Operating hour slots (5:00 PM to 9:00 PM IST in 30-minute increments)
  const START_TIME_OPTIONS = [
    { value: "17:00", label: "5:00 PM" },
    { value: "17:30", label: "5:30 PM" },
    { value: "18:00", label: "6:00 PM" },
    { value: "18:30", label: "6:30 PM" },
    { value: "19:00", label: "7:00 PM" },
    { value: "19:30", label: "7:30 PM" },
    { value: "20:00", label: "8:00 PM" },
    { value: "20:30", label: "8:30 PM" },
  ];

  const END_TIME_OPTIONS = [
    { value: "17:30", label: "5:30 PM" },
    { value: "18:00", label: "6:00 PM" },
    { value: "18:30", label: "6:30 PM" },
    { value: "19:00", label: "7:00 PM" },
    { value: "19:30", label: "7:30 PM" },
    { value: "20:00", label: "8:00 PM" },
    { value: "20:30", label: "8:30 PM" },
    { value: "21:00", label: "9:00 PM (Latest Return)" },
  ];

  // Helper to apply quick duration gap in minutes
  const handleQuickDuration = (durationMinutes: number) => {
    const [sH, sM] = startTime.split(":").map(Number);
    const startMin = sH * 60 + sM;
    if (durationMinutes === -1) {
      setEndTime("21:00");
    } else {
      const targetEndMin = Math.min(21 * 60, startMin + durationMinutes);
      const eH = Math.floor(targetEndMin / 60);
      const eM = targetEndMin % 60;
      setEndTime(`${eH.toString().padStart(2, "0")}:${eM.toString().padStart(2, "0")}`);
    }
  };

  // Helper to select start time and auto-advance end time if needed
  const handleSelectStartTime = (newStart: string) => {
    setStartTime(newStart);
    const [sH, sM] = newStart.split(":").map(Number);
    const startMin = sH * 60 + sM;
    const [eH, eM] = endTime.split(":").map(Number);
    const endMin = eH * 60 + eM;
    if (endMin <= startMin || (endMin - startMin) % 30 !== 0 || endMin > 21 * 60) {
      const targetEndMin = Math.min(21 * 60, startMin + 60); // default 1 hour gap
      const nH = Math.floor(targetEndMin / 60);
      const nM = targetEndMin % 60;
      setEndTime(`${nH.toString().padStart(2, "0")}:${nM.toString().padStart(2, "0")}`);
    }
  };

  // Calculations: Duration and Price (₹25/hr, 30m gaps, 17:00-21:00 window)
  const calculateDurationAndPrice = () => {
    if (!startTime || !endTime) {
      return { hours: 0, minutes: 0, price: 0, isValid: false, error: "Please select start and return times." };
    }
    const [sH, sM] = startTime.split(":").map(Number);
    const [eH, eM] = endTime.split(":").map(Number);
    const startMinutes = sH * 60 + sM;
    const endMinutes = eH * 60 + eM;

    // Operating hours check: 5:00 PM to 9:00 PM (17:00 – 21:00 IST)
    if (startMinutes < 17 * 60 || endMinutes > 21 * 60) {
      return {
        hours: 0,
        minutes: 0,
        price: 0,
        isValid: false,
        error: "CampusCycle operating hours are 5:00 PM to 9:00 PM (17:00 – 21:00 IST). Cycles must be collected from 5:00 PM and returned by 9:00 PM.",
      };
    }

    if (endMinutes <= startMinutes) {
      return { hours: 0, minutes: 0, price: 0, isValid: false, error: "Return time must be after start time." };
    }

    const totalMinutes = endMinutes - startMinutes;
    if (totalMinutes < 30) {
      return { hours: 0, minutes: totalMinutes, price: 0, isValid: false, error: "Minimum duration gap is 30 minutes." };
    }

    if (totalMinutes % 30 !== 0) {
      return { hours: 0, minutes: totalMinutes, price: 0, isValid: false, error: "Booking duration must be in 30-minute intervals (e.g. 30m, 1h, 1.5h)." };
    }

    const hours = parseFloat((totalMinutes / 60).toFixed(2));
    const price = parseFloat((hours * 25).toFixed(2)); // ₹25/hr
    return { hours, minutes: totalMinutes, price, isValid: true, error: "" };
  };

  const { hours, price, isValid: isDurationValid, error: durationError } = calculateDurationAndPrice();

  // Same-Day 60-Minute Cutoff Calculation
  const isSameDay = bookingDate === campusNow.dateStr;
  const isFutureDate = bookingDate > campusNow.dateStr;

  const calculateCutoff = () => {
    if (!isSameDay || !startTime || !campusNow.nowMs) {
      return { isCutoffPassed: false, minutesRemaining: 999, cutoffTimeStr: "" };
    }
    const [sH, sM] = startTime.split(":").map(Number);
    const [y, m, d] = bookingDate.split("-").map(Number);
    
    // UTC ms for Asia/Kolkata
    const slotMs = Date.UTC(y, m - 1, d, sH, sM, 0) - (5 * 60 + 30) * 60 * 1000;
    const diffMinutes = (slotMs - campusNow.nowMs) / (60 * 1000);
    
    // Cutoff timestamp is 60 minutes before start time
    const cutoffH = (sH - 1 + 24) % 24;
    const cutoffTimeStr = `${cutoffH.toString().padStart(2, "0")}:${sM.toString().padStart(2, "0")}`;

    return {
      isCutoffPassed: diffMinutes < 60,
      minutesRemaining: Math.round(diffMinutes),
      cutoffTimeStr,
    };
  };

  const { isCutoffPassed, minutesRemaining, cutoffTimeStr } = calculateCutoff();

  // Computed Bicycle Availability Helpers for Selected Slot
  const selectedCycleSlot = cyclePreference !== "ANY" ? capacity?.cycleAvailability?.[cyclePreference] : null;
  const isSelectedCycleBooked = Boolean(
    (cyclePreference !== "ANY" && capacity?.specificBikeBooked) ||
    (selectedCycleSlot && (selectedCycleSlot.status === "BOOKED" || selectedCycleSlot.isBookedInSlot))
  );
  const isSelectedCycleMaintenance = Boolean(
    (cyclePreference !== "ANY" && capacity?.specificBikeMaintenance) ||
    (selectedCycleSlot && (selectedCycleSlot.isMaintenance || selectedCycleSlot.status === "MAINTENANCE"))
  );

  // Handle Form Submission
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDurationValid) {
      setSubmissionStatus({ type: "error", message: durationError });
      return;
    }

    if (isSameDay && isCutoffPassed) {
      setSubmissionStatus({
        type: "error",
        message: `Cutoff rule violated: Same-day booking must be created at least 60 minutes before start time. For a ${startTime} ride, booking closed at ${cutoffTimeStr}.`,
      });
      return;
    }

    if (isSelectedCycleBooked) {
      setSubmissionStatus({
        type: "error",
        message: "This bicycle is already booked for the selected time. Please choose another bicycle or time.",
      });
      await checkCapacity();
      return;
    }

    setSubmissionStatus({ type: "submitting", message: "Verifying live availability and locking reservation..." });

    try {
      // Re-validate availability on click before submission to guarantee fresh check
      if (cyclePreference !== "ANY") {
        const query = new URLSearchParams({
          date: bookingDate,
          startTime,
          endTime,
          cycleId: cyclePreference,
        });
        const freshRes = await fetch(`/api/fleet/capacity?${query.toString()}`);
        const freshData = await freshRes.json();
        if (freshData.success && freshData.capacity) {
          setCapacity(freshData.capacity);
          if (freshData.capacity.specificBikeBooked || freshData.capacity.cycleAvailability?.[cyclePreference]?.status === "BOOKED") {
            setSubmissionStatus({
              type: "error",
              message: "This bicycle is already booked for the selected time. Please choose another bicycle or time.",
            });
            await fetchBookings();
            return;
          }
        }
      }

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          studentName,
          date: bookingDate,
          startTime,
          endTime,
          cyclePreference,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Refresh availability immediately on failure
        await checkCapacity();
        await fetchBookings();
        setSubmissionStatus({
          type: "error",
          message: data.error || "This bicycle is already booked for the selected time. Please choose another bicycle or time.",
        });
        return;
      }

      setSubmissionStatus({
        type: "success",
        message: data.message,
        booking: data.booking,
      });

      // Refresh data
      await fetchBookings();
      await checkCapacity();
    } catch (err: unknown) {
      await checkCapacity();
      setSubmissionStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Network error during booking submission.",
      });
    }
  };

  // Admin Actions
  const handleApprove = async (bookingId: string) => {
    setAdminActionLoading(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "admin",
        },
        body: JSON.stringify({
          reviewerName: "Admin Aryan (Office of Student Mobility)",
          notes: "Approved based on available fleet capacity.",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Approval failed");
      } else {
        await fetchBookings();
        await checkCapacity();
      }
    } finally {
      setAdminActionLoading(null);
    }
  };

  const handleReject = async (bookingId: string) => {
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejecting the booking request.");
      return;
    }
    setAdminActionLoading(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "admin",
        },
        body: JSON.stringify({
          reviewerName: "Admin Aryan (Office of Student Mobility)",
          reason: rejectReason,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Rejection failed");
      } else {
        setActiveRejectId(null);
        setRejectReason("");
        await fetchBookings();
        await checkCapacity();
      }
    } finally {
      setAdminActionLoading(null);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking/request?")) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to cancel");
      } else {
        await fetchBookings();
        await checkCapacity();
      }
    } catch {
      alert("Network error while canceling booking");
    }
  };

  const handleAssignCycle = async (bookingId: string) => {
    const cycleId = selectedAssignBike[bookingId];
    if (!cycleId) {
      alert("Please select a physical cycle from the stand to assign.");
      return;
    }
    setAdminActionLoading(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "volunteer",
        },
        body: JSON.stringify({
          cycleId,
          volunteerName: "Volunteer Aryan K.",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to assign cycle");
      } else {
        await fetchBookings();
      }
    } finally {
      setAdminActionLoading(null);
    }
  };

  const handleToggleMaintenance = async (cycleId: string, currentMaintenance: boolean) => {
    try {
      const res = await fetch("/api/fleet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "admin",
        },
        body: JSON.stringify({
          cycleId,
          isMaintenance: !currentMaintenance,
          reason: !currentMaintenance ? "Safety inspection & hydraulic brake check" : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to toggle maintenance");
      } else {
        await fetchCampusInfo();
        await checkCapacity();
      }
    } catch {
      alert("Error updating maintenance status");
    }
  };

  // Pending future requests for admin portal
  const pendingRequests = allBookings.filter((b) => b.status === "PENDING_APPROVAL");

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-elevated space-y-6">
      {/* Policy Header & Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#006699]/10 text-[#006699] border border-[#006699]/20 uppercase tracking-wider">
              OFFICIAL CAMPUS POLICY
            </span>
            <span className="text-xs text-slate-500 font-mono">
              TZ: {campusNow.dateStr} {campusNow.timeStr} IST
            </span>
          </div>
          <h2 className="font-space text-2xl font-extrabold text-slate-900 mt-1">
            CampusCycle Booking & Reservation System
          </h2>
          <p className="text-xs text-slate-500">
            5:00 PM – 9:00 PM Operating Hours • Strict 60-min cutoff • All rides approval-based • Flat ₹25/hr
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab("book")}
            className={`px-3.5 py-2 rounded-lg transition ${
              activeTab === "book" 
                ? "bg-white text-slate-900 shadow-sm" 
                : "hover:text-slate-900"
            }`}
          >
            Reserve Slot
          </button>
          <button
            onClick={() => setActiveTab("my-bookings")}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === "my-bookings" 
                ? "bg-white text-slate-900 shadow-sm" 
                : "hover:text-slate-900"
            }`}
          >
            <span>My Bookings</span>
            {myBookings.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#006699] text-white text-[10px] flex items-center justify-center font-bold">
                {myBookings.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("admin-portal")}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === "admin-portal" 
                ? "bg-[#006699] text-white shadow-sm" 
                : "hover:text-slate-900 text-slate-700"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Admin Portal</span>
            {pendingRequests.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[10px] flex items-center justify-center font-bold">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: BOOKING FORM */}
      {activeTab === "book" && (
        <form onSubmit={handleBookingSubmit} className="space-y-6">
          {/* Policy Summary Ribbon */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-100 flex items-start gap-3">
              <Clock className="w-5 h-5 text-[#006699] shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">Same-Day 60m Cutoff</span>
                <span className="text-slate-600">
                  Bookings must be placed at least 60 min before start (e.g. 5 PM ride closes at 4 PM).
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3">
              <Calendar className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">All Rides Require Approval</span>
                <span className="text-slate-600">
                  Whether for today or tomorrow, ride requests must be approved by the admin before dock unlock.
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">Flat ₹25.00 / Hour</span>
                <span className="text-slate-600">
                  Fixed duration rate (₹12.50 per 30 mins). Zero distance fees. Subsidized campus transit.
                </span>
              </div>
            </div>
          </div>

          {/* Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left 8 Cols: Input Controls */}
            <div className="md:col-span-8 space-y-5">
              {/* Row 1: Date & Time Picker */}
              <div className="space-y-4">
                {/* Booking Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#006699]" />
                    <span>Booking Date</span>
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      type="date"
                      min={campusNow.dateStr}
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#006699] focus:outline-none w-full sm:w-auto"
                      required
                    />
                    <div className="text-[11px] font-semibold flex items-center gap-2">
                      {isSameDay && (
                        <span className="text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          Today (Requires Admin Approval)
                        </span>
                      )}
                      {isFutureDate && (
                        <span className="text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          Tomorrow / Future (Requires Admin Approval)
                        </span>
                      )}
                      <span className="text-slate-500 text-[11px] font-medium">
                        Operating Hours: <strong className="text-slate-800">5:00 PM – 9:00 PM IST</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Start Time Section with Interactive Buttons */}
                <div className="space-y-2 p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#1E5631]" />
                      <span>1. Select Start Time (From 5:00 PM)</span>
                    </label>
                    <span className="text-[11px] font-bold text-[#1E5631] font-space bg-[#1E5631]/10 px-2 py-0.5 rounded">
                      Selected: {startTime} ({START_TIME_OPTIONS.find(o => o.value === startTime)?.label || startTime})
                    </span>
                  </div>

                  {/* Start Time Slot Buttons Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {START_TIME_OPTIONS.map((slot) => {
                      const isSelected = startTime === slot.value;
                      return (
                        <button
                          key={slot.value}
                          type="button"
                          onClick={() => handleSelectStartTime(slot.value)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 border ${
                            isSelected
                              ? "bg-[#1E5631] text-white border-[#1E5631] shadow-md ring-2 ring-[#1E5631]/30"
                              : "bg-white hover:bg-slate-100 text-slate-800 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <span className="font-space font-extrabold text-sm">{slot.label}</span>
                          <span className={`text-[10px] font-mono ${isSelected ? "text-amber-300" : "text-slate-400"}`}>
                            {slot.value} IST
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Duration Gap Shortcut Buttons */}
                <div className="space-y-1.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>2. Quick Duration Gap (30-Min Increments)</span>
                    </span>
                    <span className="text-[10px] text-amber-700 font-semibold">
                      Must return by 9:00 PM
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                    {[
                      { label: "30 Min", mins: 30, price: "₹12.50" },
                      { label: "1 Hour", mins: 60, price: "₹25.00" },
                      { label: "1.5 Hours", mins: 90, price: "₹37.50" },
                      { label: "2 Hours", mins: 120, price: "₹50.00" },
                      { label: "Until 9:00 PM", mins: -1, price: "Max" },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => handleQuickDuration(btn.mins)}
                        className="py-1.5 px-2 rounded-lg bg-white hover:bg-amber-100 text-slate-800 hover:text-amber-950 font-bold text-xs border border-amber-200/70 transition flex flex-col items-center shadow-2xs active:scale-95"
                      >
                        <span className="text-[11px]">{btn.label}</span>
                        <span className="text-[10px] text-[#1E5631] font-mono font-bold">{btn.price}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Return Time Section with Interactive Buttons */}
                <div className="space-y-2 p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#006699]" />
                      <span>3. Select Expected Return Time (Latest by 9:00 PM)</span>
                    </label>
                    <span className="text-[11px] font-bold text-[#006699] font-space bg-[#006699]/10 px-2 py-0.5 rounded">
                      Return: {endTime} ({END_TIME_OPTIONS.find(o => o.value === endTime)?.label || endTime})
                    </span>
                  </div>

                  {/* Return Time Slot Buttons Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {END_TIME_OPTIONS.map((slot) => {
                      const isSelected = endTime === slot.value;
                      const [eH, eM] = slot.value.split(":").map(Number);
                      const [sH, sM] = startTime.split(":").map(Number);
                      const isPastStart = (eH * 60 + eM) > (sH * 60 + sM);
                      const is30mMultiple = isPastStart && ((eH * 60 + eM) - (sH * 60 + sM)) >= 30 && ((eH * 60 + eM) - (sH * 60 + sM)) % 30 === 0;
                      const isDisabled = !isPastStart || !is30mMultiple;

                      return (
                        <button
                          key={slot.value}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => setEndTime(slot.value)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 border ${
                            isDisabled
                              ? "bg-slate-100 text-slate-300 border-slate-200 opacity-40 cursor-not-allowed"
                              : isSelected
                              ? "bg-[#006699] text-white border-[#006699] shadow-md ring-2 ring-[#006699]/30"
                              : "bg-white hover:bg-slate-100 text-slate-800 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <span className="font-space font-extrabold text-sm">{slot.label}</span>
                          <span className={`text-[10px] font-mono ${isSelected ? "text-amber-300" : "text-slate-400"}`}>
                            {slot.value === "21:00" ? "Campus Deadline" : `${slot.value} IST`}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Manual Fine-Tuning Fallback Inputs */}
                  <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                    <span>Manual clock fine-tune (30m step):</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        min="17:00"
                        max="20:30"
                        step="1800"
                        value={startTime}
                        onChange={(e) => handleSelectStartTime(e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-mono font-bold text-slate-800"
                      />
                      <span>to</span>
                      <input
                        type="time"
                        min="17:30"
                        max="21:00"
                        step="1800"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-mono font-bold text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 60-Minute Cutoff Feedback Alert (Only for same-day) */}
              {isSameDay && (
                <div className={`p-4 rounded-2xl border text-xs transition-all ${
                  isCutoffPassed 
                    ? "bg-red-50 border-red-200 text-red-900" 
                    : "bg-emerald-50 border-emerald-200 text-emerald-900"
                }`}>
                  <div className="flex items-start gap-2.5">
                    {isCutoffPassed ? (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5 flex-1">
                      <div className="font-bold">
                        {isCutoffPassed ? "Same-Day Booking Cutoff Exceeded" : "Within Allowed Booking Window"}
                      </div>
                      <p className="text-slate-600">
                        {isCutoffPassed ? (
                          <>
                            Booking cutoff for a <strong>{startTime}</strong> start passed at <strong>{cutoffTimeStr}</strong> (60 minutes prior). Current campus time is <strong>{campusNow.timeStr}</strong>. Please choose a later start time.
                          </>
                        ) : (
                          <>
                            Slot start: <strong>{startTime}</strong>. Booking window closes at <strong>{cutoffTimeStr}</strong> ({minutesRemaining} mins remaining).
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Future Date Review Alert */}
              {isFutureDate && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <div className="flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block">Future Date Protocol Active</strong>
                      <span>
                        Submitting this form creates a <strong>Pending Approval Request</strong>. A volunteer or fleet administrator will review fleet capacity before confirming.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Cycle Assignment / Allocation Preference */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <BikeIcon className="w-3.5 h-3.5 text-[#006699]" />
                    <span>Cycle Allocation Preference</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Fleet capacity: {capacity ? `${capacity.availableSlots} of ${capacity.activeFleetCapacity} slots free` : "Checking..."}
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Any Available (Recommended) */}
                  <label className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                    cyclePreference === "ANY" 
                      ? "bg-sky-50 border-[#006699] ring-2 ring-[#006699]/20" 
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}>
                    <input
                      type="radio"
                      name="cyclePreference"
                      value="ANY"
                      checked={cyclePreference === "ANY"}
                      onChange={() => setCyclePreference("ANY")}
                      className="mt-1 text-[#006699] focus:ring-[#006699]"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                        <span>Any Available Cycle</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 font-bold uppercase">
                          Recommended
                        </span>
                      </span>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Guarantees a reserved slot. Authorized volunteer assigns any suitable bike from the stand at pickup.
                      </p>
                    </div>
                  </label>

                  {/* Option 2..N: Specific Cycles */}
                  {fleetList.map((bike) => {
                    const bikeSlotInfo = capacity?.cycleAvailability?.[bike.id];
                    const isMaint = bike.isMaintenance || bikeSlotInfo?.isMaintenance || bikeSlotInfo?.status === "MAINTENANCE";
                    const isBooked = Boolean(bikeSlotInfo?.status === "BOOKED" || bikeSlotInfo?.isBookedInSlot);
                    const isInUse = bikeSlotInfo?.status === "IN_USE";
                    const isDisabled = isMaint || isBooked || isInUse;

                    let statusBadge = (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 font-bold uppercase">
                        Available
                      </span>
                    );

                    if (isMaint) {
                      statusBadge = (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-100 text-amber-800 font-bold uppercase">
                          Maintenance
                        </span>
                      );
                    } else if (isBooked) {
                      const slotText = bikeSlotInfo?.bookedSlot 
                        ? `${bikeSlotInfo.bookedSlot.startTime}–${bikeSlotInfo.bookedSlot.endTime}`
                        : `${startTime}–${endTime}`;
                      statusBadge = (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-red-100 text-red-800 font-bold uppercase">
                          Booked ({slotText})
                        </span>
                      );
                    } else if (isInUse) {
                      statusBadge = (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-sky-100 text-sky-800 font-bold uppercase">
                          In Use
                        </span>
                      );
                    }

                    return (
                      <label
                        key={bike.id}
                        className={`p-3.5 rounded-2xl border transition flex items-start gap-3 ${
                          isDisabled
                            ? "bg-slate-100/80 border-slate-200 opacity-60 cursor-not-allowed"
                            : cyclePreference === bike.id
                            ? "bg-sky-50 border-[#006699] ring-2 ring-[#006699]/20 cursor-pointer"
                            : "bg-white border-slate-200 hover:border-slate-300 cursor-pointer"
                        }`}
                      >
                        <input
                          type="radio"
                          name="cyclePreference"
                          value={bike.id}
                          disabled={isDisabled}
                          checked={cyclePreference === bike.id}
                          onChange={() => {
                            if (!isDisabled) setCyclePreference(bike.id);
                          }}
                          className="mt-1 text-[#006699] focus:ring-[#006699]"
                        />
                        <div className="text-xs flex-1">
                          <div className="flex items-center gap-1.5 justify-between">
                            <span className="font-bold text-slate-900">{bike.name}</span>
                            {statusBadge}
                          </div>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            {isMaint 
                              ? (bike.maintenanceReason || "Safety inspection & maintenance") 
                              : isBooked
                              ? "Already booked for selected time. Select another cycle or time slot."
                              : isInUse
                              ? "Currently in active campus transit."
                              : `Dock ${bike.dockNumber} • Model: ${bike.modelCode}`}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Specific Bicycle Booking Conflict Alert */}
                {isSelectedCycleBooked && (
                  <div className="p-3.5 rounded-2xl bg-red-50 border border-red-300 text-red-900 text-xs flex items-start gap-2.5 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Bicycle Unavailable for Selected Slot:</strong>
                      <p className="text-slate-700 mt-0.5">
                        This bicycle is already booked for the selected time. Please choose another bicycle or time.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right 4 Cols: Real-Time Fare & Capacity Summary */}
            <div className="md:col-span-4 space-y-4">
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                <h3 className="font-space font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">
                  Booking Tariff & Interval Capacity
                </h3>

                {/* Duration & Hourly Price */}
                <div className="space-y-2 text-xs divide-y divide-slate-200">
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500">Selected Interval</span>
                    <span className="font-bold text-slate-900">{startTime} – {endTime}</span>
                  </div>
                  <div className="flex justify-between pt-1.5">
                    <span className="text-slate-500">Calculated Duration</span>
                    <span className="font-bold text-slate-900">{hours} Hours ({Math.round(hours * 60)} mins)</span>
                  </div>
                  <div className="flex justify-between pt-1.5">
                    <span className="text-slate-500">Hourly Base Tariff</span>
                    <span className="font-bold text-slate-900">₹25.00 / hr</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 text-sm">
                    <span className="font-bold text-slate-900">Total Price</span>
                    <span className="font-space font-extrabold text-2xl text-[#1E5631]">
                      ₹{price.toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-2 text-[10px] text-slate-500 leading-tight">
                    • Minimum 30-min duration gap (₹12.50)<br/>
                    • Operating hours: 5:00 PM – 9:00 PM IST<br/>
                    • Must return cycle to dock by 9:00 PM
                  </div>
                </div>

                {/* Fleet Capacity Status */}
                {capacity && (
                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700">Fleet Availability:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        capacity.isOverbooked 
                          ? "bg-red-100 text-red-800" 
                          : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {capacity.isOverbooked ? "FULL (0 Available)" : `${capacity.availableSlots} Available`}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          capacity.isOverbooked ? "bg-red-500" : "bg-emerald-500"
                        }`}
                        style={{
                          width: `${Math.min(100, (capacity.overlappingConfirmedCount / Math.max(1, capacity.activeFleetCapacity)) * 100)}%`
                        }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>{capacity.overlappingConfirmedCount} reserved</span>
                      <span>Cap: {capacity.activeFleetCapacity} active ({capacity.maintenanceCyclesCount} in maint.)</span>
                    </div>
                  </div>
                )}

                {/* Student Credentials */}
                <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{studentName} ({studentId})</span>
                  </div>
                  <span className="text-emerald-700 font-bold">Pass Active</span>
                </div>

                {/* Wallet Balance & Required Amount Check */}
                <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                      <Wallet className="w-3.5 h-3.5 text-[#006699]" />
                      <span>Campus Wallet</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-space font-bold text-slate-900">
                        ₹{walletBalance.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsWalletModalOpen(true)}
                        className="text-[10px] text-[#006699] font-bold hover:underline"
                      >
                        +Top-Up
                      </button>
                    </div>
                  </div>

                  {isSameDay && walletBalance < price ? (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-1.5">
                      <div className="flex justify-between items-center text-[11px] font-bold">
                        <span>Insufficient Wallet Balance</span>
                        <span className="font-mono">Shortfall: ₹{(price - walletBalance).toFixed(2)}</span>
                      </div>
                      <p className="text-[10px] text-slate-600">
                        Required: <strong>₹{price.toFixed(2)}</strong>, Available: <strong>₹{walletBalance.toFixed(2)}</strong>.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsWalletModalOpen(true)}
                        className="w-full py-1.5 px-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] transition shadow-xs"
                      >
                        + Add Money to Wallet
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-lg">
                      <span>Wallet Balance Verified</span>
                      <span>Sufficient funds</span>
                    </div>
                  )}
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={
                    !isDurationValid || 
                    (isSameDay && isCutoffPassed) || 
                    (isSameDay && walletBalance < price) ||
                    (capacity?.isOverbooked ?? false) ||
                    isSelectedCycleBooked ||
                    isSelectedCycleMaintenance ||
                    submissionStatus.type === "submitting"
                  }
                  className="w-full py-3.5 px-4 rounded-xl bg-[#006699] hover:bg-[#005580] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-space font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 active:scale-95"
                >
                  {submissionStatus.type === "submitting" ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                      <span>Verifying Policy & Reserving...</span>
                    </>
                  ) : isSelectedCycleBooked ? (
                    <span>Bicycle Booked — Select Another Cycle</span>
                  ) : isSelectedCycleMaintenance ? (
                    <span>Cycle in Maintenance — Select Another</span>
                  ) : isSameDay && walletBalance < price ? (
                    <span>Insufficient Balance — Top-Up Required</span>
                  ) : (
                    <>
                      <span>Submit Ride Request for Approval (₹{price.toFixed(2)})</span>
                      <ArrowRight className="w-4 h-4 text-amber-300" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Submission Feedback Messages */}
          {submissionStatus.type === "success" && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{submissionStatus.message}</span>
              </div>
              {submissionStatus.booking && (
                <div className="bg-white/80 p-3 rounded-xl border border-emerald-200 text-slate-700 flex flex-wrap gap-4 justify-between items-center">
                  <div>
                    <span className="font-mono font-bold text-[#006699] text-xs">
                      {submissionStatus.booking.id}
                    </span>
                    <span className="text-slate-500 block text-[11px]">
                      {submissionStatus.booking.date} • {submissionStatus.booking.startTime} - {submissionStatus.booking.endTime} ({submissionStatus.booking.durationHours} hrs)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      submissionStatus.booking.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      Status: {submissionStatus.booking.status.replace("_", " ")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab("my-bookings")}
                      className="px-3 py-1 rounded-lg bg-[#006699] text-white font-bold text-xs"
                    >
                      View in My Bookings
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {submissionStatus.type === "error" && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-300 text-red-900 text-xs flex items-start gap-2.5 animate-in fade-in">
              <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Booking Policy Violation:</strong>
                <p className="text-slate-700 mt-0.5">{submissionStatus.message}</p>
              </div>
            </div>
          )}
        </form>
      )}

      {/* TAB 2: MY BOOKINGS & REQUESTS */}
      {activeTab === "my-bookings" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-space font-bold text-base text-slate-900">
                My Bookings & Pending Requests
              </h3>
              <p className="text-xs text-slate-500">
                Logged in as {studentName} ({studentId})
              </p>
            </div>
            <button
              onClick={fetchBookings}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Refresh</span>
            </button>
          </div>

          {myBookings.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-slate-500 space-y-2">
              <BikeIcon className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold">No bookings found for this student.</p>
              <button
                onClick={() => setActiveTab("book")}
                className="px-4 py-2 rounded-xl bg-[#006699] text-white text-xs font-bold"
              >
                Create a Slot Reservation
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#006699]">
                        {b.id}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : b.status === "PENDING_APPROVAL"
                          ? "bg-amber-100 text-amber-800"
                          : b.status === "REJECTED"
                          ? "bg-red-100 text-red-800"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {b.status.replace("_", " ")}
                      </span>
                      {b.isSameDay && (
                        <span className="text-[10px] bg-sky-50 text-sky-800 font-semibold px-1.5 py-0.2 rounded">
                          Same-Day
                        </span>
                      )}
                    </div>

                    <div className="font-space font-bold text-sm text-slate-900">
                      {b.date} • {b.startTime} to {b.endTime} ({b.durationHours} hrs)
                    </div>

                    <div className="text-xs text-slate-500">
                      Cycle: <strong>{b.assignedBikeName || b.cycleName}</strong> • Tariff: ₹{b.totalPrice.toFixed(2)} (@ ₹25/hr)
                    </div>

                    {b.status === "PENDING_APPROVAL" && (
                      <div className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200 flex items-center gap-1.5 mt-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Awaiting admin review. You must wait until the admin approves this ride request before dock unlock.</span>
                      </div>
                    )}
                    {b.status === "APPROVED" && (
                      <div className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5 mt-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Approved by administrator. Ready for dock unlock!</span>
                      </div>
                    )}

                    {b.rejectionReason && (
                      <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                        Reason for rejection: {b.rejectionReason}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {b.status !== "CANCELLED" && b.status !== "REJECTED" && (
                      <button
                        onClick={() => handleCancelBooking(b.id)}
                        className="px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-700 text-xs font-semibold transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ADMIN / VOLUNTEER APPROVAL PORTAL */}
      {activeTab === "admin-portal" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-[#006699]" />
                <span>Authorized Volunteer & Admin Dashboard</span>
              </span>
              <p className="text-slate-600">
                Review all ride requests (for today or future dates), evaluate fleet capacity, assign physical bikes from stands at pickup, and manage fleet maintenance.
              </p>
            </div>
            <button
              onClick={() => {
                fetchBookings();
                fetchCampusInfo();
              }}
              className="px-3 py-1.5 rounded-lg bg-white border border-sky-300 text-slate-700 font-bold hover:bg-sky-100 flex items-center gap-1.5 transition shrink-0"
            >
              <RefreshCw className="w-3 h-3 text-[#006699]" />
              <span>Refresh Queue</span>
            </button>
          </div>

          {/* Pending Approval Requests Section */}
          <div className="space-y-3">
            <h3 className="font-space font-bold text-base text-slate-900 flex items-center gap-2">
              <span>Ride Requests Pending Admin Approval</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                {pendingRequests.length} Pending
              </span>
            </h3>

            {pendingRequests.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                No ride requests currently pending approval.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-5 rounded-2xl border-2 border-amber-200 bg-amber-50/40 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-[#006699]">
                            {req.id}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold text-[10px]">
                            NEEDS REVIEW
                          </span>
                        </div>
                        <span className="text-xs text-slate-600">
                          Requested by: <strong>{req.studentName}</strong> ({req.studentId})
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-space font-bold text-base text-slate-900">
                          {req.date} ({req.startTime} – {req.endTime})
                        </span>
                        <span className="text-xs text-slate-500 block">
                          Duration: {req.durationHours} hrs • ₹{req.totalPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="text-slate-500">Requested Cycle: </span>
                        <strong>{req.cycleName}</strong>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={adminActionLoading === req.id}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1 shadow-sm active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Request</span>
                        </button>

                        <button
                          onClick={() => setActiveRejectId(req.id)}
                          disabled={adminActionLoading === req.id}
                          className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition flex items-center gap-1 shadow-sm active:scale-95"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>

                    {/* Rejection reason inline form */}
                    {activeRejectId === req.id && (
                      <div className="p-3 rounded-xl bg-white border border-red-200 space-y-2 animate-in fade-in">
                        <label className="text-xs font-bold text-red-900 block">
                          Reason for Rejection:
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Fleet capacity allocation limit reached for this slot"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-red-300 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setActiveRejectId(null)}
                            className="px-3 py-1 rounded-lg text-xs text-slate-600 hover:bg-slate-100"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold"
                          >
                            Confirm Rejection
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stand Pickup Cycle Assignment Section */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h3 className="font-space font-bold text-base text-slate-900 flex items-center gap-2">
              <BikeIcon className="w-4 h-4 text-[#006699]" />
              <span>Stand Pickup Cycle Assignment</span>
            </h3>
            <p className="text-xs text-slate-500">
              When a student arrives at the dock with an Approved &apos;Any Available Cycle&apos; reservation, assign a physical bike from the stand.
            </p>

            <div className="space-y-2">
              {allBookings.filter((b) => b.status === "APPROVED" && (!b.assignedBikeId || b.assignedBikeId === "ANY")).length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border text-center text-xs text-slate-500">
                  No approved unassigned reservations at present.
                </div>
              ) : (
                allBookings
                  .filter((b) => b.status === "APPROVED" && (!b.assignedBikeId || b.assignedBikeId === "ANY"))
                  .map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          {b.id} • {b.studentName} ({b.studentId})
                        </div>
                        <span className="text-slate-500 text-[11px]">
                          {b.date} • {b.startTime} - {b.endTime}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={selectedAssignBike[b.id] || ""}
                          onChange={(e) =>
                            setSelectedAssignBike({ ...selectedAssignBike, [b.id]: e.target.value })
                          }
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-slate-50 text-slate-900"
                        >
                          <option value="">Select Physical Bike at Stand...</option>
                          {fleetList
                            .filter((c) => !c.isMaintenance)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.dockNumber})
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={() => handleAssignCycle(b.id)}
                          disabled={!selectedAssignBike[b.id]}
                          className="px-3 py-1.5 rounded-lg bg-[#006699] disabled:bg-slate-300 text-white font-bold text-xs transition"
                        >
                          Assign Cycle
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Fleet Maintenance Status Manager */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h3 className="font-space font-bold text-base text-slate-900 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-600" />
              <span>Fleet Maintenance & Service Controls</span>
            </h3>
            <p className="text-xs text-slate-500">
              Cycles under maintenance cannot be booked by students and are automatically excluded from active fleet capacity.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fleetList.map((bike) => (
                <div
                  key={bike.id}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900">{bike.name}</div>
                    <div className="text-[11px] text-slate-500">
                      Dock: {bike.dockNumber} • Model: {bike.modelCode}
                    </div>
                    {bike.isMaintenance && (
                      <span className="text-[10px] text-red-600 font-semibold block mt-0.5">
                        {bike.maintenanceReason}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleToggleMaintenance(bike.id, bike.isMaintenance)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                      bike.isMaintenance
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-amber-500 hover:bg-amber-600 text-white"
                    }`}
                  >
                    {bike.isMaintenance ? "Clear Maintenance" : "Set Maintenance"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
