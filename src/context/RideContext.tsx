"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CAMPUS_BIKES, Bike } from "@/data/bikes";
import { CAMPUS_STATIONS, Station } from "@/data/stations";
import { PublicUserProfile } from "@/models/types";

export type AppView = "map" | "stations" | "booking" | "active-ride" | "trip-summary" | "onboarding";

export interface ActiveRideTelemetry {
  rideId: string;
  bookingId: string;
  bike: Bike;
  startTime: number;
  checkOutTimeMs: number;
  checkOutTimeText: string;
  expectedReturnTimeMs: number;
  expectedReturnTimeText: string;
  elapsedSeconds: number;
  distanceKm: number;
  currentCost: number;
  currentSpeed: number;
  cadence: number;
  isOverdue: boolean;
  overdueSeconds: number;
  isDemoMode: boolean;
}

export interface CompletedTrip {
  rideId: string;
  bookingId?: string;
  bike: Bike;
  startStation: string;
  endStation: string;
  startTimeText: string;
  endTimeText: string;
  durationSeconds: number;
  distanceKm: number;
  caloriesBurned: number;
  carbonSavedKg: number;
  avgSpeedKmH: number;
  maxSpeedKmH: number;
  baseFare: number;
  subsidyDiscount: number;
  rebalanceBonus: number;
  finalSettlementDue: number;
  paid: boolean;
  paymentMethod: string;
  xpEarned: number;
  isLateReturn?: boolean;
  overdueMinutes?: number;
}

export const DEFAULT_USER: PublicUserProfile = {
  id: "260691",
  userId: "260691",
  name: "Samir Yadav",
  email: "260691@aitpune.edu.in",
  role: "student",
  department: "Computer Engineering",
  semester: "6th Semester",
};

interface RideContextType {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  selectedStation: Station;
  setSelectedStation: (station: Station) => void;
  selectedBike: Bike;
  setSelectedBike: (bike: Bike) => void;
  activeRide: ActiveRideTelemetry | null;
  startRide: (bike: Bike, bookingId?: string) => void;
  endRide: () => void;
  completedTrip: CompletedTrip | null;
  payTripSettlement: (method: string) => Promise<{ success: boolean; error?: string }>;
  deviceViewMode: "desktop" | "mobile";
  setDeviceViewMode: (mode: "desktop" | "mobile") => void;
  showStitchModal: boolean;
  setShowStitchModal: (show: boolean) => void;
  walletBalance: number;
  refreshWallet: (overrideUserId?: string) => Promise<void>;
  isWalletModalOpen: boolean;
  setIsWalletModalOpen: (open: boolean) => void;
  currentUser: PublicUserProfile | null;
  setCurrentUser: (user: PublicUserProfile | null) => void;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  loginUser: (userId: string, password: string) => Promise<{ success: boolean; error?: string; user?: PublicUserProfile; redirectUrl?: string }>;
  logoutUser: () => Promise<void>;
  availableUsers: PublicUserProfile[];
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
}

const RideContext = createContext<RideContextType | undefined>(undefined);

export const RideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<AppView>("map");
  const [selectedStation, setSelectedStation] = useState<Station>(CAMPUS_STATIONS[0]);
  const [selectedBike, setSelectedBike] = useState<Bike>(CAMPUS_BIKES[2]); // Mountain Bike #04 by default
  const [activeRide, setActiveRide] = useState<ActiveRideTelemetry | null>(null);
  const [completedTrip, setCompletedTrip] = useState<CompletedTrip | null>(null);
  const [deviceViewMode, setDeviceViewMode] = useState<"desktop" | "mobile">("desktop");
  const [showStitchModal, setShowStitchModal] = useState<boolean>(false);
  const [walletBalance, setWalletBalance] = useState<number>(50.0);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<PublicUserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(false);
  const [availableUsers, setAvailableUsers] = useState<PublicUserProfile[]>([DEFAULT_USER]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Load saved user session or fetch from server
  useEffect(() => {
    let cachedUser: PublicUserProfile | null = null;
    try {
      const saved = localStorage.getItem("campuscycle_current_user");
      if (saved) {
        cachedUser = JSON.parse(saved);
        if (cachedUser && cachedUser.userId) {
          setCurrentUser(cachedUser);
        }
      }
    } catch {}

    // Verify against server session /api/auth/me
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.authenticated && data.user) {
          setCurrentUser(data.user);
          try {
            localStorage.setItem("campuscycle_current_user", JSON.stringify(data.user));
          } catch {}
        } else if (data.authenticated === false) {
          // If server confirms no session, clear client state
          setCurrentUser(null);
          try {
            localStorage.removeItem("campuscycle_current_user");
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingAuth(false);
      });

    fetch("/api/auth/users")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.users)) {
          setAvailableUsers(data.users);
        }
      })
      .catch(() => {});
  }, []);

  const loginUser = async (userId: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
        try {
          localStorage.setItem("campuscycle_current_user", JSON.stringify(data.user));
        } catch {}
        refreshWallet(data.user.userId);
        return { success: true, user: data.user, redirectUrl: data.redirectUrl };
      }
      return { success: false, error: data.error || "Authentication failed" };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      return { success: false, error: message };
    }
  };

  const logoutUser = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setCurrentUser(null);
    try {
      localStorage.removeItem("campuscycle_current_user");
    } catch {}
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  // Refresh trusted student wallet balance from server
  const refreshWallet = async (overrideUserId?: string) => {
    try {
      const uid = overrideUserId || currentUser?.userId || "260691";
      const res = await fetch(`/api/wallet?studentId=${uid}`);
      const data = await res.json();
      if (data.success && data.wallet) {
        setWalletBalance(data.wallet.balance);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (currentUser?.userId) {
      refreshWallet(currentUser.userId);
    }
  }, [currentUser?.userId]);

  // Continuous active ride live timer (No Pause mechanism permitted)
  useEffect(() => {
    if (!activeRide) return;

    const interval = setInterval(() => {
      setActiveRide((prev) => {
        if (!prev) return null;
        const newSeconds = prev.elapsedSeconds + 1;
        // Approx 16 km/h speed for distance statistic
        const speed = 15.5 + Math.sin(newSeconds * 0.1) * 2.5;
        const addedKm = (speed / 3600);
        const newDist = parseFloat((prev.distanceKm + addedKm).toFixed(2));
        
        // Fixed hourly pricing: duration in hours * ₹25 (strictly duration-based)
        const durationHours = Math.max(1, Math.ceil(newSeconds / 3600));
        const newCost = parseFloat((durationHours * 25.0).toFixed(2));
        const cadence = Math.round(70 + Math.sin(newSeconds * 0.2) * 8);

        // Check return deadline status against stored expectedReturnTimeMs
        const now = Date.now();
        const overdueDiffMs = now - prev.expectedReturnTimeMs;
        const isOverdue = overdueDiffMs > 0;
        const overdueSeconds = isOverdue ? Math.floor(overdueDiffMs / 1000) : 0;

        return {
          ...prev,
          elapsedSeconds: newSeconds,
          currentSpeed: parseFloat(speed.toFixed(1)),
          distanceKm: newDist, // Distance is purely statistical
          currentCost: newCost,
          cadence,
          isOverdue,
          overdueSeconds,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeRide]);

  const startRide = (bike: Bike, bookingId: string = "BK-20261017-9921") => {
    setSelectedBike(bike);
    const now = Date.now();
    const checkOutTimeMs = now;
    const expectedReturnTimeMs = checkOutTimeMs + 60 * 60 * 1000; // 1 hr standard slot

    const checkOutDate = new Date(checkOutTimeMs);
    const checkOutTimeText = checkOutDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const returnDate = new Date(expectedReturnTimeMs);
    const expectedReturnTimeText = returnDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // Atomic sync with fleet store
    fetch("/api/fleet/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cycleId: bike.id,
        riderId: "IITB-22B0814",
        riderName: "Aryan K.",
        departureStand: "Sports Complex & Tennis Courts Stand",
      }),
    }).catch(() => {});

    const newRide: ActiveRideTelemetry = {
      rideId: "#VC-9921",
      bookingId,
      bike,
      startTime: checkOutTimeMs,
      checkOutTimeMs,
      checkOutTimeText,
      expectedReturnTimeMs,
      expectedReturnTimeText,
      elapsedSeconds: 0,
      distanceKm: 0.0,
      currentCost: 25.0, // Fixed hourly tariff (1 hr = ₹25.00)
      currentSpeed: 16.4,
      cadence: 74,
      isOverdue: false,
      overdueSeconds: 0,
      isDemoMode: false,
    };
    setActiveRide(newRide);
    setCurrentView("active-ride");
  };

  const endRide = async () => {
    const elapsed = activeRide ? activeRide.elapsedSeconds : 1104;
    const dist = activeRide ? activeRide.distanceKm : 3.4; // Purely statistical
    const rideId = activeRide?.rideId || "#VC-9921";
    const cycleId = activeRide?.bike?.id || selectedBike.id;
    
    // Check if return was late
    let isLateReturn = activeRide?.isOverdue || false;
    let overdueMinutes = activeRide ? Math.ceil(activeRide.overdueSeconds / 60) : 0;

    // Trigger backend end-trip check-in
    try {
      const res = await fetch("/api/telemetry/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: "IITB-22B0814",
          rideId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        isLateReturn = data.wasLate;
        overdueMinutes = Math.ceil(data.overdueSeconds / 60);
      }
    } catch {
      // ignore
    }

    // Atomic sync with fleet store check-in
    try {
      await fetch("/api/fleet/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycleId,
          returnStand: "Sports Complex & Tennis Courts Stand",
          volunteerId: "VOL-001",
        }),
      });
    } catch {
      // ignore
    }

    // Fixed hourly pricing: duration in hours * ₹25 (1 hour = ₹25.00)
    const bookedDurationHours = 1.0;
    const baseFare = parseFloat((bookedDurationHours * 25.0).toFixed(2)); // ₹25.00
    const subsidy = 0.0;
    const rebalanceBonus = 0.0;
    const finalSettlement = baseFare; // Strictly ₹25.00 (distance does not change fare)

    const trip: CompletedTrip = {
      rideId,
      bookingId: activeRide?.bookingId || "BK-20261017-9921",
      bike: activeRide?.bike || selectedBike,
      startStation: "North Quad Hub",
      endStation: "SAC Central Hub (Bay A03)",
      startTimeText: activeRide?.checkOutTimeText || "16:24 IST",
      endTimeText: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) + " IST",
      durationSeconds: elapsed,
      distanceKm: dist, // Statistical display only
      caloriesBurned: 112,
      carbonSavedKg: 0.42,
      avgSpeedKmH: 16.2,
      maxSpeedKmH: 21.0,
      baseFare,
      subsidyDiscount: subsidy,
      rebalanceBonus,
      finalSettlementDue: finalSettlement,
      paid: false,
      paymentMethod: "Campus Wallet (Sandbox)",
      xpEarned: 18,
      isLateReturn,
      overdueMinutes: isLateReturn ? overdueMinutes : 0,
    };

    setCompletedTrip(trip);
    setActiveRide(null);
    setCurrentView("trip-summary");
  };

  const payTripSettlement = async (method: string): Promise<{ success: boolean; error?: string }> => {
    if (!completedTrip) return { success: false, error: "No completed trip." };

    if (method.includes("Wallet") || method === "wallet") {
      try {
        const res = await fetch("/api/wallet/debit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: "IITB-22B0814",
            amount: completedTrip.finalSettlementDue,
            rideId: completedTrip.rideId,
            idempotencyKey: `SETTLE-${completedTrip.rideId}`,
            description: `Rental settlement: ${completedTrip.rideId} (1 hr @ ₹25/hr fixed rate)`,
            bookedDurationHours: 1,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || "Insufficient wallet balance." };
        }
        await refreshWallet();
      } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : "Network error" };
      }
    }

    setCompletedTrip((prev) => (prev ? { ...prev, paid: true, paymentMethod: method } : null));
    return { success: true };
  };

  return (
    <RideContext.Provider
      value={{
        currentView,
        setCurrentView,
        selectedStation,
        setSelectedStation,
        selectedBike,
        setSelectedBike,
        activeRide,
        startRide,
        endRide,
        completedTrip,
        payTripSettlement,
        deviceViewMode,
        setDeviceViewMode,
        showStitchModal,
        setShowStitchModal,
        walletBalance,
        refreshWallet,
        isWalletModalOpen,
        setIsWalletModalOpen,
        currentUser,
        setCurrentUser,
        isAuthenticated: !!currentUser,
        isLoadingAuth,
        loginUser,
        logoutUser,
        availableUsers,
        isAuthModalOpen,
        setIsAuthModalOpen,
      }}
    >
      {children}
    </RideContext.Provider>
  );
};

export const useRide = () => {
  const context = useContext(RideContext);
  if (!context) {
    throw new Error("useRide must be used within a RideProvider");
  }
  return context;
};
