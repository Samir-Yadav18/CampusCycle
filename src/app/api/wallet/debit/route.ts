import { NextRequest, NextResponse } from "next/server";
import { debitRentalAtomic, DebitParams } from "@/lib/walletStore";

export async function POST(request: NextRequest) {
  try {
    const body: DebitParams = await request.json();

    if (!body.amount || body.amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Debit amount must be greater than ₹0." },
        { status: 400 }
      );
    }

    if (!body.rideId) {
      return NextResponse.json(
        { success: false, error: "rideId or referenceId is required." },
        { status: 400 }
      );
    }

    const studentId = body.studentId || "IITB-22B0814";
    const idempotencyKey = body.idempotencyKey || `DEBIT-KEY-${body.rideId}`;

    const result = await debitRentalAtomic({
      studentId,
      amount: parseFloat(Number(body.amount).toFixed(2)),
      rideId: body.rideId,
      idempotencyKey,
      description: body.description,
      bookedDurationHours: body.bookedDurationHours,
    });

    if (!result.success) {
      // 402 Payment Required for insufficient balance
      const isInsufficient = result.error?.includes("Insufficient");
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          requiredAmount: result.requiredAmount,
          availableBalance: result.availableBalance,
        },
        { status: isInsufficient ? 402 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      wallet: result.wallet,
      transaction: result.transaction,
      isDuplicate: result.isDuplicate,
      message: result.isDuplicate
        ? "Rental already settled (duplicate request prevented)."
        : `Successfully debited ₹${body.amount.toFixed(2)} from Campus Wallet.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal debit error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
