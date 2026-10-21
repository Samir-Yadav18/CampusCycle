import { supabase } from "@/lib/supabaseClient";
import { 
  getAllBookings, 
  createBookingAtomic, 
  Booking, 
  CreateBookingParams, 
  BookingValidationResult 
} from "@/lib/bookingStore";
import { BookingModel } from "@/models/types";

export class BookingController {
  /**
   * Get all bookings with optional filters
   */
  static async getAllBookings(filters?: { studentId?: string; status?: string }): Promise<BookingModel[]> {
    try {
      let query = supabase.from("bookings").select("*");
      if (filters?.studentId) query = query.eq("student_id", filters.studentId);
      if (filters?.status) query = query.eq("status", filters.status);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((b: any) => ({
          id: b.id,
          studentId: b.student_id,
          studentName: b.student_name,
          bookingDate: b.booking_date || b.date,
          startTime: b.start_time,
          endTime: b.end_time,
          durationHours: Number(b.duration_hours),
          hourlyRate: Number(b.hourly_rate),
          totalPrice: Number(b.total_price),
          isSameDay: b.is_same_day,
          cyclePreference: b.cycle_preference,
          assignedCycleId: b.assigned_cycle_id,
          status: b.status,
          rejectionReason: b.rejection_reason,
          reviewedBy: b.reviewed_by,
          reviewedAt: b.reviewed_at,
          createdAt: b.created_at,
          updatedAt: b.updated_at,
        }));
      }
    } catch (e) {}

    let bookings: Booking[] = getAllBookings();
    if (filters?.studentId) {
      bookings = bookings.filter((b) => b.studentId.toLowerCase() === filters.studentId?.toLowerCase());
    }
    if (filters?.status) {
      bookings = bookings.filter((b) => b.status === filters.status);
    }

    return bookings.map((b: Booking) => ({
      id: b.id,
      studentId: b.studentId,
      studentName: b.studentName,
      bookingDate: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      durationHours: b.durationHours,
      hourlyRate: b.hourlyRate,
      totalPrice: b.totalPrice,
      isSameDay: b.isSameDay,
      cyclePreference: b.cyclePreference,
      assignedCycleId: b.assignedBikeId,
      assignedCycleName: b.assignedBikeName,
      status: b.status,
      rejectionReason: b.rejectionReason,
      reviewedBy: b.adminReview?.reviewedBy,
      reviewedAt: b.adminReview?.reviewedAt,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }));
  }

  /**
   * Get booking by ID
   */
  static async getBookingById(id: string): Promise<BookingModel | null> {
    const all = getAllBookings();
    const b = all.find((item) => item.id.toLowerCase() === id.toLowerCase());
    if (!b) return null;
    return {
      id: b.id,
      studentId: b.studentId,
      studentName: b.studentName,
      bookingDate: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      durationHours: b.durationHours,
      hourlyRate: b.hourlyRate,
      totalPrice: b.totalPrice,
      isSameDay: b.isSameDay,
      cyclePreference: b.cyclePreference,
      assignedCycleId: b.assignedBikeId,
      assignedCycleName: b.assignedBikeName,
      status: b.status,
      rejectionReason: b.rejectionReason,
      reviewedBy: b.adminReview?.reviewedBy,
      reviewedAt: b.adminReview?.reviewedAt,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
  }

  /**
   * Create new booking atomically
   */
  static async createBooking(data: {
    studentId?: string;
    studentName?: string;
    date: string;
    startTime: string;
    endTime: string;
    cyclePreference?: string;
    bypassOperatingHours?: boolean;
  }): Promise<{ success: boolean; booking?: Booking; error?: string }> {
    const res: BookingValidationResult = await createBookingAtomic({
      studentId: data.studentId || "22B0814",
      studentName: data.studentName || "Aryan K.",
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      cyclePreference: data.cyclePreference || "ANY",
      bypassOperatingHours: data.bypassOperatingHours || false,
    });

    if (res.valid && res.booking) {
      try {
        await supabase.from("bookings").insert([
          {
            id: res.booking.id,
            student_id: res.booking.studentId,
            student_name: res.booking.studentName,
            booking_date: res.booking.date,
            start_time: res.booking.startTime,
            end_time: res.booking.endTime,
            duration_hours: res.booking.durationHours,
            hourly_rate: res.booking.hourlyRate,
            total_price: res.booking.totalPrice,
            is_same_day: res.booking.isSameDay,
            cycle_preference: res.booking.cyclePreference,
            assigned_cycle_id: res.booking.assignedBikeId,
            status: res.booking.status,
          },
        ]);
      } catch (e) {}

      return { success: true, booking: res.booking };
    }

    return { success: false, error: res.error };
  }
}
