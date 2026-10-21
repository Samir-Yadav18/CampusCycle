import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/lib/userStore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, password } = body;

    const identifier = userId || email;
    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: "User ID / Email and password are required." },
        { status: 400 }
      );
    }

    const authResult = authenticateUser(identifier, password);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Authentication failed." },
        { status: 401 }
      );
    }

    // Set session cookies for role and user identification
    const redirectUrl = authResult.user.role === "admin" ? "/admin" : "/";
    const response = NextResponse.json({
      success: true,
      user: authResult.user,
      redirectUrl,
      message: `Welcome, ${authResult.user.name}! Session active.`,
    });

    response.cookies.set({
      name: "campuscycle_user_id",
      value: authResult.user.userId,
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    response.cookies.set({
      name: "campuscycle_user_role",
      value: authResult.user.role,
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal authentication error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
