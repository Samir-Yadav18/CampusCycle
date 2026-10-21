import { NextRequest, NextResponse } from "next/server";
import { rejectBookingAtomic } from "@/lib/bookingStore";
import { requireAdminOrVolunteer } from "@/lib/authServer";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = requireAdminOrVolunteer(request);
    if (authCheck instanceof NextResponse) {
      return authCheck;
    }
    const { auth } = authCheck;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reviewerName = body.reviewerName || auth.user?.name || "Mobility Admin";
    const reason = body.reason || body.rejectionReason || "Fleet capacity constraints or administrative review.";

    const result = await rejectBookingAtomic(id, reviewerName, reason);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: result.booking,
      message: "Booking request rejected.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reject booking";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
