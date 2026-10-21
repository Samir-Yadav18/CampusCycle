/**
 * CampusCycle Server-Side Active Trip & Telemetry Persistence Store
 * 
 * Provides:
 * - Persistent active trip state across page reloads
 * - Real-time student device GPS point ingestion and route tracing
 * - Return deadline and overdue/late return tracking
 * - Historical trip telemetry logging
 * - Distinction between Real Device GPS points and Demo Simulation paths
 * - Zero raw credential access / scoped by student identity
 */

import fs from "fs";
import path from "path";
import { Bike, CAMPUS_BIKES } from "@/data/bikes";

export interface LocationPoint {
  lat: number;
  lng: number;
  xPercent: number; // Normalized campus coordinate (0-100%)
  yPercent: number; // Normalized campus coordinate (0-100%)
  accuracy?: number; // In meters
  speed?: number; // In km/h
  heading?: number; // In degrees
  timestamp: number;
  isRealDeviceGps: boolean; // True if from navigator.geolocation, false if synthetic demo
}

export type TripStatus = "ACTIVE_ON_TRACK" | "APPROACHING_DEADLINE" | "OVERDUE" | "COMPLETED";

export interface ActiveTripSession {
  rideId: string;
  bookingId: string;
  studentId: string;
  studentName: string;
  bike: Bike;
  startStationName: string;
  startStationCoords: { x: number; y: number };
  targetStationName: string;
  targetStationCoords: { x: number; y: number };
  checkOutTimeMs: number;
  checkOutTimeText: string;
  expectedReturnTimeMs: number;
  expectedReturnTimeText: string;
  bookedDurationHours: number;
  routeTrace: LocationPoint[];
  currentLocation: LocationPoint | null;
  distanceKm: number;
  currentSpeedKmH: number;
  isDemoMode: boolean;
  status: TripStatus;
  isOverdue: boolean;
  overdueSeconds: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const ACTIVE_TRIPS_FILE = path.join(DATA_DIR, "active_trips.json");
const TRIP_HISTORY_FILE = path.join(DATA_DIR, "trip_history.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadActiveTrips(): Record<string, ActiveTripSession> {
  ensureDataDir();
  if (!fs.existsSync(ACTIVE_TRIPS_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(ACTIVE_TRIPS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveActiveTrips(trips: Record<string, ActiveTripSession>) {
  ensureDataDir();
  fs.writeFileSync(ACTIVE_TRIPS_FILE, JSON.stringify(trips, null, 2), "utf-8");
}

function loadTripHistory(): ActiveTripSession[] {
  ensureDataDir();
  if (!fs.existsSync(TRIP_HISTORY_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(TRIP_HISTORY_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveTripHistory(history: ActiveTripSession[]) {
  ensureDataDir();
  fs.writeFileSync(TRIP_HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
}

/**
 * Creates default active session if none exists
 */
export function getDefaultActiveTrip(
  studentId: string = "IITB-22B0814",
  rideId: string = "#VC-9921"
): ActiveTripSession {
  const now = Date.now();
  // Checked out 18 minutes ago
  const checkOutTimeMs = now - 18 * 60 * 1000 - 24 * 1000;
  // Expected return 1 hour after checkout
  const expectedReturnTimeMs = checkOutTimeMs + 60 * 60 * 1000;

  const checkOutDate = new Date(checkOutTimeMs);
  const checkOutTimeText = checkOutDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const returnDate = new Date(expectedReturnTimeMs);
  const expectedReturnTimeText = returnDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // Sample initial trace points (from Academic Stand towards Central SAC)
  const initialPoints: LocationPoint[] = [
    {
      lat: 18.6071,
      lng: 73.8745,
      xPercent: 42.0,
      yPercent: 78.0,
      accuracy: 6.0,
      speed: 0.0,
      timestamp: checkOutTimeMs,
      isRealDeviceGps: false,
    },
    {
      lat: 18.6074,
      lng: 73.8748,
      xPercent: 46.0,
      yPercent: 62.0,
      accuracy: 5.5,
      speed: 14.8,
      timestamp: checkOutTimeMs + 5 * 60 * 1000,
      isRealDeviceGps: false,
    },
    {
      lat: 18.6078,
      lng: 73.8752,
      xPercent: 52.0,
      yPercent: 45.0,
      accuracy: 5.0,
      speed: 16.2,
      timestamp: checkOutTimeMs + 12 * 60 * 1000,
      isRealDeviceGps: false,
    },
    {
      lat: 18.6082,
      lng: 73.8756,
      xPercent: 58.0,
      yPercent: 32.0,
      accuracy: 4.8,
      speed: 16.4,
      timestamp: now,
      isRealDeviceGps: false,
    },
  ];

  return {
    rideId,
    bookingId: "BK-20261017-9921",
    studentId,
    studentName: "Aryan K.",
    bike: CAMPUS_BIKES[2], // Mountain Bike #04
    startStationName: "North Quad Hub #04",
    startStationCoords: { x: 42.0, y: 82.0 },
    targetStationName: "SAC Central Hub (Bay A03)",
    targetStationCoords: { x: 78.0, y: 22.0 },
    checkOutTimeMs,
    checkOutTimeText,
    expectedReturnTimeMs,
    expectedReturnTimeText,
    bookedDurationHours: 1.0,
    routeTrace: initialPoints,
    currentLocation: initialPoints[initialPoints.length - 1],
    distanceKm: 2.8,
    currentSpeedKmH: 16.4,
    isDemoMode: true,
    status: "ACTIVE_ON_TRACK",
    isOverdue: false,
    overdueSeconds: 0,
    createdAt: new Date(checkOutTimeMs).toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Retrieves the student's active trip session, updating overdue status dynamically
 */
export function getActiveTripSession(
  studentId: string = "IITB-22B0814",
  rideId: string = "#VC-9921"
): ActiveTripSession {
  const trips = loadActiveTrips();
  const key = `${studentId.toLowerCase()}_${rideId.toLowerCase()}`;

  let session = trips[key];
  if (!session) {
    session = getDefaultActiveTrip(studentId, rideId);
    trips[key] = session;
    saveActiveTrips(trips);
  }

  // Update real-time overdue status
  const now = Date.now();
  const overdueDiffMs = now - session.expectedReturnTimeMs;
  if (overdueDiffMs > 0) {
    session.isOverdue = true;
    session.overdueSeconds = Math.floor(overdueDiffMs / 1000);
    session.status = "OVERDUE";
  } else if (-overdueDiffMs < 15 * 60 * 1000) {
    session.status = "APPROACHING_DEADLINE";
    session.isOverdue = false;
    session.overdueSeconds = 0;
  } else {
    session.status = "ACTIVE_ON_TRACK";
    session.isOverdue = false;
    session.overdueSeconds = 0;
  }

  return session;
}

/**
 * Validates a location point's geographical bounds and plausible movement
 */
export function validateLocationPoint(point: LocationPoint): { valid: boolean; reason?: string } {
  if (typeof point.lat !== "number" || isNaN(point.lat) || point.lat < -90 || point.lat > 90) {
    return { valid: false, reason: "Latitude must be a valid number between -90 and 90 degrees." };
  }
  if (typeof point.lng !== "number" || isNaN(point.lng) || point.lng < -180 || point.lng > 180) {
    return { valid: false, reason: "Longitude must be a valid number between -180 and 180 degrees." };
  }
  if (typeof point.timestamp !== "number" || isNaN(point.timestamp) || point.timestamp <= 0) {
    return { valid: false, reason: "Timestamp must be a valid positive epoch millisecond number." };
  }
  return { valid: true };
}

/**
 * Calculates Haversine distance in kilometers between two GPS coordinates
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
 * Appends a location point to the trip's route trace with validation and GPS jump filtering
 */
export function appendTripLocation(
  studentId: string,
  rideId: string,
  point: LocationPoint,
  addedDistanceKm: number = 0
): ActiveTripSession {
  const validation = validateLocationPoint(point);
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  const trips = loadActiveTrips();
  const key = `${studentId.toLowerCase()}_${rideId.toLowerCase()}`;
  const session = trips[key] || getDefaultActiveTrip(studentId, rideId);

  // Filter implausible GPS jumps (> 120 km/h or instant > 500m jump in < 3s)
  if (session.routeTrace.length > 0 && point.isRealDeviceGps) {
    const lastPoint = session.routeTrace[session.routeTrace.length - 1];
    const timeDeltaSec = Math.max(1, (point.timestamp - lastPoint.timestamp) / 1000);
    const distanceKm = calculateGpsDistanceKm(lastPoint.lat, lastPoint.lng, point.lat, point.lng);
    const speedKmH = (distanceKm / timeDeltaSec) * 3600;

    // Discard telemetry jump if speed exceeds plausible campus bike transit (> 120 km/h) with significant jump
    if (speedKmH > 120 && distanceKm > 0.2) {
      console.warn(`[Telemetry] Discarded implausible GPS jump: ${speedKmH.toFixed(1)} km/h over ${distanceKm.toFixed(2)} km`);
      return session;
    }
  }

  session.routeTrace.push(point);
  session.currentLocation = point;
  if (point.speed !== undefined) {
    session.currentSpeedKmH = point.speed;
  }
  if (addedDistanceKm > 0) {
    session.distanceKm = parseFloat((session.distanceKm + addedDistanceKm).toFixed(2));
  }
  session.isDemoMode = !point.isRealDeviceGps;
  session.updatedAt = new Date().toISOString();

  // Overdue check
  const now = Date.now();
  const overdueDiffMs = now - session.expectedReturnTimeMs;
  if (overdueDiffMs > 0) {
    session.isOverdue = true;
    session.overdueSeconds = Math.floor(overdueDiffMs / 1000);
    session.status = "OVERDUE";
  }

  trips[key] = session;
  saveActiveTrips(trips);
  return session;
}

/**
 * Starts or replaces an active trip session
 */
export function startTripSession(sessionData: Partial<ActiveTripSession>): ActiveTripSession {
  const trips = loadActiveTrips();
  const studentId = sessionData.studentId || "IITB-22B0814";
  const rideId = sessionData.rideId || `#VC-${Date.now().toString().slice(-4)}`;
  const key = `${studentId.toLowerCase()}_${rideId.toLowerCase()}`;

  const base = getDefaultActiveTrip(studentId, rideId);
  const updated: ActiveTripSession = {
    ...base,
    ...sessionData,
    rideId,
    studentId,
    updatedAt: new Date().toISOString(),
  };

  trips[key] = updated;
  saveActiveTrips(trips);
  return updated;
}

/**
 * Checks in and completes the active trip, persisting late return flag to historical log
 */
export function endTripSession(
  studentId: string,
  rideId: string
): { success: boolean; session?: ActiveTripSession; wasLate: boolean; overdueSeconds: number } {
  const trips = loadActiveTrips();
  const key = `${studentId.toLowerCase()}_${rideId.toLowerCase()}`;
  const session = trips[key] || getDefaultActiveTrip(studentId, rideId);

  const now = Date.now();
  const overdueDiffMs = now - session.expectedReturnTimeMs;
  const wasLate = overdueDiffMs > 0;
  const overdueSeconds = wasLate ? Math.floor(overdueDiffMs / 1000) : 0;

  session.status = "COMPLETED";
  session.isOverdue = wasLate;
  session.overdueSeconds = overdueSeconds;
  session.completedAt = new Date().toISOString();
  session.updatedAt = session.completedAt;

  // Save to history archive
  const history = loadTripHistory();
  history.unshift(session);
  saveTripHistory(history);

  // Remove from active map
  delete trips[key];
  saveActiveTrips(trips);

  return {
    success: true,
    session,
    wasLate,
    overdueSeconds,
  };
}
