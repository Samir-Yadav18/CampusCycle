"use client";

import React, { useState, useEffect } from "react";
import { useRide } from "@/context/RideContext";
import { 
  CheckCircle2, 
  MapPin, 
  Clock, 
  Flame, 
  Leaf, 
  Star, 
  Download, 
  CreditCard, 
  Wallet, 
  QrCode, 
  ArrowRight, 
  ShieldCheck, 
  Bike as BikeIcon, 
  Award,
  Sparkles,
  Share2,
  Check,
  Lock
} from "lucide-react";

export const TripSummaryView: React.FC = () => {
  const { completedTrip, payTripSettlement, setCurrentView, selectedBike, walletBalance, setIsWalletModalOpen } = useRide();
  const [selectedPayment, setSelectedPayment] = useState<string>("wallet");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string>("");
  const [rating, setRating] = useState(5);
  const [feedbackNotes, setFeedbackNotes] = useState("Front LED spotlight was very crisp. Rack lock clasped smoothly at SAC.");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [selectedDiagnostics, setSelectedDiagnostics] = useState<string[]>(["Smooth gears", "Firm brakes"]);
  const [recordedPoints, setRecordedPoints] = useState<{ x: number; y: number }[]>([]);
  const [isRealGpsRecorded, setIsRealGpsRecorded] = useState<boolean>(false);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("campuscycle_active_trip_state");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.routeTrace && Array.isArray(parsed.routeTrace) && parsed.routeTrace.length > 1) {
          const pts = parsed.routeTrace.map((p: { xPercent?: number; yPercent?: number }) => ({
            x: 30 + ((p.xPercent || 50) / 100) * 300,
            y: 90 - ((p.yPercent || 50) / 100) * 60,
          }));
          setRecordedPoints(pts);
          setIsRealGpsRecorded(!parsed.isDemoMode);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Fallback if accessed directly (Strictly ₹10/hr flat rate)
  const trip = completedTrip || {
    rideId: "#VC-9921",
    bike: selectedBike,
    startStation: "North Quad Hub #04",
    endStation: "SAC Central Hub (Bay A03)",
    startTimeText: "16:24 IST",
    endTimeText: "16:42 IST",
    durationSeconds: 1104, // 18m 24s
    distanceKm: 3.4, // Purely statistical
    caloriesBurned: 112,
    carbonSavedKg: 0.42,
    avgSpeedKmH: 16.2,
    maxSpeedKmH: 21.0,
    baseFare: 25.0, // Fixed 1.0 hr = ₹25.00
    subsidyDiscount: 0.0,
    rebalanceBonus: 0.0,
    finalSettlementDue: 25.0,
    paid: false,
    paymentMethod: "Campus Wallet (Sandbox)",
    xpEarned: 18,
  };

  const toggleDiagnostic = (item: string) => {
    if (selectedDiagnostics.includes(item)) {
      setSelectedDiagnostics(selectedDiagnostics.filter((i) => i !== item));
    } else {
      setSelectedDiagnostics([...selectedDiagnostics, item]);
    }
  };

  const handlePay = async () => {
    setIsProcessingPayment(true);
    setPaymentError("");

    const method = 
      selectedPayment === "wallet" 
        ? "Campus Wallet" 
        : selectedPayment === "upi" 
        ? "Instant UPI (GPay)" 
        : "RuPay Card";

    const res = await payTripSettlement(method);
    setIsProcessingPayment(false);

    if (!res.success) {
      setPaymentError(res.error || "Payment settlement failed.");
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Banner: Trip Completed Successfully */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-space font-extrabold text-xl sm:text-2xl text-slate-900">
                Trip Completed Successfully!
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                Dock Electronic Lock Engaged • Bay A03 at SAC Central Hub
              </span>
              {trip.isLateReturn && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-300">
                  Late Return Recorded (+{trip.overdueMinutes || 1}m Overdue)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated GPS docking verified & rack sensor photo confirmed at {trip.endTimeText}.
            </p>
          </div>
        </div>

        {/* Right Bike status pill */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs shrink-0">
          <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#006699] flex items-center justify-center">
            <BikeIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900">{trip.bike.name}</div>
            <div className="text-[10px] text-slate-500">Rack Slot 03 • SAC Terminal</div>
          </div>
          <span className="font-mono text-emerald-700 font-bold bg-white px-2 py-1 rounded border border-slate-200 text-[11px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Inspected
          </span>
        </div>
      </div>

      {/* Main Content Grid: Trip Trace & Rating (Left 7) + Tariff & Payment (Right 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Trip Trace */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-space font-bold text-base text-slate-900">Trip Trace</span>
                <span className="px-2.5 py-0.5 rounded-md bg-sky-50 text-[#006699] font-mono text-xs font-semibold">
                  North Quad Hub → SAC Central Hub
                </span>
                {isRealGpsRecorded && recordedPoints.length > 1 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Recorded GPS Path
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Demo Trace
                  </span>
                )}
              </div>
              <span className="text-xs font-mono text-slate-400">
                {trip.startTimeText} — {trip.endTimeText}
              </span>
            </div>

            {/* Route Map Graphic */}
            <div className="relative aspect-[16/7] rounded-xl bg-gradient-to-r from-slate-100 via-sky-50 to-emerald-50 border border-slate-200 overflow-hidden p-3 flex items-center justify-center">
              <div className="absolute top-2 left-3 px-2 py-0.5 rounded bg-white/90 text-[10px] font-bold text-slate-700 border border-slate-200">
                Speed Geofence Adhered: 100% on Green Corridor
              </div>

              <div className="absolute top-2 right-3 px-2 py-0.5 rounded bg-white/90 text-[10px] font-bold border border-slate-200">
                {isRealGpsRecorded && recordedPoints.length > 1 ? (
                  <span className="text-emerald-700 font-extrabold">Actual Recorded Path</span>
                ) : (
                  <span className="text-amber-800 font-extrabold">Demo Trace (Sample Path)</span>
                )}
              </div>

              <svg className="w-full h-full" viewBox="0 0 360 120">
                {recordedPoints.length > 1 ? (
                  <polyline
                    points={recordedPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
                    stroke="#10b981"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ) : (
                  <path
                    d="M 30,80 Q 120,20 220,70 T 330,30"
                    stroke="#34C759"
                    strokeWidth="5"
                    fill="none"
                    strokeLinecap="round"
                  />
                )}
                <circle cx={recordedPoints.length > 1 ? recordedPoints[0].x : 30} cy={recordedPoints.length > 1 ? recordedPoints[0].y : 80} r="6" fill="#006699" />
                <circle cx={recordedPoints.length > 1 ? recordedPoints[recordedPoints.length - 1].x : 330} cy={recordedPoints.length > 1 ? recordedPoints[recordedPoints.length - 1].y : 30} r="7" fill="#34C759" stroke="#fff" strokeWidth="2" />
              </svg>

              <div className="absolute bottom-2 left-3 text-[10px] text-slate-600 bg-white/80 px-2 py-0.5 rounded font-medium">
                Start: North Quad Dock #04
              </div>
              <div className="absolute bottom-2 right-3 text-[10px] text-slate-600 bg-white/80 px-2 py-0.5 rounded font-medium">
                Arrival: SAC Hub Bay A03 (+12m Elev)
              </div>
            </div>

            {/* 4 Performance Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Avg Speed</span>
                <span className="font-space font-bold text-base text-slate-900">{trip.avgSpeedKmH} km/h</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Max Speed</span>
                <span className="font-space font-bold text-base text-slate-900">{trip.maxSpeedKmH} km/h</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Geofence Adh.</span>
                <span className="font-space font-bold text-base text-emerald-600">100%</span>
              </div>
              <div className="p-3 rounded-xl bg-lime-50 border border-lime-200 text-center">
                <span className="text-[10px] text-lime-800 font-bold uppercase block">Club Rank XP</span>
                <span className="font-space font-bold text-base text-lime-900">+{trip.xpEarned} XP</span>
              </div>
            </div>
          </div>

          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase">Total Distance</span>
                <MapPin className="w-4 h-4 text-[#006699]" />
              </div>
              <div className="font-space font-extrabold text-2xl text-slate-900">
                {trip.distanceKm} <span className="text-xs font-normal text-slate-500">km</span>
              </div>
              <p className="text-[10px] text-slate-500">100% flat campus path</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase">Total Duration</span>
                <Clock className="w-4 h-4 text-[#006699]" />
              </div>
              <div className="font-space font-extrabold text-2xl text-slate-900">
                18:24 <span className="text-xs font-normal text-slate-500">mins</span>
              </div>
              <p className="text-[10px] text-slate-500">18 mins 24 secs elapsed</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase">Calories Burned</span>
                <Flame className="w-4 h-4 text-orange-500" />
              </div>
              <div className="font-space font-extrabold text-2xl text-slate-900">
                {trip.caloriesBurned} <span className="text-xs font-normal text-slate-500">kcal</span>
              </div>
              <p className="text-[10px] text-orange-600 font-semibold">+18 Club XP today</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase">Carbon Saved</span>
                <Leaf className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="font-space font-extrabold text-2xl text-emerald-600">
                {trip.carbonSavedKg} <span className="text-xs font-normal text-slate-500">kg CO₂</span>
              </div>
              <p className="text-[10px] text-slate-500">Green Transit footprint</p>
            </div>
          </div>

          {/* Rate Your Ride & Bike Condition */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-space font-bold text-base text-slate-900">Rate Your Ride & Bike Condition</h3>
              <p className="text-xs text-slate-500">Help student campus technicians keep bikes in prime running condition.</p>
            </div>

            {/* Stars */}
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= rating ? "text-amber-400 fill-amber-400" : "text-slate-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-bold text-slate-700">
                {rating === 5 ? "4.9 (Excellent)" : `${rating}.0 Rating`}
              </span>
            </div>

            {/* Mechanical Health Diagnostics chips */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">Mechanical Health Diagnostics:</label>
              <div className="flex flex-wrap gap-2 text-xs">
                {["Smooth gears", "Firm brakes", "Needs tire air", "Chain squeak", "Pedal alignment"].map((item) => {
                  const isSelected = selectedDiagnostics.includes(item);
                  return (
                    <button
                      key={item}
                      onClick={() => toggleDiagnostic(item)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                        isSelected
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Feedback textarea */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Notes for student bike mechanic workshop:
              </label>
              <textarea
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                rows={2}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#006699] focus:outline-none bg-slate-50"
              />
            </div>

            <button
              onClick={() => {
                setFeedbackSubmitted(true);
                alert("Thank you! Feedback & diagnostic telemetry logged with VeloCampus Student Mechanics Hub.");
              }}
              className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
            >
              {feedbackSubmitted ? "✓ Feedback & Diagnostics Logged" : "Submit Feedback & Report Maintenance"}
            </button>
          </div>
        </div>

        {/* Right Column: Tariff & Payment Settlement (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-elevated space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">STUDENT TARIFF</span>
                <h3 className="font-space font-extrabold text-xl text-slate-900">
                  Ride ID: {trip.rideId}
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-sky-50 text-[#006699] font-mono text-xs font-bold border border-sky-200">
                Standard Plan
              </span>
            </div>

            {/* Fare Tariff Breakdown list */}
            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="flex justify-between text-slate-700 pt-1">
                <span className="font-medium">Fixed Hourly Rental (1.0 hr × ₹25.00/hr)</span>
                <span className="font-bold text-slate-900">₹{trip.finalSettlementDue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 pt-1 text-[11px]">
                <span>Distance Traveled (Trip Metric)</span>
                <span className="font-mono">{trip.distanceKm} km (₹0.00 / Zero distance fee)</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1.5">
                <span>Campus Smart Unlock Fee</span>
                <span className="font-bold text-[#006699]">FREE (Waived)</span>
              </div>

              {/* Total Settlement Due */}
              <div className="flex justify-between items-baseline pt-3 border-t-2 border-slate-200">
                <div>
                  <span className="font-space font-extrabold text-slate-900 text-base">Total Settlement Due</span>
                  <span className="block text-[10px] text-slate-400">Strictly duration-based tariff (₹25/hr)</span>
                </div>
                <div className="text-right">
                  <span className="font-space font-extrabold text-3xl text-[#006699]">
                    ₹{trip.finalSettlementDue.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">Select Payment Method</label>
                <button
                  type="button"
                  onClick={() => setIsWalletModalOpen(true)}
                  className="text-xs text-[#006699] font-bold hover:underline"
                >
                  Manage Wallet
                </button>
              </div>

              <div className="space-y-2">
                {/* Campus Student Wallet (Primary) */}
                <label
                  onClick={() => setSelectedPayment("wallet")}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    selectedPayment === "wallet"
                      ? "border-[#006699] bg-sky-50/60 ring-1 ring-[#006699]"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={selectedPayment === "wallet"}
                      onChange={() => setSelectedPayment("wallet")}
                      className="text-[#006699]"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span>Campus Student Wallet</span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[9px] font-bold">SANDBOX</span>
                      </div>
                      <div className={`text-[10px] ${walletBalance < trip.finalSettlementDue ? "text-red-600 font-bold" : "text-slate-500"}`}>
                        Available Balance: ₹{walletBalance.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <Wallet className="w-5 h-5 text-[#006699]" />
                </label>

                {/* Instant UPI */}
                <label
                  onClick={() => setSelectedPayment("upi")}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    selectedPayment === "upi"
                      ? "border-[#006699] bg-sky-50/60 ring-1 ring-[#006699]"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={selectedPayment === "upi"}
                      onChange={() => setSelectedPayment("upi")}
                      className="text-[#006699]"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span>Instant UPI</span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">FASTEST</span>
                      </div>
                      <div className="text-[10px] text-slate-500">Google Pay, PhonePe, Paytm, BHIM</div>
                    </div>
                  </div>
                  <QrCode className="w-5 h-5 text-slate-400" />
                </label>

                {/* RuPay / Debit Card */}
                <label
                  onClick={() => setSelectedPayment("card")}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    selectedPayment === "card"
                      ? "border-[#006699] bg-sky-50/60 ring-1 ring-[#006699]"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={selectedPayment === "card"}
                      onChange={() => setSelectedPayment("card")}
                      className="text-[#006699]"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900">RuPay / Debit Card</div>
                      <div className="text-[10px] text-slate-500">Visa, MasterCard, RuPay •• 6012</div>
                    </div>
                  </div>
                  <CreditCard className="w-5 h-5 text-slate-400" />
                </label>
              </div>

              {/* Insufficient Wallet Balance Alert */}
              {selectedPayment === "wallet" && walletBalance < trip.finalSettlementDue && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Insufficient Wallet Balance</span>
                    <span className="font-mono text-[11px]">Shortfall: ₹{(trip.finalSettlementDue - walletBalance).toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-slate-700">
                    Required: <strong>₹{trip.finalSettlementDue.toFixed(2)}</strong>, but only <strong>₹{walletBalance.toFixed(2)}</strong> available.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsWalletModalOpen(true)}
                    className="w-full py-2 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition"
                  >
                    + Add Money to Wallet
                  </button>
                </div>
              )}

              {paymentError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                  {paymentError}
                </div>
              )}

              {/* Pay Button */}
              {trip.paid ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
                  <div className="font-space font-bold text-emerald-800 text-sm flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Settlement Paid (₹{trip.finalSettlementDue.toFixed(2)})
                  </div>
                  <div className="text-[10px] text-emerald-700">
                    Paid via {trip.paymentMethod}. Transaction #TXN-998102
                  </div>
                </div>
              ) : (
                <button
                  onClick={handlePay}
                  disabled={isProcessingPayment || (selectedPayment === "wallet" && walletBalance < trip.finalSettlementDue)}
                  className="w-full py-4 px-4 rounded-xl bg-[#006699] hover:bg-[#005580] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-space font-bold text-base shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {isProcessingPayment ? (
                    <span>Processing Settlement...</span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-brand-accent" />
                      <span>
                        {selectedPayment === "wallet" && walletBalance < trip.finalSettlementDue 
                          ? "Insufficient Balance — Top-Up Required" 
                          : `Settle ₹${trip.finalSettlementDue.toFixed(2)} via ${selectedPayment === "wallet" ? "Campus Wallet" : selectedPayment.toUpperCase()}`}
                      </span>
                    </>
                  )}
                </button>
              )}

              <p className="text-[10px] text-center text-slate-400">
                Official tax receipt will be sent to student roll email: <code>22b0814@campus.edu</code>
              </p>

              <div className="flex items-center justify-center gap-4 text-xs font-semibold text-[#006699] pt-1">
                <button
                  onClick={() => alert("Downloading PDF Receipt: VC_9921_Receipt.pdf")}
                  className="flex items-center gap-1 hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF Receipt</span>
                </button>
                <span>•</span>
                <button
                  onClick={() => alert("Added to Student Expense Claim portal.")}
                  className="hover:underline"
                >
                  Add to Expense Claim
                </button>
              </div>
            </div>
          </div>

          {/* Club Perks & Progress */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  CLUB PERKS & PROGRESS
                </span>
                <h4 className="font-space font-bold text-sm text-slate-900">
                  Level 4 Commuter
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded bg-lime-100 text-lime-900 font-bold text-[10px]">
                1,858 / 2,000 XP
              </span>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-lime-500 rounded-full" style={{ width: "92%" }}></div>
              </div>
              <span className="text-[10px] text-slate-500 block">
                +18 XP gained this ride! Only 142 XP to reach Gold Commuter.
              </span>
            </div>

            {/* Perk preview */}
            <div className="p-3 rounded-xl bg-lime-50/70 border border-lime-200 text-xs flex items-center gap-2.5">
              <Award className="w-5 h-5 text-lime-800 shrink-0" />
              <div>
                <strong className="text-slate-900">Free Weekend Pannier perk</strong> unlocked at Level 5!
                <div className="text-[10px] text-slate-500">Eligible for free 48-hour semester campus touring racks.</div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setCurrentView("stations")}
                className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition text-center"
              >
                Campus Dashboard
              </button>
              <button
                onClick={() => setCurrentView("booking")}
                className="py-2.5 px-3 rounded-xl bg-brand-accent hover:bg-[#c2eb00] text-slate-950 font-bold text-xs transition text-center shadow-xs"
              >
                Book Next Trip
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
