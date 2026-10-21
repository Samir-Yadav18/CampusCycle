import { NextResponse } from "next/server";
import { listPublicUsers, seedInitialUsers } from "@/lib/userStore";

export async function GET() {
  try {
    seedInitialUsers();
    // Public user list only exposes student users (admin is protected)
    const users = listPublicUsers().filter((u) => u.role !== "admin");
    return NextResponse.json({
      success: true,
      users,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to list users";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
