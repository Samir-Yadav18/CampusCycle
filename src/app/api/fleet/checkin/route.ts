import { NextRequest, NextResponse } from "next/server";
import { checkInCycleAtomic, getFleetSummaryCounts } from "@/lib/fleetStore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cycleIdentifier = body.cycleIdentifier || body.cycleId;
    const returnStandId = body.returnStandId || "stand-sports";
    const returnStandName = body.returnStandName || body.returnStand || "Sports Complex & Tennis Courts Stand";
    const conditionNote = body.conditionNote;

    if (!cycleIdentifier) {
      return NextResponse.json(
        { success: false, error: "cycleId or cycleIdentifier is required." },
        { status: 400 }
      );
    }

    const result = await checkInCycleAtomic({
      cycleIdentifier,
      returnStandId,
      returnStandName,
      conditionNote,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    const summary = getFleetSummaryCounts();

    return NextResponse.json({
      success: true,
      cycle: result.cycle,
      summary,
      message: `Checked in ${result.cycle?.name} successfully at ${result.cycle?.currentStandName}. Operational status set to AVAILABLE.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Check-in operation failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
