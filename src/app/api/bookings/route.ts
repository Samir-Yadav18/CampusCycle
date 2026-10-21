import { NextRequest, NextResponse } from "next/server";
import { 
  getAllBookings, 
  createBookingAtomic, 
  CreateBookingParams, 
  getCampusLocalNow 
} from "@/lib/bookingStore";
import { getUserById } from "@/lib/userStore";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const status = searchParams.get("status");
    const date = searchParams.get("date");

    let bookings = getAllBookings();

    if (studentId) {
      bookings = bookings.filter((b) => b.studentId.toLowerCase() === studentId.toLowerCase());
    }

    if (status) {
      bookings = bookings.filter((b) => b.status === status);
    }

    if (date) {
      bookings = bookings.filter((b) => b.date === date);
    }

    // Sort by createdAt descending
    bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const campusNow = getCampusLocalNow();

    return NextResponse.json({
      success: true,
      campusNow,
      bookings,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch bookings";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateBookingParams = await request.json();

    if (!body.studentId) {
      return NextResponse.json(
        { success: false, error: "Authentication required: User ID must be provided." },
        { status: 401 }
      );
    }

    // Check user authentication: verify studentId is present and resolve registered profile or active student identity
    const authUser = getUserById(body.studentId) || (body.studentId ? { id: body.studentId, userId: body.studentId, name: body.studentName || body.studentId, role: "student" } : null);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: `Authentication failed: User '${body.studentId}' not found.` },
        { status: 401 }
      );
    }

    const result = await createBookingAtomic(body);

    if (!result.valid) {
      // Determine appropriate HTTP status code:
      // Overlapping bookings & capacity conflicts return 409 Conflict.
      // Maintenance lockout, cutoff rules, and validation errors return 400 Bad Request.
      const isConflict = result.error?.includes("already booked") || 
                         result.error?.includes("already reserved") || 
                         result.error?.includes("capacity exceeded");
      return NextResponse.json(
        { success: false, error: result.error },
        { status: isConflict ? 409 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: result.booking,
      message: "Ride request submitted successfully! Awaiting admin approval before you can unlock and ride.",
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
