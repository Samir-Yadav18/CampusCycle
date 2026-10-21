import { NextRequest, NextResponse } from "next/server";
import { getUserById } from "@/lib/userStore";
import { getAuthenticatedUser } from "@/lib/authServer";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get("userId");

    // If querying a specific user explicitly
    if (queryUserId) {
      const user = getUserById(queryUserId);
      if (!user) {
        return NextResponse.json(
          { success: false, authenticated: false, error: `User not found with ID ${queryUserId}` },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        authenticated: true,
        user,
      });
    }

    // Otherwise check currently authenticated session
    const auth = getAuthenticatedUser(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        user: null,
        message: auth.error || "No active session.",
      });
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: auth.user,
      role: auth.role,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve session";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
