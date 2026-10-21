"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRide } from "@/context/RideContext";
import { 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Sun, 
  MapPin, 
  QrCode, 
  CreditCard, 
  Check, 
  KeyRound,
  GraduationCap,
  AlertCircle
} from "lucide-react";

export const OnboardingView: React.FC = () => {
  const { setCurrentView, currentUser, setCurrentUser, loginUser, availableUsers } = useRide();
  const [userIdInput, setUserIdInput] = useState("260691");
  const [passwordInput, setPasswordInput] = useState("260691");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsSubmitting(true);
    try {
      const res = await loginUser(userIdInput.trim(), passwordInput.trim());
      if (!res.success) {
        setAuthError(res.error || "Authentication failed. Check your User ID and password.");
      } else {
        setLoginSuccess(true);
        setTimeout(() => {
          setCurrentView("stations");
        }, 1000);
      }
    } catch {
      setAuthError("Failed to authenticate.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectPreconfiguredUser = async (u: typeof availableUsers[0]) => {
    setUserIdInput(u.userId);
    setPasswordInput(u.userId); // initial password equals user ID
    setAuthError("");
    setCurrentUser(u);
    try {
      localStorage.setItem("campuscycle_current_user", JSON.stringify(u));
    } catch {}
    setLoginSuccess(true);
    setTimeout(() => {
      setCurrentView("stations");
    }, 800);
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-300">
      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Campus Auth & Hero Pitch */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-[#006699] border border-sky-200">
              <GraduationCap className="w-3.5 h-3.5 text-[#006699]" />
              Official University Mobility Network
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-lime-100 text-lime-900 border border-lime-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-lime-700" />
              100% Pedal-Powered
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="font-space text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.08]">
              Ride campus smart.{" "}
              <span className="text-[#006699] underline decoration-brand-accent decoration-wavy decoration-2">
                Zero emissions.
              </span>{" "}
              Zero hassle.
            </h1>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
              Affordable, conventional bicycles parked right at your dorms, laboratories, and cafeteria docks. Subsidized student transit engineered specifically for university campus life.
            </p>
          </div>

          {/* Campus Auth Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-elevated border border-slate-200/80 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-[#006699]">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-space font-bold text-lg text-slate-900">Verify Your Campus Identity</h2>
                <p className="text-xs text-slate-500">Access subsidized fleet unlocks using your university credentials.</p>
              </div>
            </div>

            {/* University SSO Button */}
            <button
              onClick={() => setCurrentView("stations")}
              className="w-full py-3.5 px-4 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-medium text-sm flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all group"
            >
              <GraduationCap className="w-5 h-5 text-brand-accent group-hover:scale-110 transition-transform" />
              <span>Continue with Campus Single Sign-On (SSO)</span>
            </button>

            {/* Quick Campus User Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Official User Accounts (1-Click Switch)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {availableUsers.map((u) => {
                  const isCurrent = currentUser?.userId === u.userId;
                  return (
                    <button
                      key={u.userId}
                      type="button"
                      onClick={() => handleSelectPreconfiguredUser(u)}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        isCurrent
                          ? "bg-emerald-50 border-[#1E5631] ring-2 ring-[#1E5631]/20 shadow-xs"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900 truncate">{u.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {u.userId}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full"></div>
              <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider relative">
                OR LOG IN WITH USER ID & PASSWORD
              </span>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Manual Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    User ID
                  </label>
                  <input
                    type="text"
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value)}
                    placeholder="e.g. 260691"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#006699] bg-slate-50 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Initial Password
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#006699] bg-slate-50 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="w-4 h-4 rounded text-[#006699] focus:ring-[#006699] border-slate-300"
                  />
                  <span>Remember this device on campus Wi-Fi</span>
                </label>
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Fast Pass Ready
                </span>
              </div>

              <button
                type="submit"
                disabled={loginSuccess || isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-brand-accent hover:bg-[#c2eb00] text-slate-900 font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-[0.99]"
              >
                {loginSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-800" />
                    <span>Authenticated! Launching Station Fleet...</span>
                  </>
                ) : isSubmitting ? (
                  <span>Verifying Credentials...</span>
                ) : (
                  <>
                    <span>Log In to CampusCycle</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Zero deposit trust badge */}
            <div className="pt-2 flex items-start gap-2.5 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p>
                <strong className="text-slate-700">Zero security deposit</strong> with verified university credentials. 100% of rental revenue directly funds campus student bike repair clinics & maintenance stands.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Hero Visual & Interactive Hub Preview */}
        <div className="lg:col-span-5 relative">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-900 aspect-[4/5] sm:aspect-[3/4]">
            <Image
              src="/campus-dock-hub.jpg"
              alt="Campus Bicycle Dock Hub"
              fill
              className="object-cover object-center"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent"></div>

            {/* Top Hub Status Pill */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 text-white text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>North Quad Hub</span>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-brand-accent text-slate-950 text-xs font-bold font-mono">
                14 bikes ready
              </div>
            </div>

            {/* Floating Live Telemetry Overlay Card */}
            <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-white/95 backdrop-blur-md shadow-xl border border-white/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    🚲
                  </div>
                  <div>
                    <div className="font-space font-bold text-sm text-slate-900">35 Bicycles Fleet</div>
                    <div className="text-[10px] text-slate-500 font-medium">Central Sports & Tennis Courts Dock</div>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  98.4% Uptime
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                <div className="p-2 rounded-lg bg-slate-50">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Fleet Health</div>
                  <div className="font-bold text-slate-900">100% Inspected</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Student Rate</div>
                  <div className="font-bold text-emerald-600">Flat ₹25 / hr</div>
                </div>
              </div>

              <button
                onClick={() => setCurrentView("stations")}
                className="w-full py-2.5 rounded-xl bg-[#006699] text-white text-xs font-bold hover:bg-[#005580] transition flex items-center justify-center gap-1.5"
              >
                <span>Explore Live Station Fleet</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* How VeloCampus Works */}
      <div className="pt-8 border-t border-slate-200 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold tracking-widest text-[#006699] uppercase">Simple Campus Transit</span>
          <h2 className="font-space text-3xl font-extrabold text-slate-900">How VeloCampus Works</h2>
          <p className="text-sm text-slate-600">
            No messy physical keys, zero hassle. Travel from your library desk to the lecture hall in under four minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle hover:shadow-elevated transition-all space-y-4">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-full bg-sky-100 text-[#006699] font-space font-bold flex items-center justify-center text-sm">
                1
              </span>
              <MapPin className="w-5 h-5 text-sky-600" />
            </div>
            <h3 className="font-space font-bold text-lg text-slate-900">1. Find a Bike</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              All campus cycles are docked exclusively at the Central One-Stop Dock located at the Sports Complex & Tennis Courts point. Check real-time availability on the campus map.
            </p>
            <div className="pt-2 text-[11px] font-semibold text-[#006699] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Central Dock at Sports & Tennis Courts
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle hover:shadow-elevated transition-all space-y-4">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-full bg-lime-200 text-lime-900 font-space font-bold flex items-center justify-center text-sm">
                2
              </span>
              <QrCode className="w-5 h-5 text-lime-700" />
            </div>
            <h3 className="font-space font-bold text-lg text-slate-900">2. Unlock via App or Card</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Point your camera at the handlebar QR code or tap your university NFC student ID card on the smart hub lock to release. Unlocks in under 1.8 seconds.
            </p>
            <div className="pt-2 text-[11px] font-semibold text-lime-800 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Compatible with RFID student ID
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle hover:shadow-elevated transition-all space-y-4">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-space font-bold flex items-center justify-center text-sm">
                3
              </span>
              <CreditCard className="w-5 h-5 text-emerald-700" />
            </div>
            <h3 className="font-space font-bold text-lg text-slate-900">3. Fixed Hourly Pricing</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Heavily subsidized flat rate: strictly ₹25.00/hour with zero per-kilometre charges. Auto-deducted from trusted student wallet. Zero hidden unlock fees or penalty spikes.
            </p>
            <div className="pt-2 text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Semester passes available
            </div>
          </div>
        </div>
      </div>

      {/* Welfare Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#006699] to-[#0284C7] text-white p-6 sm:p-8 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 space-y-2">
            <span className="inline-block px-2.5 py-1 rounded bg-brand-accent text-slate-950 font-bold text-[10px] uppercase tracking-wider">
              Student Welfare Initiative
            </span>
            <h3 className="font-space text-2xl font-bold">Mobility Built for College Budgets</h3>
            <p className="text-xs text-sky-100 max-w-md leading-relaxed">
              Every ride saves an estimated 160g of carbon compared to campus auto-rickshaws while maintaining campus serenity.
            </p>
          </div>

          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
              <div className="font-bold text-sm text-brand-accent">Free Sanitization</div>
              <div className="text-[11px] text-sky-100 mt-1">UV-C helmet booths at all main hubs.</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
              <div className="font-bold text-sm text-brand-accent">Rebalance Bonus</div>
              <div className="text-[11px] text-sky-100 mt-1">Earn ₹5 credit when parking at low docks.</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
              <div className="font-bold text-sm text-brand-accent">Semester Passes</div>
              <div className="text-[11px] text-sky-100 mt-1">Unlimited 30-min trips for ₹299/term.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
