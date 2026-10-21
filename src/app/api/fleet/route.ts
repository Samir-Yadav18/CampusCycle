import { NextRequest, NextResponse } from "next/server";
import { 
  loadFleet35, 
  getFleetSummaryCounts, 
  getFleetAnalytics, 
  findCycle, 
  saveFleet35 
} from "@/lib/fleetStore";
import { toggleCycleMaintenance } from "@/lib/bookingStore";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const categoryFilter = searchParams.get("category");
    const searchQuery = searchParams.get("search");
    const idleDaysParam = searchParams.get("idleDays");
    const idleThreshold = idleDaysParam ? parseInt(idleDaysParam, 10) : 7;

    let fleet = loadFleet35();

    // Recalculate idle status based on requested threshold
    fleet = fleet.map((c) => ({
      ...c,
      isIdle: c.daysSinceLastUse >= idleThreshold,
    }));

    if (statusFilter && statusFilter !== "ALL") {
      if (statusFilter === "IDLE") {
        fleet = fleet.filter((c) => c.isIdle);
      } else if (statusFilter === "OVERDUE") {
        fleet = fleet.filter((c) => c.status === "OVERDUE");
      } else if (statusFilter === "CHECKED_OUT") {
        fleet = fleet.filter((c) => c.status === "CHECKED_OUT" || c.status === "OVERDUE");
      } else {
        fleet = fleet.filter((c) => c.status === statusFilter);
      }
    }

    if (categoryFilter && categoryFilter !== "ALL") {
      fleet = fleet.filter((c) => c.category === categoryFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      fleet = fleet.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.modelCode.toLowerCase().includes(q) ||
          c.stencilCode.includes(q)
      );
    }

    const allFleet = loadFleet35();
    const summary = getFleetSummaryCounts(allFleet);
    const analytics = getFleetAnalytics(idleThreshold, allFleet);

    return NextResponse.json({
      success: true,
      fleet,
      summary,
      analytics,
      // Backwards-compatibility fields
      activeCapacity: allFleet.filter((c) => !c.isMaintenance).length,
      maintenanceCount: allFleet.filter((c) => c.isMaintenance).length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch fleet";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { requireAdminOrVolunteer } from "@/lib/authServer";

export async function POST(request: NextRequest) {
  try {
    const authCheck = requireAdminOrVolunteer(request);
    if (authCheck instanceof NextResponse) {
      return authCheck;
    }

    const body = await request.json();
    const { cycleId, isMaintenance, reason } = body;

    if (!cycleId || typeof isMaintenance !== "boolean") {
      return NextResponse.json(
        { success: false, error: "cycleId and isMaintenance (boolean) are required." },
        { status: 400 }
      );
    }

    // Update canonical 35 fleet store
    const fleet35 = loadFleet35();
    const targetCycle = findCycle(cycleId, fleet35);
    if (targetCycle) {
      targetCycle.isMaintenance = isMaintenance;
      targetCycle.status = isMaintenance ? "MAINTENANCE" : "AVAILABLE";
      targetCycle.maintenanceReason = isMaintenance ? reason || "Scheduled inspection" : undefined;
      targetCycle.condition = isMaintenance ? "Under Maintenance" : "100% Road Ready - Inspected";
      targetCycle.conditionType = isMaintenance ? "maintenance" : "ready";
      saveFleet35(fleet35);
    }

    // Also update legacy bookingStore fleet if present
    toggleCycleMaintenance(cycleId, isMaintenance, reason);

    return NextResponse.json({
      success: true,
      cycle: targetCycle,
      message: `Cycle ${targetCycle?.name || cycleId} maintenance status set to ${isMaintenance ? "ACTIVE (Under Maintenance)" : "CLEARED (Available for booking)"}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update fleet status";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
