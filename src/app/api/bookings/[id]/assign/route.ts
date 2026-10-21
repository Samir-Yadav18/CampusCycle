import { NextRequest, NextResponse } from "next/server";
import { assignCycleAtPickup } from "@/lib/bookingStore";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authRole = request.headers.get("x-user-role") || "admin";

    if (authRole !== "admin" && authRole !== "volunteer") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Volunteer or Admin role required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    if (!body.cycleId) {
      return NextResponse.json(
        { success: false, error: "cycleId is required." },
        { status: 400 }
      );
    }

    const volunteerName = body.volunteerName || "Station Volunteer";
    const result = await assignCycleAtPickup(id, body.cycleId, volunteerName);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: result.booking,
      message: `Cycle assigned successfully at stand/dock.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to assign cycle";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
