/**
 * CampusCycle — AIT Pune Campus Map & Dock Radar Configuration
 * 
 * Single source of truth for:
 * 1. The AIT Pune Campus Map image asset path
 * 2. Configurable Cycle Stand markers and normalized coordinates (percentages 0-100)
 * 3. Club Fleet summary (Total 35 cycles) with invariant validation
 * 4. Flat rental pricing (₹10/hour)
 */

export interface CycleStand {
  id: string;
  name: string;
  /** Horizontal position as percentage (0 - 100) of map image width. null if unconfigured. */
  x: number | null;
  /** Vertical position as percentage (0 - 100) of map image height. null if unconfigured. */
  y: number | null;
  availableCycles: number | null;
  checkedOutCycles: number;
  maintenanceCycles: number;
  totalCapacity: number;
  lastUpdated: string;
  status: "OPEN" | "FULL" | "EMPTY" | "MAINTENANCE";
  description?: string;
}

export interface FleetSummary {
  isDemoData: boolean;
  totalFleet: number;
  availableCycles: number;
  reservedCycles: number;
  checkedOutCycles: number;
  maintenanceCycles: number;
}

export interface RentalPricing {
  ratePerHour: number;
  currency: string;
  unit: string;
  displayText: string;
  description: string;
}

/**
 * 1. REAL AIT PUNE CAMPUS MAP ASSET PATH
 * Image asset path in the public folder: public/images/ait-campus-map.png
 */
export const CAMPUS_MAP_CONFIG = {
  imagePath: "/images/ait-campus-map.png",
  altText: "Army Institute of Technology (AIT) Pune Campus Aerial Map",
  aspectRatio: "800 / 294",
  fallbackNote: "AIT Pune Campus Map image awaiting upload to public/images/ait-campus-map.png",
};

/**
 * 2. CONFIGURABLE CYCLE STAND MARKERS
 * 
 * Coordinates use normalized percentages (0-100%) of the map image:
 * - x: % from left edge of map image (0% to 100%)
 * - y: % from top edge of map image (0% to 100%)
 * 
 * One-Stop Dock System:
 * All campus cycles are stationed at a single central point:
 * - Sports Complex & Tennis Courts Stand (southeast sports field & courts at x: 73.5%, y: 78.5%)
 * 
 * All other former location pins have been removed as per the one-stop dock policy.
 */
export const CAMPUS_CYCLE_STANDS: CycleStand[] = [
  {
    id: "stand-sports",
    name: "Sports Complex & Tennis Courts Stand",
    x: 73.5, // Southeast sports field and courts
    y: 78.5,
    availableCycles: 18,
    checkedOutCycles: 10,
    maintenanceCycles: 3,
    totalCapacity: 35,
    lastUpdated: "Today, 14:30 IST",
    status: "OPEN",
    description: "Central One-Stop Dock: Badminton/Tennis courts, sports complex & athletics ground",
  },
];

/**
 * 3. FLEET SUMMARY DATA
 * 
 * Total Club Fleet: 35 cycles
 * 
 * Invariant Rule:
 * Available (18) + Reserved (4) + Checked-out (10) + Maintenance (3) = Total Fleet (35)
 * 
 * Available sum across the One-Stop Dock = 18 cycles.
 * 
 * Note: Clearly identified as Sample Demo Data (backend API integration pending).
 */
export const FLEET_SUMMARY: FleetSummary = {
  isDemoData: true,
  totalFleet: 35,
  availableCycles: 18,
  reservedCycles: 4,
  checkedOutCycles: 10,
  maintenanceCycles: 3,
};

/**
 * Programmatic Invariant Validator:
 * Validates that Available + Reserved + Checked-out + Maintenance === Total Fleet (35).
 */
export function validateFleetSummary(summary: FleetSummary): {
  isValid: boolean;
  computedSum: number;
  expectedTotal: number;
  message: string;
} {
  const computedSum =
    summary.availableCycles +
    summary.reservedCycles +
    summary.checkedOutCycles +
    summary.maintenanceCycles;
  const isValid = computedSum === summary.totalFleet;

  return {
    isValid,
    computedSum,
    expectedTotal: summary.totalFleet,
    message: isValid
      ? `Fleet balance verified: ${computedSum} of ${summary.totalFleet} cycles accounted for.`
      : `Fleet balance invariant violated: sum (${computedSum}) != total (${summary.totalFleet}).`,
  };
}

/**
 * 4. RENTAL PRICING CONFIGURATION
 * 
 * Standard flat rate: ₹25 per hour.
 * Distance-based / per-kilometer rates are strictly removed.
 */
export const RENTAL_PRICING: RentalPricing = {
  ratePerHour: 25,
  currency: "₹",
  unit: "hour",
  displayText: "₹25/hour",
  description: "Standard CampusCycle transit rate. Flat hourly billing — zero distance charges.",
};

/**
 * 5. AIT PUNE GEOGRAPHICAL BOUNDS & GPS TO CAMPUS COORDINATE PROJECTION
 * 
 * Geographic bounding box for Army Institute of Technology (AIT), Pune:
 * Min Lat: 18.6040 N, Max Lat: 18.6105 N
 * Min Lng: 73.8715 E, Max Lng: 73.8790 E
 * Center: 18.60725 N, 73.87525 E
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
 * Projects real device GPS coordinates to normalized percentage coordinates (0-100%) on the campus map.
 * Works for devices anywhere: inside AIT Pune or elsewhere with distance computation.
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

  // Clamp within map bounds with a visual safety margin
  const xPercent = Math.min(96, Math.max(4, parseFloat(rawX.toFixed(2))));
  const yPercent = Math.min(96, Math.max(4, parseFloat(rawY.toFixed(2))));
  const distanceKm = parseFloat(calculateGpsDistanceKm(lat, lng, AIT_PUNE_BOUNDS.centerLat, AIT_PUNE_BOUNDS.centerLng).toFixed(2));

  return { xPercent, yPercent, isWithinCampus, distanceKm };
}
