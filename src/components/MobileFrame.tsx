"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useRide } from "@/context/RideContext";
import { 
  Compass, 
  Bike as BikeIcon, 
  CreditCard, 
  Award, 
  Wifi, 
  Battery, 
  Signal, 
  X,
  Monitor,
  MapPin
} from "lucide-react";

export const MobileFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { currentView, setCurrentView, setDeviceViewMode } = useRide();

  return (
    <div className="py-6 flex flex-col items-center justify-center min-h-[90vh]">
      {/* Switcher Banner */}
      <div className="mb-4 flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm text-xs">
        <span className="font-semibold text-slate-700">Mobile Companion View (390px iPhone Frame)</span>
        <button
          onClick={() => setDeviceViewMode("desktop")}
          className="text-[#006699] font-bold hover:underline flex items-center gap-1"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Switch to Web Portal</span>
        </button>
      </div>

      {/* Phone Mockup Frame */}
      <div className="relative w-[390px] h-[844px] bg-white rounded-[50px] shadow-2xl border-[10px] border-slate-900 overflow-hidden flex flex-col ring-1 ring-slate-900/10">
        {/* Dynamic Island / Speaker notch */}
        <div className="h-10 bg-white flex items-center justify-between px-7 shrink-0 z-40 select-none">
          <span className="text-[12px] font-bold font-mono text-slate-900">9:41</span>
          <div className="w-24 h-5 bg-slate-950 rounded-full mx-auto"></div>
          <div className="flex items-center gap-1.5 text-slate-900">
            <Signal className="w-3 h-3" />
            <Wifi className="w-3 h-3" />
            <Battery className="w-4 h-4" />
          </div>
        </div>

        {/* Scrollable View Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative bg-[#F8FAFC]">
          {children}
        </div>

        {/* Mobile Bottom Navigation Bar (Matching Stitch mobile prototype) */}
        <div className="h-16 bg-white border-t border-slate-200 flex items-center justify-around px-2 shrink-0 z-40 select-none shadow-md">
          <button
            onClick={() => {
              setCurrentView("map");
              router.push("/");
            }}
            className={`flex flex-col items-center gap-0.5 transition ${
              currentView === "map" ? "text-slate-950 font-bold" : "text-slate-400 hover:text-slate-700"
            }`}
          >
            <div className={`p-1 rounded-full ${currentView === "map" ? "bg-amber-400 text-slate-950" : ""}`}>
              <MapPin className="w-5 h-5" />
            </div>
            <span className="text-[10px]">Map</span>
          </button>

          <button
            onClick={() => {
              setCurrentView("stations");
              router.push("/stations");
            }}
            className={`flex flex-col items-center gap-0.5 transition ${
              currentView === "stations" ? "text-slate-950 font-bold" : "text-slate-400 hover:text-slate-700"
            }`}
          >
            <div className={`p-1 rounded-full ${currentView === "stations" ? "bg-amber-400 text-slate-950" : ""}`}>
              <Compass className="w-5 h-5" />
            </div>
            <span className="text-[10px]">Fleet</span>
          </button>

          <button
            onClick={() => {
              setCurrentView("active-ride");
              router.push("/active-ride");
            }}
            className={`flex flex-col items-center gap-0.5 transition ${
              currentView === "active-ride" ? "text-slate-950 font-bold" : "text-slate-400 hover:text-slate-700"
            }`}
          >
            <div className={`p-1 rounded-full ${currentView === "active-ride" ? "bg-brand-accent text-slate-950" : ""}`}>
              <BikeIcon className="w-5 h-5" />
            </div>
            <span className="text-[10px]">Active Ride</span>
          </button>

          <button
            onClick={() => {
              setCurrentView("trip-summary");
              router.push("/trip-summary");
            }}
            className={`flex flex-col items-center gap-0.5 transition ${
              currentView === "trip-summary" ? "text-slate-950 font-bold" : "text-slate-400 hover:text-slate-700"
            }`}
          >
            <div className={`p-1 rounded-full ${currentView === "trip-summary" ? "bg-brand-accent text-slate-950" : ""}`}>
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-[10px]">Passes</span>
          </button>

          <button
            onClick={() => {
              setCurrentView("onboarding");
              router.push("/onboarding");
            }}
            className={`flex flex-col items-center gap-0.5 transition ${
              currentView === "onboarding" ? "text-slate-950 font-bold" : "text-slate-400 hover:text-slate-700"
            }`}
          >
            <div className={`p-1 rounded-full ${currentView === "onboarding" ? "bg-brand-accent text-slate-950" : ""}`}>
              <Award className="w-5 h-5" />
            </div>
            <span className="text-[10px]">Club Perks</span>
          </button>
        </div>

        {/* Home Indicator Bar */}
        <div className="h-3 bg-white flex justify-center items-center pb-1">
          <div className="w-32 h-1 bg-slate-300 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};
