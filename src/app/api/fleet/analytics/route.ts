import { NextRequest, NextResponse } from "next/server";
import { loadFleet35, getFleetSummaryCounts, getFleetAnalytics } from "@/lib/fleetStore";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const thresholdParam = searchParams.get("thresholdDays");
    const thresholdDays = thresholdParam ? parseInt(thresholdParam, 10) : 7;

    const fleet = loadFleet35();
    const summary = getFleetSummaryCounts(fleet);
    const analytics = getFleetAnalytics(thresholdDays, fleet);

    // Identify all idle cycles according to thresholdDays
    const idleCycles = fleet
      .filter((c) => c.daysSinceLastUse >= thresholdDays)
      .map((c) => {
        let suggestedAction = "Conduct standard 50-point safety check & verify tyre pressure.";
        if (c.daysSinceLastUse >= 14) {
          suggestedAction = "Run comprehensive brake, chain & derailleur inspection; consider stand redeployment.";
        } else if (c.tirePressurePsi < 45) {
          suggestedAction = "Inflate tyres to 50 PSI and lubricate drive chain.";
        }

        return {
          id: c.id,
          name: c.name,
          modelCode: c.modelCode,
          category: c.category,
          categoryLabel: c.categoryLabel,
          status: c.status,
          currentStandName: c.currentStandName || c.lastRecordedStandName,
          lastTripDate: c.lastTripDate,
          daysSinceLastUse: c.daysSinceLastUse,
          condition: c.condition,
          conditionType: c.conditionType,
          tirePressurePsi: c.tirePressurePsi,
          image: c.image,
          suggestedAction,
        };
      });

    return NextResponse.json({
      success: true,
      idleThresholdDays: thresholdDays,
      idleCyclesCount: idleCycles.length,
      idleCycles,
      summary,
      analytics,
      dataSource: "Recorded AIT CampusCycle check-out/check-in logs",
      isLiveCalculated: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to compute analytics";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
