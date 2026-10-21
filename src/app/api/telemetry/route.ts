import { NextRequest, NextResponse } from "next/server";
import { 
  getActiveTripSession, 
  appendTripLocation, 
  startTripSession,
  LocationPoint 
} from "@/lib/tripTelemetryStore";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId") || "IITB-22B0814";
    const rideId = searchParams.get("rideId") || "#VC-9921";

    const session = getActiveTripSession(studentId, rideId);
    return NextResponse.json({
      success: true,
      session,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load telemetry session";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const studentId = body.studentId || "IITB-22B0814";
    const rideId = body.rideId || "#VC-9921";

    if (body.action === "START") {
      const session = startTripSession({
        studentId,
        rideId,
        bookingId: body.bookingId,
        bookedDurationHours: body.bookedDurationHours || 1,
        expectedReturnTimeMs: body.expectedReturnTimeMs,
        expectedReturnTimeText: body.expectedReturnTimeText,
      });
      return NextResponse.json({ success: true, session });
    }

    if (!body.point) {
      return NextResponse.json({ success: false, error: "Missing location point" }, { status: 400 });
    }

    const point: LocationPoint = body.point;

    // Validate coordinates
    if (typeof point.lat !== "number" || isNaN(point.lat) || point.lat < -90 || point.lat > 90) {
      return NextResponse.json({ success: false, error: "Invalid latitude: must be between -90 and 90 degrees." }, { status: 400 });
    }
    if (typeof point.lng !== "number" || isNaN(point.lng) || point.lng < -180 || point.lng > 180) {
      return NextResponse.json({ success: false, error: "Invalid longitude: must be between -180 and 180 degrees." }, { status: 400 });
    }

    const addedDistanceKm = typeof body.addedDistanceKm === "number" ? Math.max(0, body.addedDistanceKm) : 0;

    const session = appendTripLocation(studentId, rideId, point, addedDistanceKm);

    return NextResponse.json({
      success: true,
      session,
      isOverdue: session.isOverdue,
      overdueSeconds: session.overdueSeconds,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update telemetry";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
