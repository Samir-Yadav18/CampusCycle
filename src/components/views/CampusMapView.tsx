"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useRide } from "@/context/RideContext";
import { CampusDockRadar } from "@/components/CampusDockRadar";
import { 
  Bike as BikeIcon, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  QrCode, 
  Sparkles, 
  ArrowRight,
  GraduationCap,
  Sun,
  CheckCircle2,
  Compass,
  KeyRound,
  Coins
} from "lucide-react";

import { BicycleCarouselHero } from "@/components/BicycleCarouselHero";

export const CampusMapView: React.FC = () => {
  const { setCurrentView } = useRide();
  const router = useRouter();

  const handleExploreStations = () => {
    setCurrentView("stations");
    router.push("/stations");
  };

  const handleUnlockClick = () => {
    setCurrentView("booking");
    router.push("/booking");
  };

  return (
    <div className="bg-white min-h-screen animate-in fade-in duration-300">
      {/* 1. Primary Homepage Bicycle Carousel & Hero (Matches Uploaded Screenshot) */}
      <BicycleCarouselHero />

      {/* 2. Campus Cycle Map & Central One-Stop Dock Radar Centerpiece */}
      <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 border-t border-slate-100">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Sun className="w-3.5 h-3.5 text-emerald-600" />
                Army Institute of Technology, Pune
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <Coins className="w-3.5 h-3.5 text-amber-600" />
                Flat ₹25/hr Subsidized
              </span>
            </div>
            <h2 className="font-space text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              AIT Pune Campus Cycle Map & Live Dock Radar
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl mt-1">
              Campus Bicycle Tracking, Fleet Management and Real-Time Availability at the Central One-Stop Dock for all 35 campus cycles. Subsidized flat ₹25/hr transit.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExploreStations}
              className="py-2.5 px-4 rounded-xl bg-[#00A3E0] hover:bg-[#008cc2] text-white font-extrabold text-xs shadow-md transition flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-white" />
              <span>Explore Stations & Fleet</span>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
            <button
              onClick={handleUnlockClick}
              className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-slate-700" />
              <span>Instant QR Unlock</span>
            </button>
          </div>
        </div>

      {/* Primary Centerpiece: The Real Campus Mini Map & Dock Radar */}
      <div>
        <CampusDockRadar />
      </div>

      {/* Quick 3-Step Transit Workflow */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <span className="text-[11px] font-extrabold text-[#1E5631] uppercase tracking-wider">
            Seamless Campus Transit
          </span>
          <h2 className="font-space font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            How to Ride in 3 Easy Steps
          </h2>
          <p className="text-xs text-slate-500">
            Instant checkout for students and faculty across AIT Pune
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3 hover:bg-white hover:shadow-md transition">
            <div className="w-9 h-9 rounded-xl bg-[#1E5631] text-white font-extrabold text-sm flex items-center justify-center font-space shadow-xs">
              1
            </div>
            <h3 className="font-space font-bold text-base text-slate-900">Locate Dock on Map</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Check live cycle availability on the AIT Pune map above. All campus cycles are stationed at the single Central One-Stop Dock at the Sports Complex & Tennis Courts.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3 hover:bg-white hover:shadow-md transition">
            <div className="w-9 h-9 rounded-xl bg-[#1E5631] text-white font-extrabold text-sm flex items-center justify-center font-space shadow-xs">
              2
            </div>
            <h3 className="font-space font-bold text-base text-slate-900">Scan QR or Stencil Code</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Scan the handlebar QR code or enter the 4-digit stencil code to release the smart wheel lock in under 2 seconds.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3 hover:bg-white hover:shadow-md transition">
            <div className="w-9 h-9 rounded-xl bg-[#1E5631] text-white font-extrabold text-sm flex items-center justify-center font-space shadow-xs">
              3
            </div>
            <h3 className="font-space font-bold text-base text-slate-900">Flat ₹25/Hour Rate</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Enjoy subsidized green campus transit. Flat rate billed in simple hourly increments with zero per-kilometer fees.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
