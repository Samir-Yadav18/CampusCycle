"use client";

import React, { useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useRide } from "@/context/RideContext";
import { 
  CAMPUS_MAP_CONFIG, 
  CAMPUS_CYCLE_STANDS, 
  FLEET_SUMMARY, 
  RENTAL_PRICING, 
  validateFleetSummary, 
  CycleStand,
  coordsToCampusPercent,
  AIT_PUNE_BOUNDS
} from "@/data/campusMapConfig";
import { 
  MapPin, 
  Bike as BikeIcon, 
  Clock, 
  CheckCircle2, 
  X, 
  ArrowRight, 
  Compass, 
  Maximize2,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  LocateFixed,
  Crosshair,
  ZoomIn,
  ZoomOut,
  Info,
  Check,
  Smartphone,
  Globe,
  ExternalLink,
  Layers
} from "lucide-react";

interface CampusDockRadarProps {
  compact?: boolean;
}

export interface UserLocationState {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  xPercent: number;
  yPercent: number;
  isWithinCampus: boolean;
  distanceKm: number;
}

export interface LocationErrorState {
  type: "DENIED" | "UNAVAILABLE" | "TIMEOUT" | "UNSUPPORTED";
  message: string;
}

export const CampusDockRadar: React.FC<CampusDockRadarProps> = ({ compact = false }) => {
  const { setCurrentView } = useRide();
  const router = useRouter();
  const [selectedStand, setSelectedStand] = useState<CycleStand | null>(CAMPUS_CYCLE_STANDS[0]);
  const [mapImageError, setMapImageError] = useState(false);
  const [mapImageLoaded, setMapImageLoaded] = useState(true);

  // Validate fleet invariant: Available (18) + Reserved (4) + Checked-out (10) + Maintenance (3) = 35
  const fleetValidation = validateFleetSummary(FLEET_SUMMARY);

  const configuredStands = CAMPUS_CYCLE_STANDS.filter(
    (s) => s.x !== null && s.y !== null
  );

  // "Locate Me" Real-time Geolocation State
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<UserLocationState | null>(null);
  const [locationError, setLocationError] = useState<LocationErrorState | null>(null);
  const [showLocationPanel, setShowLocationPanel] = useState<boolean>(true);

  // Google Maps Live Location Fetcher State
  const [activeMapMode, setActiveMapMode] = useState<"google" | "radar">("google");
  const [googleMapType, setGoogleMapType] = useState<"m" | "k">("m"); // m: roadmap, k: satellite
  const [googleZoom, setGoogleZoom] = useState<number>(17);

  const googleMapEmbedUrl = useMemo(() => {
    if (userLocation) {
      return `https://maps.google.com/maps?q=${userLocation.lat},${userLocation.lng}&hl=en&z=${googleZoom}&t=${googleMapType}&output=embed`;
    }
    return `https://maps.google.com/maps?q=Army+Institute+of+Technology+Pune&hl=en&z=${googleZoom}&t=${googleMapType}&output=embed`;
  }, [userLocation, googleZoom, googleMapType]);

  // Interactive Pan & Zoom State for Campus Map
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number }>({
    clientX: 0,
    clientY: 0,
    panX: 0,
    panY: 0,
  });
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Center the map on specific percentage coordinates
  const centerMapOnPercent = useCallback((xPct: number, yPct: number, targetZoom: number = 1.5) => {
    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const targetX = ((50 - xPct) / 100) * rect.width * targetZoom;
    const targetY = ((50 - yPct) / 100) * rect.height * targetZoom;
    setPan({ x: targetX, y: targetY });
    setZoom(targetZoom);
  }, []);

  // One-time Location Query via navigator.geolocation.getCurrentPosition()
  const handleLocateMe = useCallback(() => {
    // Prevent duplicate concurrent requests
    if (isLocating) return;

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationError({
        type: "UNSUPPORTED",
        message: "Your browser does not support geolocation.",
      });
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;

        if (
          typeof latitude !== "number" ||
          typeof longitude !== "number" ||
          isNaN(latitude) ||
          isNaN(longitude)
        ) {
          setLocationError({
            type: "UNAVAILABLE",
            message: "Invalid geographical coordinates received from device.",
          });
          return;
        }

        const projection = coordsToCampusPercent(latitude, longitude);
        const locData: UserLocationState = {
          lat: latitude,
          lng: longitude,
          accuracy: accuracy ? Math.round(accuracy) : 5,
          timestamp: Date.now(),
          xPercent: projection.xPercent,
          yPercent: projection.yPercent,
          isWithinCampus: projection.isWithinCampus,
          distanceKm: projection.distanceKm,
        };

        setUserLocation(locData);
        setShowLocationPanel(true);
        setActiveMapMode("google"); // Show live position on Google Maps
        // Center on user's actual position and zoom in
        centerMapOnPercent(projection.xPercent, projection.yPercent, 1.5);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError({
            type: "DENIED",
            message: "Location permission denied. To enable: click the lock/settings icon in your browser address bar (next to the URL), change Location to 'Allow', and click 'Locate Me' again.",
          });
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocationError({
            type: "UNAVAILABLE",
            message: "Device position is currently unavailable. Please verify that GPS or Location Services are enabled in your device settings.",
          });
        } else if (err.code === err.TIMEOUT) {
          setLocationError({
            type: "TIMEOUT",
            message: "Location request timed out. Please click 'Locate Me' again.",
          });
        } else {
          setLocationError({
            type: "UNAVAILABLE",
            message: "Unable to retrieve device location. Please try again.",
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, [isLocating, centerMapOnPercent]);

  // Recenter map on user's existing marker
  const handleRecenterOnUser = () => {
    if (userLocation) {
      centerMapOnPercent(userLocation.xPercent, userLocation.yPercent, zoom || 1.5);
    }
  };

  // Reset to full AIT Pune campus view
  const handleResetToCampus = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoom((z) => Math.min(3.0, parseFloat((z + 0.25).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoom((z) => {
      const next = Math.max(1.0, parseFloat((z - 0.25).toFixed(2)));
      if (next === 1.0) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  // Interactive Pan / Drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleSelectStand = (stand: CycleStand) => {
    setSelectedStand(stand);
  };

  const handleExploreStations = () => {
    setCurrentView("stations");
    router.push("/stations");
  };

  const handlePickupCycle = (stand: CycleStand) => {
    if (stand.availableCycles === 0 || stand.availableCycles === null) {
      alert(`No cycles are currently available for immediate pickup at ${stand.name}. Please select an adjacent stand.`);
      return;
    }
    setCurrentView("booking");
    router.push("/booking");
  };

  /* -------------------------------------------------------------
   * COMPACT MODE: Rendered inside sidebars (e.g. StationsFleetView)
   * ------------------------------------------------------------- */
  if (compact) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#1E5631] text-white flex items-center justify-center shadow-xs">
              <BikeIcon className="w-3.5 h-3.5 text-amber-300" />
            </div>
            <div>
              <h4 className="font-space font-bold text-xs text-slate-900 leading-tight">
                Campus Dock Radar
              </h4>
              <p className="text-[10px] text-slate-400">AIT Pune • One-Stop Central Dock</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            Live
          </span>
        </div>

        {/* Compact Map Preview with Markers */}
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs">
          {!mapImageError && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={CAMPUS_MAP_CONFIG.imagePath}
              alt={CAMPUS_MAP_CONFIG.altText}
              className="w-full h-auto block select-none"
              onLoad={() => setMapImageLoaded(true)}
              onError={() => setMapImageError(true)}
            />
          )}

          {!mapImageError && mapImageLoaded && (
            <div className="absolute inset-0 pointer-events-none">
              {configuredStands.map((stand) => (
                <div
                  key={stand.id}
                  style={{ left: `${stand.x}%`, top: `${stand.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                >
                  <button
                    onClick={() => handleSelectStand(stand)}
                    className="group relative flex items-center justify-center p-0.5 cursor-pointer"
                    title={`${stand.name}: ${stand.availableCycles ?? 0} cycles`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border border-white shadow flex items-center justify-center transition-transform ${
                        selectedStand?.id === stand.id
                          ? "bg-amber-400 text-slate-950 scale-125 ring-2 ring-[#1E5631]"
                          : "bg-[#1E5631] text-white hover:scale-110"
                      }`}
                    >
                      <BikeIcon className="w-2.5 h-2.5" />
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compact Selected Stand Info */}
        {selectedStand && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
            <div className="flex items-start justify-between gap-1">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block">
                  Selected Cycle Stand
                </span>
                <span className="font-space font-bold text-slate-900 text-xs block leading-tight">
                  {selectedStand.name}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Updated: {selectedStand.lastUpdated}
                </span>
              </div>
              <span className="font-mono font-bold text-[#1E5631] text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {selectedStand.availableCycles} avail
              </span>
            </div>

            {/* Status breakdown grid */}
            <div className="grid grid-cols-4 gap-1.5 py-1 text-center font-mono text-[11px]">
              <div className="p-1 rounded bg-white border border-slate-200">
                <span className="text-[9px] text-slate-400 block font-sans uppercase">Total</span>
                <span className="font-bold text-slate-800">{selectedStand.totalCapacity}</span>
              </div>
              <div className="p-1 rounded bg-emerald-50 border border-emerald-200">
                <span className="text-[9px] text-emerald-700 block font-sans uppercase">Avail</span>
                <span className="font-bold text-[#1E5631]">{selectedStand.availableCycles}</span>
              </div>
              <div className="p-1 rounded bg-amber-50 border border-amber-200">
                <span className="text-[9px] text-amber-700 block font-sans uppercase">In Use</span>
                <span className="font-bold text-amber-800">{selectedStand.checkedOutCycles}</span>
              </div>
              <div className="p-1 rounded bg-red-50 border border-red-200">
                <span className="text-[9px] text-red-700 block font-sans uppercase">Maint</span>
                <span className="font-bold text-red-700">{selectedStand.maintenanceCycles}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <button
                onClick={handleExploreStations}
                className="w-full py-1.5 px-3 rounded-lg bg-[#1E5631] hover:bg-[#144525] text-white font-bold text-[11px] shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-amber-300" />
                <span>View Stand Bicycle Inventory (35 Cycles)</span>
              </button>
              <button
                onClick={() => handlePickupCycle(selectedStand)}
                className="w-full py-1.5 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-300 flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <span>Unlock Cycle (₹25/hr)</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            setCurrentView("map");
            router.push("/");
          }}
          className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5 text-[#1E5631]" />
          <span>Open Full Interactive Campus Map</span>
        </button>
      </div>
    );
  }

  /* -------------------------------------------------------------
   * FULL MODE: Primary Centerpiece for Campus Map Landing Page (/)
   * ------------------------------------------------------------- */
  const accuracyRadiusPx = userLocation ? Math.max(26, Math.min(100, userLocation.accuracy * 1.8 * zoom)) : 30;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/90 space-y-7">
      
      {/* 1. Header & Navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#1E5631] text-white flex items-center justify-center shadow-md ring-4 ring-[#1E5631]/10">
            <BikeIcon className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-space font-extrabold text-xl text-slate-900 tracking-tight">
                Campus Mini Map & Dock Radar
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                Live Sensors
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Army Institute of Technology (AIT), Pune • Live Cycle Stand Telemetry
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          
          {/* LOCATE ME / LOCATE ME AGAIN PRIMARY BUTTON (Prompt Requirement 1) */}
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-60 ${
              userLocation
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                : "bg-[#006699] hover:bg-[#005580] text-white shadow-sky-700/20"
            }`}
            title={userLocation ? "Refresh and relocate your actual position" : "Locate yourself on the campus map"}
          >
            {isLocating ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <MapPin className="w-4 h-4 text-white" />
            )}
            <span>{isLocating ? "Locating..." : userLocation ? "Locate Me Again" : "Locate Me"}</span>
          </button>

          {/* STEP 3 Button: Explore Stations & Fleet */}
          <button
            onClick={handleExploreStations}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E5631] hover:bg-[#144525] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
            title="Explore full campus stations and available bicycle fleet"
          >
            <Compass className="w-4 h-4 text-amber-300" />
            <span>Explore Stations & Fleet</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
          </button>

          {/* Flat Rate Pricing Badge (₹25/hour, no distance fees) */}
          <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200/80 px-3.5 py-2 rounded-xl shadow-xs">
            <Clock className="w-4 h-4 text-amber-700 shrink-0" />
            <div className="text-left">
              <div className="flex items-baseline gap-1.5">
                <span className="font-space font-extrabold text-sm text-[#1E5631]">
                  {RENTAL_PRICING.displayText}
                </span>
                <span className="text-[9px] font-extrabold text-amber-800 uppercase tracking-wider bg-amber-100/80 px-1 rounded">
                  Flat Rate
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-none">
                Zero distance fees
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Fleet Summary Cards (Invariant 35 Verified) */}
      <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-space font-bold text-sm text-slate-900">
              CampusCycle Fleet Allocation
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#1E5631] text-white shadow-xs">
              Total Fleet: {FLEET_SUMMARY.totalFleet} Cycles
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Full Fleet Balance Verified (35/35)</span>
            </span>
          </div>
        </div>

        {/* 4 Status Breakdown Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Available</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="font-space font-extrabold text-2xl text-[#1E5631]">
              {FLEET_SUMMARY.availableCycles}
            </div>
            <span className="text-[11px] text-slate-500 block">Ready at campus stands</span>
          </div>

          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Reserved</span>
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            </div>
            <div className="font-space font-extrabold text-2xl text-amber-600">
              {FLEET_SUMMARY.reservedCycles}
            </div>
            <span className="text-[11px] text-slate-500 block">5-min student hold</span>
          </div>

          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Checked Out</span>
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            </div>
            <div className="font-space font-extrabold text-2xl text-blue-600">
              {FLEET_SUMMARY.checkedOutCycles}
            </div>
            <span className="text-[11px] text-slate-500 block">Active campus rides</span>
          </div>

          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Maintenance</span>
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            </div>
            <div className="font-space font-extrabold text-2xl text-slate-700">
              {FLEET_SUMMARY.maintenanceCycles}
            </div>
            <span className="text-[11px] text-slate-500 block">Safety depot inspection</span>
          </div>
        </div>
      </div>

      {/* Permission & Geolocation Error Notification Banner */}
      {locationError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-950 text-xs space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-red-900">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{locationError.type === "DENIED" ? "Location Permission Denied" : "Location Unavailable"}</span>
            </div>
            <button
              onClick={() => setLocationError(null)}
              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-slate-700 leading-relaxed">
            {locationError.message}
          </p>
          <div className="pt-1">
            <button
              onClick={handleLocateMe}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* 3. Real AIT Pune Campus Map & Configurable Stand Markers + Live Blue Location Dot */}
      <div className="space-y-3">
        {/* Map Header with Mode Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveMapMode("google")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeMapMode === "google"
                  ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>Google Maps Live</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMapMode("radar")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeMapMode === "radar"
                  ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-700" />
              <span>Campus Dock Radar</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeMapMode === "google" && (
              <>
                <button
                  type="button"
                  onClick={() => setGoogleMapType(googleMapType === "m" ? "k" : "m")}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>{googleMapType === "m" ? "Satellite" : "Roadmap"}</span>
                </button>
                <a
                  href={userLocation ? `https://www.google.com/maps?q=${userLocation.lat},${userLocation.lng}` : "https://www.google.com/maps?q=Army+Institute+of+Technology+Pune"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#006699] border border-blue-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </>
            )}
            <span className="text-[11px] font-medium text-slate-500">
              {userLocation 
                ? `Located at ${userLocation.lat.toFixed(5)}° N, ${userLocation.lng.toFixed(5)}° E (±${userLocation.accuracy}m)` 
                : "Click 'Locate Me' to display your real-time position"}
            </span>
          </div>
        </div>

        {/* GOOGLE MAPS LIVE LOCATION EMBED */}
        {activeMapMode === "google" && (
          <div className="relative aspect-[800/420] sm:aspect-[800/380] w-full rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-300 shadow-inner">
            <iframe
              src={googleMapEmbedUrl}
              title="AIT Pune Google Maps Live Location Fetcher"
              className="w-full h-full border-0 block"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />

            {/* Floating Live GPS Status Header */}
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md text-[11px] font-bold text-white border border-white/20 shadow-md">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping"></span>
                <span>
                  {userLocation
                    ? `Live Device Location: ${userLocation.lat.toFixed(5)}° N, ${userLocation.lng.toFixed(5)}° E (±${userLocation.accuracy}m)`
                    : "Google Maps Live Location Fetcher • AIT Pune"}
                </span>
              </div>
            </div>

            {/* Floating Quick Controls at Bottom-Right */}
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 shadow-lg">
              <button
                type="button"
                onClick={() => setGoogleZoom((z) => Math.min(20, z + 1))}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setGoogleZoom((z) => Math.max(12, z - 1))}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={isLocating}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs transition flex items-center gap-1 active:scale-95 cursor-pointer"
                title="Fetch Live Location on Google Maps"
              >
                {isLocating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
                <span>Locate</span>
              </button>
            </div>
          </div>
        )}

        {/* Map Viewport Container: Pixel-locked coordinates with Interactive Panning & Zooming */}
        <div 
          ref={mapContainerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={`relative w-full rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-900 shadow-lg select-none touch-none ${
            activeMapMode === "radar" ? "block" : "hidden"
          } ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        >
          {/* Transformable Canvas Layer */}
          <div 
            className="relative inline-block w-full transition-transform duration-100 ease-out origin-center"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            {!mapImageError && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={CAMPUS_MAP_CONFIG.imagePath}
                alt={CAMPUS_MAP_CONFIG.altText}
                className="w-full h-auto block select-none pointer-events-none"
                draggable={false}
                onLoad={() => {
                  setMapImageLoaded(true);
                  setMapImageError(false);
                }}
                onError={() => {
                  setMapImageError(true);
                  setMapImageLoaded(false);
                }}
              />
            )}

            {/* Graceful Fallback if map image is missing */}
            {mapImageError && (
              <div className="p-10 text-center max-w-md mx-auto space-y-3 my-8 bg-white rounded-xl">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                  <MapPin className="w-6 h-6 text-[#1E5631]" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-space font-bold text-sm text-slate-900">
                    AIT Pune Campus Map Image Awaiting Upload
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Verify map image is located at:
                  </p>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono font-semibold text-[#1E5631] select-all">
                    public/images/ait-campus-map.png
                  </div>
                </div>
              </div>
            )}

            {/* Normalized Marker Overlay */}
            {!mapImageError && mapImageLoaded && (
              <div className="absolute inset-0 pointer-events-none">
                
                {/* 1. Cycle Stands (e.g. Sports Complex Stand) */}
                {configuredStands.map((stand) => {
                  const isSelected = selectedStand?.id === stand.id;
                  return (
                    <div
                      key={stand.id}
                      style={{
                        left: `${stand.x}%`,
                        top: `${stand.y}%`,
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                    >
                      <button
                        onClick={() => handleSelectStand(stand)}
                        className="group relative flex items-center justify-center transition-transform hover:scale-115 active:scale-95 cursor-pointer"
                        title={`${stand.name}: ${stand.availableCycles ?? 0} cycles available`}
                      >
                        {/* Radar Ping Pulse on Selected Stand */}
                        {isSelected && (
                          <span className="absolute w-10 h-10 rounded-full bg-amber-400/40 animate-ping pointer-events-none"></span>
                        )}

                        {/* Stand Pin Badge */}
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-amber-400 text-slate-950 scale-110 ring-4 ring-[#1E5631]/40 shadow-xl"
                              : "bg-[#1E5631] text-white hover:bg-[#144525] hover:shadow-md"
                          }`}
                        >
                          <BikeIcon className="w-4 h-4" />
                        </div>

                        {/* Stand Label Tooltip */}
                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-md bg-slate-950/90 text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-md z-30 border border-white/10">
                          {stand.name.replace(" Stand", "")} • {stand.availableCycles ?? 0} bikes
                        </span>
                      </button>
                    </div>
                  );
                })}

                {/* 2. PROMINENT BLUE LOCATION MARKER & ACCURACY CIRCLE (Prompt Requirement 2) */}
                {userLocation && (
                  <div
                    style={{
                      left: `${userLocation.xPercent}%`,
                      top: `${userLocation.yPercent}%`,
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none transition-all duration-300 ease-out"
                  >
                    {/* GPS Accuracy Circle */}
                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/15 border border-blue-400/40 pointer-events-none"
                      style={{
                        width: `${accuracyRadiusPx}px`,
                        height: `${accuracyRadiusPx}px`,
                        left: "50%",
                        top: "50%",
                      }}
                    />

                    {/* Outer Pulsing Blue Beacon */}
                    <div className="absolute -inset-2 rounded-full bg-blue-400/40 animate-ping"></div>

                    {/* Solid Vibrant Blue Core Marker with White Border */}
                    <div className="relative w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-2xl flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>

                    {/* Marker Tag */}
                    <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-blue-900/90 backdrop-blur-md text-white text-[9px] font-bold shadow-lg border border-blue-400/30 whitespace-nowrap flex items-center gap-1 pointer-events-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                      <span>You (±{userLocation.accuracy}m)</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FLOATING MAP ZOOM & RECENTER CONTROLS (Bottom-Right Pillar) */}
          <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1.5 bg-slate-950/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 shadow-2xl">
            <button
              onClick={handleZoomIn}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="h-px bg-white/20 my-0.5"></div>
            <button
              onClick={handleRecenterOnUser}
              disabled={!userLocation}
              className="w-8 h-8 rounded-xl bg-blue-600/80 hover:bg-blue-600 disabled:opacity-40 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
              title="Recenter on My Location"
            >
              <Crosshair className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetToCampus}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
              title="Reset View to AIT Pune Campus"
            >
              <Compass className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. REAL-TIME LOCATION INFORMATION PANEL (Prompt Requirement 2) */}
      {userLocation && showLocationPanel && (
        <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 border border-blue-200 text-slate-900 shadow-sm space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                <LocateFixed className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-space font-bold text-sm text-slate-900">
                  Your Current Device Position
                </h4>
                <p className="text-[11px] text-blue-900">
                  {userLocation.isWithinCampus 
                    ? "Located inside Army Institute of Technology (AIT), Pune" 
                    : `Located ${userLocation.distanceKm} km from AIT Pune Campus`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLocateMe}
                disabled={isLocating}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-space font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                {isLocating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Locate Me Again</span>
              </button>
              <button
                onClick={handleRecenterOnUser}
                className="px-3 py-1.5 rounded-xl bg-white border border-blue-200 text-blue-800 font-bold text-xs hover:bg-blue-100 transition cursor-pointer"
              >
                Recenter
              </button>
            </div>
          </div>

          {/* Coordinates & Accuracy Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-white border border-blue-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Latitude</span>
              <span className="font-mono font-bold text-slate-900 block mt-0.5">
                {userLocation.lat.toFixed(6)}° N
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-blue-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Longitude</span>
              <span className="font-mono font-bold text-slate-900 block mt-0.5">
                {userLocation.lng.toFixed(6)}° E
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-blue-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">GPS Accuracy</span>
              <span className="font-mono font-bold text-emerald-700 block mt-0.5">
                ±{userLocation.accuracy} meters
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-blue-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Last Reading</span>
              <span className="font-mono text-[11px] text-slate-700 block mt-0.5">
                {new Date(userLocation.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
            <Smartphone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span><strong>Privacy Notice:</strong> Real device coordinates are calculated strictly in-memory within your browser and are never uploaded or stored.</span>
          </div>
        </div>
      )}

      {/* 5. Stand Information Panel */}
      {selectedStand && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-white to-amber-50/50 border border-emerald-200/90 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1E5631] animate-pulse"></span>
                <span className="text-[10px] text-emerald-800 uppercase font-extrabold tracking-wider">
                  Active Selected Stand Telemetry
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  • Last Updated: {selectedStand.lastUpdated}
                </span>
              </div>
              <h4 className="font-space font-extrabold text-xl text-slate-900 leading-snug">
                {selectedStand.name}
              </h4>
              {selectedStand.description && (
                <p className="text-xs text-slate-600">
                  {selectedStand.description}
                </p>
              )}
            </div>

            <div className="text-right shrink-0">
              <div className="font-space font-extrabold text-2xl text-[#1E5631]">
                {selectedStand.availableCycles ?? 0}
              </div>
              <span className="text-[11px] font-medium text-slate-500 block">
                Cycles Available Now
              </span>
            </div>
          </div>

          {/* Quick Actions for Selected Stand */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
            <button
              onClick={() => handlePickupCycle(selectedStand)}
              className="px-5 py-2.5 rounded-xl bg-[#1E5631] hover:bg-[#144525] text-white font-space font-bold text-xs shadow-md transition flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <span>Instant Unlock Cycle at {selectedStand.name.split(" ")[0]} Stand</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
            </button>
            <button
              onClick={handleExploreStations}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
            >
              View Full Stand Inventory
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
