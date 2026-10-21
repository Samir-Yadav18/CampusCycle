import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authServer";
import { toggleUserActiveStatus } from "@/lib/userStore";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = requireAdmin(request);
    if (authCheck instanceof NextResponse) {
      return authCheck;
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'isActive' boolean parameter." },
        { status: 400 }
      );
    }

    const result = toggleUserActiveStatus(id, isActive);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      message: `User ${result.user?.name} account status updated to ${isActive ? "ACTIVE" : "DEACTIVATED"}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to toggle user status";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
