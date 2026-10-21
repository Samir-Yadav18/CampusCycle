"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRide } from "@/context/RideContext";
import { CAMPUS_BIKES } from "@/data/bikes";
import { 
  Lock, 
  Unlock, 
  ShieldCheck, 
  Clock, 
  QrCode, 
  Camera, 
  ChevronRight, 
  ArrowRight, 
  Check, 
  RotateCw,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  Calendar
} from "lucide-react";
import { BookingPolicyConsole } from "@/components/BookingPolicyConsole";

export const BookingUnlockView: React.FC = () => {
  const { selectedBike, setSelectedBike, startRide, setCurrentView, currentUser } = useRide();
  const [bookingMode, setBookingMode] = useState<"policy" | "instant">("policy");
  const [stencilDigits, setStencilDigits] = useState(["0", "7", "1", "2"]);
  const [countdownSeconds, setCountdownSeconds] = useState(282); // 04:42
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [scannerMode, setScannerMode] = useState<"optical" | "manual">("optical");
  const [flashOn, setFlashOn] = useState(false);

  // Reservation window countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 300));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleTriggerUnlock = () => {
    if (selectedBike.isMaintenance) {
      alert(`Safety Hold: Bicycle ${selectedBike.name} is under maintenance. Unlocking blocked until cleared by a volunteer.`);
      return;
    }
    setIsUnlocking(true);
    // Simulate smart solenoid unlocking sound and handshake
    setTimeout(() => {
      setIsUnlocking(false);
      startRide(selectedBike);
    }, 1500);
  };

  const otherBikes = CAMPUS_BIKES.filter((b) => b.id !== selectedBike.id);

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Location & SSO Status Strip */}
      <div className="flex flex-wrap items-center justify-between text-xs py-2 px-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900">Current Location:</span>
          <span>North Quad Hub • Bay 02 Quad</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[10px] rounded bg-emerald-100 text-emerald-800 font-semibold">
            BLE 5.2 Handshake Active
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>SSO Verified: <strong className="text-slate-900">{currentUser?.name || "Samir Yadav"} (User ID: {currentUser?.userId || "260691"})</strong></span>
          <span className="text-emerald-700 font-semibold">• Active Semester Transit Pass</span>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#006699] uppercase tracking-wider block">
            INSTANT DOCK RELEASE CONSOLE
          </span>
          <h1 className="font-space text-3xl font-extrabold text-slate-900">
            Booking & Instant Unlock Portal
          </h1>
          <p className="text-xs text-slate-500">
            Authorize smart dock release and claim high-torque campus bike at North Quad station.
          </p>
        </div>

        {/* Countdown Window */}
        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm shrink-0">
          <Clock className="w-5 h-5 text-[#006699] animate-pulse" />
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Session Reservation Window</span>
            <span className="font-mono font-bold text-lg text-slate-900">
              {formatCountdown(countdownSeconds)} <span className="text-xs font-normal text-slate-500">remaining</span>
            </span>
          </div>
        </div>
      </div>

      {/* Mode Switcher: Policy Slot Reservation vs Instant Dock Viewfinder */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200">
        <button
          onClick={() => setBookingMode("policy")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            bookingMode === "policy"
              ? "bg-[#006699] text-white shadow-sm"
              : "text-slate-700 hover:text-slate-900"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Slot Reservation (Policy System)</span>
        </button>
        <button
          onClick={() => setBookingMode("instant")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            bookingMode === "instant"
              ? "bg-[#006699] text-white shadow-sm"
              : "text-slate-700 hover:text-slate-900"
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Instant Dock Viewfinder</span>
        </button>
      </div>

      {bookingMode === "policy" ? (
        <BookingPolicyConsole />
      ) : (
        <>
          {/* Approval Policy Notice Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span><strong>Approval-Based Fleet:</strong> All rides for today or tomorrow must be approved by the administrator before smart dock unlock is released.</span>
            </div>
            <button
              onClick={() => setBookingMode("policy")}
              className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-[11px] shrink-0 transition"
            >
              Check Approval Status
            </button>
          </div>

          {/* Main Grid: Viewfinder & Telemetry (Left 8) + Checkout Summary (Right 4) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Station Viewfinder & Scanner */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                <h3 className="font-space font-bold text-base text-slate-900">Station Viewfinder & Scanner</h3>
              </div>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setScannerMode("optical")}
                  className={`px-3 py-1 rounded-md transition ${
                    scannerMode === "optical" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Optical Reticle
                </button>
                <button
                  onClick={() => setScannerMode("manual")}
                  className={`px-3 py-1 rounded-md transition ${
                    scannerMode === "manual" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Manual Stencil ID
                </button>
              </div>
            </div>

            {/* Viewfinder Preview Box with HUD overlay */}
            <div className="relative aspect-[16/8] rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
              <Image
                src={selectedBike.image}
                alt={selectedBike.name}
                fill
                className="object-cover opacity-75"
              />
              {/* Camera Scanner Reticle */}
              <div className="absolute inset-0 scanner-grid flex items-center justify-center pointer-events-none">
                <div className="w-56 h-36 border-2 border-emerald-400 rounded-lg relative flex flex-col justify-between p-2 shadow-glowVolt">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold bg-slate-950/80 px-1 rounded">
                      [QR: #VC-{selectedBike.modelCode.slice(-4)}]
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>
                  <div className="bg-slate-950/90 p-1.5 rounded border border-emerald-500/50 text-[10px] text-white font-mono">
                    <div className="text-emerald-400 font-bold">Target Locked: {selectedBike.name}</div>
                    <div className="text-slate-400">CONF: 98.4% • LATENCY: 24ms</div>
                  </div>
                </div>
              </div>

              {/* Viewfinder Bottom Controls */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button
                  onClick={() => setFlashOn(!flashOn)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold backdrop-blur-md transition ${
                    flashOn ? "bg-amber-400 text-slate-950" : "bg-black/60 text-white hover:bg-black/80"
                  }`}
                >
                  Flash {flashOn ? "ON" : "OFF"}
                </button>
                <span className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-slate-300 font-mono text-[10px]">
                  1080p@60fps
                </span>
              </div>
            </div>

            {/* Stencil manual boxes */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-500">
                Can't scan the QR? Enter 4-Digit Stencil ID laser engraved on the top tube:
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 font-mono font-bold text-base">
                  {stencilDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const newDigits = [...stencilDigits];
                        newDigits[idx] = e.target.value;
                        setStencilDigits(newDigits);
                      }}
                      className="w-9 h-10 text-center rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#006699] focus:outline-none"
                    />
                  ))}
                </div>
                <button
                  onClick={() => alert("Hardware stencil verified! Bike telemetry confirmed ready.")}
                  className="px-3 py-2 rounded-lg bg-sky-100 hover:bg-sky-200 text-[#006699] text-xs font-bold transition"
                >
                  Verify Hardware
                </button>
              </div>
            </div>
          </div>

          {/* Selected Bike Telemetry Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                  Grade A+ Fleet Condition
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Bay Position: #02 (Left Rack)
                </span>
              </div>
              <div className="font-space font-extrabold text-xl text-slate-900">
                Fleet Readiness: <span className="text-emerald-700 font-bold">100% Road Ready</span>
              </div>
            </div>

            <div>
              <h3 className="font-space text-2xl font-extrabold text-slate-900">
                {selectedBike.name} • <span className="text-slate-500 font-normal">{selectedBike.series}</span>
              </h3>
            </div>

            {/* 4 Conventional Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Brakes & Cables</span>
                <div className="font-space font-bold text-base text-slate-900">
                  Dual Caliper <span className="text-[10px] text-emerald-600 font-semibold">Inspected</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Chain & Gears</span>
                <div className="font-space font-bold text-base text-slate-900">
                  Clean & Lubed <span className="text-[10px] text-slate-500">Smooth Shift</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Tire Pressure</span>
                <div className="font-space font-bold text-base text-slate-900">
                  {selectedBike.specs.tirePressurePsi || 50} PSI <span className="text-[10px] text-slate-500">Optimal</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Safety Inspection</span>
                <div className="font-space font-bold text-base text-slate-900">
                  Grade A+ <span className="text-[10px] text-slate-500">Passed</span>
                </div>
              </div>
            </div>

            {/* Hardware Status Row */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Dock Lock Mechanism: <strong>Engaged & Secured</strong>
              </span>
              <span className="font-mono text-[11px]">GPS Precision: ±1.2m Active</span>
              <span className="font-mono text-[11px]">Firmware: v4.21-Rev0</span>
            </div>
          </div>
        </div>

        {/* Right Column: Checkout & Pre-Ride Safety Check (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl p-6 border-2 border-[#006699]/30 shadow-elevated space-y-5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              Ready for Immediate Checkout
            </div>

            <div>
              <h3 className="font-space font-bold text-lg text-slate-900">
                Selected: {selectedBike.name}
              </h3>
              <p className="text-xs text-slate-500">
                North Quad Bay 02 (15m walk from Library Gate 4)
              </p>
            </div>

            {/* Fare Tariff Breakdown */}
            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="flex justify-between text-slate-600 pt-1">
                <span>Fixed Hourly Rental</span>
                <span className="font-semibold text-slate-900">₹25.00 / hour</span>
              </div>
              <div className="flex justify-between text-emerald-700 pt-1.5">
                <span>Distance Charges</span>
                <span className="font-bold text-emerald-700">₹0.00 (Zero distance fee)</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1.5">
                <span>Smart Dock Unlock Fee</span>
                <span className="font-bold text-[#006699]">₹0.00 (Waived)</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1.5">
                <span>Deposit Hold</span>
                <span className="font-bold text-slate-900">₹0.00 (SSO Trusted)</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t-2 border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 text-sm">Estimated Ride Fare</span>
                  <span className="block text-[10px] text-slate-400">1.0 hr standard booking duration</span>
                </div>
                <div className="text-right">
                  <span className="font-space font-extrabold text-2xl text-[#006699]">₹25.00</span>
                  <span className="block text-[10px] text-slate-400">Campus Wallet</span>
                </div>
              </div>
            </div>

            {/* Mandatory Pre-Ride Safety Check */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                <span>Mandatory Pre-Ride Safety Check</span>
                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  4/4 Auto-Verified
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-700 p-1.5 rounded-lg bg-slate-50">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Mechanical disc brakes functional
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Tested</span>
                </div>
                <div className="flex items-center justify-between text-slate-700 p-1.5 rounded-lg bg-slate-50">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Tires at recommended pressure (52 PSI)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Sensored</span>
                </div>
                <div className="flex items-center justify-between text-slate-700 p-1.5 rounded-lg bg-slate-50">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    UV-C Sanitized Dock Helmet Secured
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Rack #02</span>
                </div>
                <div className="flex items-center justify-between text-slate-700 p-1.5 rounded-lg bg-slate-50">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Front & rear safety spoke reflectors intact
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Passed</span>
                </div>
              </div>
            </div>

            {/* Primary Action Button: Unlock Bike */}
            <div className="space-y-2 pt-2">
              {selectedBike.isMaintenance ? (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-red-900">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>Maintenance Safety Lockout Active</span>
                  </div>
                  <p>
                    {selectedBike.name} is currently flagged for maintenance inspection. Unlocking is disabled until cleared by an authorized volunteer.
                  </p>
                </div>
              ) : null}

              <button
                onClick={handleTriggerUnlock}
                disabled={isUnlocking || selectedBike.isMaintenance}
                className="w-full py-4 px-4 rounded-xl bg-[#1E5631] hover:bg-[#144525] disabled:bg-slate-300 text-white font-space font-bold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
              >
                {isUnlocking ? (
                  <>
                    <RotateCw className="w-5 h-5 text-amber-300 animate-spin" />
                    <span>Unlatching Dock Stanchion Lock...</span>
                  </>
                ) : selectedBike.isMaintenance ? (
                  <>
                    <Lock className="w-5 h-5 text-slate-500" />
                    <span>Bicycle Under Maintenance (Locked)</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 text-amber-300 group-hover:hidden" />
                    <Unlock className="w-5 h-5 text-amber-300 hidden group-hover:block" />
                    <span>Slide or Click to Unlock {selectedBike.name.split(" ")[0]} #{selectedBike.name.split("#")[1] || "04"}</span>
                    <ArrowRight className="w-5 h-5 text-amber-300 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <button
                onClick={() => setCurrentView("stations")}
                className="w-full py-2 text-center text-xs text-slate-500 hover:text-slate-800 font-medium transition"
              >
                Switch Bike / Choose Other Bay
              </button>
            </div>

            {/* Auto release hint */}
            <div className="p-3 rounded-xl bg-sky-50/80 border border-sky-100 text-[11px] text-slate-600 space-y-1">
              <div className="font-semibold text-[#006699] flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Smart Lock Auto-Release:
              </div>
              <p>
                Once triggered, the rear wheel solenoid lock will pop open in <strong>1.8 seconds</strong> with an audible double-chime. Please ensure kickstand is stowed before mounting.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Switcher: Other Available Bikes at Station */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-space font-bold text-sm text-slate-900">
            Other Available Bikes at North Quad
          </h3>
          <button 
            onClick={() => setCurrentView("stations")}
            className="text-xs text-[#006699] font-semibold hover:underline flex items-center gap-0.5"
          >
            <span>View All Docks</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {otherBikes.map((bike) => (
            <div
              key={bike.id}
              className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 flex items-center justify-between bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-10 rounded-lg overflow-hidden bg-slate-200">
                  <Image src={bike.image} alt={bike.name} fill className="object-cover" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">{bike.name}</div>
                  <div className="text-[10px] text-slate-500">{bike.specs.topSpeed} • {bike.specs.motorOrGear.slice(0, 24)}...</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedBike(bike)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Select
              </button>
            </div>
          ))}
        </div>
      </div>
      </>
      )}
    </div>
  );
};
