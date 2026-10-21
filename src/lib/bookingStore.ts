/**
 * CampusCycle Booking Engine & Server-Side Persistence Store
 * 
 * Provides concurrency-safe transactional reservations, fleet capacity tracking,
 * campus-local timezone calculations (Asia/Kolkata), cutoff enforcement,
 * future-date approval workflows, and maintenance checks.
 */

import fs from "fs";
import path from "path";
import { CAMPUS_BIKES, Bike } from "@/data/bikes";

export type BookingStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface Booking {
  id: string;
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  startIso: string;
  endIso: string;
  durationHours: number;
  hourlyRate: number; // ₹25/hr
  totalPrice: number; // durationHours * 25
  isSameDay: boolean;
  cyclePreference: "ANY" | string; // "ANY" or cycle ID
  cycleName: string;
  assignedBikeId?: string;
  assignedBikeName?: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
  adminReview?: {
    reviewedBy: string;
    reviewedAt: string;
    action: "APPROVE" | "REJECT";
    notes?: string;
  };
}

export interface CycleMaintenanceInfo {
  id: string;
  name: string;
  modelCode: string;
  dockNumber: string;
  isMaintenance: boolean;
  maintenanceReason?: string;
}

// In-memory mutex for concurrency safety during transactional capacity checks
class AsyncMutex {
  private mutex = Promise.resolve();

  lock(): Promise<() => void> {
    let begin: () => void = () => {};
    this.mutex = this.mutex.then(() => {
      return new Promise((res) => {
        begin = res;
      });
    });
    return new Promise((res) => {
      res(begin);
    });
  }
}

const bookingMutex = new AsyncMutex();

// Campus Local Timezone (Asia/Kolkata = UTC+05:30)
export const CAMPUS_TIMEZONE = "Asia/Kolkata";

/**
 * Returns current timestamp in campus-local timezone formatted as YYYY-MM-DD and HH:MM
 */
export function getCampusLocalNow(): { dateStr: string; timeStr: string; nowMs: number } {
  const now = new Date();
  
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAMPUS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const timeStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: CAMPUS_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  return { dateStr, timeStr, nowMs: now.getTime() };
}

/**
 * Converts a campus local date (YYYY-MM-DD) and time (HH:MM) to UTC milliseconds
 */
export function campusDateTimeToMs(dateStr: string, timeStr: string): number {
  // Asia/Kolkata is strictly UTC +05:30 (offset of 330 minutes)
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  
  // Construct UTC time subtracting 5h 30m
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, 0) - (5 * 60 + 30) * 60 * 1000;
  return utcMs;
}

// Persistence file location
const DATA_DIR = path.join(process.cwd(), ".data");
const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json");
const FLEET_FILE = path.join(DATA_DIR, "fleet.json");

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Default Fleet State with cycles flagged for maintenance demonstration
function getInitialFleet(): CycleMaintenanceInfo[] {
  return CAMPUS_BIKES.map((bike) => {
    // Flag trail-gravel-04, CC-033, CC-034, CC-035 as under maintenance
    const isMaint = bike.id === "trail-gravel-04" || 
                    bike.isMaintenance === true || 
                    bike.id === "CC-033" || 
                    bike.id === "CC-034" || 
                    bike.id === "CC-035";
    return {
      id: bike.id,
      name: bike.name,
      modelCode: bike.modelCode,
      dockNumber: bike.dockNumber,
      isMaintenance: isMaint,
      maintenanceReason: isMaint ? "Scheduled brake cable service & safety inspection" : undefined,
    };
  });
}

function loadFleet(): CycleMaintenanceInfo[] {
  ensureDataDir();
  if (!fs.existsSync(FLEET_FILE)) {
    const initial = getInitialFleet();
    fs.writeFileSync(FLEET_FILE, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
  try {
    const raw = fs.readFileSync(FLEET_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === CAMPUS_BIKES.length) {
      return parsed;
    }
    const initial = getInitialFleet();
    fs.writeFileSync(FLEET_FILE, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  } catch {
    return getInitialFleet();
  }
}

function saveFleet(fleet: CycleMaintenanceInfo[]) {
  ensureDataDir();
  fs.writeFileSync(FLEET_FILE, JSON.stringify(fleet, null, 2), "utf-8");
}

function loadBookings(): Booking[] {
  ensureDataDir();
  if (!fs.existsSync(BOOKINGS_FILE)) {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([], null, 2), "utf-8");
    return [];
  }
  try {
    const raw = fs.readFileSync(BOOKINGS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveBookings(bookings: Booking[]) {
  ensureDataDir();
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), "utf-8");
}

/**
 * Checks if two time intervals on the same date overlap
 */
export function doIntervalsOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  // start1 < end2 and start2 < end1
  return start1 < end2 && start2 < end1;
}

export interface BookedSlotDetail {
  bookingId: string;
  studentId: string;
  studentName: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface CycleSlotAvailability {
  cycleId: string;
  cycleName: string;
  status: "AVAILABLE" | "BOOKED" | "IN_USE" | "MAINTENANCE";
  isAvailable: boolean;
  bookedSlot?: BookedSlotDetail;
  bookedSlotText?: string;
  reason?: string;
}

export interface CapacityCheckResult {
  totalFleet: number;
  maintenanceCyclesCount: number;
  activeFleetCapacity: number;
  overlappingConfirmedCount: number;
  availableSlots: number;
  isOverbooked: boolean;
  overlappingBookings: Booking[];
  specificBikeBooked: boolean;
  specificBikeMaintenance: boolean;
  specificBikeBookedSlot?: string;
  cycleAvailability: Record<string, CycleSlotAvailability>;
}

/**
 * Calculates real-time fleet capacity during a specified time window
 * Half-open interval [startTime, endTime): a booking ending at 5:00 PM does not conflict with one starting at 5:00 PM.
 */
export function checkFleetCapacity(
  date: string,
  startTime: string,
  endTime: string,
  specificCycleId?: string,
  excludeBookingId?: string
): CapacityCheckResult {
  const fleet = loadFleet();
  const bookings = loadBookings();

  const activeFleet = fleet.filter((c) => !c.isMaintenance);
  const totalFleet = fleet.length;
  const maintenanceCyclesCount = fleet.filter((c) => c.isMaintenance).length;
  const activeFleetCapacity = activeFleet.length;

  // Active reservations for this date and overlapping interval:
  // Both APPROVED and PENDING_APPROVAL hold reservations.
  // CANCELLED and REJECTED bookings do NOT block availability.
  const overlappingConfirmed = bookings.filter((b) => {
    if (b.id === excludeBookingId) return false;
    if (b.date !== date) return false;
    if (b.status !== "APPROVED" && b.status !== "PENDING_APPROVAL") return false;
    return doIntervalsOverlap(b.startTime, b.endTime, startTime, endTime);
  });

  const overlappingConfirmedCount = overlappingConfirmed.length;
  const availableSlots = Math.max(0, activeFleetCapacity - overlappingConfirmedCount);
  const isOverbooked = overlappingConfirmedCount >= activeFleetCapacity;

  let specificBikeBooked = false;
  let specificBikeMaintenance = false;
  let specificBikeBookedSlot: string | undefined = undefined;

  // Check specific requested cycle
  if (specificCycleId && specificCycleId !== "ANY") {
    const cycle = fleet.find((c) => c.id === specificCycleId || c.modelCode === specificCycleId);
    if (cycle && cycle.isMaintenance) {
      specificBikeMaintenance = true;
    }
    const bikeOverlap = overlappingConfirmed.find(
      (b) => b.assignedBikeId === specificCycleId || b.cyclePreference === specificCycleId
    );
    if (bikeOverlap) {
      specificBikeBooked = true;
      specificBikeBookedSlot = `${bikeOverlap.startTime} – ${bikeOverlap.endTime}`;
    }
  }

  // Build real-time slot availability for every cycle in the fleet
  const cycleAvailability: Record<string, CycleSlotAvailability> = {};
  for (const c of fleet) {
    if (c.isMaintenance) {
      cycleAvailability[c.id] = {
        cycleId: c.id,
        cycleName: c.name,
        status: "MAINTENANCE",
        isAvailable: false,
        reason: c.maintenanceReason || "Under safety maintenance",
      };
    } else {
      const overlap = overlappingConfirmed.find(
        (b) => b.assignedBikeId === c.id || b.cyclePreference === c.id
      );
      if (overlap) {
        cycleAvailability[c.id] = {
          cycleId: c.id,
          cycleName: c.name,
          status: "BOOKED",
          isAvailable: false,
          bookedSlot: {
            bookingId: overlap.id,
            studentId: overlap.studentId,
            studentName: overlap.studentName,
            startTime: overlap.startTime,
            endTime: overlap.endTime,
            status: overlap.status,
          },
          bookedSlotText: `${overlap.startTime} – ${overlap.endTime}`,
          reason: `Booked for ${overlap.startTime} – ${overlap.endTime}`,
        };
      } else {
        cycleAvailability[c.id] = {
          cycleId: c.id,
          cycleName: c.name,
          status: "AVAILABLE",
          isAvailable: true,
        };
      }
    }
  }

  return {
    totalFleet,
    maintenanceCyclesCount,
    activeFleetCapacity,
    overlappingConfirmedCount,
    availableSlots,
    isOverbooked,
    overlappingBookings: overlappingConfirmed,
    specificBikeBooked,
    specificBikeMaintenance,
    specificBikeBookedSlot,
    cycleAvailability,
  };
}

export interface CreateBookingParams {
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  cyclePreference?: string; // "ANY" or cycle ID
  bypassOperatingHours?: boolean; // For automated testing overrides
}

export interface BookingValidationResult {
  valid: boolean;
  error?: string;
  booking?: Booking;
}

/**
 * Creates a booking atomically with full server-side validation
 */
export async function createBookingAtomic(params: CreateBookingParams): Promise<BookingValidationResult> {
  const unlock = await bookingMutex.lock();
  try {
    const { studentId, studentName, date, startTime, endTime, cyclePreference = "ANY", bypassOperatingHours = false } = params;
    const campusNow = getCampusLocalNow();

    // 1. Basic format validation
    if (!date || !startTime || !endTime) {
      return { valid: false, error: "Date, start time, and expected end time are required." };
    }

    if (endTime <= startTime) {
      return { valid: false, error: "Expected end time must be later than start time." };
    }

    // Calculate duration in minutes and hours
    const [sH, sM] = startTime.split(":").map(Number);
    const [eH, eM] = endTime.split(":").map(Number);
    const startMinutes = sH * 60 + sM;
    const endMinutes = eH * 60 + eM;

    // Operating hours check: 5:00 PM (17:00) to 9:00 PM (21:00)
    // "time should start from 5pm and the last time till one can book the cycle is 9pm i.e. by 9pm he should return the cycle back to campus"
    if (!bypassOperatingHours) {
      if (startMinutes < 17 * 60 || endMinutes > 21 * 60) {
        return {
          valid: false,
          error: "CampusCycle operating hours are 5:00 PM to 9:00 PM (17:00 – 21:00 IST). Cycles must be collected from 5:00 PM onwards and returned to campus by 9:00 PM.",
        };
      }
    }

    const durationMinutes = endMinutes - startMinutes;
    if (durationMinutes < 30) {
      return { valid: false, error: "Minimum booking duration gap is 30 minutes." };
    }

    if (durationMinutes % 30 !== 0) {
      return { valid: false, error: "Booking duration must be in 30-minute intervals (e.g. 30m, 1h, 1.5h, 2h)." };
    }

    const durationHours = parseFloat((durationMinutes / 60).toFixed(2));

    if (durationHours > 12) {
      return { valid: false, error: "Single ride duration cannot exceed 12 hours." };
    }

    // Price policy: ₹25 per hour flat
    const hourlyRate = 25;
    const totalPrice = parseFloat((durationHours * hourlyRate).toFixed(2));

    // 2. Date classification (Past vs Today vs Future)
    if (date < campusNow.dateStr) {
      return { valid: false, error: "Cannot create a booking for a past date." };
    }

    const isSameDay = date === campusNow.dateStr;
    const isFutureDate = date > campusNow.dateStr;

    // 3. Same-day Cutoff Policy:
    // "A same-day booking must be created no later than 60 minutes before its scheduled start time."
    if (isSameDay) {
      const [nowH, nowM] = campusNow.timeStr.split(":").map(Number);
      const nowClockMinutes = nowH * 60 + nowM;
      const [slotH, slotM] = startTime.split(":").map(Number);
      const slotClockMinutes = slotH * 60 + slotM;
      const minutesRemaining = slotClockMinutes - nowClockMinutes;

      if (minutesRemaining < 60) {
        return {
          valid: false,
          error: `Same-day booking cutoff rule violated: Bookings must be created at least 60 minutes before scheduled start time. Selected start: ${startTime}, Current campus time: ${campusNow.timeStr}. (For ${startTime} start, booking closed at 60 mins prior).`,
        };
      }
    }

    // 4. Capacity & Specific Cycle validation
    const fleet = loadFleet();
    if (cyclePreference !== "ANY") {
      const foundCycle = fleet.find((c) => c.id === cyclePreference || c.modelCode === cyclePreference);
      if (!foundCycle) {
        return {
          valid: false,
          error: "Selected bicycle does not exist in the campus fleet.",
        };
      }
    }

    const capacity = checkFleetCapacity(date, startTime, endTime, cyclePreference);

    if (capacity.specificBikeMaintenance) {
      return {
        valid: false,
        error: `The selected cycle (${cyclePreference}) is currently undergoing safety maintenance and cannot be reserved. Please select another cycle or choose 'Any Available Cycle'.`,
      };
    }

    if (capacity.specificBikeBooked) {
      return {
        valid: false,
        error: "This bicycle is already booked for the selected time. Please choose another bicycle or time.",
      };
    }

    if (capacity.isOverbooked) {
      return {
        valid: false,
        error: `Campus fleet capacity exceeded for ${date} (${startTime} - ${endTime}). All ${capacity.activeFleetCapacity} available cycles are already reserved.`,
      };
    }

    // 5. Determine initial status:
    // User policy: All rides are approval-based (same-day or future date).
    // Students must wait until the admin approves the ride request before unlocking.
    const status: BookingStatus = "PENDING_APPROVAL";

    let cycleName = "Any Available Campus Cycle";
    let assignedBikeId: string | undefined = undefined;
    let assignedBikeName: string | undefined = undefined;

    if (cyclePreference !== "ANY") {
      const b = fleet.find((c) => c.id === cyclePreference);
      if (b) {
        cycleName = b.name;
        assignedBikeId = b.id;
        assignedBikeName = b.name;
      }
    }

    const startIso = `${date}T${startTime}:00+05:30`;
    const endIso = `${date}T${endTime}:00+05:30`;

    const newBooking: Booking = {
      id: `BK-${date.replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
      studentId,
      studentName,
      date,
      startTime,
      endTime,
      startIso,
      endIso,
      durationHours,
      hourlyRate,
      totalPrice,
      isSameDay,
      cyclePreference,
      cycleName,
      assignedBikeId,
      assignedBikeName,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const bookings = loadBookings();
    bookings.push(newBooking);
    saveBookings(bookings);

    return { valid: true, booking: newBooking };
  } finally {
    unlock();
  }
}

/**
 * Admin review: Approve future booking request
 */
export async function approveBookingAtomic(
  bookingId: string,
  reviewerName: string,
  notes?: string
): Promise<{ success: boolean; error?: string; booking?: Booking }> {
  const unlock = await bookingMutex.lock();
  try {
    const bookings = loadBookings();
    const booking = bookings.find((b) => b.id === bookingId);

    if (!booking) {
      return { success: false, error: "Booking request not found." };
    }

    if (booking.status !== "PENDING_APPROVAL") {
      return { success: false, error: `Cannot approve booking with current status: ${booking.status}` };
    }

    // Verify fleet capacity for this slot at approval time
    const capacity = checkFleetCapacity(
      booking.date,
      booking.startTime,
      booking.endTime,
      booking.cyclePreference,
      booking.id
    );

    if (capacity.isOverbooked) {
      return {
        success: false,
        error: `Cannot approve: Fleet capacity of ${capacity.activeFleetCapacity} cycles is already fully reserved for ${booking.date} (${booking.startTime} - ${booking.endTime}).`,
      };
    }

    if (capacity.specificBikeMaintenance) {
      return {
        success: false,
        error: `Cannot approve: The requested cycle is currently under maintenance.`,
      };
    }

    if (capacity.specificBikeBooked) {
      return {
        success: false,
        error: `Cannot approve: The requested specific cycle has already been booked by another student for an overlapping slot.`,
      };
    }

    booking.status = "APPROVED";
    booking.updatedAt = new Date().toISOString();
    booking.adminReview = {
      reviewedBy: reviewerName,
      reviewedAt: new Date().toISOString(),
      action: "APPROVE",
      notes,
    };

    saveBookings(bookings);
    return { success: true, booking };
  } finally {
    unlock();
  }
}

/**
 * Admin review: Reject future booking request
 */
export async function rejectBookingAtomic(
  bookingId: string,
  reviewerName: string,
  reason: string
): Promise<{ success: boolean; error?: string; booking?: Booking }> {
  const unlock = await bookingMutex.lock();
  try {
    const bookings = loadBookings();
    const booking = bookings.find((b) => b.id === bookingId);

    if (!booking) {
      return { success: false, error: "Booking request not found." };
    }

    if (booking.status === "REJECTED" || booking.status === "CANCELLED") {
      return { success: false, error: `Booking is already ${booking.status}.` };
    }

    booking.status = "REJECTED";
    booking.rejectionReason = reason;
    booking.updatedAt = new Date().toISOString();
    booking.adminReview = {
      reviewedBy: reviewerName,
      reviewedAt: new Date().toISOString(),
      action: "REJECT",
      notes: reason,
    };

    saveBookings(bookings);
    return { success: true, booking };
  } finally {
    unlock();
  }
}

/**
 * Cancel a booking (student or admin)
 */
export async function cancelBookingAtomic(
  bookingId: string
): Promise<{ success: boolean; error?: string; booking?: Booking }> {
  const unlock = await bookingMutex.lock();
  try {
    const bookings = loadBookings();
    const booking = bookings.find((b) => b.id === bookingId);

    if (!booking) {
      return { success: false, error: "Booking not found." };
    }

    booking.status = "CANCELLED";
    booking.updatedAt = new Date().toISOString();

    saveBookings(bookings);
    return { success: true, booking };
  } finally {
    unlock();
  }
}

/**
 * Assign cycle at stand/pickup by volunteer
 */
export async function assignCycleAtPickup(
  bookingId: string,
  cycleId: string,
  volunteerName: string
): Promise<{ success: boolean; error?: string; booking?: Booking }> {
  const unlock = await bookingMutex.lock();
  try {
    const fleet = loadFleet();
    const cycle = fleet.find((c) => c.id === cycleId);
    if (!cycle) {
      return { success: false, error: "Cycle not found in campus fleet." };
    }
    if (cycle.isMaintenance) {
      return { success: false, error: `Cycle ${cycle.name} is currently under maintenance.` };
    }

    const bookings = loadBookings();
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) {
      return { success: false, error: "Booking not found." };
    }
    if (booking.status !== "APPROVED") {
      return { success: false, error: "Only approved bookings can be assigned a cycle at pickup." };
    }

    booking.assignedBikeId = cycle.id;
    booking.assignedBikeName = cycle.name;
    booking.updatedAt = new Date().toISOString();

    saveBookings(bookings);
    return { success: true, booking };
  } finally {
    unlock();
  }
}

/**
 * Toggle cycle maintenance mode (Admin only)
 */
export function toggleCycleMaintenance(
  cycleId: string,
  isMaintenance: boolean,
  reason?: string
): { success: boolean; error?: string; cycle?: CycleMaintenanceInfo } {
  const fleet = loadFleet();
  const cycle = fleet.find((c) => c.id === cycleId);
  if (!cycle) {
    return { success: false, error: "Cycle not found." };
  }

  cycle.isMaintenance = isMaintenance;
  cycle.maintenanceReason = isMaintenance ? (reason || "Scheduled inspection") : undefined;

  saveFleet(fleet);
  return { success: true, cycle };
}

export function getAllBookings(): Booking[] {
  return loadBookings();
}

export function getAllFleet(): CycleMaintenanceInfo[] {
  return loadFleet();
}
