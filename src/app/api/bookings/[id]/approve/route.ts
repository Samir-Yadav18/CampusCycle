import { NextRequest, NextResponse } from "next/server";
import { approveBookingAtomic } from "@/lib/bookingStore";
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
    const notes = body.notes;

    const result = await approveBookingAtomic(id, reviewerName, notes);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: result.booking,
      message: "Booking request approved and confirmed.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to approve booking";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
