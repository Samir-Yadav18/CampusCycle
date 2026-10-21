import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authServer";
import { loadUsers, sanitizeUser } from "@/lib/userStore";
import { getAllBookings } from "@/lib/bookingStore";

export async function GET(request: NextRequest) {
  try {
    const authCheck = requireAdmin(request);
    if (authCheck instanceof NextResponse) {
      return authCheck;
    }

    const rawUsers = loadUsers();
    const bookings = getAllBookings();

    const usersWithStats = rawUsers.map((u) => {
      const sanitized = sanitizeUser(u);
      const userBookings = bookings.filter(
        (b) =>
          b.studentId === u.userId ||
          b.studentId === u.id ||
          b.studentName.toLowerCase() === u.name.toLowerCase()
      );
      const activeBookings = userBookings.filter(
        (b) => b.status === "APPROVED" || b.status === "PENDING_APPROVAL"
      ).length;

      return {
        ...sanitized,
        totalBookings: userBookings.length,
        activeBookings,
        createdAt: u.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      users: usersWithStats,
      totalCount: usersWithStats.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve registered users";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
