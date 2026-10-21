"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRide } from "@/context/RideContext";
import { 
  X, 
  ExternalLink, 
  Layers, 
  Sparkles, 
  Palette, 
  Type, 
  Monitor, 
  Smartphone, 
  Check, 
  ArrowUpRight 
} from "lucide-react";

interface StitchScreenMeta {
  id: string;
  title: string;
  type: "Desktop Portal" | "Mobile Companion";
  mappedView: "onboarding" | "stations" | "booking" | "active-ride" | "trip-summary";
  screenshotFile: string;
}

const STITCH_SCREENS: StitchScreenMeta[] = [
  {
    id: "df393156f3b049ed90e36fbe6ebb415a",
    title: "VeloCampus - Onboarding & Campus Auth Web Portal",
    type: "Desktop Portal",
    mappedView: "onboarding",
    screenshotFile: "/stitch_screens/df393156f3b049ed90e36fbe6ebb415a.png",
  },
  {
    id: "e065b96649a740f1b04018129e4840be",
    title: "VeloCampus - Campus Station & Fleet Web Portal",
    type: "Desktop Portal",
    mappedView: "stations",
    screenshotFile: "/stitch_screens/e065b96649a740f1b04018129e4840be.png",
  },
  {
    id: "02cbadb06bc648899eef47ee391fbc4d",
    title: "VeloCampus - Booking & Instant Unlock Web Portal",
    type: "Desktop Portal",
    mappedView: "booking",
    screenshotFile: "/stitch_screens/02cbadb06bc648899eef47ee391fbc4d.png",
  },
  {
    id: "29d6723480d94b068b30b527d3d7e994",
    title: "VeloCampus - Active Ride & Live Telemetry Web Portal",
    type: "Desktop Portal",
    mappedView: "active-ride",
    screenshotFile: "/stitch_screens/29d6723480d94b068b30b527d3d7e994.png",
  },
  {
    id: "df25bb2eed7740028d92e4f84fa0f508",
    title: "VeloCampus - Post-Ride Summary & Trip Settlement Web Portal",
    type: "Desktop Portal",
    mappedView: "trip-summary",
    screenshotFile: "/stitch_screens/df25bb2eed7740028d92e4f84fa0f508.png",
  },
  {
    id: "7c57f082233940a6ac786c471c98ce72",
    title: "1. Authentication & Onboarding (Mobile)",
    type: "Mobile Companion",
    mappedView: "onboarding",
    screenshotFile: "/stitch_screens/7c57f082233940a6ac786c471c98ce72.png",
  },
  {
    id: "b6d83987073b434fb9a02bb5c97cc6b6",
    title: "2. Home / Dashboard The Station View (Mobile)",
    type: "Mobile Companion",
    mappedView: "stations",
    screenshotFile: "/stitch_screens/b6d83987073b434fb9a02bb5c97cc6b6.png",
  },
  {
    id: "0fe8d229a5f144e9a917b3d79662a20a",
    title: "3. Booking & Unlock Screen (Mobile)",
    type: "Mobile Companion",
    mappedView: "booking",
    screenshotFile: "/stitch_screens/0fe8d229a5f144e9a917b3d79662a20a.png",
  },
  {
    id: "d87e30d938fc4bd3bc46cfed6abe61d3",
    title: "4. Active Ride Screen (Mobile)",
    type: "Mobile Companion",
    mappedView: "active-ride",
    screenshotFile: "/stitch_screens/d87e30d938fc4bd3bc46cfed6abe61d3.png",
  },
  {
    id: "f6b11383a71343648fd5554faafbd070",
    title: "5. Post-Ride & Payment Summary (Mobile)",
    type: "Mobile Companion",
    mappedView: "trip-summary",
    screenshotFile: "/stitch_screens/f6b11383a71343648fd5554faafbd070.png",
  },
];

export const StitchProjectModal: React.FC = () => {
  const { showStitchModal, setShowStitchModal, setCurrentView, setDeviceViewMode } = useRide();
  const [activeTab, setActiveTab] = useState<"screens" | "tokens">("screens");
  const [previewScreen, setPreviewScreen] = useState<StitchScreenMeta | null>(null);

  if (!showStitchModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-space font-extrabold text-lg text-slate-900">
                  Google Stitch Project Integration
                </h2>
                <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-amber-100 text-amber-900 border border-amber-300">
                  ID: 18433143651599993382
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Remix of Campus Bike Share Platform • Synchronized with Stitch MCP & Next.js Website Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setActiveTab("screens")}
                className={`px-3 py-1.5 rounded-md transition ${
                  activeTab === "screens" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                10 Project Screens
              </button>
              <button
                onClick={() => setActiveTab("tokens")}
                className={`px-3 py-1.5 rounded-md transition ${
                  activeTab === "tokens" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Design DNA Tokens
              </button>
            </div>
            <button
              onClick={() => setShowStitchModal(false)}
              className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "screens" ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs text-slate-600 bg-sky-50 p-3 rounded-xl border border-sky-100">
                <span>
                  Below are all 10 synchronized screens from Stitch project <code>18433143651599993382</code>. Click on any screen to launch the live interactive Next.js replica.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {STITCH_SCREENS.map((sc) => (
                  <div
                    key={sc.id}
                    className="group rounded-2xl border border-slate-200 bg-white hover:border-[#006699] hover:shadow-elevated transition-all flex flex-col justify-between overflow-hidden"
                  >
                    <div>
                      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden cursor-pointer"
                        onClick={() => setPreviewScreen(sc)}
                      >
                        <Image
                          src={sc.screenshotFile}
                          alt={sc.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-[10px] font-semibold text-white">
                          {sc.type}
                        </div>
                        <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="px-3 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-bold shadow-md">
                            Inspect Screenshot
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 space-y-1">
                        <h4 className="font-space font-bold text-xs text-slate-900 line-clamp-2">
                          {sc.title}
                        </h4>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {sc.id.slice(0, 12)}...
                        </div>
                      </div>
                    </div>

                    <div className="p-3 pt-0 flex gap-2">
                      <button
                        onClick={() => {
                          setCurrentView(sc.mappedView);
                          setDeviceViewMode(sc.type === "Desktop Portal" ? "desktop" : "mobile");
                          setShowStitchModal(false);
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-[#006699] hover:bg-[#005580] text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <span>Launch View</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tokens: Color Palette */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-[#006699]" />
                  <h3 className="font-space font-bold text-base text-slate-900">Extracted Design System Colors</h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="h-10 rounded-lg bg-[#D4FF00] border border-slate-300"></div>
                    <div>
                      <strong className="block text-slate-900">Brand Accent</strong>
                      <span className="font-mono text-slate-500">#D4FF00 (Volt Lime)</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="h-10 rounded-lg bg-[#006699]"></div>
                    <div>
                      <strong className="block text-slate-900">Brand Primary</strong>
                      <span className="font-mono text-slate-500">#006699 (Deep Cyan/Blue)</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="h-10 rounded-lg bg-[#34C759]"></div>
                    <div>
                      <strong className="block text-slate-900">Status Success</strong>
                      <span className="font-mono text-slate-500">#34C759 (Emerald)</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="h-10 rounded-lg bg-[#000000]"></div>
                    <div>
                      <strong className="block text-slate-900">Primary Dark</strong>
                      <span className="font-mono text-slate-500">#000000 (Black)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tokens: Typography */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2">
                  <Type className="w-5 h-5 text-[#006699]" />
                  <h3 className="font-space font-bold text-base text-slate-900">Typography Hierarchy</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Display & Headlines</span>
                    <h4 className="font-space text-2xl font-bold text-slate-900">Space Grotesk</h4>
                    <p className="text-slate-500">Used for hero displays, telemetry numbers, timers, prices, and high-impact badges.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Body & Labels</span>
                    <h4 className="font-sans text-2xl font-bold text-slate-900">Hanken Grotesk / Inter</h4>
                    <p className="text-slate-500">Used for navigation, card copy, station subtitles, specifications, and checklists.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Single Screen Preview Overlay Modal */}
        {previewScreen && (
          <div className="fixed inset-0 bg-slate-950/85 z-60 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-5 max-w-4xl w-full max-h-[90vh] flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-space font-bold text-base text-slate-900">{previewScreen.title}</h4>
                  <span className="text-xs text-slate-400 font-mono">Stitch Artifact: {previewScreen.id}</span>
                </div>
                <button
                  onClick={() => setPreviewScreen(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-slate-100 p-2 flex justify-center">
                <Image
                  src={previewScreen.screenshotFile}
                  alt={previewScreen.title}
                  width={1200}
                  height={1500}
                  className="object-contain max-h-[70vh] rounded-lg shadow-md"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => {
                    setCurrentView(previewScreen.mappedView);
                    setDeviceViewMode(previewScreen.type === "Desktop Portal" ? "desktop" : "mobile");
                    setPreviewScreen(null);
                    setShowStitchModal(false);
                  }}
                  className="py-2.5 px-5 rounded-xl bg-[#006699] text-white font-bold text-xs hover:bg-[#005580] transition"
                >
                  Open in Interactive Website Replica →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
