"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRide, DEFAULT_USER } from "@/context/RideContext";
import { 
  Bike as BikeIcon, 
  QrCode, 
  Activity, 
  Wallet,
  ChevronDown,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Clock,
  ArrowRight,
  X,
  LogOut
} from "lucide-react";

export const Header: React.FC = () => {
  const router = useRouter();
  const { 
    currentView, 
    setCurrentView, 
    walletBalance,
    setIsWalletModalOpen,
    currentUser,
    setCurrentUser,
    logoutUser,
    availableUsers,
    setIsAuthModalOpen,
    refreshWallet
  } = useRide();

  const user = currentUser || DEFAULT_USER;

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleNavigate = (view: "map" | "stations" | "booking" | "active-ride", path: string) => {
    setCurrentView(view);
    router.push(path);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Live Indicator */}
          <button 
            onClick={() => {
              setCurrentView("map");
              router.push("/");
            }}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
            title="CampusCycle - Campus Bicycle Tracking & Fleet Management Platform"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1E5631] to-[#2D7D46] p-0.5 shadow-md group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#1E5631] rounded-[10px] flex items-center justify-center text-white">
                <BikeIcon className="w-6 h-6 text-amber-300 animate-pulse-slow" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-space font-bold text-xl text-slate-900 tracking-tight">
                  Campus<span className="text-[#1E5631]">Cycle</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide">
                AIT PUNE • FLEET TRACKING & UTILISATION
              </p>
            </div>
          </button>

          {/* Clean Navigation Bar: Home, Fleet Tracking, Book & Unlock, Live Telemetry, Wallet, Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* 1. Home Button */}
            <button
              onClick={() => handleNavigate("map", "/")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 ${
                currentView === "map"
                  ? "bg-[#1E5631] text-white shadow-md ring-2 ring-[#1E5631]/30"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900"
              }`}
              title="Home"
            >
              <span className="whitespace-nowrap">Home</span>
            </button>

            {/* 2. Fleet Tracking Button */}
            <button
              onClick={() => handleNavigate("stations", "/stations")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 ${
                currentView === "stations"
                  ? "bg-[#1E5631] text-white shadow-md ring-2 ring-[#1E5631]/30"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900"
              }`}
              title="Central Fleet Inventory, Tracking & Maintenance (35 Bicycles)"
            >
              <BikeIcon className={`w-3.5 h-3.5 ${currentView === "stations" ? "text-amber-300" : "text-[#1E5631]"}`} />
              <span className="hidden md:inline whitespace-nowrap">Fleet Tracking</span>
              <span className="md:hidden whitespace-nowrap">Fleet (35)</span>
            </button>

            {/* 3. Book and Unlock Button (Rental Service) */}
            <button
              onClick={() => handleNavigate("booking", "/booking")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 ${
                currentView === "booking"
                  ? "bg-[#1E5631] text-white shadow-md ring-2 ring-[#1E5631]/30"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900"
              }`}
              title="Book and unlock a campus cycle (₹25/hr rental)"
            >
              <QrCode className={`w-3.5 h-3.5 ${currentView === "booking" ? "text-amber-300" : "text-slate-600"}`} />
              <span className="hidden lg:inline whitespace-nowrap">Book & Unlock</span>
              <span className="lg:hidden whitespace-nowrap">Book</span>
            </button>

            {/* 4. Live Telemetry Button */}
            <button
              onClick={() => handleNavigate("active-ride", "/active-ride")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 ${
                currentView === "active-ride"
                  ? "bg-[#1E5631] text-white shadow-md ring-2 ring-[#1E5631]/30"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900"
              }`}
              title="Track active trip and live telemetry"
            >
              <Activity className={`w-3.5 h-3.5 ${currentView === "active-ride" ? "text-amber-300" : "text-emerald-600"}`} />
              <span className="hidden xl:inline whitespace-nowrap">Live Telemetry</span>
            </button>

            {/* 5. Wallet Button */}
            <button
              onClick={() => setIsWalletModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold border border-slate-700 shadow-sm transition hover:scale-[1.02] active:scale-95"
              title="Campus Wallet (Click to add funds or view balance)"
            >
              <Wallet className="w-3.5 h-3.5 text-amber-300" />
              <span className="font-space font-extrabold text-amber-300">₹{walletBalance.toFixed(2)}</span>
            </button>

            {/* 6. Functional Profile Button & Role Switcher */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className={`flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all active:scale-95 ${
                  profileDropdownOpen 
                    ? "bg-slate-100 border-[#1E5631] ring-2 ring-[#1E5631]/20" 
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                }`}
                title="Open user profile and account switcher"
                aria-expanded={profileDropdownOpen}
              >
                <div className="relative">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-slate-900 to-[#1E5631] flex items-center justify-center text-white text-xs font-bold shadow-xs">
                    {user.name.split(" ").map((n: string) => n[0]).join("")}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                </div>
                <div className="hidden lg:block text-left text-xs leading-tight">
                  <div className="font-semibold text-slate-900 flex items-center gap-1">
                    <span>{user.name}</span>
                  </div>
                  <div className="text-[10px] text-emerald-700 font-medium font-mono">ID: {user.userId}</div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Profile Dropdown Panel */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User Card Header */}
                  <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-900 via-[#006699] to-emerald-600 flex items-center justify-center text-white font-space font-extrabold text-base shadow-md">
                        {user.name.split(" ").map((n: string) => n[0]).join("")}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-space font-bold text-sm text-slate-900">{user.name}</h4>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            Verified
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono">User ID: {user.userId}</p>
                        <p className="text-[10px] text-slate-400">{user.department || "Student"} • {user.semester || "Campus Transit Pass"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setProfileDropdownOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                      title="Close profile"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Account Switcher Bar (Samir, Kirtika, Sumit) */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span>Switch Active User:</span>
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          setIsAuthModalOpen(true);
                        }}
                        className="text-[10px] text-[#006699] hover:underline font-bold"
                      >
                        Sign In / Passwords
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {availableUsers.map((u) => {
                        const isCurrent = user.userId === u.userId;
                        return (
                          <button
                            key={u.userId}
                            onClick={async () => {
                              setCurrentUser(u);
                              try {
                                localStorage.setItem("campuscycle_current_user", JSON.stringify(u));
                              } catch {}
                              await refreshWallet(u.userId);
                            }}
                            className={`p-1.5 rounded-lg text-center text-xs transition border ${
                              isCurrent
                                ? "bg-[#1E5631] text-white border-[#1E5631] font-bold shadow-xs"
                                : "bg-white hover:bg-slate-100 text-slate-800 border-slate-200"
                            }`}
                            title={`Switch account to ${u.name} (ID: ${u.userId})`}
                          >
                            <div className="truncate font-semibold text-[11px]">{u.name.split(" ")[0]}</div>
                            <div className={`text-[9px] font-mono ${isCurrent ? "text-amber-200" : "text-slate-400"}`}>
                              {u.userId}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Assigned Hub */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#006699]" />
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Assigned Dock</div>
                        <div className="font-semibold text-slate-800 text-[11px]">Sports Complex & Tennis Courts</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                      One-Stop
                    </span>
                  </div>

                  {/* Quick Wallet Summary Card */}
                  <div className="mt-3 p-3 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <Wallet className="w-3.5 h-3.5 text-amber-300" />
                        <span>Wallet Balance</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        Active
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div className="font-space font-extrabold text-2xl text-white">
                        ₹{walletBalance.toFixed(2)}
                      </div>
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          setIsWalletModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-[11px] transition shadow-xs"
                      >
                        Add Money +
                      </button>
                    </div>
                  </div>

                  {/* Transit Metrics Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Trips</div>
                      <div className="font-space font-bold text-sm text-slate-900">14</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Distance</div>
                      <div className="font-space font-bold text-sm text-[#006699]">42.5 km</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">CO₂ Saved</div>
                      <div className="font-space font-bold text-sm text-emerald-600">8.4 kg</div>
                    </div>
                  </div>

                  {/* Navigation Shortcuts */}
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleNavigate("stations", "/stations");
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#1E5631] flex items-center justify-between transition"
                    >
                      <span className="flex items-center gap-2">
                        <BikeIcon className="w-3.5 h-3.5 text-[#1E5631]" />
                        <span>Fleet Inventory & Tracking (35)</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleNavigate("booking", "/booking");
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#1E5631] flex items-center justify-between transition"
                    >
                      <span className="flex items-center gap-2">
                        <QrCode className="w-3.5 h-3.5 text-[#006699]" />
                        <span>Book & Unlock Cycle</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleNavigate("active-ride", "/active-ride");
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#006699] flex items-center justify-between transition"
                    >
                      <span className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Active Ride Telemetry</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setCurrentView("trip-summary");
                        router.push("/trip-summary");
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#006699] flex items-center justify-between transition"
                    >
                      <span className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Trip Settlement History</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>

                  {/* Footer Action: Role Status & Logout */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 text-slate-400">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Role: {user.role === "admin" ? "Admin" : "Student"}
                    </span>
                    <button
                      onClick={logoutUser}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-lg transition"
                      title="Log out of session"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Visible Logout Button */}
            <button
              onClick={logoutUser}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/80 hover:bg-rose-100 text-rose-700 text-xs font-bold transition shadow-xs active:scale-95"
              title="Sign out of CampusCycle"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
