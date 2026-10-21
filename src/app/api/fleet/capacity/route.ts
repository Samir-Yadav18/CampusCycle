import { NextRequest, NextResponse } from "next/server";
import { checkFleetCapacity, getCampusLocalNow } from "@/lib/bookingStore";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const startTime = searchParams.get("startTime");
    const endTime = searchParams.get("endTime");
    const cycleId = searchParams.get("cycleId") || undefined;

    const campusNow = getCampusLocalNow();

    if (!date || !startTime || !endTime) {
      return NextResponse.json({
        success: true,
        campusNow,
        message: "Provide date, startTime, and endTime to calculate interval capacity.",
      });
    }

    const capacity = checkFleetCapacity(date, startTime, endTime, cycleId);

    return NextResponse.json({
      success: true,
      campusNow,
      date,
      startTime,
      endTime,
      capacity,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to check capacity";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
