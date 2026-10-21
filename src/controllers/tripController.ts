import { supabase } from "@/lib/supabaseClient";
import { 
  getActiveTripSession, 
  startTripSession, 
  appendTripLocation, 
  endTripSession,
  LocationPoint,
  ActiveTripSession 
} from "@/lib/tripTelemetryStore";

export class TripController {
  /**
   * Get active trip telemetry session
   */
  static getActiveTrip(studentId: string = "IITB-22B0814", rideId: string = "#VC-9921") {
    return getActiveTripSession(studentId, rideId);
  }

  /**
   * Start or initialize trip session
   */
  static async startTrip(sessionData: Partial<ActiveTripSession>): Promise<ActiveTripSession> {
    const session = startTripSession(sessionData);

    try {
      await supabase.from("trips").insert([
        {
          id: session.rideId,
          booking_id: session.bookingId,
          cycle_id: session.bike?.id || "CC-007",
          rider_id: session.studentId,
          rider_name: session.studentName,
          start_stand: session.startStationName,
          start_time: new Date(session.checkOutTimeMs).toISOString(),
          status: session.status,
        },
      ]);
    } catch (e) {}

    return session;
  }

  /**
   * Append GPS telemetry point to ongoing trip
   */
  static recordPoint(studentId: string, rideId: string, point: LocationPoint, addedDistanceKm: number = 0) {
    return appendTripLocation(studentId, rideId, point, addedDistanceKm);
  }

  /**
   * End and check-in trip session
   */
  static async endTrip(studentId: string, rideId: string) {
    const res = endTripSession(studentId, rideId);

    try {
      if (res.session) {
        await supabase
          .from("trips")
          .update({
            end_time: res.session.completedAt || new Date().toISOString(),
            distance_km: res.session.distanceKm,
            status: "COMPLETED",
            was_late: res.wasLate,
            overdue_seconds: res.overdueSeconds,
          })
          .eq("id", rideId);
      }
    } catch (e) {}

    return res;
  }
}
