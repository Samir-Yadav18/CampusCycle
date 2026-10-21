import { NextRequest, NextResponse } from "next/server";
import { cancelBookingAtomic, getAllBookings } from "@/lib/bookingStore";
import { getAuthenticatedUser } from "@/lib/authServer";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const auth = getAuthenticatedUser(request);

    // If an authenticated user is identified, enforce ownership check
    if (auth.authenticated && auth.user) {
      const allBookings = getAllBookings();
      const targetBooking = allBookings.find((b) => b.id === id);

      if (!targetBooking) {
        return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });
      }

      // Admin or volunteer can cancel any booking
      if (auth.role !== "admin" && auth.role !== "volunteer") {
        // Normal student user: can ONLY cancel their own booking
        const isOwner =
          targetBooking.studentId === auth.user.userId ||
          targetBooking.studentId === auth.user.id ||
          targetBooking.studentName.toLowerCase() === auth.user.name.toLowerCase();

        if (!isOwner) {
          return NextResponse.json(
            {
              success: false,
              error: "Forbidden: You are not authorized to cancel or modify another user's booking.",
            },
            { status: 403 }
          );
        }
      }
    }

    const result = await cancelBookingAtomic(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: result.booking,
      message: "Booking cancelled successfully.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to cancel booking";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
