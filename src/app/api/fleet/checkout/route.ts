import { NextRequest, NextResponse } from "next/server";
import { checkOutCycleAtomic, getFleetSummaryCounts } from "@/lib/fleetStore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cycleIdentifier = body.cycleIdentifier || body.cycleId;
    const riderName = body.riderName || "Aryan K. (Student)";
    const riderId = body.riderId || "IITB-22B0814";
    const departureStandName = body.departureStandName || body.departureStand || "Sports Complex & Tennis Courts Stand";
    const expectedDurationHours = body.expectedDurationHours || 1;

    if (!cycleIdentifier) {
      return NextResponse.json(
        { success: false, error: "cycleId or cycleIdentifier is required." },
        { status: 400 }
      );
    }

    const result = await checkOutCycleAtomic({
      cycleIdentifier,
      riderName,
      riderId,
      departureStandName,
      expectedDurationHours,
    });

    if (!result.success) {
      const isConflict = result.error?.toLowerCase().includes("already checked out") ||
                         result.error?.toLowerCase().includes("already on an active");
      return NextResponse.json(
        { success: false, error: result.error },
        { status: isConflict ? 409 : 400 }
      );
    }

    const summary = getFleetSummaryCounts();

    return NextResponse.json({
      success: true,
      cycle: result.cycle,
      summary,
      message: `Checked out ${result.cycle?.name} successfully. Operational status updated to CHECKED_OUT.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Check-out operation failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
