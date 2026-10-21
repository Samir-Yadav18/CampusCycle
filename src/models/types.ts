export type BookingStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "CANCELLED";

export type CycleCategory = "commuter" | "city" | "trail" | "step-thru";

export interface CycleModel {
  id: string;
  name: string;
  series: string;
  modelCode: string;
  category: CycleCategory;
  categoryLabel?: string;
  dockNumber: string;
  isMaintenance: boolean;
  maintenanceReason?: string | null;
  batteryPercent?: number | null;
  hourlyRate: number;
  condition?: string;
  conditionType?: "ready" | "inspected" | "attention" | "maintenance";
  createdAt?: string;
  updatedAt?: string;
}

export interface BookingModel {
  id: string;
  studentId: string;
  studentName: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string;   // HH:mm
  endTime: string;     // HH:mm
  durationHours: number;
  hourlyRate: number;
  totalPrice: number;
  isSameDay: boolean;
  cyclePreference: string;
  assignedCycleId?: string | null;
  assignedCycleName?: string | null;
  status: BookingStatus;
  rejectionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TripModel {
  id: string;
  bookingId?: string | null;
  cycleId: string;
  cycleName?: string;
  riderId: string;
  riderName: string;
  startStand: string;
  endStand?: string | null;
  startTime: string;
  endTime?: string | null;
  durationSeconds: number;
  distanceKm: number;
  fareCharged: number;
  status: "ACTIVE" | "COMPLETED" | "OVERDUE";
  wasLate?: boolean;
  overdueSeconds?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WalletModel {
  id: string;
  studentId: string;
  studentName: string;
  balance: number;
  currency: string;
  isSandbox: boolean;
  updatedAt?: string;
}

export interface WalletTransactionModel {
  id: string;
  walletId: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  category: "TOP_UP" | "RENTAL_DEBIT" | "REFUND";
  referenceId?: string | null;
  idempotencyKey?: string | null;
  isSandbox: boolean;
  timestamp: string;
}

export interface UserModel {
  id: string; // User ID as string
  userId: string; // e.g. "260691"
  name: string; // e.g. "Samir Yadav"
  email: string; // e.g. "260691@aitpune.edu.in"
  passwordHash: string; // Stored securely, never sent to frontend
  role: "student" | "volunteer" | "admin";
  department?: string;
  semester?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUserProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "student" | "volunteer" | "admin";
  department?: string;
  semester?: string;
  isActive?: boolean;
}
