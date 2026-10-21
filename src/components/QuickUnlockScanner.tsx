"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";
import { useRide } from "@/context/RideContext";
import { CAMPUS_BIKES, Bike } from "@/data/bikes";
import { 
  Camera, 
  CameraOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  QrCode, 
  Lock, 
  Unlock, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles,
  Smartphone,
  HelpCircle,
  Clock,
  RotateCcw
} from "lucide-react";

interface QuickUnlockScannerProps {
  onBikeUnlocked?: (bike: Bike) => void;
  variant?: "full" | "widget";
}

type CameraStatus = "idle" | "requesting" | "active" | "denied" | "unavailable" | "error";

interface ValidationResult {
  status: "idle" | "valid" | "invalid" | "already-checked-out" | "active-ride-conflict" | "maintenance-locked";
  message: string;
  bike?: Bike;
  scannedCode?: string;
}

export const QuickUnlockScanner: React.FC<QuickUnlockScannerProps> = ({ 
  onBikeUnlocked, 
  variant = "full" 
}) => {
  const { selectedBike, setSelectedBike, startRide, setCurrentView, activeRide } = useRide();
  const [isVolunteerAction, setIsVolunteerAction] = useState(false);
  
  // Camera & Video state
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);
  const [scannerActive, setScannerActive] = useState<boolean>(true);
  
  // Validation state
  const [validation, setValidation] = useState<ValidationResult>({
    status: "idle",
    message: ""
  });
  const [manualCode, setManualCode] = useState<string>("");
  const [isProcessingUnlock, setIsProcessingUnlock] = useState<boolean>(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Stop camera tracks cleanly
  const stopCameraStream = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Check available camera devices
  const checkCameraDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setHasMultipleCameras(videoDevices.length > 1);
    } catch {
      // ignore enumerate devices errors
    }
  }, []);

  // Core cycle validation logic against campus fleet
  const validateCyclePayload = useCallback((payload: string): ValidationResult => {
    const raw = payload.trim();
    if (!raw) {
      return {
        status: "invalid",
        message: "Please enter or scan a cycle identification code.",
        scannedCode: raw
      };
    }

    // Extract potential code from URLs or query strings (e.g. ?bike=VC-0712 or /unlock/0712)
    let searchStr = raw;
    try {
      if (raw.startsWith("http://") || raw.startsWith("https://")) {
        const url = new URL(raw);
        searchStr = url.searchParams.get("bike") || 
                    url.searchParams.get("code") || 
                    url.searchParams.get("id") || 
                    url.pathname.split("/").pop() || raw;
      }
    } catch {
      // Not a valid URL, search directly
    }

    // Try parsing as JSON payload if applicable
    try {
      if (raw.startsWith("{") && raw.endsWith("}")) {
        const parsed = JSON.parse(raw);
        if (parsed.bikeId || parsed.code || parsed.modelCode) {
          searchStr = parsed.bikeId || parsed.code || parsed.modelCode;
        }
      }
    } catch {
      // Not JSON
    }

    const cleanQuery = searchStr.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase();

    // Find bike in CAMPUS_BIKES
    const matchedBike = CAMPUS_BIKES.find((b) => {
      const bModel = b.modelCode.toUpperCase().replace(/[^a-zA-Z0-9-]/g, "");
      const bId = b.id.toUpperCase();
      const bNumeric = b.modelCode.replace(/[^0-9]/g, "");
      const cleanNumeric = cleanQuery.replace(/[^0-9]/g, "");

      return (
        bModel === cleanQuery ||
        bModel.includes(cleanQuery) ||
        bId === cleanQuery ||
        (cleanNumeric.length >= 4 && bNumeric.includes(cleanNumeric))
      );
    });

    if (!matchedBike) {
      return {
        status: "invalid",
        message: `Unrecognized cycle code: "${raw}". Not registered in AIT Pune CampusCycle fleet.`,
        scannedCode: raw
      };
    }

    // Prevent duplicate checkout if this bike is already on an active ride
    if (activeRide && activeRide.bike.id === matchedBike.id) {
      return {
        status: "already-checked-out",
        message: `${matchedBike.name} (${matchedBike.modelCode}) is currently on an active trip. Duplicate checkout prevented.`,
        bike: matchedBike,
        scannedCode: raw
      };
    }

    // Check if user already has an active ride on another cycle
    if (activeRide && activeRide.bike.id !== matchedBike.id) {
      return {
        status: "active-ride-conflict",
        message: `You currently have an active ride on ${activeRide.bike.name}. Please complete or return your current ride before unlocking another cycle.`,
        bike: matchedBike,
        scannedCode: raw
      };
    }

    // Check if bicycle is under maintenance
    if (matchedBike.isMaintenance || matchedBike.conditionType === "maintenance") {
      return {
        status: "maintenance-locked",
        message: `Safety Hold: ${matchedBike.name} (${matchedBike.modelCode}) is currently placed UNDER MAINTENANCE. Check-out is blocked until inspected and cleared by an authorized technician.`,
        bike: matchedBike,
        scannedCode: raw
      };
    }

    // Valid cycle found
    return {
      status: "valid",
      message: `Verified: ${matchedBike.name} (${matchedBike.modelCode}) located at ${matchedBike.dockNumber}. Ready for authorization.`,
      bike: matchedBike,
      scannedCode: raw
    };
  }, [activeRide]);

  // Request & Start Camera stream
  const startCamera = useCallback(async () => {
    stopCameraStream();

    // Verify browser compatibility & secure context
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("unavailable");
      setCameraErrorMessage("Camera access is not supported by this browser. Please use the manual stencil code entry below.");
      return;
    }

    // Check localhost / HTTPS security requirement
    const isLocalhost = window.location.hostname === "localhost" || 
                        window.location.hostname === "127.0.0.1" || 
                        window.location.hostname === "::1";
    if (!window.isSecureContext && !isLocalhost) {
      setCameraStatus("unavailable");
      setCameraErrorMessage("Camera access requires HTTPS or localhost. Please open the website over a secure connection.");
      return;
    }

    setCameraStatus("requesting");
    setCameraErrorMessage("");

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }

      setCameraStatus("active");
      await checkCameraDevices();
    } catch (err: unknown) {
      const error = err as Error;
      stopCameraStream();

      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setCameraStatus("denied");
        setCameraErrorMessage(
          "Camera permission was denied. To enable: click the camera/lock icon in your browser URL bar, set Camera to 'Allow', and click 'Try Again'."
        );
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setCameraStatus("unavailable");
        setCameraErrorMessage("No camera hardware found on this device. Use manual 4-digit stencil code entry below.");
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        setCameraStatus("error");
        setCameraErrorMessage("Camera is currently in use by another tab or app. Please close other camera apps and retry.");
      } else {
        setCameraStatus("error");
        setCameraErrorMessage(`Camera initialization error: ${error.message || "Failed to start camera"}`);
      }
    }
  }, [facingMode, stopCameraStream, checkCameraDevices]);

  // Flip camera between environment (rear) and user (selfie)
  const toggleCameraFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Trigger camera start on mount if scannerActive is true
  useEffect(() => {
    if (scannerActive) {
      startCamera();
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [scannerActive, facingMode, startCamera, stopCameraStream]);

  // Real-time QR decoding loop from live video frame
  useEffect(() => {
    if (cameraStatus !== "active" || !scannerActive) return;

    let isScanning = true;

    const scanFrame = () => {
      if (!isScanning) return;

      const video = videoRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        let canvas = canvasRef.current;
        if (!canvas) {
          canvas = document.createElement("canvas");
          canvasRef.current = canvas;
        }

        const width = video.videoWidth;
        const height = video.videoHeight;

        if (width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });

          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });

            if (qrResult && qrResult.data) {
              const res = validateCyclePayload(qrResult.data);
              setValidation(res);

              if (res.bike) {
                setSelectedBike(res.bike);
              }

              // Pause scanning frame loop while viewing validated result
              isScanning = false;
              return;
            }
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);

    return () => {
      isScanning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraStatus, scannerActive, validateCyclePayload, setSelectedBike]);

  // Handle manual code entry submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    const res = validateCyclePayload(manualCode);
    setValidation(res);
    if (res.bike) {
      setSelectedBike(res.bike);
    }
  };

  // Authorize & trigger smart dock release
  const handleAuthorizeUnlock = () => {
    if (!validation.bike) return;

    setIsProcessingUnlock(true);

    // Record atomic check-out in shared fleet store
    fetch("/api/fleet/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cycleId: validation.bike.id,
        riderId: "IITB-22B0814",
        riderName: "Aryan K.",
        departureStand: "Sports Complex & Tennis Courts Stand",
      }),
    }).catch(() => {});

    // Simulate smart BLE solenoid dock release handshake
    setTimeout(() => {
      setIsProcessingUnlock(false);
      startRide(validation.bike!);
      if (onBikeUnlocked) {
        onBikeUnlocked(validation.bike!);
      }
      setCurrentView("active-ride");
    }, 1200);
  };

  // Volunteer check-out action
  const handleVolunteerCheckOut = async () => {
    if (!validation.bike) return;
    setIsVolunteerAction(true);
    try {
      const res = await fetch("/api/fleet/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycleId: validation.bike.id,
          riderId: "VOL-001",
          riderName: "Volunteer Team",
          departureStand: "Sports Complex & Tennis Courts Stand",
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Bicycle ${validation.bike.modelCode} checked out for volunteer fleet operations.`);
        handleResetScan();
      } else {
        alert(data.error || "Volunteer check-out failed.");
      }
    } catch {
      alert("Network communication error.");
    } finally {
      setIsVolunteerAction(false);
    }
  };

  // Volunteer check-in action
  const handleVolunteerCheckIn = async () => {
    if (!validation.bike) return;
    setIsVolunteerAction(true);
    try {
      const res = await fetch("/api/fleet/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycleId: validation.bike.id,
          returnStand: "Sports Complex & Tennis Courts Stand",
          volunteerId: "VOL-001",
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Bicycle ${validation.bike.modelCode} checked in at Sports Complex & Tennis Courts Stand.`);
        handleResetScan();
      } else {
        alert(data.error || "Volunteer check-in failed.");
      }
    } catch {
      alert("Network communication error.");
    } finally {
      setIsVolunteerAction(false);
    }
  };

  // Reset scan to allow scanning another code
  const handleResetScan = () => {
    setValidation({ status: "idle", message: "" });
    setManualCode("");
    if (cameraStatus !== "active") {
      startCamera();
    }
  };

  const isWidget = variant === "widget";

  return (
    <div className={`bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-elevated border border-slate-800 space-y-4 ${isWidget ? "max-w-md mx-auto" : ""}`}>
      {/* Header & Status Indicator */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#006699] to-[#00F0FF] p-0.5 shadow-sm">
            <div className="w-full h-full bg-[#006699] rounded-[10px] flex items-center justify-center text-white">
              <QrCode className="w-4 h-4 text-brand-accent" />
            </div>
          </div>
          <div>
            <h3 className="font-space font-bold text-sm sm:text-base text-white">
              Quick Unlock Hub
            </h3>
            <p className="text-[11px] text-slate-400">
              Live Camera QR Scanner & Stencil Release
            </p>
          </div>
        </div>

        {/* Camera Switcher & Live Pill */}
        <div className="flex items-center gap-2">
          {cameraStatus === "active" && hasMultipleCameras && (
            <button
              onClick={toggleCameraFacingMode}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-semibold border border-slate-700 flex items-center gap-1 transition"
              title={`Switch to ${facingMode === "environment" ? "front" : "rear"} camera`}
            >
              <RefreshCw className="w-3 h-3 text-brand-accent" />
              <span className="hidden sm:inline">Flip</span>
            </button>
          )}

          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            cameraStatus === "active" 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
              : "bg-amber-500/10 text-amber-300 border-amber-500/30"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              cameraStatus === "active" ? "bg-emerald-400 animate-ping" : "bg-amber-400"
            }`}></span>
            {cameraStatus === "active" ? "Camera Live" : "Camera Standby"}
          </span>
        </div>
      </div>

      {/* Main Viewfinder Box: Houses the actual live camera video */}
      <div className="relative aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 flex items-center justify-center shadow-inner">
        {/* Hidden Canvas for QR frame processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* 1. Actual Live Camera Video Stream */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            cameraStatus === "active" ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* 2. Optical Reticle HUD (Shown when camera is active) */}
        {cameraStatus === "active" && validation.status === "idle" && (
          <div className="absolute inset-0 scanner-grid flex items-center justify-center pointer-events-none p-4">
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 border-2 border-emerald-400 rounded-2xl flex flex-col justify-between p-3 shadow-glowVolt">
              {/* Corner tick marks */}
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-slate-950/80 px-1.5 py-0.5 rounded">
                  SCANNING
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              </div>

              {/* Center crosshair */}
              <div className="text-center">
                <div className="w-8 h-8 mx-auto border border-dashed border-emerald-400/60 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                </div>
              </div>

              <div className="bg-slate-950/90 py-1 px-2 rounded-lg border border-emerald-500/40 text-[10px] text-center text-slate-300 font-mono">
                Align Handlebar QR in Frame
              </div>
            </div>
          </div>
        )}

        {/* 3. Requesting / Initializing Camera Loader */}
        {cameraStatus === "requesting" && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="w-10 h-10 rounded-full border-2 border-brand-accent border-t-transparent animate-spin"></div>
            <div className="space-y-1">
              <p className="font-space font-bold text-sm text-white">
                Requesting Camera Permission...
              </p>
              <p className="text-xs text-slate-400 max-w-xs">
                Please tap <strong>&quot;Allow&quot;</strong> in your browser prompt to scan cycle QR codes.
              </p>
            </div>
          </div>
        )}

        {/* 4. Camera Permission Denied Screen */}
        {cameraStatus === "denied" && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-5 text-center space-y-3 z-20">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <CameraOff className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h4 className="font-space font-bold text-sm text-white">
                Camera Access Denied
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {cameraErrorMessage}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                onClick={startCamera}
                className="px-3 py-1.5 rounded-xl bg-brand-accent hover:bg-lime-400 text-slate-950 font-bold text-xs shadow-sm transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        )}

        {/* 5. Camera Unavailable / Error Screen */}
        {(cameraStatus === "unavailable" || cameraStatus === "error") && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-5 text-center space-y-3 z-20">
            <div className="w-11 h-11 rounded-2xl bg-slate-800 text-slate-300 flex items-center justify-center border border-slate-700">
              <CameraOff className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-xs">
              <h4 className="font-space font-bold text-sm text-white">
                Camera Unavailable
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {cameraErrorMessage}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={startCamera}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Camera</span>
              </button>
            </div>
          </div>
        )}

        {/* 6. Camera Idle Screen */}
        {cameraStatus === "idle" && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#006699]/30 text-brand-accent flex items-center justify-center border border-[#006699]/50">
              <Camera className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-400">
              Tap below to activate device camera for instant dock unlock.
            </p>
            <button
              onClick={startCamera}
              className="px-4 py-2 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md"
            >
              <Camera className="w-3.5 h-3.5 text-brand-accent" />
              <span>Enable Device Camera</span>
            </button>
          </div>
        )}
      </div>

      {/* Validation Result Feedback Banner */}
      {validation.status !== "idle" && (
        <div className={`p-4 rounded-2xl border transition-all animate-in fade-in duration-200 ${
          validation.status === "valid" 
            ? "bg-emerald-950/70 border-emerald-500/50 text-white" 
            : validation.status === "invalid"
            ? "bg-red-950/70 border-red-500/50 text-white"
            : "bg-amber-950/70 border-amber-500/50 text-white"
        }`}>
          {/* Valid Bike Detected */}
          {validation.status === "valid" && validation.bike && (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-emerald-400">
                      Cycle Identified • Ready for Unlock
                    </span>
                  </div>
                  <h4 className="font-space font-bold text-base text-white">
                    {validation.bike.name} ({validation.bike.modelCode})
                  </h4>
                  <p className="text-xs text-slate-300">
                    Assigned: {validation.bike.dockNumber} • {validation.bike.conditionBadge}
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-space font-extrabold text-base text-brand-accent">
                    ₹25/hr
                  </span>
                  <span className="text-[10px] text-slate-400 block">Flat Rate</span>
                </div>
              </div>

              {/* Student Authorization Banner */}
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Student ID: <strong>Aryan K. (IITB-22B0814)</strong></span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40">
                  Pass Active
                </span>
              </div>

              {/* Volunteer & Fleet Management Actions */}
              <div className="pt-2 border-t border-emerald-500/20 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Volunteer & Fleet Control Actions
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleVolunteerCheckOut}
                    disabled={isVolunteerAction}
                    className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 transition"
                  >
                    Volunteer Check-Out
                  </button>
                  <button
                    onClick={handleVolunteerCheckIn}
                    disabled={isVolunteerAction}
                    className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 transition"
                  >
                    Volunteer Check-In (Dock)
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  onClick={handleAuthorizeUnlock}
                  disabled={isProcessingUnlock}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-brand-accent hover:bg-lime-400 disabled:bg-slate-700 text-slate-950 font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 active:scale-95"
                >
                  {isProcessingUnlock ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin"></div>
                      <span>Releasing Dock Lock...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Authorize & Unlock Cycle</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                <button
                  onClick={handleResetScan}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                >
                  Scan Another
                </button>
              </div>
            </div>
          )}

          {/* Maintenance Locked Cycle */}
          {validation.status === "maintenance-locked" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 font-mono text-[10px] font-bold border border-red-500/40">
                      MAINTENANCE SAFETY HOLD
                    </span>
                    <span className="text-xs text-red-400 font-bold">Check-Out Prohibited</span>
                  </div>
                  <h4 className="font-space font-bold text-sm text-white">
                    {validation.bike?.name} ({validation.bike?.modelCode})
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {validation.message}
                  </p>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-red-500/30 text-xs text-slate-300">
                <span className="text-amber-400 font-semibold">Technician Notice:</span> Only an authorized volunteer or administrator can mark this bicycle ready for use after physical safety inspection.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleResetScan}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                >
                  Scan Another Cycle
                </button>
              </div>
            </div>
          )}

          {/* Invalid QR Code */}
          {validation.status === "invalid" && (
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="font-space font-bold text-xs text-red-300 uppercase tracking-wide">
                    QR Validation Failed
                  </h4>
                  <p className="text-xs text-slate-200">
                    {validation.message}
                  </p>
                </div>
              </div>
              <button
                onClick={handleResetScan}
                className="w-full py-2 px-3 rounded-xl bg-red-900/60 hover:bg-red-800/80 text-white font-bold text-xs border border-red-700/60 transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear & Rescan Cycle</span>
              </button>
            </div>
          )}

          {/* Already Checked Out or Conflict */}
          {(validation.status === "already-checked-out" || validation.status === "active-ride-conflict") && (
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="font-space font-bold text-xs text-amber-300 uppercase tracking-wide">
                    Ride Conflict Warning
                  </h4>
                  <p className="text-xs text-slate-200">
                    {validation.message}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentView("active-ride")}
                  className="flex-1 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition"
                >
                  View Active Ride
                </button>
                <button
                  onClick={handleResetScan}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Stencil Code Fallback Entry */}
      <div className="pt-2 border-t border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <label htmlFor="manual-code-input" className="font-medium text-slate-300 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-brand-accent" />
            <span>Manual Stencil ID Entry:</span>
          </label>
          <span className="text-[10px] text-slate-500 font-mono">Laser Top Tube ID</span>
        </div>

        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            id="manual-code-input"
            type="text"
            maxLength={10}
            placeholder="e.g. 0712 or VC-0712"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#006699]"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md active:scale-95 shrink-0"
          >
            <span>Verify & Unlock</span>
            <ArrowRight className="w-3.5 h-3.5 text-brand-accent" />
          </button>
        </form>
        <p className="text-[10px] text-slate-500">
          Manual input undergoes the identical authorization check. Flat ₹25/hr rate applies.
        </p>
      </div>
    </div>
  );
};
