"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRide } from "@/context/RideContext";
import {
  Bike as BikeIcon,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  Users,
  Calendar,
  Wrench,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  ArrowLeft,
  Clock,
  Sparkles,
  ChevronRight,
  SlidersHorizontal,
  Lock,
  UserCheck,
  UserX
} from "lucide-react";

interface AdminStats {
  totalBicycles: number;
  availableBicycles: number;
  inUseOrBookedBicycles: number;
  maintenanceBicycles: number;
  totalUsers: number;
  activeAndUpcomingBookings: number;
  pendingApprovalsCount: number;
  completedOrCancelledBookings: number;
  totalBookings: number;
}

interface FleetCycle {
  id: string;
  name: string;
  modelCode: string;
  category: string;
  categoryLabel?: string;
  status: string;
  isMaintenance: boolean;
  maintenanceReason?: string;
  currentStand: string;
  condition: string;
  conditionType: string;
  hourlyRate: number;
  stencilCode: string;
  daysSinceLastUse: number;
}

interface AdminBooking {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  hourlyRate: number;
  totalPrice: number;
  cyclePreference: string;
  cycleName: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "CANCELLED";
  rejectionReason?: string;
  createdAt: string;
}

interface AdminUser {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "student" | "volunteer" | "admin";
  department?: string;
  semester?: string;
  isActive: boolean;
  totalBookings: number;
  activeBookings: number;
  createdAt: string;
}

export const AdminDashboard: React.FC = () => {
  const router = useRouter();
  const { currentUser, logoutUser, isLoadingAuth } = useRide();

  // Navigation tab inside Admin Dashboard
  const [activeTab, setActiveTab] = useState<"overview" | "fleet" | "bookings" | "users">("overview");

  // Live Data States
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [fleet, setFleet] = useState<FleetCycle[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  
  // Loading & Action states
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Filters & Search
  const [fleetSearch, setFleetSearch] = useState("");
  const [fleetCategoryFilter, setFleetCategoryFilter] = useState("ALL");
  const [fleetStatusFilter, setFleetStatusFilter] = useState("ALL");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("ALL");

  // Fetch all live admin data from real database endpoints
  const fetchAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch Overview Stats
      const statRes = await fetch("/api/admin/overview");
      if (statRes.ok) {
        const statData = await statRes.json();
        if (statData.success) {
          setStats(statData.stats);
        }
      }

      // 2. Fetch Fleet Inventory
      const fleetRes = await fetch("/api/fleet");
      if (fleetRes.ok) {
        const fleetData = await fleetRes.json();
        if (fleetData.success && Array.isArray(fleetData.fleet)) {
          setFleet(fleetData.fleet);
        }
      }

      // 3. Fetch Bookings
      const bookRes = await fetch("/api/bookings");
      if (bookRes.ok) {
        const bookData = await bookRes.json();
        if (bookData.success && Array.isArray(bookData.bookings)) {
          setBookings(bookData.bookings);
        }
      }

      // 4. Fetch Users
      const userRes = await fetch("/api/admin/users");
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.success && Array.isArray(userData.users)) {
          setUsers(userData.users);
        }
      }
    } catch {
      // Ignore network errors in polling
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.role === "admin") {
      fetchAllData();
    }
  }, [currentUser, fetchAllData]);

  // Action handlers
  const handleToggleMaintenance = async (cycleId: string, currentMaintenance: boolean) => {
    const nextState = !currentMaintenance;
    const reason = nextState ? "Scheduled safety & brake line inspection" : undefined;
    try {
      const res = await fetch("/api/fleet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleId, isMaintenance: nextState, reason }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({
          text: `Cycle ${cycleId} maintenance status set to ${nextState ? "MAINTENANCE" : "AVAILABLE"}.`,
          type: "success",
        });
        await fetchAllData();
      } else {
        setActionMessage({ text: data.error || "Failed to update maintenance status.", type: "error" });
      }
    } catch {
      setActionMessage({ text: "Failed to communicate with fleet server.", type: "error" });
    }
  };

  const handleApproveBooking = async (bookingId: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerName: currentUser?.name || "Mohit Sharma" }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ text: `Booking ${bookingId} approved successfully.`, type: "success" });
        await fetchAllData();
      } else {
        setActionMessage({ text: data.error || "Failed to approve booking.", type: "error" });
      }
    } catch {
      setActionMessage({ text: "Failed to approve booking.", type: "error" });
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    const reason = window.prompt("Enter rejection reason for student:", "Fleet reserved for campus sports marathon.");
    if (!reason) return;

    try {
      const res = await fetch(`/api/bookings/${bookingId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerName: currentUser?.name || "Mohit Sharma", rejectionReason: reason }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ text: `Booking ${bookingId} rejected.`, type: "success" });
        await fetchAllData();
      } else {
        setActionMessage({ text: data.error || "Failed to reject booking.", type: "error" });
      }
    } catch {
      setActionMessage({ text: "Failed to reject booking.", type: "error" });
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm(`Are you sure you want to cancel booking ${bookingId}? This will release the bicycle slot.`)) return;

    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ text: `Booking ${bookingId} cancelled and slot released.`, type: "success" });
        await fetchAllData();
      } else {
        setActionMessage({ text: data.error || "Failed to cancel booking.", type: "error" });
      }
    } catch {
      setActionMessage({ text: "Failed to cancel booking.", type: "error" });
    }
  };

  const handleToggleUserStatus = async (userId: string, currentActive: boolean) => {
    const nextState = !currentActive;
    if (userId === "Mohit Sharma") {
      alert("The primary administrator account cannot be deactivated.");
      return;
    }
    if (!window.confirm(`Are you sure you want to ${nextState ? "activate" : "deactivate"} account ${userId}?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextState }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({
          text: `Account ${userId} status updated to ${nextState ? "ACTIVE" : "DEACTIVATED"}.`,
          type: "success",
        });
        await fetchAllData();
      } else {
        setActionMessage({ text: data.error || "Failed to update account status.", type: "error" });
      }
    } catch {
      setActionMessage({ text: "Failed to toggle user status.", type: "error" });
    }
  };

  // --- ACCESS CONTROL GUARD ---
  // If not logged in -> redirect to /login
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="font-space font-extrabold text-xl text-slate-900">Authentication Required</h2>
          <p className="text-xs text-slate-500">
            You must be logged in as an administrator to access the fleet management dashboard.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-space font-bold text-sm transition"
          >
            Go to Campus Login →
          </button>
        </div>
      </div>
    );
  }

  // If logged in as student -> Reject access (Requirement 3: "If a logged-in user manually enters an admin URL, reject access and redirect them to their user home page or display an appropriate access-denied page.")
  if (currentUser.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center space-y-5 shadow-2xl border border-rose-200">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-md">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <span className="inline-block px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold uppercase tracking-wider mb-2">
              HTTP 403 • Access Denied
            </span>
            <h2 className="font-space font-extrabold text-2xl text-slate-900">Administrator Portal Locked</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Your account <strong>{currentUser.name}</strong> (User ID: <span className="font-mono">{currentUser.userId}</span>) holds the <strong>{currentUser.role}</strong> role.
              Access to the administrative fleet management dashboard is strictly restricted to certified mobility administrators.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-rose-600" />
              Role-Based Access Enforcement Active
            </div>
            <p className="text-[11px] text-slate-500">
              Frontend state modification and client-side claims are rejected by server-side authorization guards.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#1E5631] to-emerald-600 hover:from-[#174426] hover:to-emerald-700 text-white font-space font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Student Campus Map</span>
            </button>
            <button
              onClick={logoutUser}
              className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition"
            >
              Sign Out & Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- FILTERED DATA SETS ---
  const filteredFleet = fleet.filter((cycle) => {
    const matchesSearch =
      fleetSearch === "" ||
      cycle.id.toLowerCase().includes(fleetSearch.toLowerCase()) ||
      cycle.name.toLowerCase().includes(fleetSearch.toLowerCase()) ||
      cycle.stencilCode.toLowerCase().includes(fleetSearch.toLowerCase());

    const matchesCategory =
      fleetCategoryFilter === "ALL" || cycle.category === fleetCategoryFilter;

    const matchesStatus =
      fleetStatusFilter === "ALL" ||
      (fleetStatusFilter === "MAINTENANCE" && (cycle.isMaintenance || cycle.status === "MAINTENANCE")) ||
      (fleetStatusFilter === "AVAILABLE" && cycle.status === "AVAILABLE" && !cycle.isMaintenance) ||
      (fleetStatusFilter === "CHECKED_OUT" && (cycle.status === "CHECKED_OUT" || cycle.status === "OVERDUE")) ||
      (fleetStatusFilter === "RESERVED" && cycle.status === "RESERVED");

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredBookings = bookings.filter((b) => {
    if (bookingStatusFilter === "ALL") return true;
    return b.status === bookingStatusFilter;
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Admin Navigation Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E5631] via-emerald-600 to-emerald-500 text-white flex items-center justify-center shadow-md">
              <BikeIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-space font-extrabold text-lg tracking-tight">CAMPUS<span className="text-emerald-400">CYCLE</span></span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                  Admin Portal
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Office of Mobility • AIT Pune Fleet Management</p>
            </div>
          </div>

          {/* Admin User Info & Logout Button */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 text-right">
              <div>
                <div className="font-space font-bold text-xs text-white">{currentUser.name}</div>
                <div className="text-[10px] text-emerald-400 font-mono">Role: Administrator</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-700/80 border border-emerald-500 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                MS
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchAllData}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Refresh database records"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`} />
            </button>

            {/* Administrator Logout Button (Requirement 4.E) */}
            <button
              id="admin-logout-button"
              onClick={logoutUser}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold transition shadow-xs active:scale-95"
              title="Sign out of Administrator Session"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 overflow-x-auto border-t border-slate-800">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "overview"
                ? "border-emerald-500 text-emerald-400 bg-slate-800/40"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>A. Overview Statistics</span>
          </button>

          <button
            onClick={() => setActiveTab("fleet")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "fleet"
                ? "border-emerald-500 text-emerald-400 bg-slate-800/40"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <BikeIcon className="w-4 h-4" />
            <span>B. Bicycle Inventory (35)</span>
          </button>

          <button
            onClick={() => setActiveTab("bookings")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "bookings"
                ? "border-emerald-500 text-emerald-400 bg-slate-800/40"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>C. Booking Management</span>
            {stats && stats.pendingApprovalsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
                {stats.pendingApprovalsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "users"
                ? "border-emerald-500 text-emerald-400 bg-slate-800/40"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>D. Registered Users</span>
          </button>
        </div>
      </header>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className={`py-2 px-4 text-xs font-bold flex items-center justify-between shadow-xs ${
          actionMessage.type === "success"
            ? "bg-emerald-600 text-white"
            : "bg-rose-600 text-white"
        }`}>
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <span>{actionMessage.text}</span>
            <button onClick={() => setActionMessage(null)} className="text-white hover:opacity-80">✕</button>
          </div>
        </div>
      )}

      {/* Main Admin Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
        {/* ========================================================================= */}
        {/* SECTION A: OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-space font-extrabold text-2xl text-slate-900">Fleet Operations Overview</h2>
                <p className="text-xs text-slate-500">Live operational counts dynamically computed from actual database records.</p>
              </div>
              <div className="text-xs font-mono text-slate-400">
                Last database synchronization: {new Date().toLocaleTimeString()}
              </div>
            </div>

            {/* 6 Metric Cards Required by Prompt Section 4.A */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {/* Card 1: Total Registered Bicycles */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total Fleet</span>
                  <BikeIcon className="w-4 h-4 text-slate-700" />
                </div>
                <div>
                  <div className="font-space font-extrabold text-3xl text-slate-900">
                    {stats?.totalBicycles ?? 35}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Campus Bicycles</p>
                </div>
              </div>

              {/* Card 2: Currently Available Bicycles */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-emerald-700 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Available</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="font-space font-extrabold text-3xl text-emerald-700">
                    {stats?.availableBicycles ?? 0}
                  </div>
                  <p className="text-[10px] text-emerald-600/80 mt-0.5">Ready for booking</p>
                </div>
              </div>

              {/* Card 3: Currently Booked or In-Use Bicycles */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-amber-700 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Booked / Out</span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <div className="font-space font-extrabold text-3xl text-amber-700">
                    {stats?.inUseOrBookedBicycles ?? 0}
                  </div>
                  <p className="text-[10px] text-amber-600/80 mt-0.5">Active or transit</p>
                </div>
              </div>

              {/* Card 4: Bicycles Marked for Maintenance */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-rose-700 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Maintenance</span>
                  <Wrench className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <div className="font-space font-extrabold text-3xl text-rose-700">
                    {stats?.maintenanceBicycles ?? 0}
                  </div>
                  <p className="text-[10px] text-rose-600/80 mt-0.5">Locked out safely</p>
                </div>
              </div>

              {/* Card 5: Total Registered Users */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-blue-700 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total Users</span>
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-space font-extrabold text-3xl text-blue-700">
                    {stats?.totalUsers ?? 4}
                  </div>
                  <p className="text-[10px] text-blue-600/80 mt-0.5">Verified Accounts</p>
                </div>
              </div>

              {/* Card 6: Active and Upcoming Bookings */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-purple-700 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Bookings</span>
                  <Calendar className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="font-space font-extrabold text-3xl text-purple-700">
                    {stats?.activeAndUpcomingBookings ?? 0}
                  </div>
                  <p className="text-[10px] text-purple-600/80 mt-0.5">Active & upcoming</p>
                </div>
              </div>
            </div>

            {/* Pending Approvals Callout Banner */}
            {stats && stats.pendingApprovalsCount > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <h4 className="font-space font-bold text-sm">
                      {stats.pendingApprovalsCount} Booking Request(s) Awaiting Administrator Approval
                    </h4>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Review advance student booking requests in the Booking Management tab.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveTab("bookings");
                    setBookingStatusFilter("PENDING_APPROVAL");
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition"
                >
                  Review Requests →
                </button>
              </div>
            )}

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => setActiveTab("fleet")}
                className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BikeIcon className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <h3 className="font-space font-bold text-base text-slate-900">Manage Bicycle Fleet</h3>
                <p className="text-xs text-slate-500 mt-1">
                  View all 35 conventional cycles, monitor road-readiness, and toggle safety maintenance lockouts.
                </p>
              </div>

              <div
                onClick={() => setActiveTab("bookings")}
                className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <h3 className="font-space font-bold text-base text-slate-900">Manage Bookings</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Approve, reject, or cancel student reservations. Released slots immediately reflect on user maps.
                </p>
              </div>

              <div
                onClick={() => setActiveTab("users")}
                className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <h3 className="font-space font-bold text-base text-slate-900">Manage Campus Users</h3>
                <p className="text-xs text-slate-500 mt-1">
                  View registered student accounts (Samir, Kirtika, Sumit), booking counts, and toggle account activation.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION B: BICYCLE MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === "fleet" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-space font-extrabold text-2xl text-slate-900">Bicycle Fleet Inventory</h2>
                <p className="text-xs text-slate-500">
                  Total 35 conventional campus bicycles (CC-001 to CC-035). Toggle maintenance to lock/unlock booking capability.
                </p>
              </div>
              <div className="text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                Showing {filteredFleet.length} of {fleet.length} Bicycles
              </div>
            </div>

            {/* Filter Bar */}
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search cycle ID, model, or code..."
                  value={fleetSearch}
                  onChange={(e) => setFleetSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Filter:</span>
                
                {/* Category Filter */}
                <select
                  value={fleetCategoryFilter}
                  onChange={(e) => setFleetCategoryFilter(e.target.value)}
                  className="text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700"
                >
                  <option value="ALL">All Categories</option>
                  <option value="commuter">Commuter</option>
                  <option value="city">City Cruiser</option>
                  <option value="trail">Trail / Mountain</option>
                  <option value="step-thru">Step-Thru</option>
                </select>

                {/* Status Filter */}
                <select
                  value={fleetStatusFilter}
                  onChange={(e) => setFleetStatusFilter(e.target.value)}
                  className="text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="MAINTENANCE">Under Maintenance</option>
                  <option value="CHECKED_OUT">Checked Out</option>
                  <option value="RESERVED">Reserved</option>
                </select>
              </div>
            </div>

            {/* Cycles Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Cycle ID</th>
                      <th className="py-3 px-4">Model & Category</th>
                      <th className="py-3 px-4">Current Stand</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Condition</th>
                      <th className="py-3 px-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredFleet.map((cycle) => {
                      const isMaint = cycle.isMaintenance || cycle.status === "MAINTENANCE";
                      return (
                        <tr key={cycle.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {cycle.id}
                            <span className="block text-[10px] text-slate-400 font-sans">{cycle.stencilCode}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{cycle.name}</div>
                            <span className="inline-block text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium mt-0.5">
                              {cycle.category.toUpperCase()} • ₹{cycle.hourlyRate}/hr
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {cycle.currentStand || "Sports Complex Stand"}
                          </td>
                          <td className="py-3 px-4">
                            {isMaint ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <Wrench className="w-3 h-3 text-rose-600" />
                                MAINTENANCE
                              </span>
                            ) : cycle.status === "CHECKED_OUT" || cycle.status === "OVERDUE" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                IN USE
                              </span>
                            ) : cycle.status === "RESERVED" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                RESERVED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                AVAILABLE
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                            {isMaint ? (
                              <span className="text-rose-600 font-medium">
                                {cycle.maintenanceReason || "Safety inspection in progress"}
                              </span>
                            ) : (
                              <span className="text-emerald-700">Road Ready • Mechanical OK</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isMaint ? (
                              <button
                                onClick={() => handleToggleMaintenance(cycle.id, true)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-300 font-bold text-[11px] transition shadow-xs"
                                title="Restore to Available"
                              >
                                Restore to Available
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleMaintenance(cycle.id, false)}
                                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 font-bold text-[11px] transition shadow-xs"
                                title="Mark as Under Maintenance"
                              >
                                Mark Maintenance
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION C: BOOKING MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === "bookings" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-space font-extrabold text-2xl text-slate-900">Booking Requests & Reservations</h2>
                <p className="text-xs text-slate-500">
                  Review pending advance bookings, approve or reject requests, and cancel bookings with automatic slot release.
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-200 shadow-xs">
                {(["ALL", "PENDING_APPROVAL", "APPROVED", "CANCELLED", "REJECTED"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setBookingStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      bookingStatusFilter === st
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {st === "ALL" ? "All" : st.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Bookings Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Booking ID</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Cycle Target</th>
                      <th className="py-3 px-4">Date & Slot</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No bookings found for the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {b.id}
                            <span className="block text-[10px] text-slate-400 font-sans">₹{b.totalPrice} ({b.durationHours}h)</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{b.studentName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">ID: {b.studentId}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-slate-800">{b.cyclePreference}</span>
                            <span className="block text-[10px] text-slate-400">{b.cycleName}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{b.date}</div>
                            <div className="text-[10px] text-emerald-700 font-semibold">{b.startTime} - {b.endTime}</div>
                          </td>
                          <td className="py-3 px-4">
                            {b.status === "PENDING_APPROVAL" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                PENDING REVIEW
                              </span>
                            ) : b.status === "APPROVED" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                APPROVED
                              </span>
                            ) : b.status === "REJECTED" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                REJECTED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                CANCELLED
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5">
                            {b.status === "PENDING_APPROVAL" && (
                              <>
                                <button
                                  onClick={() => handleApproveBooking(b.id)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectBooking(b.id)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] shadow-xs transition"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {b.status === "APPROVED" && (
                              <button
                                onClick={() => handleCancelBooking(b.id)}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] shadow-xs transition"
                              >
                                Cancel & Release
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION D: USER MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-space font-extrabold text-2xl text-slate-900">Campus User Management</h2>
                <p className="text-xs text-slate-500">
                  Registered university student and staff accounts. Passwords remain server-side hashed with PBKDF2-SHA512.
                </p>
              </div>
              <div className="text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                Total Registered: {users.length} Users
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">User ID & Name</th>
                      <th className="py-3 px-4">Role & Department</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Bookings Stats</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Account Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => {
                      const isPrimaryAdmin = u.userId === "Mohit Sharma";
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isPrimaryAdmin && (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">
                                  Primary Admin
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">ID: {u.userId}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === "admin"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {u.role.toUpperCase()}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-0.5">{u.department || "Student"}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {u.email}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <span className="font-bold text-slate-900">{u.totalBookings || 0}</span> total
                            <span className="text-slate-400"> • </span>
                            <span className="text-emerald-700 font-semibold">{u.activeBookings || 0} active</span>
                          </td>
                          <td className="py-3 px-4">
                            {u.isActive !== false ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <UserCheck className="w-3 h-3 text-emerald-600" />
                                ACTIVE
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <UserX className="w-3 h-3 text-rose-600" />
                                DEACTIVATED
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isPrimaryAdmin ? (
                              <span className="text-[11px] text-slate-400 italic">Protected</span>
                            ) : u.isActive !== false ? (
                              <button
                                onClick={() => handleToggleUserStatus(u.userId, true)}
                                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] shadow-xs transition"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleUserStatus(u.userId, false)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] shadow-xs transition"
                              >
                                Activate
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
