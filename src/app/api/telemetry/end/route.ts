import { NextRequest, NextResponse } from "next/server";
import { endTripSession } from "@/lib/tripTelemetryStore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const studentId = body.studentId || "IITB-22B0814";
    const rideId = body.rideId || "#VC-9921";

    const result = endTripSession(studentId, rideId);

    return NextResponse.json({
      success: true,
      session: result.session,
      wasLate: result.wasLate,
      overdueSeconds: result.overdueSeconds,
      message: result.wasLate
        ? `Trip check-in complete. Ride exceeded expected return by ${Math.floor(result.overdueSeconds / 60)} mins; logged in student record.`
        : "Trip check-in complete on time.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to end trip session";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
