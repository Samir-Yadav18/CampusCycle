import { NextRequest, NextResponse } from "next/server";
import { getStudentWallet, topUpWalletAtomic, TopUpParams } from "@/lib/walletStore";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId") || "IITB-22B0814";

    const wallet = getStudentWallet(studentId);

    return NextResponse.json({
      success: true,
      wallet,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load wallet";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: TopUpParams = await request.json();

    if (!body.amount || body.amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Top-up amount must be greater than ₹0." },
        { status: 400 }
      );
    }

    const studentId = body.studentId || "IITB-22B0814";
    const idempotencyKey = body.idempotencyKey || `TOPUP-KEY-${Date.now()}-${Math.random()}`;

    const result = await topUpWalletAtomic({
      studentId,
      amount: parseFloat(Number(body.amount).toFixed(2)),
      paymentMethod: body.paymentMethod || "UPI",
      idempotencyKey,
      gatewayOrderId: body.gatewayOrderId,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      wallet: result.wallet,
      transaction: result.transaction,
      isDuplicate: result.isDuplicate,
      message: result.isDuplicate 
        ? "Top-up already credited (idempotent request)." 
        : `Successfully added ₹${body.amount} to Campus Wallet (Sandbox Demo Provider).`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal wallet error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
