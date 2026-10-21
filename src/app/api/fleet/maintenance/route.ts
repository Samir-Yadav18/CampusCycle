import { NextRequest, NextResponse } from "next/server";
import { 
  reportCycleDefectAtomic, 
  clearCycleMaintenanceAtomic, 
  loadFleet35, 
  getFleetSummaryCounts 
} from "@/lib/fleetStore";

export async function GET() {
  try {
    const fleet = loadFleet35();
    const reports = fleet.flatMap((c) => c.activeMaintenanceReports || []);
    const maintenanceCycles = fleet.filter((c) => c.status === "MAINTENANCE" || c.status === "INSPECTION");
    const summary = getFleetSummaryCounts(fleet);

    return NextResponse.json({
      success: true,
      reports,
      maintenanceCycles,
      maintenanceCount: summary.maintenanceCycles,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch maintenance data";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "REPORT_DEFECT") {
      const { cycleIdentifier, reporterName, reporterId, reporterRole, category, description, photoUrl } = body;
      if (!cycleIdentifier || !description) {
        return NextResponse.json(
          { success: false, error: "cycleIdentifier and description are required." },
          { status: 400 }
        );
      }

      const res = await reportCycleDefectAtomic({
        cycleIdentifier,
        reporterName: reporterName || "Aryan K. (Student)",
        reporterId: reporterId || "IITB-22B0814",
        reporterRole: reporterRole || "student",
        category: category || "OTHER",
        description,
        photoUrl,
      });

      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }

      const summary = getFleetSummaryCounts();
      return NextResponse.json({
        success: true,
        report: res.report,
        cycle: res.cycle,
        summary,
        message: `Defect reported on ${res.cycle?.name}. Cycle status updated to MAINTENANCE. Booking & checkout are locked.`,
      });
    }

    if (action === "RESOLVE_DEFECT" || action === "CLEAR_MAINTENANCE") {
      const { cycleIdentifier, reportId, volunteerName, actualCost, notes } = body;
      if (!cycleIdentifier) {
        return NextResponse.json(
          { success: false, error: "cycleIdentifier is required." },
          { status: 400 }
        );
      }

      const res = await clearCycleMaintenanceAtomic({
        cycleIdentifier,
        reportId,
        volunteerName: volunteerName || "Authorized Volunteer Aryan",
        actualCost: typeof actualCost === "number" ? actualCost : 80,
        notes,
      });

      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }

      const summary = getFleetSummaryCounts();
      return NextResponse.json({
        success: true,
        cycle: res.cycle,
        summary,
        message: `Maintenance cleared for ${res.cycle?.name}. Cycle verified and marked AVAILABLE for campus riders.`,
      });
    }

    return NextResponse.json(
      { success: false, error: `Invalid maintenance action: ${action}` },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Maintenance operation failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
