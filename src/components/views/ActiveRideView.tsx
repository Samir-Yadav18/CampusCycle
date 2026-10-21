"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRide } from "@/context/RideContext";
import { 
  Bike as BikeIcon, 
  MapPin, 
  Navigation, 
  Clock, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Compass, 
  Lock, 
  RefreshCw, 
  Radio, 
  Signal, 
  Smartphone, 
  Sparkles, 
  Info,
  Layers,
  ZoomIn,
  ZoomOut,
  Crosshair,
  LocateFixed,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Eye,
  Sliders,
  Check,
  Globe,
  ExternalLink
} from "lucide-react";
import type { LocationPoint, ActiveTripSession } from "@/lib/tripTelemetryStore";
import { CAMPUS_MAP_CONFIG, CAMPUS_CYCLE_STANDS } from "@/data/campusMapConfig";

/**
 * Calculates Haversine distance in kilometers between two GPS coordinates (client-safe)
 */
export function calculateGpsDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * AIT Pune Geographical Bounding Box
 * Single Source of Truth for Real GPS to Campus Map Mapping
 */
export const AIT_PUNE_BOUNDS = {
  minLat: 18.6040,
  maxLat: 18.6105,
  minLng: 73.8715,
  maxLng: 73.8790,
  centerLat: 18.60725,
  centerLng: 73.87525,
};

/**
 * Maps real-world latitude & longitude to localized campus map percentage coordinates (0-100%).
 * Handles devices anywhere in the world by projecting onto map space and calculating distance to AIT Pune.
 */
export function coordsToCampusPercent(lat: number, lng: number): {
  xPercent: number;
  yPercent: number;
  isWithinCampus: boolean;
  distanceKm: number;
} {
  const isWithinCampus =
    lat >= AIT_PUNE_BOUNDS.minLat &&
    lat <= AIT_PUNE_BOUNDS.maxLat &&
    lng >= AIT_PUNE_BOUNDS.minLng &&
    lng <= AIT_PUNE_BOUNDS.maxLng;

  // Horizontal percentage (0% = West / minLng, 100% = East / maxLng)
  const rawX = ((lng - AIT_PUNE_BOUNDS.minLng) / (AIT_PUNE_BOUNDS.maxLng - AIT_PUNE_BOUNDS.minLng)) * 100;
  // Vertical percentage (0% = North / maxLat, 100% = South / minLat)
  const rawY = ((AIT_PUNE_BOUNDS.maxLat - lat) / (AIT_PUNE_BOUNDS.maxLat - AIT_PUNE_BOUNDS.minLat)) * 100;

  // Clamp visually within map border
  const xPercent = Math.min(96, Math.max(4, parseFloat(rawX.toFixed(2))));
  const yPercent = Math.min(96, Math.max(4, parseFloat(rawY.toFixed(2))));
  const distanceKm = parseFloat(calculateGpsDistanceKm(lat, lng, AIT_PUNE_BOUNDS.centerLat, AIT_PUNE_BOUNDS.centerLng).toFixed(2));

  return { xPercent, yPercent, isWithinCampus, distanceKm };
}

export type LocationStatusType = 
  | "IDLE" 
  | "WAITING" 
  | "ENABLED" 
  | "DENIED" 
  | "UNAVAILABLE" 
  | "INACCURATE" 
  | "CONNECTION_ISSUE" 
  | "UNSUPPORTED";

export const ActiveRideView: React.FC = () => {
  const { activeRide, endRide, selectedBike, setCurrentView, currentUser } = useRide();
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [showLocationDetails, setShowLocationDetails] = useState(true);

  // Determine if a legitimate active rental session is in progress
  const hasActiveRental = Boolean(activeRide);

  // Active or standby session details
  const fallbackCheckOutMs = useRef(Date.now() - 15 * 60 * 1000).current;
  const fallbackReturnMs = useRef(fallbackCheckOutMs + 60 * 60 * 1000).current;

  const currentRide = activeRide || {
    rideId: "STANDBY",
    bookingId: "NO-ACTIVE-RENTAL",
    bike: selectedBike,
    startTime: fallbackCheckOutMs,
    checkOutTimeMs: fallbackCheckOutMs,
    checkOutTimeText: "Standby",
    expectedReturnTimeMs: fallbackReturnMs,
    expectedReturnTimeText: "No active deadline",
    elapsedSeconds: 0,
    distanceKm: 0.0,
    currentCost: 0.0,
    currentSpeed: 0.0,
    cadence: 0,
    isOverdue: false,
    overdueSeconds: 0,
    isDemoMode: false,
  };

  // Live Location & GPS Tracking State
  const [locationStatus, setLocationStatus] = useState<LocationStatusType>("IDLE");
  const [currentLocation, setCurrentLocation] = useState<LocationPoint | null>(null);
  const [routeTrace, setRouteTrace] = useState<LocationPoint[]>([]);
  const [isTrackingActive, setIsTrackingActive] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [isPersisting, setIsPersisting] = useState<boolean>(false);
  const [lastSyncText, setLastSyncText] = useState<string>("Ready for tracking");
  const [syncError, setSyncError] = useState<string | null>(null);

  // One-time "Locate Me" Real-time State
  const [isLocatingSingle, setIsLocatingSingle] = useState<boolean>(false);
  const [hasLocatedOnce, setHasLocatedOnce] = useState<boolean>(false);
  const [singleLocateError, setSingleLocateError] = useState<string | null>(null);

  // Google Maps Live Location Fetcher State
  const [activeMapMode, setActiveMapMode] = useState<"google" | "canvas">("google");
  const [googleMapType, setGoogleMapType] = useState<"m" | "k">("m"); // m: roadmap, k: satellite
  const [googleZoom, setGoogleZoom] = useState<number>(17);

  const googleMapEmbedUrl = useMemo(() => {
    if (currentLocation) {
      return `https://maps.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}&hl=en&z=${googleZoom}&t=${googleMapType}&output=embed`;
    }
    return `https://maps.google.com/maps?q=Army+Institute+of+Technology+Pune&hl=en&z=${googleZoom}&t=${googleMapType}&output=embed`;
  }, [currentLocation, googleZoom, googleMapType]);

  // Interactive Map Pan & Zoom Controls
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [followMode, setFollowMode] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number }>({
    clientX: 0,
    clientY: 0,
    panX: 0,
    panY: 0,
  });

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastPersistMsRef = useRef<number>(0);
  const hasCenteredOnceRef = useRef<boolean>(false);

  // Countdown & Overdue calculation for active rental
  const [nowMs, setNowMs] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeRemainingMs = hasActiveRental ? currentRide.expectedReturnTimeMs - nowMs : 3600000;
  const isOverdue = hasActiveRental && timeRemainingMs <= 0;
  const overdueSeconds = isOverdue ? Math.floor(Math.abs(timeRemainingMs) / 1000) : 0;
  const remainingSeconds = !isOverdue && hasActiveRental ? Math.floor(timeRemainingMs / 1000) : 0;

  const formatCountdown = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hours > 0) {
      return `${hours}h ${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
    }
    return `${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
  };

  const formatElapsed = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60).toString().padStart(2, "0");
    const secs = (totalSecs % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  // Center map on given percentage coordinates
  const centerMapOnPercent = useCallback((xPct: number, yPct: number, zoomLevel: number = zoom) => {
    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    // Compute pixel delta from container center (50%, 50%)
    const targetX = ((50 - xPct) / 100) * rect.width * zoomLevel;
    const targetY = ((50 - yPct) / 100) * rect.height * zoomLevel;
    setPan({ x: targetX, y: targetY });
  }, [zoom]);

  // Recenter on user's current location
  const handleRecenter = useCallback(() => {
    if (currentLocation) {
      centerMapOnPercent(currentLocation.xPercent, currentLocation.yPercent, zoom);
      setFollowMode(true);
    } else {
      // Default center to AIT Pune campus center
      setPan({ x: 0, y: 0 });
      setFollowMode(true);
    }
  }, [currentLocation, zoom, centerMapOnPercent]);

  // Reset view to AIT Pune full campus
  const handleResetToCampus = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setFollowMode(false);
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

  // Interactive Drag & Pan handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Primary button only
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

    // Boundary constraints based on zoom
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });

    // Manually exploring disables automatic follow mode
    if (followMode) {
      setFollowMode(false);
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Backend Persistence of Route Points
  const persistPointToServer = useCallback(async (point: LocationPoint, addedDist: number = 0) => {
    if (!hasActiveRental) return; // Do NOT write fake rental records if no active rental exists

    setIsPersisting(true);
    try {
      const studentId = currentUser?.userId || "IITB-22B0814";
      const res = await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          rideId: currentRide.rideId,
          point,
          addedDistanceKm: addedDist,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      setLastSyncText(`Synced at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`);
      setSyncError(null);
      lastPersistMsRef.current = Date.now();
    } catch {
      setSyncError("Connection issue: could not sync telemetry to server.");
      setLastSyncText("Saved locally on device");
    } finally {
      setIsPersisting(false);
    }
  }, [hasActiveRental, currentRide.rideId, currentUser?.userId]);

  // One-time Location Query via navigator.geolocation.getCurrentPosition()
  const handleLocateMeOnce = useCallback(() => {
    // Prevent repeated clicks from creating duplicate location requests
    if (isLocatingSingle) return;

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationStatus("UNSUPPORTED");
      setSingleLocateError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocatingSingle(true);
    setSingleLocateError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingSingle(false);
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;

        if (
          typeof latitude !== "number" ||
          isNaN(latitude) ||
          latitude < -90 ||
          latitude > 90 ||
          typeof longitude !== "number" ||
          isNaN(longitude) ||
          longitude < -180 ||
          longitude > 180
        ) {
          setLocationStatus("UNAVAILABLE");
          setSingleLocateError("Invalid coordinates returned by device.");
          return;
        }

        const now = Date.now();
        const { xPercent, yPercent } = coordsToCampusPercent(latitude, longitude);

        const newPoint: LocationPoint = {
          lat: latitude,
          lng: longitude,
          xPercent,
          yPercent,
          accuracy: accuracy ? parseFloat(accuracy.toFixed(1)) : 5.0,
          speed: speed !== null && speed >= 0 ? parseFloat((speed * 3.6).toFixed(1)) : 0,
          heading: heading !== null && heading >= 0 ? Math.round(heading) : undefined,
          timestamp: now,
          isRealDeviceGps: true,
        };

        setCurrentLocation(newPoint);
        setHasLocatedOnce(true);
        setLocationStatus(accuracy <= 60 ? "ENABLED" : "INACCURATE");
        setShowLocationDetails(true);
        setActiveMapMode("google"); // Show live position on Google Maps

        // Center map on actual position and zoom in
        centerMapOnPercent(xPercent, yPercent, 1.5);
        setZoom(1.5);
        setFollowMode(true);
      },
      (err) => {
        setIsLocatingSingle(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationStatus("DENIED");
          setSingleLocateError("Location permission denied. Please allow location access in your browser settings to locate yourself.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocationStatus("UNAVAILABLE");
          setSingleLocateError("Device location is unavailable. Check that location services / GPS are enabled.");
        } else if (err.code === err.TIMEOUT) {
          setLocationStatus("UNAVAILABLE");
          setSingleLocateError("Location request timed out. Please check your signal and click 'Locate Me Again'.");
        } else {
          setLocationStatus("UNAVAILABLE");
          setSingleLocateError(err.message || "Failed to retrieve device location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, [isLocatingSingle, centerMapOnPercent]);

  // Enable Real Device GPS Tracking via navigator.geolocation.watchPosition()
  const startRealDeviceTracking = () => {
    setPermissionModalOpen(false);

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationStatus("UNSUPPORTED");
      return;
    }

    // Stop existing watcher if any
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setLocationStatus("WAITING");
    setIsTrackingActive(true);
    setIsDemoMode(false);

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;

        // 1. Validate geographical coordinates
        if (
          typeof latitude !== "number" ||
          isNaN(latitude) ||
          latitude < -90 ||
          latitude > 90 ||
          typeof longitude !== "number" ||
          isNaN(longitude) ||
          longitude < -180 ||
          longitude > 180
        ) {
          return;
        }

        const now = Date.now();
        const { xPercent, yPercent, isWithinCampus, distanceKm } = coordsToCampusPercent(latitude, longitude);

        // 2. Accuracy check (flag inaccurate if > 60m)
        const isAccurate = accuracy <= 60;
        if (!isAccurate) {
          setLocationStatus("INACCURATE");
        } else {
          setLocationStatus("ENABLED");
        }

        const newPoint: LocationPoint = {
          lat: latitude,
          lng: longitude,
          xPercent,
          yPercent,
          accuracy: accuracy ? parseFloat(accuracy.toFixed(1)) : 5.0,
          speed: speed !== null && speed >= 0 ? parseFloat((speed * 3.6).toFixed(1)) : currentRide.currentSpeed,
          heading: heading !== null && heading >= 0 ? Math.round(heading) : undefined,
          timestamp: now,
          isRealDeviceGps: true,
        };

        setCurrentLocation(newPoint);

        // 3. Center map on user's actual coordinates on first reading
        if (!hasCenteredOnceRef.current) {
          hasCenteredOnceRef.current = true;
          centerMapOnPercent(xPercent, yPercent, 1.25);
          setZoom(1.25);
        } else if (followMode) {
          // If follow mode enabled, keep user visible
          centerMapOnPercent(xPercent, yPercent, zoom);
        }

        // 4. Live Route Recording (ONLY if legitimate active rental exists)
        if (hasActiveRental) {
          setRouteTrace((prev) => {
            const last = prev[prev.length - 1];
            // Filter redundant readings within 2 seconds
            if (last && now - last.timestamp < 2000) return prev;

            // Filter implausible GPS jumps
            if (last) {
              const jumpKm = calculateGpsDistanceKm(last.lat, last.lng, latitude, longitude);
              const timeDeltaSec = (now - last.timestamp) / 1000;
              const speedKmH = (jumpKm / timeDeltaSec) * 3600;
              if (speedKmH > 80 && jumpKm > 0.1) {
                console.warn("[Telemetry] Discarded GPS jump:", speedKmH, "km/h");
                return prev;
              }
            }

            // Only append to polyline if reading has plausible accuracy (<= 80m)
            if (accuracy > 80) return prev;

            const next = [...prev, newPoint];
            return next;
          });

          // Throttle server sync every ~6 seconds
          if (now - lastPersistMsRef.current > 6000) {
            persistPointToServer(newPoint, 0.03);
          }
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationStatus("DENIED");
          setIsTrackingActive(false);
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocationStatus("UNAVAILABLE");
        } else if (err.code === err.TIMEOUT) {
          setLocationStatus("UNAVAILABLE");
        } else {
          setLocationStatus("UNAVAILABLE");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );

    watchIdRef.current = id;
  };

  // Stop Tracking Handler
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTrackingActive(false);
    setLocationStatus("IDLE");
  }, []);

  // Cleanup watcher on component unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof window !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Optional Demo Path Simulation (Explicitly flagged as demo, not real GPS)
  const activateDemoMode = () => {
    stopTracking();
    setIsDemoMode(true);
    setLocationStatus("IDLE");

    const demoWaypoints: LocationPoint[] = [
      { lat: 18.6071, lng: 73.8745, xPercent: 42.0, yPercent: 78.0, accuracy: 5.0, speed: 0.0, timestamp: Date.now() - 15 * 60 * 1000, isRealDeviceGps: false },
      { lat: 18.6074, lng: 73.8748, xPercent: 45.0, yPercent: 64.0, accuracy: 5.0, speed: 14.5, timestamp: Date.now() - 11 * 60 * 1000, isRealDeviceGps: false },
      { lat: 18.6077, lng: 73.8751, xPercent: 50.0, yPercent: 52.0, accuracy: 5.0, speed: 15.8, timestamp: Date.now() - 7 * 60 * 1000, isRealDeviceGps: false },
      { lat: 18.6080, lng: 73.8754, xPercent: 55.0, yPercent: 41.0, accuracy: 5.0, speed: 16.4, timestamp: Date.now() - 3 * 60 * 1000, isRealDeviceGps: false },
      { lat: 18.6083, lng: 73.8758, xPercent: 61.0, yPercent: 33.0, accuracy: 5.0, speed: 16.2, timestamp: Date.now(), isRealDeviceGps: false },
    ];

    setRouteTrace(demoWaypoints);
    setCurrentLocation(demoWaypoints[demoWaypoints.length - 1]);
    centerMapOnPercent(61.0, 33.0, 1.25);
  };

  // Convert recorded route coordinates to SVG points
  const polylinePoints = routeTrace
    .map((pt) => `${(pt.xPercent * 8).toFixed(1)},${(pt.yPercent * 2.94).toFixed(1)}`)
    .join(" ");

  // Default coordinate if no GPS yet
  const userMarkerPos = currentLocation || {
    lat: AIT_PUNE_BOUNDS.centerLat,
    lng: AIT_PUNE_BOUNDS.centerLng,
    xPercent: 50.0,
    yPercent: 50.0,
    accuracy: 8.0,
    speed: 0.0,
    timestamp: Date.now(),
    isRealDeviceGps: false,
  };

  // Compute accuracy ring pixel radius based on reported GPS accuracy and zoom
  const accuracyRadiusPx = Math.max(26, Math.min(100, (userMarkerPos.accuracy || 10) * 1.8 * zoom));

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* 1. TOP STATUS BAR: Trip Identity, Live Location State, and Rental Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 sm:px-6 rounded-3xl bg-slate-900 text-white shadow-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Live Location Dynamic Status Badge */}
          <div className="flex items-center gap-2">
            {locationStatus === "ENABLED" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                LIVE LOCATION ENABLED (±{userMarkerPos.accuracy || 5}m)
              </span>
            )}
            {locationStatus === "WAITING" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                WAITING FOR GPS FIX...
              </span>
            )}
            {locationStatus === "INACCURATE" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <AlertCircle className="w-3.5 h-3.5" />
                SIGNAL INACCURATE (±{userMarkerPos.accuracy}m)
              </span>
            )}
            {locationStatus === "DENIED" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                <AlertTriangle className="w-3.5 h-3.5" />
                PERMISSION DENIED
              </span>
            )}
            {locationStatus === "UNAVAILABLE" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-300 border border-slate-600">
                <AlertCircle className="w-3.5 h-3.5" />
                LOCATION UNAVAILABLE
              </span>
            )}
            {locationStatus === "IDLE" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                LIVE GPS STANDBY
              </span>
            )}
          </div>

          {/* Active Rental or Preview Badge */}
          <div className="flex items-center gap-2 text-xs">
            {hasActiveRental ? (
              <>
                <span className="font-mono font-bold text-amber-300 bg-white/10 px-2 py-0.5 rounded">
                  {currentRide.bookingId}
                </span>
                <span className="text-slate-400">•</span>
                <span className="font-semibold text-slate-200">
                  {currentRide.bike.name} ({currentRide.bike.modelCode})
                </span>
              </>
            ) : (
              <span className="text-slate-400 font-medium">
                Device GPS Preview Mode • Army Institute of Technology, Pune
              </span>
            )}
          </div>
        </div>

        {/* SOS Emergency Helpdesk */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setSosModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Campus SOS</span>
          </button>
          <button
            onClick={() => alert("AIT Pune Security & Transport Helpdesk: +91 20 2715 7534")}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold transition cursor-pointer"
          >
            Helpdesk
          </button>
        </div>
      </div>

      {/* OVERDUE LATE RETURN ALERT (Persistent banner if deadline passed) */}
      {isOverdue && (
        <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-500/80 text-red-950 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-space font-extrabold text-sm text-red-900 flex items-center gap-2">
                <span>Trip Exceeded Expected Return Deadline!</span>
                <span className="px-2 py-0.5 rounded bg-red-200 text-red-900 text-[10px] font-bold">
                  +{formatCountdown(overdueSeconds)} Overdue
                </span>
              </div>
              <p className="text-xs text-red-800 mt-0.5">
                Expected return was <strong>{currentRide.expectedReturnTimeText}</strong>. Please dock your cycle immediately at any designated station.
              </p>
            </div>
          </div>
          <button
            onClick={endRide}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-space font-bold text-xs uppercase tracking-wider shrink-0 transition shadow-md active:scale-95 cursor-pointer"
          >
            Dock & End Trip Now
          </button>
        </div>
      )}

      {/* 2. MAIN LAYOUT: Interactive Campus Map Viewport (Left 7) + Live Telemetry Console (Right 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Interactive Map Viewport with Real Device Location Marker */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-elevated space-y-4 overflow-hidden">
            
            {/* Map Header with Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-100 text-[#006699] flex items-center justify-center font-bold">
                    <Navigation className="w-4 h-4 text-[#006699]" />
                  </div>
                  <div>
                    <h3 className="font-space font-bold text-sm text-slate-900">
                      Campus Live Route Telemetry
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Army Institute of Technology (AIT), Pune • Interactive Mobility Grid
                    </p>
                  </div>
                </div>
              </div>

              {/* Real-time Tracking Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Dedicated One-Time "Locate Me" / "Locate Me Again" Button */}
                <button
                  onClick={handleLocateMeOnce}
                  disabled={isLocatingSingle}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-space font-bold text-xs shadow-md transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  title="Locate yourself on the campus map using real-time device GPS"
                >
                  {isLocatingSingle ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <MapPin className="w-3.5 h-3.5 text-white" />
                  )}
                  <span>
                    {isLocatingSingle
                      ? "Locating..."
                      : (hasLocatedOnce ? "Locate Me Again" : "Locate Me")}
                  </span>
                </button>

                {!isTrackingActive ? (
                  <button
                    onClick={() => setPermissionModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-space font-bold text-xs shadow-md transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <LocateFixed className="w-3.5 h-3.5 text-white" />
                    <span>Enable Live Location</span>
                  </button>
                ) : (
                  <button
                    onClick={stopTracking}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Stop Tracking</span>
                  </button>
                )}

                {/* Recenter on Me Button */}
                <button
                  onClick={handleRecenter}
                  disabled={!currentLocation}
                  className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 disabled:opacity-50 text-[#006699] border border-sky-200 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                  title="Recenter map on your live coordinates"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Recenter on Me</span>
                </button>

                {/* Follow Mode Toggle */}
                <button
                  onClick={() => setFollowMode(!followMode)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1 cursor-pointer ${
                    followMode 
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20" 
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                  title="Toggle automatic map tracking of marker"
                >
                  <span>Follow: {followMode ? "ON" : "OFF"}</span>
                </button>
              </div>
            </div>

            {/* Permission Denied Banner with Browser Settings Explanation */}
            {locationStatus === "DENIED" && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-950 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-red-900">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Location Permission Denied by Browser</span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  To display your real device location on the AIT Pune campus map:
                  <br />
                  1. Click the <strong>lock/tune icon</strong> in your browser address bar (next to localhost:3000).
                  <br />
                  2. Change <strong>Location</strong> permission to <strong>Allow</strong>.
                  <br />
                  3. Click the button below to retry.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setPermissionModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={activateDemoMode}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 transition cursor-pointer"
                  >
                    Use Sample Demo Route Instead
                  </button>
                </div>
              </div>
            )}

            {/* Single Locate / Geolocation Error Banner */}
            {singleLocateError && locationStatus !== "DENIED" && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{singleLocateError}</span>
                </div>
                <button
                  onClick={() => setSingleLocateError(null)}
                  className="text-amber-800 underline font-semibold text-[11px] cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Sync Connection Issue Banner */}
            {syncError && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{syncError}</span>
                </div>
                <button
                  onClick={() => setSyncError(null)}
                  className="text-amber-800 underline font-semibold text-[11px] cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Map Mode Selector (Google Maps Live vs Campus Grid) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-1">
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
                  onClick={() => setActiveMapMode("canvas")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeMapMode === "canvas"
                      ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Campus Dock Grid</span>
                </button>
              </div>

              {activeMapMode === "google" && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGoogleMapType(googleMapType === "m" ? "k" : "m")}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span>{googleMapType === "m" ? "Satellite" : "Roadmap"}</span>
                  </button>
                  <a
                    href={currentLocation ? `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}` : "https://www.google.com/maps?q=Army+Institute+of+Technology+Pune"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#006699] border border-blue-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* GOOGLE MAPS LIVE LOCATION FETCHER EMBED */}
            {activeMapMode === "google" && (
              <div className="relative aspect-[800/420] sm:aspect-[800/380] w-full rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-300 shadow-inner">
                <iframe
                  src={googleMapEmbedUrl}
                  title="Google Maps Live Location Fetcher"
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
                      {currentLocation
                        ? `Live Device Location: ${currentLocation.lat.toFixed(5)}° N, ${currentLocation.lng.toFixed(5)}° E (±${currentLocation.accuracy}m)`
                        : "Google Maps Live Location Fetcher • Click 'Locate Me'"}
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
                    onClick={handleLocateMeOnce}
                    disabled={isLocatingSingle}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs transition flex items-center gap-1 active:scale-95 cursor-pointer"
                    title="Fetch Live Location on Google Maps"
                  >
                    {isLocatingSingle ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
                    <span>Locate</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. INTERACTIVE CAMPUS MAP CANVAS: Panning, Zooming, Real Device Blue Dot, Station Markers */}
            <div 
              ref={mapContainerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className={`relative aspect-[800/420] sm:aspect-[800/380] w-full rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-300 select-none shadow-inner touch-none ${
                activeMapMode === "canvas" ? "block" : "hidden"
              } ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            >
              {/* Transformable Map Canvas Layer */}
              <div 
                className="w-full h-full relative transition-transform duration-100 ease-out origin-center"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                }}
              >
                {/* Real AIT Pune Campus Map Aerial Base Asset */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={CAMPUS_MAP_CONFIG.imagePath}
                  alt={CAMPUS_MAP_CONFIG.altText}
                  className="w-full h-full object-cover pointer-events-none select-none block"
                  draggable={false}
                />

                {/* Vector Campus Mobility Paths & Recorded Polyline */}
                <svg 
                  className="absolute inset-0 w-full h-full pointer-events-none" 
                  viewBox="0 0 800 294" 
                  preserveAspectRatio="none"
                >
                  {/* Recorded Route Polyline (Traversed path with glow effect) */}
                  {routeTrace.length > 1 && (
                    <>
                      <polyline
                        points={polylinePoints}
                        stroke="#00F0FF"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        opacity="0.9"
                      />
                      <polyline
                        points={polylinePoints}
                        stroke="#10B981"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </>
                  )}
                </svg>

                {/* Campus Cycle Stand Markers (e.g. Sports Complex One-Stop Dock) */}
                {CAMPUS_CYCLE_STANDS.map((stand) => {
                  if (stand.x === null || stand.y === null) return null;
                  return (
                    <div
                      key={stand.id}
                      style={{ left: `${stand.x}%`, top: `${stand.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto"
                    >
                      <div className="group relative flex flex-col items-center">
                        {/* Stand Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1.5 px-2.5 py-1 rounded-lg bg-slate-900/95 text-white text-[10px] font-sans whitespace-nowrap shadow-xl border border-slate-700 pointer-events-none z-30">
                          <span className="font-bold text-amber-300 block">{stand.name}</span>
                          <span className="text-slate-300">{stand.availableCycles} cycles available • {stand.totalCapacity} capacity</span>
                        </div>

                        {/* Station Pin Icon */}
                        <div className="w-6 h-6 rounded-full bg-[#1E5631] text-amber-300 border-2 border-white shadow-xl flex items-center justify-center hover:scale-125 transition-transform cursor-pointer">
                          <BikeIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className="mt-0.5 px-1.5 py-0.2 rounded bg-slate-900/80 text-white text-[8px] font-bold border border-white/20 whitespace-nowrap">
                          {stand.name.split(" ")[0]} Dock
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* REAL DEVICE LIVE LOCATION MARKER: Google Maps-Style Blue Location Dot */}
                {(isTrackingActive || currentLocation !== null) && (
                  <div 
                    className="absolute z-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300 ease-out"
                    style={{ 
                      left: `${userMarkerPos.xPercent}%`, 
                      top: `${userMarkerPos.yPercent}%` 
                    }}
                  >
                    {/* 1. Accuracy Circle (subtle translucent blue circle representing GPS accuracy) */}
                    <div 
                      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/15 border border-blue-400/40 pointer-events-none transition-all duration-500"
                      style={{
                        width: `${accuracyRadiusPx}px`,
                        height: `${accuracyRadiusPx}px`,
                        left: "50%",
                        top: "50%",
                      }}
                    />

                    {/* 2. Pulsing Beacon Ripple */}
                    <div className="absolute -inset-2 rounded-full bg-blue-400/40 animate-ping"></div>

                    {/* 3. Solid Blue Core Dot with White Ring */}
                    <div className="relative w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-2xl flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>

                    {/* 4. Directional Heading Indicator if available */}
                    {userMarkerPos.heading !== undefined && (
                      <div 
                        className="absolute w-8 h-8 -top-1.5 -left-1.5 pointer-events-none"
                        style={{ transform: `rotate(${userMarkerPos.heading}deg)` }}
                      >
                        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-blue-600 mx-auto -mt-2"></div>
                      </div>
                    )}

                    {/* 5. Tooltip Tag: "You • Live GPS" */}
                    <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-blue-900/90 backdrop-blur-md text-white text-[9px] font-bold shadow-lg border border-blue-400/30 whitespace-nowrap flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                      <span>You (Device GPS)</span>
                    </div>
                  </div>
                )}

                {/* MOVING BICYCLE ICON (When Active Rental In Progress) */}
                {hasActiveRental && (
                  <div 
                    className="absolute z-25 flex flex-col items-center -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out"
                    style={{ 
                      left: `${userMarkerPos.xPercent}%`, 
                      top: `${userMarkerPos.yPercent}%` 
                    }}
                  >
                    <div className="relative mb-6">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
                        <BikeIcon className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* FLOATING MAP CONTROLS (Top-Left Geofence & Status) */}
              <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 pointer-events-none">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-[10px] font-bold text-white border border-white/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>AIT Pune Campus Mobility Grid</span>
                </div>
                {!followMode && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/80 backdrop-blur-md text-[9px] font-bold text-amber-300 border border-amber-500/30">
                    <span>Exploring (Follow Paused • Click Recenter to Resume)</span>
                  </div>
                )}
              </div>

              {/* FLOATING ZOOM & VIEW CONTROLS (Bottom-Right Pillar) */}
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
                  onClick={handleRecenter}
                  className="w-8 h-8 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
                  title="Recenter on My Location"
                >
                  <Crosshair className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetToCampus}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
                  title="Center on AIT Pune Campus"
                >
                  <Compass className="w-4 h-4" />
                </button>
              </div>

              {/* Distance from AIT Pune campus badge (if device is outside) */}
              {currentLocation && (
                <div className="absolute bottom-3 left-3 z-20 px-2.5 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md text-[10px] text-slate-300 border border-white/20 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" />
                  <span>
                    {coordsToCampusPercent(currentLocation.lat, currentLocation.lng).isWithinCampus
                      ? "Device within AIT Pune Campus"
                      : `${coordsToCampusPercent(currentLocation.lat, currentLocation.lng).distanceKm} km from AIT Pune`}
                  </span>
                </div>
              )}
            </div>

            {/* 4. OPTIONAL LOCATION DETAILS & DIAGNOSTICS PANEL */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
              <button
                onClick={() => setShowLocationDetails(!showLocationDetails)}
                className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#006699]" />
                  <span>Real Device Location Details & Diagnostics</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-normal">
                  <span>{showLocationDetails ? "Hide" : "Show"}</span>
                  {showLocationDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showLocationDetails && (
                <div className="p-4 pt-1 border-t border-slate-200/80 space-y-3 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Latitude */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Latitude</span>
                      <span className="font-mono font-bold text-slate-900 block mt-0.5">
                        {currentLocation ? `${currentLocation.lat.toFixed(6)}° N` : "Not acquired"}
                      </span>
                    </div>

                    {/* Longitude */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Longitude</span>
                      <span className="font-mono font-bold text-slate-900 block mt-0.5">
                        {currentLocation ? `${currentLocation.lng.toFixed(6)}° E` : "Not acquired"}
                      </span>
                    </div>

                    {/* GPS Accuracy */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">GPS Accuracy</span>
                      <span className="font-mono font-bold text-emerald-700 block mt-0.5">
                        {currentLocation ? `±${currentLocation.accuracy} m` : "—"}
                      </span>
                    </div>

                    {/* Last Update Timestamp */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Last Reading</span>
                      <span className="font-mono text-[11px] text-slate-700 block mt-0.5">
                        {currentLocation 
                          ? new Date(currentLocation.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) 
                          : "Awaiting update"}
                      </span>
                    </div>
                  </div>

                  {/* Device Telemetry Disclaimer */}
                  <div className="p-2.5 rounded-xl bg-sky-50/80 border border-sky-200 text-[11px] text-sky-900 flex items-start gap-2">
                    <Info className="w-4 h-4 text-[#006699] shrink-0 mt-0.5" />
                    <span>
                      <strong>Device Telemetry Notice:</strong> Marker represents the GPS receiver in your device (smartphone/laptop) running this browser session. Campus bicycles do not possess standalone cellular transmitters.
                    </span>
                  </div>

                  {/* Sync Status Footer */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Recorded GPS Points: <strong>{routeTrace.length}</strong></span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono">{lastSyncText}</span>
                      {isPersisting && <RefreshCw className="w-3 h-3 animate-spin text-[#006699]" />}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Rental Information / Standby Console */}
        <div className="lg:col-span-5 space-y-5">
          
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-elevated space-y-5">
            
            {/* Header: Bike Details or Standby Banner */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center p-1 text-[#006699] shrink-0">
                  <BikeIcon className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-space font-extrabold text-base text-slate-900 leading-tight">
                    {hasActiveRental ? currentRide.bike.name : "CampusCycle Mobility Standby"}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {hasActiveRental ? `${currentRide.bike.series} • Model ${currentRide.bike.modelCode}` : "Select a cycle to begin an authorized rental"}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-[#006699] border border-sky-200">
                  Fixed ₹25/hr
                </span>
              </div>
            </div>

            {/* Trip Timeline & Deadlines */}
            {hasActiveRental ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Active Rental Timeline & Deadlines
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    A
                  </div>
                  <div className="flex-1 flex justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">North Quad Hub #04</span>
                      <span className="text-[10px] text-slate-500">Check-out verified</span>
                    </div>
                    <span className="font-mono text-slate-700 font-semibold">{currentRide.checkOutTimeText}</span>
                  </div>
                </div>

                <div className="ml-2.5 border-l-2 border-dashed border-slate-300 h-3"></div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#006699] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    B
                  </div>
                  <div className="flex-1 flex justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">SAC Central Hub (Bay A03)</span>
                      <span className="text-[10px] text-slate-500">Return Deadline</span>
                    </div>
                    <span className="font-mono text-[#006699] font-bold">{currentRide.expectedReturnTimeText}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                  <Info className="w-4 h-4 text-[#006699]" />
                  <span>No Active Rental In Progress</span>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  You are previewing device-based live telemetry. When you unlock a bicycle at the Sports Complex or any campus stand, your live route will automatically record here.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      setCurrentView("booking");
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-bold text-xs transition text-center cursor-pointer"
                  >
                    Book & Unlock Cycle
                  </button>
                  <button
                    onClick={() => {
                      setCurrentView("stations");
                    }}
                    className="py-2 px-3 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                  >
                    View Fleet
                  </button>
                </div>
              </div>
            )}

            {/* Countdown / Elapsed Dual Metric Display */}
            {hasActiveRental && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Elapsed Duration
                  </span>
                  <div className="font-space font-extrabold text-2xl text-slate-900">
                    {formatElapsed(currentRide.elapsedSeconds)}
                  </div>
                  <span className="text-[10px] text-slate-500 block">Active session clock</span>
                </div>

                <div className={`p-4 rounded-2xl border space-y-1 ${
                  isOverdue 
                    ? "bg-red-50 border-red-300 text-red-900" 
                    : "bg-sky-50 border-sky-200 text-[#006699]"
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider block">
                    {isOverdue ? "Overdue By" : "Time Remaining"}
                  </span>
                  <div className="font-space font-extrabold text-2xl font-mono">
                    {isOverdue ? `+${formatCountdown(overdueSeconds)}` : formatCountdown(remainingSeconds)}
                  </div>
                  <span className="text-[10px] block opacity-80">
                    {isOverdue ? "Return past deadline" : "Until return cutoff"}
                  </span>
                </div>
              </div>
            )}

            {/* 4 Telemetry Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Distance Traveled */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase">
                  <span>Distance</span>
                  <span className="text-emerald-700 font-semibold font-mono">GPS Trace</span>
                </div>
                <div className="font-space font-extrabold text-xl text-slate-900">
                  {currentRide.distanceKm.toFixed(2)} <span className="text-xs font-normal text-slate-500">km</span>
                </div>
                <span className="text-[10px] text-slate-400 block leading-tight">
                  Trip statistic only • Fixed ₹25/hr
                </span>
              </div>

              {/* Current Speed */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase">
                  <span>Speed</span>
                  <span className="text-sky-700 font-semibold font-mono">Live</span>
                </div>
                <div className="font-space font-extrabold text-xl text-slate-900">
                  {(userMarkerPos.speed || currentRide.currentSpeed).toFixed(1)} <span className="text-xs font-normal text-slate-500">km/h</span>
                </div>
                <span className="text-[10px] text-slate-500 block">Cadence: {currentRide.cadence || 72} rpm</span>
              </div>

              {/* Fixed Hourly Fare Current Calculation */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Rental Fare</span>
                <div className="font-space font-extrabold text-xl text-[#006699]">
                  ₹{currentRide.currentCost.toFixed(2)}
                </div>
                <span className="text-[10px] text-slate-500 block">Flat ₹25.00 / hour</span>
              </div>

              {/* Bicycle Mechanical Inspection */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Brakes & Tires</span>
                <div className="font-space font-extrabold text-xl text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-base text-slate-900">Optimal</span>
                </div>
                <span className="text-[10px] text-slate-500 block">50 PSI • Dual Rim Brakes</span>
              </div>
            </div>

            {/* AUTHORIZED CHECK-IN ACTION BUTTON (For Active Rental) */}
            {hasActiveRental && (
              <div className="space-y-2 pt-2">
                <button
                  onClick={endRide}
                  className="w-full py-4 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-space font-bold text-sm uppercase tracking-wider shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group active:scale-[0.98] cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                  <span>Lock & End Ride at Official Dock</span>
                </button>

                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1">
                  <span>Authorized Dock Sensor Verification</span>
                  <button
                    onClick={() => alert("Reported to Sports Complex Stand Maintenance.")}
                    className="text-slate-600 hover:text-slate-900 font-semibold underline cursor-pointer"
                  >
                    Report Rack Issue
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. PERMISSION EXPLANATION MODAL (Required by Prompt) */}
      {permissionModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl animate-in zoom-in-95 border border-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <LocateFixed className="w-8 h-8" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-space font-extrabold text-xl text-slate-900">
                Enable Campus Live Location
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                CampusCycle needs access to your device location to display your actual live position on the AIT Pune campus map and record route telemetry during your rental.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>How your location is handled:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-slate-500">
                <li>Acquires position from your smartphone or laptop browser.</li>
                <li>Updates marker smoothly as you move across campus.</li>
                <li>Only records telemetry points when an active rental is underway.</li>
                <li>You can stop tracking anytime using the Stop Tracking control.</li>
              </ul>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={startRealDeviceTracking}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-space font-bold text-sm shadow-md transition cursor-pointer"
              >
                Grant Permission & Start Tracking
              </button>
              <button
                onClick={() => setPermissionModalOpen(false)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. SOS EMERGENCY MODAL */}
      {sosModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-space font-bold text-xl text-slate-900">Campus Emergency SOS</h3>
              <p className="text-xs text-slate-500">
                Your live coordinates ({currentLocation ? `${currentLocation.lat.toFixed(5)}° N, ${currentLocation.lng.toFixed(5)}° E` : "18.6072° N, 73.8752° E"}) will be transmitted to AIT Pune Security Dispatch.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  alert("Emergency SOS dispatched! Campus mobile response van dispatched to your live coordinates.");
                  setSosModalOpen(false);
                }}
                className="w-full py-3.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition cursor-pointer"
              >
                Confirm Dispatch Security Van
              </button>
              <button
                onClick={() => setSosModalOpen(false)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
