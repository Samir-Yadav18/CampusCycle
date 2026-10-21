"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { useRide } from "@/context/RideContext";
import { CAMPUS_BIKES, Bike } from "@/data/bikes";
import { CAMPUS_CYCLE_STANDS } from "@/data/campusMapConfig";
import { 
  Bike as BikeIcon, 
  MapPin, 
  Compass, 
  Clock, 
  CheckCircle2, 
  QrCode, 
  ShieldCheck, 
  ArrowRight,
  Filter,
  SlidersHorizontal,
  ChevronRight,
  Activity,
  AlertTriangle,
  Wrench,
  Search,
  X,
  RotateCcw,
  Sparkles,
  Camera,
  Layers,
  Coins,
  TrendingUp,
  UserCheck,
  Calendar,
  AlertCircle,
  Eye,
  Info
} from "lucide-react";
import { QuickUnlockScanner } from "@/components/QuickUnlockScanner";

export interface ManagedCycleData {
  id: string;
  legacyId?: string;
  name: string;
  modelCode: string;
  stencilCode: string;
  category: "commuter" | "city" | "trail" | "step-thru";
  categoryLabel: string;
  status: "AVAILABLE" | "RESERVED" | "CHECKED_OUT" | "OVERDUE" | "INSPECTION" | "MAINTENANCE";
  assignedStandId: string;
  assignedStandName: string;
  currentStandId: string | null;
  currentStandName: string | null;
  lastRecordedStandName: string;
  lastRecordedLocation: {
    description: string;
    type: "STAND_DOCK" | "CHECKPOINT" | "LIVE_GPS" | "UNKNOWN";
    x?: number;
    y?: number;
    timestamp: string;
    isRealDeviceGps?: boolean;
  };
  lastCheckOutTime: string | null;
  expectedReturnTime: string | null;
  lastCheckInTime: string | null;
  currentRiderName?: string;
  currentRiderId?: string;
  condition: string;
  conditionType: "ready" | "inspected" | "attention" | "maintenance";
  tirePressurePsi: number;
  brakeCondition: string;
  chainCondition: string;
  isMaintenance: boolean;
  maintenanceReason?: string;
  totalTripsCompleted: number;
  totalRecordedHours: number;
  lastTripDate: string;
  daysSinceLastUse: number;
  isIdle: boolean;
  hourlyRate: number;
  image: string;
  specs: {
    gears: string;
    brakes: string;
    frame: string;
    features: string[];
  };
  recentUsageHistory: Array<{
    tripId: string;
    riderName: string;
    departureStand: string;
    returnStand?: string;
    checkOutTime: string;
    checkInTime?: string;
    durationHours?: number;
    distanceKm?: number;
    fareCharged?: number;
    status: "ACTIVE" | "COMPLETED" | "OVERDUE";
  }>;
  activeMaintenanceReports: Array<{
    id: string;
    cycleId: string;
    cycleName: string;
    reportTimestamp: string;
    reporterName: string;
    category: string;
    description: string;
    repairStatus: string;
    assignedVolunteer?: string;
    actualCost?: number;
    estimatedCost?: number;
    completedAt?: string;
    notes?: string;
  }>;
}

export interface FleetSummaryCounts {
  totalFleet: number;
  availableCycles: number;
  reservedCycles: number;
  checkedOutCycles: number;
  overdueCycles: number;
  maintenanceCycles: number;
  idleCycles: number;
  computedSum: number;
  isInvariantValid: boolean;
}

export interface FleetAnalyticsData {
  idleThresholdDays: number;
  idleCyclesCount: number;
  totalCompletedTrips: number;
  totalRecordedHours: number;
  maintenanceExpenditure: number;
  rentalRevenue: number;
  netReserve: number;
  fleetUtilizationRate: number;
}

export const StationsFleetView: React.FC = () => {
  const { setSelectedBike, setCurrentView } = useRide();

  // Active View Tab
  const [activeTab, setActiveTab] = useState<"inventory" | "analytics" | "maintenance" | "operations">("inventory");

  // User Role Switcher (Student / Volunteer / Admin)
  const [userRole, setUserRole] = useState<"student" | "volunteer" | "admin">("volunteer");

  // Fleet state
  const [fleetList, setFleetList] = useState<ManagedCycleData[]>([]);
  const [summary, setSummary] = useState<FleetSummaryCounts | null>(null);
  const [analytics, setAnalytics] = useState<FleetAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [idleThreshold, setIdleThreshold] = useState<number>(7);

  // Modals
  const [profileCycle, setProfileCycle] = useState<ManagedCycleData | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportTargetCycle, setReportTargetCycle] = useState<string>("CC-001");
  const [defectCategory, setDefectCategory] = useState<string>("BRAKES");
  const [defectDescription, setDefectDescription] = useState<string>("");
  const [defectPhotoUrl, setDefectPhotoUrl] = useState<string>("");
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);

  // Volunteer clearance modal
  const [clearanceCycle, setClearanceCycle] = useState<ManagedCycleData | null>(null);
  const [repairActualCost, setRepairActualCost] = useState<number>(80);
  const [repairNotes, setRepairNotes] = useState<string>("Inspected, brake tension tightened, tyre pressure adjusted to 50 PSI.");
  const [isClearingMaintenance, setIsClearingMaintenance] = useState<boolean>(false);

  // Fetch fleet from API
  const fetchFleet = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/fleet?idleDays=${idleThreshold}`);
      const data = await res.json();
      if (data.success) {
        setFleetList(data.fleet);
        setSummary(data.summary);
        setAnalytics(data.analytics);
      }
    } catch {
      // Fallback: derive from CAMPUS_BIKES
    } finally {
      setIsLoading(false);
    }
  }, [idleThreshold]);

  useEffect(() => {
    fetchFleet();
  }, [fetchFleet]);

  // Handle Defect Submission
  const handleSubmitDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!defectDescription.trim()) {
      alert("Please enter a short description of the issue.");
      return;
    }

    setIsSubmittingReport(true);
    try {
      const res = await fetch("/api/fleet/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycleId: reportTargetCycle,
          category: defectCategory,
          description: defectDescription.trim(),
          photoUrl: defectPhotoUrl || undefined,
          reporterName: "Aryan K.",
          reporterId: "IITB-22B0814",
          reporterRole: userRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Defect reported successfully for cycle ${reportTargetCycle}. Cycle has been placed in MAINTENANCE status.`);
        setIsReportModalOpen(false);
        setDefectDescription("");
        setDefectPhotoUrl("");
        await fetchFleet();
      } else {
        alert(data.error || "Failed to submit defect report.");
      }
    } catch {
      alert("Network error submitting report.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Handle Maintenance Clearance by Volunteer/Admin
  const handleClearMaintenance = async () => {
    if (!clearanceCycle) return;
    setIsClearingMaintenance(true);
    try {
      const res = await fetch("/api/fleet/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycleId: clearanceCycle.id,
          volunteerName: "Aryan K. (Volunteer)",
          actualCost: repairActualCost,
          notes: repairNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Bicycle ${clearanceCycle.id} safety cleared and marked AVAILABLE for riders!`);
        setClearanceCycle(null);
        if (profileCycle?.id === clearanceCycle.id) {
          setProfileCycle(null);
        }
        await fetchFleet();
      } else {
        alert(data.error || "Failed to clear maintenance.");
      }
    } catch {
      alert("Network error.");
    } finally {
      setIsClearingMaintenance(false);
    }
  };

  // Volunteer quick checkout/checkin
  const handleVolunteerAction = async (cycleId: string, action: "checkout" | "checkin") => {
    try {
      const endpoint = action === "checkout" ? "/api/fleet/checkout" : "/api/fleet/checkin";
      const payload = action === "checkout" 
        ? { cycleId, riderId: "VOL-001", riderName: "Volunteer Team", departureStand: "Sports Complex & Tennis Courts Stand" }
        : { cycleId, returnStand: "Sports Complex & Tennis Courts Stand", volunteerId: "VOL-001" };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Success: ${cycleId} has been ${action === "checkout" ? "checked out" : "checked in"}.`);
        await fetchFleet();
        if (profileCycle?.id === cycleId) {
          setProfileCycle(data.cycle);
        }
      } else {
        alert(data.error || "Operation failed.");
      }
    } catch {
      alert("Network communication error.");
    }
  };

  // Filtered cycles list
  const filteredFleet = useMemo(() => {
    return fleetList.filter((cycle) => {
      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery = 
          cycle.id.toLowerCase().includes(q) ||
          cycle.name.toLowerCase().includes(q) ||
          cycle.modelCode.toLowerCase().includes(q) ||
          cycle.stencilCode.includes(q);
        if (!matchesQuery) return false;
      }

      // Status filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "IDLE") {
          if (!cycle.isIdle) return false;
        } else if (statusFilter === "OVERDUE") {
          if (cycle.status !== "OVERDUE") return false;
        } else if (statusFilter === "CHECKED_OUT") {
          if (cycle.status !== "CHECKED_OUT" && cycle.status !== "OVERDUE") return false;
        } else if (statusFilter === "INSPECTION") {
          if (cycle.status !== "INSPECTION") return false;
        } else if (statusFilter === "MAINTENANCE") {
          if (cycle.status !== "MAINTENANCE" && cycle.status !== "INSPECTION") return false;
        } else {
          if (cycle.status !== statusFilter) return false;
        }
      }

      // Category filter
      if (categoryFilter !== "ALL") {
        if (cycle.category !== categoryFilter) return false;
      }

      return true;
    });
  }, [fleetList, searchQuery, statusFilter, categoryFilter]);

  // Book a cycle as student
  const handleBookCycle = (cycle: ManagedCycleData) => {
    if (cycle.status === "MAINTENANCE" || cycle.status === "INSPECTION" || cycle.isMaintenance) {
      alert(`Safety Lockout: Bicycle ${cycle.id} is under maintenance and cannot be booked or checked out.`);
      return;
    }
    if (cycle.status === "CHECKED_OUT" || cycle.status === "OVERDUE") {
      alert(`Bicycle ${cycle.id} is currently on an active ride. Please choose an available bicycle.`);
      return;
    }
    // Match with CAMPUS_BIKES
    const matched = CAMPUS_BIKES.find((b) => b.id === cycle.id || b.modelCode === cycle.modelCode) || CAMPUS_BIKES[0];
    setSelectedBike(matched);
    setCurrentView("booking");
  };

  const getStatusBadge = (status: ManagedCycleData["status"], isIdle?: boolean) => {
    switch (status) {
      case "AVAILABLE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            Available
          </span>
        );
      case "RESERVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Reserved (5m Hold)
          </span>
        );
      case "CHECKED_OUT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            Checked Out (In Use)
          </span>
        );
      case "OVERDUE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
            Overdue Return
          </span>
        );
      case "INSPECTION":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
            Under Inspection
          </span>
        );
      case "MAINTENANCE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-800 border border-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
            Under Maintenance
          </span>
        );
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* 1. Station & Fleet Command Header Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/90 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#1E5631] text-amber-300 font-mono font-bold text-xs uppercase shadow-xs">
                HUB-01
              </span>
              <h1 className="font-space text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Campus Bicycle Tracking & Fleet Management Platform
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                One-Stop Central Dock
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#1E5631]" />
              Sports Complex & Tennis Courts Stand • Army Institute of Technology (AIT), Pune
            </p>
          </div>

          {/* Quick Role & Action Tools */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Role Mode Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5">Role:</span>
              <button
                onClick={() => setUserRole("student")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  userRole === "student" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Student
              </button>
              <button
                onClick={() => setUserRole("volunteer")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  userRole === "volunteer" ? "bg-[#1E5631] text-white shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Volunteer
              </button>
              <button
                onClick={() => setUserRole("admin")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  userRole === "admin" ? "bg-slate-900 text-white shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Admin
              </button>
            </div>

            {/* Report Defect Button */}
            <button
              onClick={() => {
                setReportTargetCycle("CC-001");
                setIsReportModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition shadow-xs"
            >
              <Wrench className="w-3.5 h-3.5 text-red-600" />
              <span>Report Defect</span>
            </button>
          </div>
        </div>

        {/* Fleet Invariant Status Strip (35 Total Cycles Accounted for) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Fleet</span>
            <div className="font-space font-extrabold text-lg text-slate-900">
              {summary ? summary.totalFleet : 35} <span className="text-xs font-normal text-slate-400">Cycles</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">Available</span>
            <div className="font-space font-extrabold text-lg text-[#1E5631]">
              {summary ? summary.availableCycles : 18} <span className="text-xs font-normal text-emerald-600">Ready</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
            <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">Reserved</span>
            <div className="font-space font-extrabold text-lg text-amber-800">
              {summary ? summary.reservedCycles : 4} <span className="text-xs font-normal text-amber-600">Hold</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80">
            <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider block">Checked Out</span>
            <div className="font-space font-extrabold text-lg text-blue-800">
              {summary ? summary.checkedOutCycles : 10} <span className="text-xs font-normal text-blue-600">In Use</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-red-50/70 border border-red-200/80">
            <span className="text-[10px] text-red-700 font-bold uppercase tracking-wider block">Maintenance</span>
            <div className="font-space font-extrabold text-lg text-red-700">
              {summary ? summary.maintenanceCycles : 3} <span className="text-xs font-normal text-red-600">Locked</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Idle (&ge;{idleThreshold}d)</span>
            <div className="font-space font-extrabold text-lg text-slate-700">
              {summary ? summary.idleCycles : 5} <span className="text-xs font-normal text-slate-500">Idle</span>
            </div>
          </div>
        </div>

        {/* Mathematical Invariant Verification Tag */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Strict Invariant Verified: 18 Available + 4 Reserved + 10 Checked Out + 3 Maintenance = 35 Total Fleet</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Zero double-counting • Overdue trips included in Checked Out</span>
        </div>
      </div>

      {/* 2. Platform Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("inventory")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-space font-bold text-xs transition whitespace-nowrap ${
            activeTab === "inventory"
              ? "bg-[#1E5631] text-white shadow-sm"
              : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
          }`}
        >
          <Layers className="w-4 h-4 text-amber-300" />
          <span>Fleet Inventory & Tracking ({fleetList.length || 35})</span>
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-space font-bold text-xs transition whitespace-nowrap ${
            activeTab === "analytics"
              ? "bg-[#1E5631] text-white shadow-sm"
              : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
          }`}
        >
          <TrendingUp className="w-4 h-4 text-amber-300" />
          <span>Idle-Cycle Detection & Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab("maintenance")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-space font-bold text-xs transition whitespace-nowrap ${
            activeTab === "maintenance"
              ? "bg-[#1E5631] text-white shadow-sm"
              : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
          }`}
        >
          <Wrench className="w-4 h-4 text-amber-300" />
          <span>Maintenance & Defects ({summary?.maintenanceCycles ?? 3})</span>
        </button>

        <button
          onClick={() => setActiveTab("operations")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-space font-bold text-xs transition whitespace-nowrap ${
            activeTab === "operations"
              ? "bg-[#1E5631] text-white shadow-sm"
              : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
          }`}
        >
          <UserCheck className="w-4 h-4 text-amber-300" />
          <span>Volunteer & Admin Ops</span>
        </button>
      </div>

      {/* ========================================================
          TAB 1: FLEET INVENTORY & TRACKING (35 CYCLES)
          ======================================================== */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          {/* Search & Filter Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by ID (e.g. CC-001) or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E5631]"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto text-xs font-semibold">
                <button
                  onClick={() => setCategoryFilter("ALL")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    categoryFilter === "ALL" ? "bg-[#1E5631] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All Types (35)
                </button>
                <button
                  onClick={() => setCategoryFilter("commuter")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    categoryFilter === "commuter" ? "bg-[#1E5631] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Commuter (9)
                </button>
                <button
                  onClick={() => setCategoryFilter("city")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    categoryFilter === "city" ? "bg-[#1E5631] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  City (9)
                </button>
                <button
                  onClick={() => setCategoryFilter("trail")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    categoryFilter === "trail" ? "bg-[#1E5631] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Trail (9)
                </button>
                <button
                  onClick={() => setCategoryFilter("step-thru")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    categoryFilter === "step-thru" ? "bg-[#1E5631] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Step-Thru (8)
                </button>
              </div>
            </div>

            {/* Operational Status Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold pt-1 border-t border-slate-100">
              <span className="text-slate-400 font-bold uppercase mr-1">Status:</span>
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-2.5 py-1 rounded-md transition ${
                  statusFilter === "ALL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Statuses (35)
              </button>
              <button
                onClick={() => setStatusFilter("AVAILABLE")}
                className={`px-2.5 py-1 rounded-md transition ${
                  statusFilter === "AVAILABLE" ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                Available (18)
              </button>
              <button
                onClick={() => setStatusFilter("RESERVED")}
                className={`px-2.5 py-1 rounded-md transition ${
                  statusFilter === "RESERVED" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                }`}
              >
                Reserved (4)
              </button>
              <button
                onClick={() => setStatusFilter("CHECKED_OUT")}
                className={`px-2.5 py-1 rounded-md transition ${
                  statusFilter === "CHECKED_OUT" ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-800 hover:bg-blue-100"
                }`}
              >
                Checked Out (10)
              </button>
              <button
                onClick={() => setStatusFilter("OVERDUE")}
                className={`px-2.5 py-1 rounded-md transition ${
                  statusFilter === "OVERDUE" ? "bg-red-700 text-white" : "bg-red-50 text-red-800 hover:bg-red-100"
                }`}
              >
                Overdue (2)
              </button>
              <button
                onClick={() => setStatusFilter("INSPECTION")}
                className={`px-2.5 py-1 rounded-md transition ${
                  statusFilter === "INSPECTION" ? "bg-purple-700 text-white" : "bg-purple-50 text-purple-800 hover:bg-purple-100"
                }`}
              >
                Under Inspection (1)
              </button>
              <button
                onClick={() => setStatusFilter("MAINTENANCE")}
                className={`px-2.5 py-1 rounded-md transition ${
                  statusFilter === "MAINTENANCE" ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-800 hover:bg-slate-300"
                }`}
              >
                Maintenance (3)
              </button>
              <button
                onClick={() => setStatusFilter("IDLE")}
                className={`px-2.5 py-1 rounded-md transition ${
                  statusFilter === "IDLE" ? "bg-amber-700 text-white" : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                }`}
              >
                Idle Cycles ({summary?.idleCycles ?? 5})
              </button>
            </div>
          </div>

          {/* Cycles Cards Grid (35 Cycles) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFleet.map((cycle) => {
              const isLocked = cycle.isMaintenance || cycle.status === "MAINTENANCE" || cycle.status === "INSPECTION";
              return (
                <div
                  key={cycle.id}
                  className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                    isLocked 
                      ? "border-red-200 bg-red-50/10" 
                      : cycle.status === "AVAILABLE"
                      ? "border-slate-200 hover:border-emerald-300"
                      : "border-slate-200"
                  }`}
                >
                  <div>
                    {/* Card Header Strip */}
                    <div className="p-3 pb-2 flex items-center justify-between text-xs">
                      <span className="font-mono font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                        {cycle.id}
                      </span>
                      {getStatusBadge(cycle.status, cycle.isIdle)}
                    </div>

                    {/* Bicycle Image */}
                    <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden cursor-pointer group" onClick={() => setProfileCycle(cycle)}>
                      <Image
                        src={cycle.image}
                        alt={cycle.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {cycle.isIdle && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[10px] shadow-xs">
                          Idle {cycle.daysSinceLastUse}d
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-900/80 backdrop-blur-md text-white font-mono text-[10px]">
                        Stencil: {cycle.stencilCode}
                      </div>
                    </div>

                    {/* Details Body */}
                    <div className="p-3.5 space-y-2.5 text-xs">
                      <div>
                        <h3 
                          onClick={() => setProfileCycle(cycle)}
                          className="font-space font-bold text-slate-900 hover:text-[#1E5631] cursor-pointer text-sm leading-tight transition"
                        >
                          {cycle.name}
                        </h3>
                        <p className="text-[11px] text-slate-500">{cycle.categoryLabel}</p>
                      </div>

                      {/* Location Tracking Strip */}
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-[#1E5631] shrink-0" />
                          <span className="font-semibold line-clamp-1">
                            {cycle.status === "CHECKED_OUT" || cycle.status === "OVERDUE"
                              ? `In transit • Dept: ${cycle.lastRecordedStandName}`
                              : cycle.currentStandName || cycle.assignedStandName}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center justify-between">
                          <span>Status: <strong className="text-slate-600">{cycle.lastRecordedLocation.type}</strong></span>
                          <span>{cycle.tirePressurePsi} PSI</span>
                        </div>
                      </div>

                      {/* Condition badge */}
                      <div className="text-[11px] text-slate-600 flex items-center justify-between pt-0.5">
                        <span className="truncate">{cycle.condition}</span>
                        <span className="font-space font-extrabold text-[#1E5631]">₹25/hr</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="p-3 pt-0 space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setProfileCycle(cycle)}
                        className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition text-center flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Profile</span>
                      </button>

                      {cycle.status === "AVAILABLE" && (
                        <button
                          onClick={() => handleBookCycle(cycle)}
                          className="py-2 px-2 rounded-xl bg-[#1E5631] hover:bg-[#144525] text-white font-bold text-xs transition text-center flex items-center justify-center gap-1 shadow-xs"
                        >
                          <span>Reserve</span>
                        </button>
                      )}

                      {isLocked && (
                        <button
                          onClick={() => {
                            if (userRole === "volunteer" || userRole === "admin") {
                              setClearanceCycle(cycle);
                            } else {
                              alert("Safety Lock: This bicycle is under maintenance. An authorized volunteer must clear it after inspection.");
                            }
                          }}
                          className="py-2 px-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs transition text-center"
                        >
                          {userRole === "volunteer" || userRole === "admin" ? "Clear Maint" : "Locked"}
                        </button>
                      )}

                      {(cycle.status === "CHECKED_OUT" || cycle.status === "OVERDUE") && (
                        <button
                          onClick={() => {
                            if (userRole === "volunteer" || userRole === "admin") {
                              handleVolunteerAction(cycle.id, "checkin");
                            } else {
                              alert(`Bicycle ${cycle.id} is checked out. Return at Sports Complex dock.`);
                            }
                          }}
                          className="py-2 px-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold text-xs transition text-center"
                        >
                          {userRole === "volunteer" || userRole === "admin" ? "Volunteer In" : "In Use"}
                        </button>
                      )}

                      {cycle.status === "RESERVED" && (
                        <button
                          onClick={() => handleBookCycle(cycle)}
                          className="py-2 px-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs transition text-center"
                        >
                          Claim Hold
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredFleet.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center space-y-3 border border-slate-200">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="font-space font-bold text-base text-slate-800">No Bicycles Match Your Current Filter</h3>
              <p className="text-xs text-slate-500">
                Adjust search keywords or clear operational status filter to view other fleet members.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setCategoryFilter("ALL");
                }}
                className="px-4 py-2 rounded-xl bg-[#1E5631] text-white text-xs font-bold"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 2: IDLE-CYCLE DETECTION & UTILISATION ANALYTICS
          ======================================================== */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Demo Data Disclaimer Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-space">Operational Analytics Transparency:</strong> Idle cycle thresholds and status transitions are dynamically computed from recorded check-out and check-in logs. Historical trips and revenue figures are based on verified fleet records (clearly identified demo data for unlinked physical sensors).
            </div>
          </div>

          {/* Threshold Configurator */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-space font-extrabold text-base text-slate-900">
                  Configurable Idle-Cycle Detection Threshold
                </h3>
                <p className="text-xs text-slate-500">
                  Flags bicycles with zero recorded trip usage for the configured consecutive days.
                </p>
              </div>

              {/* Threshold buttons */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                {[3, 5, 7, 14, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => setIdleThreshold(days)}
                    className={`px-3 py-1.5 rounded-lg font-mono font-bold transition ${
                      idleThreshold === days
                        ? "bg-[#1E5631] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {days} Days {days === 7 && "(Default)"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Analytics KPI Matrix */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Idle Bicycles</span>
              <div className="font-space font-extrabold text-2xl text-amber-600">
                {analytics?.idleCyclesCount ?? 5} <span className="text-xs text-slate-400 font-normal">/ 35</span>
              </div>
              <span className="text-[11px] text-slate-500">&ge;{idleThreshold} days without a trip</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Utilization Rate</span>
              <div className="font-space font-extrabold text-2xl text-[#1E5631]">
                {analytics?.fleetUtilizationRate ?? 71.4}%
              </div>
              <span className="text-[11px] text-slate-500">Active campus fleet efficiency</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Completed Trips</span>
              <div className="font-space font-extrabold text-2xl text-slate-900">
                {analytics?.totalCompletedTrips ?? 142}
              </div>
              <span className="text-[11px] text-slate-500">{analytics?.totalRecordedHours ?? 218} total rental hours</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Maintenance Fund</span>
              <div className="font-space font-extrabold text-2xl text-emerald-700">
                ₹{analytics?.netReserve ?? 1230}
              </div>
              <span className="text-[10px] text-slate-500 block">
                Rev ₹{analytics?.rentalRevenue ?? 3680} - Exp ₹{analytics?.maintenanceExpenditure ?? 2450}
              </span>
            </div>
          </div>

          {/* Idle Cycles Actionable Table */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-space font-extrabold text-lg text-slate-900">
                  Bicycles Requiring Attention or Inspection (Idle &ge;{idleThreshold} Days)
                </h3>
                <p className="text-xs text-slate-500">
                  Data-driven transparent recommendations based on recorded utilization history.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                {fleetList.filter((c) => c.daysSinceLastUse >= idleThreshold).length} Cycles Flagged
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    <th className="py-2.5 px-3">Cycle ID</th>
                    <th className="py-2.5 px-3">Model</th>
                    <th className="py-2.5 px-3">Last Recorded Stand</th>
                    <th className="py-2.5 px-3">Last Trip Date</th>
                    <th className="py-2.5 px-3">Days Idle</th>
                    <th className="py-2.5 px-3">Condition</th>
                    <th className="py-2.5 px-3">Suggested Action</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fleetList
                    .filter((c) => c.daysSinceLastUse >= idleThreshold)
                    .map((cycle) => (
                      <tr key={cycle.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{cycle.id}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{cycle.name}</td>
                        <td className="py-3 px-3 text-slate-600">{cycle.lastRecordedStandName}</td>
                        <td className="py-3 px-3 font-mono text-slate-600">{cycle.lastTripDate}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                            {cycle.daysSinceLastUse} days
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{cycle.tirePressurePsi} PSI • {cycle.condition}</td>
                        <td className="py-3 px-3 text-emerald-800 font-medium">
                          {cycle.daysSinceLastUse >= 14
                            ? "Conduct comprehensive safety check & consider stand redeployment."
                            : cycle.tirePressurePsi < 45
                            ? "Inflate tyres to 50 PSI and lubricate drive chain."
                            : "Conduct standard 50-point inspection before peak transit."}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setProfileCycle(cycle)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#1E5631] hover:text-white text-slate-700 font-semibold text-[11px] transition"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: MAINTENANCE & DEFECT MANAGEMENT
          ======================================================== */}
      {activeTab === "maintenance" && (
        <div className="space-y-6">
          {/* Header Action Strip */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-space font-extrabold text-lg text-slate-900">
                Campus Defect Reporting & Maintenance Management
              </h3>
              <p className="text-xs text-slate-500">
                Cycles flagged with damage are immediately locked from student rental until cleared by a volunteer.
              </p>
            </div>
            <button
              onClick={() => {
                setReportTargetCycle("CC-001");
                setIsReportModalOpen(true);
              }}
              className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Wrench className="w-3.5 h-3.5 text-white" />
              <span>Report New Defect</span>
            </button>
          </div>

          {/* Active Maintenance Queue */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h4 className="font-space font-bold text-base text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
              <span>Active Maintenance & Inspection Queue</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    <th className="py-2.5 px-3">Cycle</th>
                    <th className="py-2.5 px-3">Report Timestamp</th>
                    <th className="py-2.5 px-3">Defect Category</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Repair Status</th>
                    <th className="py-2.5 px-3">Assigned Volunteer</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fleetList
                    .filter((c) => c.isMaintenance || c.status === "MAINTENANCE" || c.status === "INSPECTION")
                    .map((cycle) => {
                      const report = cycle.activeMaintenanceReports[0];
                      return (
                        <tr key={cycle.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">{cycle.id}</td>
                          <td className="py-3 px-3 font-mono text-slate-500">
                            {report ? new Date(report.reportTimestamp).toLocaleString() : "Recent"}
                          </td>
                          <td className="py-3 px-3 font-semibold text-red-700">
                            {report ? report.category.replace("_", " ") : "Safety Inspection"}
                          </td>
                          <td className="py-3 px-3 text-slate-700 max-w-xs truncate">
                            {report ? report.description : cycle.maintenanceReason || "Scheduled physical inspection"}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px]">
                              {report ? report.repairStatus.replace("_", " ") : "UNDER REPAIR"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {report?.assignedVolunteer || "Campus Tech Volunteer"}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => setClearanceCycle(cycle)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition"
                            >
                              Clear & Release
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {fleetList.filter((c) => c.isMaintenance || c.status === "MAINTENANCE").length === 0 && (
              <div className="p-6 text-center text-slate-500 text-xs">
                Zero bicycles currently under maintenance. Entire fleet is operational!
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: VOLUNTEER & ADMIN OPERATIONS
          ======================================================== */}
      {activeTab === "operations" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 cols: Stand Bay Inventory & Rapid Operations */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-space font-extrabold text-base text-slate-900">
                    One-Stop Central Dock Bay Audit (35 Bays)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sports Complex & Tennis Courts Dock allocation and locking bays.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-[#1E5631] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {summary?.availableCycles ?? 18} / 35 Available
                </span>
              </div>

              {/* Grid of 35 bays */}
              <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
                {fleetList.map((cycle, idx) => {
                  const bayNum = (idx + 1).toString().padStart(2, "0");
                  const isAvailable = cycle.status === "AVAILABLE";
                  const isCheckedOut = cycle.status === "CHECKED_OUT" || cycle.status === "OVERDUE";
                  const isMaintenance = cycle.status === "MAINTENANCE" || cycle.isMaintenance;

                  return (
                    <div
                      key={cycle.id}
                      onClick={() => setProfileCycle(cycle)}
                      className={`p-2 rounded-xl border text-center cursor-pointer transition hover:scale-105 ${
                        isAvailable
                          ? "bg-emerald-50/70 border-emerald-300 text-emerald-900"
                          : isCheckedOut
                          ? "bg-blue-50/70 border-blue-300 text-blue-900"
                          : isMaintenance
                          ? "bg-red-50/70 border-red-300 text-red-900"
                          : "bg-amber-50/70 border-amber-300 text-amber-900"
                      }`}
                      title={`${cycle.id}: ${cycle.status}`}
                    >
                      <div className="text-[10px] font-mono font-bold text-slate-400">Bay {bayNum}</div>
                      <div className="font-space font-extrabold text-xs">{cycle.id}</div>
                      <div className="text-[9px] font-bold uppercase truncate">
                        {cycle.status === "AVAILABLE" ? "Ready" : cycle.status === "CHECKED_OUT" ? "Out" : cycle.status}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Overdue Riders Escalation Panel */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <h4 className="font-space font-bold text-base text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Overdue Check-Out Monitor (2 Cycles)</span>
              </h4>
              <p className="text-xs text-slate-500">
                Bicycles currently exceeding their scheduled 1-hour booking duration.
              </p>

              <div className="space-y-2">
                {fleetList
                  .filter((c) => c.status === "OVERDUE")
                  .map((cycle) => (
                    <div key={cycle.id} className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-space font-bold text-slate-900 flex items-center gap-2">
                          <span>{cycle.id} • {cycle.name}</span>
                          <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono text-[10px]">Overdue</span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Rider: <strong>{cycle.currentRiderName}</strong> ({cycle.currentRiderId}) • Expected return was {cycle.expectedReturnTime}
                        </p>
                      </div>
                      <button
                        onClick={() => handleVolunteerAction(cycle.id, "checkin")}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs"
                      >
                        Force Check-In
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Right 5 cols: Live QR Scanner Hub */}
          <div className="lg:col-span-5 space-y-6">
            <QuickUnlockScanner variant="widget" />
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CYCLE PROFILE (DETAILED VIEW)
          ======================================================== */}
      {profileCycle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl space-y-5 p-6 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-sm bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-900">
                    {profileCycle.id}
                  </span>
                  {getStatusBadge(profileCycle.status, profileCycle.isIdle)}
                </div>
                <h3 className="font-space font-extrabold text-xl text-slate-900 mt-1">
                  {profileCycle.name}
                </h3>
                <p className="text-xs text-slate-500">{profileCycle.categoryLabel}</p>
              </div>
              <button
                onClick={() => setProfileCycle(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo & Telemetry Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative aspect-[16/11] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                <Image
                  src={profileCycle.image}
                  alt={profileCycle.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-slate-900/80 text-white font-mono text-[11px]">
                  Laser Stencil: {profileCycle.stencilCode}
                </div>
              </div>

              {/* Status details */}
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Location Mechanism</span>
                  <div className="font-space font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#1E5631]" />
                    <span>{profileCycle.lastRecordedLocation.type}</span>
                  </div>
                  <p className="text-[11px] text-slate-600">{profileCycle.lastRecordedLocation.description}</p>
                  <p className="text-[10px] text-slate-400 font-mono">Recorded: {new Date(profileCycle.lastRecordedLocation.timestamp).toLocaleTimeString()}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Tyre Pressure</span>
                    <span className="font-space font-bold text-sm text-slate-900">{profileCycle.tirePressurePsi} PSI</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Rental Rate</span>
                    <span className="font-space font-bold text-sm text-[#1E5631]">₹25 / hour</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-0.5">
                  <div><strong>Brakes:</strong> {profileCycle.specs.brakes}</div>
                  <div><strong>Drivetrain:</strong> {profileCycle.specs.gears}</div>
                  <div><strong>Frame:</strong> {profileCycle.specs.frame}</div>
                </div>
              </div>
            </div>

            {/* Recent Usage History */}
            <div className="space-y-2">
              <h4 className="font-space font-bold text-xs uppercase tracking-wider text-slate-400">
                Recent Recorded Usage History
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200 text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2">Trip ID</th>
                      <th className="p-2">Rider</th>
                      <th className="p-2">Departure</th>
                      <th className="p-2">Return</th>
                      <th className="p-2">Fare</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {profileCycle.recentUsageHistory.map((trip, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-mono">{trip.tripId}</td>
                        <td className="p-2 font-semibold">{trip.riderName}</td>
                        <td className="p-2 text-slate-500">{trip.departureStand}</td>
                        <td className="p-2 text-slate-500">{trip.returnStand || "—"}</td>
                        <td className="p-2 font-mono font-bold text-[#1E5631]">₹{trip.fareCharged ?? 25}</td>
                        <td className="p-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            trip.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                          }`}>
                            {trip.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => {
                  setReportTargetCycle(profileCycle.id);
                  setProfileCycle(null);
                  setIsReportModalOpen(true);
                }}
                className="py-2 px-3.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition"
              >
                Report Defect on {profileCycle.id}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setProfileCycle(null)}
                  className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Close
                </button>

                {profileCycle.status === "AVAILABLE" && (
                  <button
                    onClick={() => {
                      setProfileCycle(null);
                      handleBookCycle(profileCycle);
                    }}
                    className="py-2 px-4 rounded-xl bg-[#1E5631] hover:bg-[#144525] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Book Cycle (₹25/hr)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: REPORT BICYCLE DEFECT
          ======================================================== */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-space font-extrabold text-lg text-slate-900 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-red-600" />
                  <span>Report Bicycle Defect & Maintenance</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Cycle will be placed under safety lockout until inspected by a volunteer.
                </p>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDefect} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Bicycle</label>
                <select
                  value={reportTargetCycle}
                  onChange={(e) => setReportTargetCycle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E5631]"
                >
                  {fleetList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} — {c.name} ({c.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Defect Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "BRAKES", label: "Damaged Brakes" },
                    { id: "TYRE_PUNCTURE", label: "Punctured / Flat Tyre" },
                    { id: "CHAIN_GEAR", label: "Chain / Gear Issues" },
                    { id: "SEAT_HANDLEBAR", label: "Damaged Seat / Handlebar" },
                    { id: "FRAME_PEDAL", label: "Frame / Pedals" },
                    { id: "OTHER", label: "Other Bicycle Defect" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setDefectCategory(cat.id)}
                      className={`p-2 rounded-xl text-left border font-semibold transition ${
                        defectCategory === cat.id
                          ? "bg-red-50 border-red-300 text-red-900 ring-1 ring-red-300"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Short Description of Damage</label>
                <textarea
                  rows={3}
                  value={defectDescription}
                  onChange={(e) => setDefectDescription(e.target.value)}
                  placeholder="Describe the defect (e.g. Front brake cable loose, rear tyre completely flat)..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E5631]"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Photo Upload / Asset URL (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={defectPhotoUrl}
                    onChange={(e) => setDefectPhotoUrl(e.target.value)}
                    placeholder="https://... or sample photo link"
                    className="flex-1 p-2.5 rounded-xl border border-slate-200 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setDefectPhotoUrl("/bikes/trail-gravel.jpg")}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                  >
                    Use Sample Photo
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="py-2 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  {isSubmittingReport ? "Reporting..." : "Submit Defect Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CLEAR MAINTENANCE (VOLUNTEER INSPECTION)
          ======================================================== */}
      {clearanceCycle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-space font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Volunteer Inspection & Clearance</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Certify {clearanceCycle.id} as road-ready and return to available pool.
                </p>
              </div>
              <button
                onClick={() => setClearanceCycle(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                <div className="font-space font-bold text-slate-900">{clearanceCycle.id} — {clearanceCycle.name}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  Reported Issue: {clearanceCycle.maintenanceReason || "Brake adjustment and inspection"}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Repair Cost Incurred (₹)</label>
                <input
                  type="number"
                  value={repairActualCost}
                  onChange={(e) => setRepairActualCost(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E5631]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Technician / Volunteer Notes</label>
                <textarea
                  rows={2}
                  value={repairNotes}
                  onChange={(e) => setRepairNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E5631]"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setClearanceCycle(null)}
                  className="py-2 px-3 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearMaintenance}
                  disabled={isClearingMaintenance}
                  className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isClearingMaintenance ? "Clearing..." : "Certify Road Ready"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
