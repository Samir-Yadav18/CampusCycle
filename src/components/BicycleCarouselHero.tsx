"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRide, AppView } from "@/context/RideContext";
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight,
  Bike as BikeIcon,
  CheckCircle2,
  X
} from "lucide-react";

import { CAMPUS_BIKES, Bike } from "@/data/bikes";

interface CarouselBikeItem {
  id: string;
  bikeId: string;
  name: string;
  category: string;
  dockBay: string;
  badgeLabel: string;
  badgeBg: string;
  badgeText: string;
  circleBg: string;
  image: string;
  targetView: AppView;
  targetPath: string;
  description: string;
  specs: string;
}

const CAROUSEL_ITEMS: CarouselBikeItem[] = [
  {
    id: "city-cruiser-12",
    bikeId: "city-cruiser-12",
    name: "City Cruiser #12",
    category: "City Cruiser",
    dockBay: "Bay 12",
    badgeLabel: "NON GEAR",
    badgeBg: "bg-[#00A3E0]",
    badgeText: "text-white",
    circleBg: "bg-[#D6F4F8]", // Soft pastel sky blue
    image: "/bikes/city-clean.png",
    targetView: "booking",
    targetPath: "/booking",
    description: "City Cruiser #12 • Upright geometry with front cargo basket",
    specs: "Single-Speed & 7-Speed • Dual Caliper Rim Brakes",
  },
  {
    id: "step-thru-09",
    bikeId: "step-thru-09",
    name: "Campus Step-Thru #09",
    category: "Step-Thru Comfort",
    dockBay: "Bay 09",
    badgeLabel: "STEP-THRU",
    badgeBg: "bg-[#DB2777]",
    badgeText: "text-white",
    circleBg: "bg-[#FFE4EF]", // Soft pastel blush pink
    image: "/bikes/stepthru-clean.png",
    targetView: "booking",
    targetPath: "/booking",
    description: "Campus Step-Thru #09 • Low standover frame with rear carrier",
    specs: "Comfort Glide Fleet • Wide Spring Saddle",
  },
  {
    id: "e-commuter-07",
    bikeId: "e-commuter-07",
    name: "Campus Commuter #07",
    category: "Classic Commuter",
    dockBay: "Bay 07",
    badgeLabel: "GEARED",
    badgeBg: "bg-[#7C3AED]",
    badgeText: "text-white",
    circleBg: "bg-[#EDE4FF]", // Soft pastel lavender
    image: "/bikes/commuter-clean.png",
    targetView: "booking",
    targetPath: "/booking",
    description: "Campus Commuter #07 • Fast rolling road tires with 21 gears",
    specs: "Shimano 21-Speed Derailleur • Caliper Brakes",
  },
  {
    id: "trail-gravel-04",
    bikeId: "trail-gravel-04",
    name: "Mountain Bike #04",
    category: "Trail & Gravel",
    dockBay: "Bay 04",
    badgeLabel: "ALL-TERRAIN",
    badgeBg: "bg-[#059669]",
    badgeText: "text-white",
    circleBg: "bg-[#E2F8EE]", // Soft pastel mint green
    image: "/bikes/mountain-clean.png",
    targetView: "booking",
    targetPath: "/booking",
    description: "Mountain Bike #04 • Front suspension fork and knobby tires",
    specs: "Dual Disc Brakes • TrailCommuter Ratios",
  },
  {
    id: "CC-015",
    bikeId: "CC-015",
    name: "City Cruiser #15",
    category: "City Cruiser",
    dockBay: "Bay 15",
    badgeLabel: "NON GEAR",
    badgeBg: "bg-[#00A3E0]",
    badgeText: "text-white",
    circleBg: "bg-[#D6F4F8]", // Soft pastel sky blue
    image: "/bikes/city-clean.png",
    targetView: "booking",
    targetPath: "/booking",
    description: "City Cruiser #15 • Standard campus cruiser with reinforced front basket",
    specs: "Puncture-Resistant Tires • Anti-Rust Chain",
  },
  {
    id: "CC-031",
    bikeId: "CC-031",
    name: "Campus Step-Thru #31",
    category: "Step-Thru Comfort",
    dockBay: "Bay 31",
    badgeLabel: "STEP-THRU",
    badgeBg: "bg-[#DB2777]",
    badgeText: "text-white",
    circleBg: "bg-[#FFE4EF]", // Soft pastel blush pink
    image: "/bikes/stepthru-clean.png",
    targetView: "booking",
    targetPath: "/booking",
    description: "Campus Step-Thru #31 • Ergonomic grips with relaxed saddle position",
    specs: "Lightweight Aluminum • Low Step Frame",
  },
  {
    id: "CC-001",
    bikeId: "CC-001",
    name: "Campus Commuter #01",
    category: "Classic Commuter",
    dockBay: "Bay 01",
    badgeLabel: "GEARED",
    badgeBg: "bg-[#7C3AED]",
    badgeText: "text-white",
    circleBg: "bg-[#EDE4FF]", // Soft pastel lavender
    image: "/bikes/commuter-clean.png",
    targetView: "booking",
    targetPath: "/booking",
    description: "Campus Commuter #01 • Quick release saddle and front safety reflectors",
    specs: "7-Speed Shimano • 100% Inspected",
  },
  {
    id: "CC-025",
    bikeId: "CC-025",
    name: "Mountain Bike #25",
    category: "Trail & Gravel",
    dockBay: "Bay 25",
    badgeLabel: "ALL-TERRAIN",
    badgeBg: "bg-[#059669]",
    badgeText: "text-white",
    circleBg: "bg-[#E2F8EE]", // Soft pastel mint green
    image: "/bikes/mountain-clean.png",
    targetView: "booking",
    targetPath: "/booking",
    description: "Mountain Bike #25 • High-traction rubber for rough campus shortcuts",
    specs: "Mechanical Disc Brakes • High Clearance",
  },
];

export const BicycleCarouselHero: React.FC = () => {
  const { setCurrentView, setSelectedBike } = useRide();
  const router = useRouter();
  const carouselRef = useRef<HTMLDivElement>(null);
  const [manualOffset, setManualOffset] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ sender: "user" | "bot"; text: string }>>([
    { 
      sender: "bot", 
      text: "Namaste! Welcome to CampusCycle AIT Pune. Need help locating a cycle stand, checking availability, or booking a ride?" 
    }
  ]);

  const handleScroll = (direction: "left" | "right") => {
    const shift = 260; // Nudge by roughly one bicycle item card
    setManualOffset((prev) => (direction === "left" ? prev - shift : prev + shift));
  };

  const handleItemClick = (item: CarouselBikeItem) => {
    if (item.bikeId) {
      const found = CAMPUS_BIKES.find((b) => b.id === item.bikeId || b.name === item.name);
      if (found) {
        setSelectedBike(found);
      }
    }
    setCurrentView(item.targetView);
    router.push(item.targetPath);
  };

  const handleSelectCycle = () => {
    setCurrentView("booking");
    router.push("/booking");
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    const userText = chatMessage;
    setChatHistory((prev) => [...prev, { sender: "user", text: userText }]);
    setChatMessage("");

    setTimeout(() => {
      let botReply = "All 35 CampusCycle bicycles are docked at the Central Sports Complex & Tennis Courts Dock. Operating hours are 5:00 PM – 9:00 PM IST at ₹25/hour flat rate.";
      const lower = userText.toLowerCase();
      if (lower.includes("price") || lower.includes("cost") || lower.includes("rate") || lower.includes("fare")) {
        botReply = "Rental rate is strictly ₹25.00 per hour (₹12.50 per 30 minutes) with zero distance charges.";
      } else if (lower.includes("where") || lower.includes("location") || lower.includes("stand") || lower.includes("dock")) {
        botReply = "All bicycles are stationed at the one-stop dock: Sports Complex & Tennis Courts Point on the AIT Pune campus map.";
      } else if (lower.includes("time") || lower.includes("hour") || lower.includes("return")) {
        botReply = "CampusCycle operates from 5:00 PM to 9:00 PM IST. All bicycles must be returned to the dock by 9:00 PM.";
      } else if (lower.includes("how") || lower.includes("book") || lower.includes("unlock")) {
        botReply = "Click 'Select Your Cycle' or scan the handlebar QR code to request admin approval and release the dock stanchion lock!";
      }
      setChatHistory((prev) => [...prev, { sender: "bot", text: botReply }]);
    }, 600);
  };

  return (
    <div className="bg-white text-slate-900 w-full overflow-hidden select-none">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP SECTION: HORIZONTAL BICYCLE CAROUSEL                   */}
      {/* ------------------------------------------------------------- */}
      <section className="relative pt-8 sm:pt-12 pb-6 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto">
        {/* Subtle Section Header */}
        <div className="flex items-center justify-between mb-6 px-2">
          <div>
            <span className="text-[11px] font-mono tracking-widest text-slate-400 uppercase font-semibold">
              AIT PUNE CAMPUS FLEET • 35 CONVENTIONAL CYCLES
            </span>
            <h2 className="font-space text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Explore Available Cycles
            </h2>
          </div>

          {/* Carousel Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              title={isPaused ? "Resume continuous movement" : "Pause movement"}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer shadow-xs mr-1"
            >
              <span className={`w-2 h-2 rounded-full ${isPaused ? "bg-amber-400" : "bg-emerald-500 animate-pulse"}`} />
              <span>{isPaused ? "Paused" : "Live Loop"}</span>
            </button>
            <button
              onClick={() => handleScroll("left")}
              aria-label="Nudge bicycles left"
              className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center transition-all bg-white hover:bg-slate-50 text-slate-700 shadow-xs hover:border-slate-300 active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleScroll("right")}
              aria-label="Nudge bicycles right"
              className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center transition-all bg-white hover:bg-slate-50 text-slate-700 shadow-xs hover:border-slate-300 active:scale-95 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Continuous Left-to-Right Carousel Track */}
        <div
          ref={carouselRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="relative w-full overflow-hidden py-4 px-2 -mx-2 pause-marquee select-none"
        >
          {/* Subtle gradient edge fades */}
          <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-white to-transparent z-20 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-white to-transparent z-20 pointer-events-none" />

          {/* Interactive Manual Offset Wrapper */}
          <div
            style={{
              transform: `translate3d(${manualOffset}px, 0, 0)`,
              transition: "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          >
            {/* Infinite Moving Loop: Moving continuously from Left to Right */}
            <div
              className="flex w-max shrink-0 items-stretch animate-marquee-ltr"
              style={{
                animationPlayState: isPaused ? "paused" : "running",
              }}
            >
              {/* 4 Identical Groups for Seamless Infinite Looping on Any Screen Width */}
              {[0, 1, 2, 3].map((groupIndex) => (
                <div
                  key={`carousel-group-${groupIndex}`}
                  className="flex shrink-0 items-stretch gap-6 sm:gap-8 pr-6 sm:pr-8"
                  aria-hidden={groupIndex > 0 ? "true" : undefined}
                >
                  {CAROUSEL_ITEMS.map((item, itemIndex) => (
                    <div
                      key={`bike-${groupIndex}-${item.id}-${itemIndex}`}
                      onClick={() => handleItemClick(item)}
                      role="button"
                      tabIndex={groupIndex === 0 ? 0 : -1}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleItemClick(item);
                        }
                      }}
                      className="flex-shrink-0 flex flex-col items-center group cursor-pointer w-[180px] sm:w-[210px] focus:outline-none transition-transform"
                    >
                      {/* Pastel Circle Container */}
                      <div
                        className={`relative w-[170px] h-[170px] sm:w-[195px] sm:h-[195px] rounded-full ${item.circleBg} flex items-center justify-center transition-all duration-300 group-hover:shadow-md group-hover:scale-[1.04]`}
                      >
                        {/* Saturated Category Badge at Top of Circle */}
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-space font-extrabold uppercase tracking-wider ${item.badgeBg} ${item.badgeText} shadow-xs whitespace-nowrap`}
                          >
                            {item.badgeLabel}
                          </span>
                        </div>

                        {/* Transparent Bicycle Image (Over pastel circle) */}
                        <div className="relative w-[190px] h-[135px] sm:w-[220px] sm:h-[155px] z-10 transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:scale-105">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes="(max-width: 640px) 190px, 220px"
                            className="object-contain drop-shadow-sm pointer-events-none select-none"
                            priority={groupIndex === 0 && itemIndex < 4}
                          />
                        </div>
                      </div>

                      {/* Bold Dark-Gray Category Name below circle */}
                      <div className="mt-3.5 text-center px-1">
                        <h3 className="font-space font-bold text-xs sm:text-sm text-slate-800 tracking-tight group-hover:text-[#00A3E0] transition-colors line-clamp-1">
                          {item.name}
                        </h3>
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                          {item.category} • {item.dockBay}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 2. HERO FEATURE SECTION: "RENT A CYCLE to get started"        */}
      {/* ------------------------------------------------------------- */}
      <section className="relative pt-6 sm:pt-10 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto border-t border-slate-100">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Big Bold Typography & CTA Button */}
          <div className="lg:col-span-5 space-y-6 sm:space-y-8 pl-2 sm:pl-4">
            <div>
              <span className="inline-block text-xs font-mono font-bold tracking-widest text-[#00A3E0] uppercase bg-[#00A3E0]/10 px-3 py-1 rounded-full mb-3">
                CAMPUSCYCLE MOBILITY NETWORK
              </span>
              <h1 className="font-space font-extrabold text-5xl sm:text-6xl lg:text-7xl text-slate-900 tracking-tight leading-[1.04]">
                RENT A<br />CYCLE
              </h1>
              <p className="font-space font-light text-3xl sm:text-4xl lg:text-5xl text-slate-400 mt-2 tracking-tight">
                to get started
              </p>
            </div>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-md">
              Locate, unlock and ride 35 conventional campus bicycles across AIT Pune. Subsidized student transit at flat ₹25/hour with zero distance fees.
            </p>

            {/* Action Button: "Select Your Cycle" */}
            <div className="space-y-3">
              <button
                onClick={handleSelectCycle}
                className="px-8 sm:px-10 py-4 rounded-full bg-[#00A3E0] hover:bg-[#008cc2] text-white font-space font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-3 group cursor-pointer"
              >
                <span>Select Your Cycle</span>
                <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1.5 transition-transform" />
              </button>

              <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1 font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  35 Docks Available
                </span>
                <span>•</span>
                <span>5:00 PM – 9:00 PM IST</span>
                <span>•</span>
                <span>Flat ₹25/hr</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Bike with Sketch Blue Annotations */}
          <div className="lg:col-span-7 relative flex items-center justify-center py-8 lg:py-4">
            {/* Main Featured Bicycle */}
            <div className="relative w-full max-w-[560px] aspect-[4/3]">
              <Image
                src="/bikes/mountain-hero-clean.png"
                alt="CampusCycle Sport Mountain Bike with Annotations"
                fill
                sizes="(max-width: 1024px) 90vw, 560px"
                className="object-contain drop-shadow-md"
                priority
              />

              {/* -------------------------------------------------------- */}
              {/* SKETCH ANNOTATIONS MATCHING THE UPLOADED SCREENSHOT       */}
              {/* -------------------------------------------------------- */}

              {/* Annotation 1: "35 Cycle Options" (Top Center -> Bike Top Tube) */}
              <div className="absolute top-[8%] left-[46%] -translate-x-1/2 flex flex-col items-center pointer-events-none select-none">
                <div className="font-mono text-xs sm:text-sm font-bold text-[#00A3E0] text-center leading-tight tracking-wider whitespace-nowrap bg-white/70 px-1 rounded">
                  35 &nbsp;Cycle<br />Options
                </div>
                {/* Curved Arrow down */}
                <svg className="w-6 h-8 text-[#00A3E0] mt-0.5" viewBox="0 0 24 32" fill="none">
                  <path
                    d="M12 2 C 12 12, 14 22, 12 28"
                    stroke="#00A3E0"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8 24 L 12 30 L 16 24"
                    stroke="#00A3E0"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Annotation 2: "Free Maintenance" (Upper Left -> Saddle) */}
              <div className="absolute top-[26%] left-[6%] sm:left-[12%] flex flex-col items-center pointer-events-none select-none">
                <div className="font-mono text-[11px] sm:text-xs font-bold text-[#00A3E0] leading-tight tracking-wider whitespace-nowrap bg-white/70 px-1 rounded">
                  Free<br />Maintenance
                </div>
                {/* Curved Arrow pointing down-right toward saddle */}
                <svg className="w-10 h-7 text-[#00A3E0] mt-0.5 -rotate-12" viewBox="0 0 40 28" fill="none">
                  <path
                    d="M4 8 Q 20 6, 32 20"
                    stroke="#00A3E0"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M24 20 L 34 22 L 32 12"
                    stroke="#00A3E0"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Annotation 3: "Anytime" (Upper Right -> Handlebars) */}
              <div className="absolute top-[18%] right-[8%] sm:right-[14%] flex flex-col items-center pointer-events-none select-none">
                <div className="font-mono text-[11px] sm:text-xs font-bold text-[#00A3E0] leading-tight tracking-wider bg-white/70 px-1 rounded">
                  Anytime
                </div>
                {/* Curved Arrow pointing down-left toward handlebars */}
                <svg className="w-10 h-7 text-[#00A3E0] mt-0.5 rotate-12" viewBox="0 0 40 28" fill="none">
                  <path
                    d="M36 8 Q 20 6, 8 20"
                    stroke="#00A3E0"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M16 20 L 6 22 L 8 12"
                    stroke="#00A3E0"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Annotation 4: "Top Notch Condition" (Lower Left -> Rear Wheel/Derailleur) */}
              <div className="absolute bottom-[2%] left-[4%] sm:left-[10%] flex flex-col items-center pointer-events-none select-none">
                {/* Curved Arrow pointing up-right toward rear tire */}
                <svg className="w-10 h-8 text-[#00A3E0] mb-0.5 -rotate-6" viewBox="0 0 40 32" fill="none">
                  <path
                    d="M6 26 Q 22 24, 30 10"
                    stroke="#00A3E0"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M22 8 L 32 8 L 32 18"
                    stroke="#00A3E0"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="font-mono text-[11px] sm:text-xs font-bold text-[#00A3E0] leading-tight tracking-wider whitespace-nowrap bg-white/70 px-1 rounded">
                  Top Notch<br />Condition
                </div>
              </div>

              {/* Annotation 5: "Custom Duration" (Lower Right -> Pedals/Bottom Bracket) */}
              <div className="absolute bottom-[2%] right-[8%] sm:right-[16%] flex flex-col items-center pointer-events-none select-none">
                {/* Curved Arrow pointing up-left toward pedals */}
                <svg className="w-10 h-8 text-[#00A3E0] mb-0.5 rotate-6" viewBox="0 0 40 32" fill="none">
                  <path
                    d="M34 26 Q 18 24, 10 10"
                    stroke="#00A3E0"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8 18 L 8 8 L 18 8"
                    stroke="#00A3E0"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="font-mono text-[11px] sm:text-xs font-bold text-[#00A3E0] leading-tight tracking-wider whitespace-nowrap bg-white/70 px-1 rounded">
                  Custom<br />Duration
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. FLOATING "LIVE CHAT" WIDGET (Matching Reference Screenshot) */}
      {/* ------------------------------------------------------------- */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isChatOpen ? (
          <button
            onClick={() => setIsChatOpen(true)}
            aria-label="Open Live Chat"
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#1F2937] hover:bg-black text-white text-xs font-bold font-space shadow-xl hover:shadow-2xl transition-all active:scale-95 border border-slate-700/60 cursor-pointer"
          >
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400">
              <BikeIcon className="w-3.5 h-3.5 text-emerald-400" />
            </span>
            <span>Live Chat</span>
          </button>
        ) : (
          <div className="w-[320px] sm:w-[360px] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom-6 duration-200">
            {/* Header */}
            <div className="bg-[#1F2937] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <BikeIcon className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-space font-bold text-xs">CampusCycle Assistant</h4>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live at Sports Complex Dock
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Area */}
            <div className="p-4 h-[250px] overflow-y-auto space-y-3 text-xs bg-slate-50">
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl ${
                      msg.sender === "user"
                        ? "bg-[#00A3E0] text-white rounded-br-none"
                        : "bg-white text-slate-800 border border-slate-200 shadow-2xs rounded-bl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Action Chips */}
            <div className="px-3 py-2 bg-white border-t border-slate-100 flex flex-wrap gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setChatHistory(prev => [
                    ...prev,
                    { sender: "user", text: "What is the rental rate?" },
                    { sender: "bot", text: "CampusCycle is flat ₹25.00/hour (₹12.50 per 30 minutes) with zero distance charges." }
                  ]);
                }}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
              >
                ₹25/hr Rate
              </button>
              <button
                type="button"
                onClick={() => {
                  setChatHistory(prev => [
                    ...prev,
                    { sender: "user", text: "Where are cycles parked?" },
                    { sender: "bot", text: "All 35 bicycles are parked at the Central One-Stop Dock at the Sports Complex & Tennis Courts." }
                  ]);
                }}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
              >
                Dock Location
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100 flex gap-2">
              <input
                type="text"
                placeholder="Ask about bicycles or docking..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#00A3E0]"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-[#00A3E0] hover:bg-[#008cc2] text-white font-bold text-xs transition"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
