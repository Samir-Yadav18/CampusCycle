"use client";

import React from "react";
import { useRide } from "@/context/RideContext";
import { Bike as BikeIcon, ShieldAlert } from "lucide-react";

export const Footer: React.FC = () => {
  const { setCurrentView } = useRide();

  return (
    <footer className="bg-white border-t border-slate-200 mt-16 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#006699] flex items-center justify-center text-white">
              <BikeIcon className="w-4 h-4 text-brand-accent" />
            </div>
            <span className="font-space font-bold text-slate-900 text-sm">
              Velo<span className="text-[#006699]">Campus</span>
            </span>
          </div>
          <span className="hidden sm:inline text-slate-300">|</span>
          <p className="text-[11px] text-slate-500">
            © 2025 VeloCampus Mobility Solutions. University Campus Transit Network.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-medium text-slate-600">
          <button 
            onClick={() => setCurrentView("stations")}
            className="hover:text-[#006699] transition"
          >
            Campus Dock Status
          </button>
          <button 
            onClick={() => setCurrentView("onboarding")}
            className="hover:text-[#006699] transition"
          >
            Safety Guidelines
          </button>
          <a href="#" className="hover:text-[#006699] transition">
            Terms of Transit
          </a>
          <a href="#" className="hover:text-[#006699] transition">
            Student Support
          </a>
          <button
            onClick={() => alert("Report Faulty Bike dialog: Technician dispatched to Station Dock 02.")}
            className="hover:text-red-600 transition flex items-center gap-1 text-red-500 font-semibold"
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Report Faulty Bike</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
