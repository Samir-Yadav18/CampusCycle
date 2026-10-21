import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully.",
    });

    // Invalidate cookies by setting maxAge: 0
    response.cookies.set({
      name: "campuscycle_user_id",
      value: "",
      path: "/",
      maxAge: 0,
    });

    response.cookies.set({
      name: "campuscycle_user_role",
      value: "",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to logout";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
