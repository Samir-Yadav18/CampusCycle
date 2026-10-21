import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authServer";
import { loadFleet35 } from "@/lib/fleetStore";
import { getAllBookings } from "@/lib/bookingStore";
import { loadUsers } from "@/lib/userStore";

export async function GET(request: NextRequest) {
  try {
    const authCheck = requireAdmin(request);
    if (authCheck instanceof NextResponse) {
      return authCheck;
    }

    const fleet = loadFleet35();
    const bookings = getAllBookings();
    const users = loadUsers();

    // Actual live calculated numbers from database records
    const totalBicycles = fleet.length;
    const availableBicycles = fleet.filter((c) => c.status === "AVAILABLE" && !c.isMaintenance).length;
    const inUseOrBookedBicycles = fleet.filter(
      (c) => c.status === "CHECKED_OUT" || c.status === "RESERVED" || c.status === "OVERDUE"
    ).length;
    const maintenanceBicycles = fleet.filter((c) => c.status === "MAINTENANCE" || c.isMaintenance).length;
    const totalUsers = users.length;
    const activeAndUpcomingBookings = bookings.filter(
      (b) => b.status === "APPROVED" || b.status === "PENDING_APPROVAL"
    ).length;
    const pendingApprovalsCount = bookings.filter((b) => b.status === "PENDING_APPROVAL").length;
    const completedOrCancelledBookings = bookings.filter(
      (b) => b.status === "CANCELLED" || b.status === "REJECTED"
    ).length;

    return NextResponse.json({
      success: true,
      stats: {
        totalBicycles,
        availableBicycles,
        inUseOrBookedBicycles,
        maintenanceBicycles,
        totalUsers,
        activeAndUpcomingBookings,
        pendingApprovalsCount,
        completedOrCancelledBookings,
        totalBookings: bookings.length,
      },
      verifiedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to calculate overview statistics";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
